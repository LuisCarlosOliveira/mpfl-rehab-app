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
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
const back = () => fireEvent.click(screen.getByRole('button', { name: 'Back' }));
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

const Q = {
  written: 'Did your care team give you a written rehab plan?',
  procedure: 'Which operation did you have?',
  age: 'How old are you?',
  both: 'Did you have surgery on both knees?',
  first: 'Is this your first MPFL surgery on this knee?',
  rules: /Did your surgeon give special rules/,
  date: 'What was the date of your surgery?',
  side: 'Which knee did you have surgery on?',
  limit: /Did your surgeon give a limit for how far you can bend your knee/,
  flags: 'Do any of these apply today?',
  today: 'How is your knee today?',
  clearance: /Has your surgeon or physiotherapist said that you can start the next stage/,
};

/** Answers the questions up to the date question. */
function referralQuestions() {
  choose('No'); next();
  choose('MPFL reconstruction only'); next();
  choose('18 or older'); next();
  choose('No'); next();
  choose('Yes'); next();
  choose('No'); next();
}

/** Answers every question from the first to the summary. The date gives week 3. */
function walk(date = '2026-10-15', extra: () => void = () => undefined) {
  referralQuestions();
  type('Date of surgery', date); next();
  choose('Left'); next();
  choose(/Yes, my limit is/); type('Limit in degrees', '60'); next();
  next(); // red flags: no tick
  choose('2'); choose('No swelling'); next();
  extra();
}

