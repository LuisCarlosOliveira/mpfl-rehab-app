import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateProtocol, type GeneratorInputs } from '../../src/lib/protocolGen';
import { Onboarding } from '../../src/ui/Onboarding';
import { hasVerdictWord } from './verdict';

// The extended generator items are on by default (VITE_GENERATOR_EXTENDED is off only for false or 0). This file sets the flag on to be exact.
// The value false (off) is tested in protocolGenV2.test.ts, onboardingModel.test.ts and ui/updatePlanV2.test.tsx.
vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true');
beforeEach(() => vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true'));

afterEach(cleanup);

const TODAY = '2026-11-08';
function setup(props: Partial<Parameters<typeof Onboarding>[0]> = {}) {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  const view = render(<Onboarding today={TODAY} onDone={onDone} onCancel={onCancel} {...props} />);
  return { onDone, onCancel, view };
}
const h1 = () => screen.getByRole('heading', { level: 1 }).textContent;
const choose = (name: string | RegExp) => fireEvent.click(screen.getByRole('radio', { name }));
/** Answers one question of a group screen. The legend names the group of radio buttons. */
const pick = (question: string | RegExp, answer: string | RegExp) =>
  fireEvent.click(within(screen.getByRole('group', { name: question })).getByRole('radio', { name: answer }));
const go = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }));
const GO = { surgeon: 'Continue to your surgeon', today: 'Continue to today', check: 'Check my answers' } as const;
const back = () => fireEvent.click(screen.getByRole('button', { name: 'Back' }));
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
/** Types an ISO date into the day, month and year fields. */
const typeDate = (iso: string) => {
  const [y, m, d] = iso.split('-') as [string, string, string];
  type('Day', String(Number(d))); type('Month', String(Number(m))); type('Year', y);
};

const Q = {
  written: 'Did your care team give you a written rehab plan?',
  procedure: 'Which operation did you have?',
  age: 'How old are you?',
  both: 'Did you have surgery on both knees?',
  first: 'Is this your first MPFL surgery on this knee?',
  rules: /Did your surgeon give special rules/,
  side: 'Which knee did you have surgery on?',
  limit: /Did your surgeon give a limit for how far you can bend your knee/,
  flags: 'Do any of these apply today?',
  clearance: /Has your surgeon or physiotherapist said that you can start the next stage/,
};

/** Answers the 6 questions of group 1 with the answers that allow a plan. */
function aboutAnswers() {
  pick(Q.written, 'No');
  pick(Q.procedure, 'MPFL reconstruction only');
  pick(Q.age, '18 or older');
  pick(Q.both, 'No');
  pick(Q.first, 'Yes');
  pick(Q.rules, 'No');
}

/** Group 1 to group 2. */
function referralQuestions() {
  aboutAnswers();
  go(GO.surgeon);
}

/** Answers group 2 with a date, the left knee and a limit of 60. It stays on the screen of group 3. */
function surgeonGroup(date: string) {
  typeDate(date);
  pick(Q.side, 'Left');
  pick(Q.limit, /Yes, my limit is/); type('Limit in degrees', '60');
  go(GO.today);
}

/** Answers every question from the first to the summary. The date gives week 3. `extra` answers the questions of group 3 that the date opens. */
function walk(date = '2026-10-15', extra: () => void = () => undefined) {
  referralQuestions();
  surgeonGroup(date);
  choose('2'); choose('No swelling');
  extra();
  go(GO.check);
}