describe('Onboarding, one question for each screen', () => {
  it('starts with the first referral question and counts the questions', () => {
    setup();
    expect(h1()).toBe(Q.written);
    expect(screen.getByText('Question 1 of 11')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('asks the referral questions first, in the order of the design', () => {
    setup();
    const seen: (string | null)[] = [h1()];
    const answers: [string, string][] = [['No', 'next'], ['MPFL reconstruction only', 'next'], ['18 or older', 'next'], ['No', 'next'], ['Yes', 'next'], ['No', 'next']];
    for (const [a] of answers) {
      choose(a);
      next();
      seen.push(h1());
    }
    expect(seen).toEqual([Q.written, Q.procedure, Q.age, Q.both, Q.first, 'Did your surgeon give special rules, for example about the graft, the fixation or the shape of your knee?', Q.date]);
  });

  it('keeps Next closed until the question has an answer', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    choose('No');
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('Back on the first question leaves the questions, and Back on a later one keeps the answer', () => {
    const { onCancel } = setup();
    choose('No');
    next();
    back();
    expect(h1()).toBe(Q.written);
    expect(screen.getByRole('radio', { name: 'No' })).toBeChecked();
    back();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('moves the focus to the new question heading', () => {
    setup();
    choose('No');
    next();
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
    expect(document.activeElement?.textContent).toBe(Q.procedure);
  });

  it('shows the help line of the operation question', () => {
    setup();
    choose('No');
    next();
    expect(screen.getByText(/Your discharge letter names the operation/)).toBeInTheDocument();
  });
});

describe('Onboarding, early referral', () => {
  it.each([
    ['a written plan', () => choose('Yes'), 'R1'],
    ['a combined operation', () => { choose('No'); next(); choose('MPFL reconstruction with another procedure'); }, 'R2'],
    ['an age under 18', () => { choose('No'); next(); choose('MPFL reconstruction only'); next(); choose('Under 18'); }, 'R3'],
  ])('shows the referral at once for %s, with no other question and no plan', (_n, act, id) => {
    const { onDone } = setup();
    act();
    next();
    expect(onDone).toHaveBeenCalledTimes(1);
    const draft = onDone.mock.calls[0]![0];
    expect(draft).toMatchObject({ kind: 'referral', origin: 'create', reason: id, inputs: null });
    expect('protocol' in draft).toBe(false);
  });

  it('refers for both knees, a repeat surgery and special rules', () => {
    for (const [pick, id] of [['both', 'R4'], ['first', 'R5'], ['rules', 'R6']] as const) {
      cleanup();
      const { onDone } = setup();
      choose('No'); next();
      choose('MPFL reconstruction only'); next();
      choose('18 or older'); next();
      if (pick === 'both') { choose('Yes'); next(); }
      else { choose('No'); next(); }
      if (pick === 'first') { choose('No'); next(); }
      else if (pick !== 'both') { choose('Yes'); next(); }
      if (pick === 'rules') { choose('Yes'); next(); }
      expect(onDone.mock.calls[0]![0]).toMatchObject({ kind: 'referral', reason: id });
    }
  });

  it('asks the next question when the answer allows a plan', () => {
    const { onDone } = setup();
    choose('No');
    next();
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('Onboarding, the date, the knee and the limit', () => {
  it('has a date field that stops at today, and keeps Next closed while it is empty', () => {
    setup();
    referralQuestions();
    expect(h1()).toBe(Q.date);
    const input = screen.getByLabelText('Date of surgery') as HTMLInputElement;
    expect(input.type).toBe('date');
    expect(input.max).toBe(TODAY);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByText(/keeps this date on this device only/i)).toBeInTheDocument();
  });

  it('shows the number field only for "Yes, my limit is", and checks the range', () => {
    setup();
    referralQuestions();
    type('Date of surgery', '2026-10-15'); next();
    choose('Left'); next();
    expect(h1()).toMatch(Q.limit);
    expect(screen.queryByLabelText('Limit in degrees')).toBeNull();
    choose(/Yes, my limit is/);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    type('Limit in degrees', '181');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    type('Limit in degrees', '60');
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('A-06: a limit of 200, -5 or 90.5 gets a plain message and aria-invalid, and a good number clears both', () => {
    setup();
    referralQuestions();
    type('Date of surgery', '2026-10-15'); next();
    choose('Left'); next();
    choose(/Yes, my limit is/);
    const field = () => screen.getByLabelText('Limit in degrees');
    expect(field()).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).toBeNull();
    for (const bad of ['200', '-5', '90.5']) {
      type('Limit in degrees', bad);
      expect(field()).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole number of degrees from 0 to 180.');
      expect(field()).toHaveAccessibleDescription(/Enter a whole number of degrees from 0 to 180/);
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    }
    type('Limit in degrees', '');
    expect(field()).not.toHaveAttribute('aria-invalid', 'true');
    type('Limit in degrees', '0');
    expect(field()).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    type('Limit in degrees', '180');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says that the heel slide needs a number from the surgeon when the answer is no limit', () => {
    setup();
    referralQuestions();
    type('Date of surgery', '2026-10-15'); next();
    choose('Left'); next();
    choose('No limit');
    expect(screen.getByText('Before week 6, the app needs the number from your surgeon to add the heel slide.')).toBeInTheDocument();
  });

  it('lists the red flags in two groups, with no tick as a valid answer', () => {
    setup();
    referralQuestions();
    type('Date of surgery', '2026-10-15'); next();
    choose('Left'); next();
    choose('I do not know'); next();
    expect(h1()).toBe(Q.flags);
    expect(screen.getAllByRole('checkbox')).toHaveLength(9);
    expect(screen.getByRole('group', { name: /Call emergency services if any of these is true/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });
});

describe('Onboarding, the summary and the plan', () => {
  it('shows the summary with each answer and a Change button, then makes the plan', () => {
    const { onDone } = setup();
    walk();
    expect(h1()).toBe('Check your answers');
    expect(screen.getAllByRole('button', { name: /^Change/ }).length).toBeGreaterThanOrEqual(11);
    expect(screen.getByText('2026-10-15')).toBeInTheDocument();
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

  it('goes to one question with Change and back to the summary with Next', () => {
    setup();
    walk();
    fireEvent.click(screen.getByRole('button', { name: 'Change the side of the knee' }));
    expect(h1()).toBe(Q.side);
    choose('Right');
    next();
    expect(h1()).toBe('Check your answers');
    expect(within(screen.getByRole('list', { name: 'Your answers' })).getByText('Right')).toBeInTheDocument();
  });

  it('makes a referral from a red flag at the summary, with the message of its group', () => {
    const { onDone } = setup();
    referralQuestions();
    type('Date of surgery', '2026-10-15'); next();
    choose('Left'); next();
    choose('No limit'); next();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sudden shortness of breath or chest pain.' }));
    next();
    choose('2'); choose('No swelling'); next();
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    const draft = onDone.mock.calls[0]![0];
    expect(draft).toMatchObject({ kind: 'referral', reason: 'R8' });
    expect(draft.text).toContain('Stop. Do not exercise. Call emergency services now.');
  });

  it('refers when the pain is 7 or more', () => {
    const { onDone } = setup();
    walk('2026-10-15');
    // change the pain answer from the summary
    fireEvent.click(screen.getByRole('button', { name: 'Change the pain and swelling today' }));
    choose('9');
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ kind: 'referral', reason: 'R9' });
  });

  it('refers at week 12 with the text of the generator, at the date question', () => {
    const { onDone } = setup();
    referralQuestions();
    type('Date of surgery', '2026-08-01'); next();
    expect(onDone.mock.calls[0]![0]).toMatchObject({ kind: 'referral', reason: 'R10', text: expect.stringMatching(/no plan after week 11/) });
  });

  it('asks the clearance question from week 7 and puts the answer in the inputs', () => {
    const { onDone } = setup();
    walk('2026-09-15', () => {
      expect(h1()).toMatch(Q.clearance);
      expect(screen.getByText('Question 12 of 12')).toBeInTheDocument();
      choose('Yes');
      next();
      // Generator v2: the answer yes opens three more questions.
      expect(h1()).toMatch(/Do you walk without crutches/);
      expect(screen.getByText('Question 13 of 15')).toBeInTheDocument();
      choose('I do not know');
      next();
      choose('I do not know');
      next();
      choose('I do not know');
      next();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    const draft = onDone.mock.calls[0]![0];
    expect(draft.inputs.phaseClearance).toBe('yes');
    expect(draft.protocol.activePhase).toBe(2);
  });

  it('asks no more questions after the answer no to the clearance question', () => {
    const { onDone } = setup();
    walk('2026-09-15', () => {
      choose('No');
      next();
    });
    expect(h1()).toBe('Check your answers');
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    expect(onDone.mock.calls[0]![0].inputs).toMatchObject({ walksWithoutCrutches: 'unknown', legRaiseStraight: 'unknown', seatedHoldCleared: 'unknown' });
  });

  it('adds the mini squat to the plan when both answers are yes, and no hold without the surgeon answer', () => {
    const { onDone } = setup();
    walk('2026-09-15', () => {
      choose('Yes');
      next();
      choose('Yes');
      next();
      choose('Yes');
      next();
      choose('No');
      next();
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
    type('Date of surgery', '2026-09-10'); // week 8
    next();
    expect(h1()).toMatch(Q.clearance);
  });
});

describe('Onboarding, a surgery date after week 11 stops the questions at the date (A-12)', () => {
  it('shows the referral right after the date question, before the side and the other questions', () => {
    const { onDone } = setup();
    referralQuestions();
    type('Date of surgery', '2026-08-01'); // week 14
    next();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0]).toMatchObject({ kind: 'referral', reason: 'R10' });
  });

  it('goes on to the side question for a date in week 11', () => {
    const { onDone } = setup();
    referralQuestions();
    type('Date of surgery', '2026-08-23'); // week 11
    next();
    expect(onDone).not.toHaveBeenCalled();
    expect(h1()).toBe(Q.side);
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
      choose('Yes');
      next();
    });
    check();
  });

  it('marks every icon as hidden from assistive technology', () => {
    const { view } = setup();
    for (const svg of view.container.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