describe('Onboarding, the date that the person sees is the date that the app keeps', () => {
  const toDate = () => {
    setup();
    referralQuestions();
  };
  it('shows the chosen date in words under the fields, with the week', () => {
    toDate();
    expect(screen.queryByText(/You chose/)).toBeNull();
    typeDate('2026-10-29');
    expect(screen.getByText('You chose 29 October 2026, week 1 (the second week after surgery).')).toBeInTheDocument();
  });
  it('shows the date in words on Check your answers, so a wrong date is visible', () => {
    setup({ today: '2026-11-18' });
    referralQuestions();
    surgeonGroup('2026-10-29');
    choose('2'); choose('No swelling');
    go(GO.check);
    expect(h1()).toBe('Check your answers');
    expect(screen.getByText('29 October 2026, week 2 (the third week after surgery)')).toBeInTheDocument();
  });
  it('keeps the date of the fields in the stored answers, and never today', () => {
    const { onDone } = setup({ today: '2026-11-18' });
    referralQuestions();
    surgeonGroup('2026-10-29');
    choose('2'); choose('No swelling');
    go(GO.check);
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    expect(onDone.mock.calls[0]![0].inputs.surgeryDate).toBe('2026-10-29');
  });
  it('does not replace an empty or invalid date by today: Continue stays closed and no words show', () => {
    toDate();
    pick(Q.side, 'Left');
    pick(Q.limit, 'No limit');
    expect(screen.getByRole('button', { name: GO.today })).toBeDisabled();
    typeDate('2026-11-30'); // after today
    expect(screen.getByRole('button', { name: GO.today })).toBeDisabled();
    expect(screen.queryByText(/You chose/)).toBeNull();
    expect(screen.getByText('The date cannot be in the future')).toBeInTheDocument();
    typeDate('2026-11-08');
    expect(screen.getByRole('button', { name: GO.today })).toBeEnabled();
  });
});

describe('Onboarding, 3 groups', () => {
  it('starts with group 1 and counts the steps', () => {
    setup();
    expect(h1()).toBe('You and your surgery');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(16);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('asks the 6 referral questions first, each in a fieldset with its legend, in the order of the design', () => {
    setup();
    const legends = [...document.querySelectorAll('fieldset > legend')].map((l) => l.textContent);
    expect(legends).toEqual([
      Q.written, Q.procedure, Q.age, Q.both, Q.first,
      'Did your surgeon give special rules, for example about the graft, the fixation or the shape of your knee?',
    ]);
  });

  it('shows group 2 and group 3 with their questions', () => {
    setup();
    referralQuestions();
    expect(h1()).toBe('Your surgeon');
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    const legends = [...document.querySelectorAll('fieldset > legend')].map((l) => l.textContent);
    expect(legends[0]).toBe('Date of surgery');
    expect(legends.slice(1)).toEqual([Q.side, 'Did your surgeon give a limit for how far you can bend your knee, also with a brace?']);
    surgeonGroup('2026-10-15');
    expect(h1()).toBe('How are you today?');
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
  });

  it('keeps Continue closed until every question of the group has an answer', () => {
    setup();
    expect(screen.getByRole('button', { name: GO.surgeon })).toBeDisabled();
    pick(Q.written, 'No'); pick(Q.procedure, 'MPFL reconstruction only'); pick(Q.age, '18 or older'); pick(Q.both, 'No'); pick(Q.first, 'Yes');
    expect(screen.getByRole('button', { name: GO.surgeon })).toBeDisabled();
    pick(Q.rules, 'No');
    expect(screen.getByRole('button', { name: GO.surgeon })).toBeEnabled();
  });

  it('Back on group 1 leaves the questions, and Back on a later group keeps the answers', () => {
    const { onCancel } = setup();
    referralQuestions();
    back();
    expect(h1()).toBe('You and your surgery');
    expect(within(screen.getByRole('group', { name: Q.age })).getByRole('radio', { name: '18 or older' })).toBeChecked();
    back();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('moves the focus to the heading of the new group', () => {
    setup();
    referralQuestions();
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
    expect(document.activeElement?.textContent).toBe('Your surgeon');
  });

  it('shows the help line of the operation question', () => {
    setup();
    expect(screen.getByText(/Your discharge letter names the operation/)).toBeInTheDocument();
  });
});

describe('Onboarding, early referral', () => {
  it.each([
    ['a written plan', () => pick(Q.written, 'Yes'), 'R1'],
    ['a combined operation', () => pick(Q.procedure, 'MPFL reconstruction with another procedure'), 'R2'],
    ['an age under 18', () => pick(Q.age, 'Under 18'), 'R3'],
    ['both knees', () => pick(Q.both, 'Yes'), 'R4'],
    ['a repeat surgery', () => pick(Q.first, 'No'), 'R5'],
    ['special rules', () => pick(Q.rules, 'Yes'), 'R6'],
  ])('shows the referral at once for %s, when group 1 goes on, with no other question and no plan', (_n, act, id) => {
    const { onDone } = setup();
    aboutAnswers();
    act();
    go(GO.surgeon);
    expect(onDone).toHaveBeenCalledTimes(1);
    const draft = onDone.mock.calls[0]![0];
    expect(draft).toMatchObject({ kind: 'referral', origin: 'create', reason: id, inputs: null });
    expect('protocol' in draft).toBe(false);
  });

  it('shows no referral before group 1 goes on, and none when the answers allow a plan', () => {
    const { onDone } = setup();
    pick(Q.written, 'Yes');
    expect(onDone).not.toHaveBeenCalled();
    pick(Q.written, 'No');
    aboutAnswers();
    go(GO.surgeon);
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('Onboarding, the date, the knee and the limit', () => {
  it('has three number fields in a fieldset, and keeps Continue closed while they are empty', () => {
    setup();
    referralQuestions();
    expect(h1()).toBe('Your surgeon');
    expect(screen.getByRole('group', { name: 'Date of surgery' })).toBeInTheDocument();
    for (const label of ['Day', 'Month', 'Year']) expect((screen.getByLabelText(label) as HTMLInputElement).inputMode).toBe('numeric');
    expect(document.querySelector('input[type=date]')).toBeNull();
    expect(screen.getByRole('button', { name: GO.today })).toBeDisabled();
    expect(screen.getByText(/keeps this date on this device only/i)).toBeInTheDocument();
  });

  it('shows the number field only for "Yes, my limit is", and checks the range', () => {
    setup();
    referralQuestions();
    typeDate('2026-10-15');
    pick(Q.side, 'Left');
    expect(screen.queryByLabelText('Limit in degrees')).toBeNull();
    pick(Q.limit, /Yes, my limit is/);
    expect(screen.getByRole('button', { name: GO.today })).toBeDisabled();
    type('Limit in degrees', '181');
    expect(screen.getByRole('button', { name: GO.today })).toBeDisabled();
    type('Limit in degrees', '60');
    expect(screen.getByRole('button', { name: GO.today })).toBeEnabled();
  });

  it('A-06: a limit of 200, -5 or 90.5 gets a plain message and aria-invalid, and a good number clears both', () => {
    setup();
    referralQuestions();
    typeDate('2026-10-15');
    pick(Q.side, 'Left');
    pick(Q.limit, /Yes, my limit is/);
    const field = () => screen.getByLabelText('Limit in degrees');
    expect(field()).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).toBeNull();
    for (const bad of ['200', '-5', '90.5']) {
      type('Limit in degrees', bad);
      expect(field()).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole number of degrees from 0 to 180.');
      expect(field()).toHaveAccessibleDescription(/Enter a whole number of degrees from 0 to 180/);
      expect(screen.getByRole('button', { name: GO.today })).toBeDisabled();
    }
    type('Limit in degrees', '');
    expect(field()).not.toHaveAttribute('aria-invalid', 'true');
    type('Limit in degrees', '0');
    expect(field()).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: GO.today })).toBeEnabled();
    type('Limit in degrees', '180');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says that the heel slide needs a number from the surgeon when the answer is no limit', () => {
    setup();
    referralQuestions();
    pick(Q.limit, 'No limit');
    expect(screen.getByText('Before week 6, the app needs the number from your surgeon to add the heel slide.')).toBeInTheDocument();
  });

  it('lists the red flags in two groups, with no tick as a valid answer, and asks pain and swelling on the same screen', () => {
    setup();
    referralQuestions();
    surgeonGroup('2026-10-15');
    expect(h1()).toBe('How are you today?');
    expect(screen.getAllByRole('checkbox')).toHaveLength(9);
    expect(screen.getByRole('group', { name: Q.flags })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Call emergency services if any of these is true/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: GO.check })).toBeDisabled(); // pain and swelling are open
    choose('2'); choose('No swelling');
    expect(screen.getByRole('button', { name: GO.check })).toBeEnabled();
  });
});

describe('Onboarding, the summary and the plan', () => {
  it('shows the summary with each answer and a Change button, then makes the plan', () => {
    const { onDone } = setup();
    walk();
    expect(h1()).toBe('Check your answers');
    expect(screen.getAllByRole('button', { name: /^Change/ }).length).toBeGreaterThanOrEqual(11);
    expect(screen.getByText('15 October 2026, week 3 (the fourth week after surgery)')).toBeInTheDocument();
    expect(screen.getByText('60 degrees')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    const draft = onDone.mock.calls[0]![0];
    expect(draft).toMatchObject({ kind: 'plan', origin: 'create', changes: [], hold: null });
    expect(draft.protocol.generated.rules).toContain('SLR');
    expect(draft.protocol.approvedOn).toBeUndefined();
    const expected: GeneratorInputs = draft.inputs;
    expect(generateProtocol(expected, TODAY)).toMatchObject({ kind: 'protocol' });
  });

  it('calls the generator only when the person presses Make my plan', () => {
    const { onDone } = setup();
    walk();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('goes to the group of one answer with Change, and back to the summary with Continue', () => {
    setup();
    walk();
    fireEvent.click(screen.getByRole('button', { name: 'Change the side of the knee' }));
    expect(h1()).toBe('Your surgeon');
    pick(Q.side, 'Right');
    go(GO.today);
    expect(h1()).toBe('Check your answers');
    expect(within(screen.getByRole('list', { name: 'Your answers' })).getByText('Right')).toBeInTheDocument();
  });

  it('makes a referral from a red flag at the summary, with the message of its group', () => {
    const { onDone } = setup();
    referralQuestions();
    typeDate('2026-10-15');
    pick(Q.side, 'Left');
    pick(Q.limit, 'No limit');
    go(GO.today);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sudden shortness of breath or chest pain.' }));
    choose('2'); choose('No swelling');
    go(GO.check);
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    const draft = onDone.mock.calls[0]![0];
    expect(draft).toMatchObject({ kind: 'referral', reason: 'R8' });
    expect(draft.text).toContain('Stop. Do not exercise. Call emergency services now.');
  });

  it('refers when the pain is 7 or more', () => {
    const { onDone } = setup();
    walk('2026-10-15');
    fireEvent.click(screen.getByRole('button', { name: 'Change the pain and swelling today' }));
    expect(h1()).toBe('How are you today?');
    choose('9');
    go(GO.check);
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ kind: 'referral', reason: 'R9' });
  });

  it('refers at week 12 with the text of the generator, when group 2 goes on', () => {
    const { onDone } = setup();
    referralQuestions();
    typeDate('2026-08-01');
    pick(Q.side, 'Left');
    pick(Q.limit, 'No limit');
    go(GO.today);
    expect(onDone.mock.calls[0]![0]).toMatchObject({ kind: 'referral', reason: 'R10', text: expect.stringMatching(/no plan after week 11/) });
  });

  it('asks the clearance question from week 7 on the last group and puts the answer in the inputs', () => {
    const { onDone } = setup();
    walk('2026-09-15', () => {
      expect(h1()).toBe('How are you today?');
      pick(Q.clearance, 'Yes');
      // Generator v2: the answer yes opens three more questions on the same screen.
      expect(screen.getByRole('group', { name: /Do you walk without crutches/ })).toBeInTheDocument();
      for (const q of [/Do you walk without crutches/, /Can you lift your leg/, /knee straightening exercises while you sit/]) pick(q, 'I do not know');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    const draft = onDone.mock.calls[0]![0];
    expect(draft.inputs.phaseClearance).toBe('yes');
    expect(draft.protocol.activePhase).toBe(2);
  });

  it('keeps Check my answers closed until the clearance question has an answer, and asks it only from week 7', () => {
    setup();
    referralQuestions();
    surgeonGroup('2026-10-15');
    expect(screen.queryByRole('group', { name: Q.clearance })).toBeNull();
    cleanup();
    setup();
    referralQuestions();
    surgeonGroup('2026-09-15');
    choose('2'); choose('No swelling');
    expect(screen.getByRole('button', { name: GO.check })).toBeDisabled();
    pick(Q.clearance, 'No');
    expect(screen.getByRole('button', { name: GO.check })).toBeEnabled();
  });

  it('asks no more questions after the answer no to the clearance question', () => {
    const { onDone } = setup();
    walk('2026-09-15', () => pick(Q.clearance, 'No'));
    expect(h1()).toBe('Check your answers');
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    expect(onDone.mock.calls[0]![0].inputs).toMatchObject({ walksWithoutCrutches: 'unknown', legRaiseStraight: 'unknown', seatedHoldCleared: 'unknown' });
  });

  it('shows the three questions by default with a plain text, keeps each answer on Back, and shows a summary row for each', () => {
    setup();
    walk('2026-09-15', () => {
      pick(Q.clearance, 'Yes');
      pick(/Do you walk without crutches/, 'Yes');
      pick(/Can you lift your leg/, 'No');
      pick(/knee straightening exercises while you sit/, 'Yes');
    });
    expect(h1()).toBe('Check your answers');
    back();
    expect(h1()).toBe('How are you today?');
    expect(within(screen.getByRole('group', { name: /Can you lift your leg/ })).getByRole('radio', { name: 'No' })).toBeChecked();
    expect(within(screen.getByRole('group', { name: /Do you walk without crutches/ })).getByRole('radio', { name: 'Yes' })).toBeChecked();
    go(GO.check);
    for (const label of ['Walking without crutches', 'Leg raise with a straight knee', 'Knee straightening while you sit, said by your surgeon']) {
      expect(screen.getByText(label), label).toBeInTheDocument();
    }
    for (const name of ['Change the walking answer', 'Change the leg raise answer', 'Change the seated exercise answer']) {
      expect(screen.getByRole('button', { name }), name).toBeInTheDocument();
    }
  });

  it('leaves the mini squat and the seated hold out for a no or an unknown answer, and says so with the words of the guideline', () => {
    const { onDone } = setup();
    walk('2026-09-15', () => {
      pick(Q.clearance, 'Yes');
      pick(/Do you walk without crutches/, 'No');
      pick(/Can you lift your leg/, 'I do not know');
      pick(/knee straightening exercises while you sit/, 'I do not know');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    const draft = onDone.mock.calls[0]![0];
    const kinds = draft.protocol.phases.find((p: { id: number }) => p.id === 2).exercises.map((e: { kind: string }) => e.kind);
    expect(kinds).not.toContain('mini-squat');
    expect(kinds).not.toContain('seated-extension-hold');
    const squat = draft.why.find((w: { ruleId: string }) => w.ruleId === 'SQUAT_P2');
    expect(squat.text).toMatch(/not in your plan/);
    expect(squat.text).toMatch(/P3 lists the mini squat/);
    expect(draft.why.find((w: { ruleId: string }) => w.ruleId === 'HOLD').text).toMatch(/P1 and P2 avoid/);
  });

  it('adds the mini squat to the plan when both answers are yes, and no hold without the surgeon answer', () => {
    const { onDone } = setup();
    walk('2026-09-15', () => {
      pick(Q.clearance, 'Yes');
      pick(/Do you walk without crutches/, 'Yes');
      pick(/Can you lift your leg/, 'Yes');
      pick(/knee straightening exercises while you sit/, 'No');
    });
    expect(screen.getByText('Walking without crutches')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    const draft = onDone.mock.calls[0]![0];
    const kinds = draft.protocol.phases.find((p: { id: number }) => p.id === 2).exercises.map((e: { kind: string }) => e.kind);
    expect(kinds).toContain('mini-squat');
    expect(kinds).not.toContain('seated-extension-hold');
    expect(draft.inputs).toMatchObject({ walksWithoutCrutches: 'yes', legRaiseStraight: 'yes', seatedHoldCleared: 'no', kneeGaveWay: false });
  });

  it('starts at the summary when it is given the earlier answers', () => {
    const inputs: GeneratorInputs = {
      writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
      surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'none' }, phaseClearance: 'no', redFlags: {}, pain: 1, swelling: 'some',
    };
    setup({ initial: inputs });
    expect(h1()).toBe('Check your answers');
    expect(screen.getByText('No limit')).toBeInTheDocument();
  });
});

describe('Onboarding, a date change that opens the clearance question (A-01)', () => {
  it('asks the clearance question after the date moves from week 3 to week 8, and shows no answer for it before', () => {
    const inputs: GeneratorInputs = {
      writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
      surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 1, swelling: 'none',
    };
    setup({ initial: inputs });
    expect(screen.queryByText('Next stage said by your care team')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Change the date of surgery' }));
    typeDate('2026-09-10'); // week 8
    go(GO.today);
    expect(h1()).toBe('How are you today?');
    expect(screen.getByRole('group', { name: Q.clearance })).toBeInTheDocument();
  });
});

describe('Onboarding, a surgery date after week 11 stops the questions at group 2 (A-12)', () => {
  it('shows the referral when group 2 goes on, before the questions of group 3', () => {
    const { onDone } = setup();
    referralQuestions();
    typeDate('2026-08-01'); // week 14
    pick(Q.side, 'Left');
    pick(Q.limit, 'No limit');
    go(GO.today);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0]).toMatchObject({ kind: 'referral', reason: 'R10' });
  });

  it('goes on to group 3 for a date in week 11', () => {
    const { onDone } = setup();
    referralQuestions();
    typeDate('2026-08-23'); // week 11
    pick(Q.side, 'Left');
    pick(Q.limit, 'No limit');
    go(GO.today);
    expect(onDone).not.toHaveBeenCalled();
    expect(h1()).toBe('How are you today?');
  });
});

describe('Onboarding, markup and words', () => {
  it('has no inline style and no verdict word on any screen', () => {
    const { view } = setup();
    const check = () => {
      expect(view.container.querySelector('[style]')).toBeNull();
      expect(hasVerdictWord(view.container.textContent ?? '')).toBeNull();
    };
    check();
    walk('2026-09-15', () => {
      check();
      pick(Q.clearance, 'Yes');
      for (const q of [/Do you walk without crutches/, /Can you lift your leg/, /knee straightening exercises while you sit/]) pick(q, 'No');
    });
    check();
  });

  it('marks every icon as hidden from assistive technology', () => {
    const { view } = setup();
    for (const svg of view.container.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the exact wording of the red flag step', () => {
    setup();
    referralQuestions();
    surgeonGroup('2026-10-15');
    expect(screen.getByText('Tick each sentence that is true today.')).toBeInTheDocument();
    expect(screen.getByText('Call emergency services if any of these is true')).toBeInTheDocument();
    expect(screen.getByText('Contact your care team if any of these is true')).toBeInTheDocument();
  });
});
