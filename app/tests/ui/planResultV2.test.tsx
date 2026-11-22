import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { draftOf, type PlanDraft } from '../../src/lib/planView';
import type { Protocol } from '../../src/lib/protocol';
import { generateProtocol, RULES, type GeneratorInputs } from '../../src/lib/protocolGen';
import { Home } from '../../src/ui/Home';
import { PlanResult } from '../../src/ui/PlanResult';
import { freshDb } from './helpers';
import { hasVerdictWord } from './verdict';

// The extended generator items are on by default (VITE_GENERATOR_EXTENDED is off only for false or 0). This file sets the flag on to be exact.
// The value false (off) is tested in protocolGenV2.test.ts, onboardingModel.test.ts and ui/updatePlanV2.test.tsx.
vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true');
beforeEach(() => vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true'));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const TODAY = '2026-11-08';
const inputs = (over: Partial<GeneratorInputs> = {}): GeneratorInputs => ({
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
  ...over,
});
const week8 = { surgeryDate: '2026-09-12', phaseClearance: 'yes', surgeonLimit: { kind: 'none' } } as const;
const draftFor = (over: Partial<GeneratorInputs> = {}) => {
  const i = inputs(over);
  const d = draftOf(generateProtocol(i, TODAY), 'create', i);
  if (d.kind !== 'plan') throw new Error('expected a plan');
  return d as Extract<PlanDraft, { kind: 'plan' }>;
};
const NOT_CHECKED = 'The app does not check this exercise.';
const NOT_CHECKED_GROUP = 'The app does not check these exercises.';
const FIVE_NAMES = ['Quadriceps set', 'Gluteal set', 'Ankle pump', 'Leg raise to the side', 'Leg raise to the back'];
const planList = () => screen.getByRole('list', { name: 'Exercises in your plan' });
const planRow = (name: string) => within(planList()).getByText(name).closest('li') as HTMLElement;
const HONEST: Record<string, string> = {
  'Leg raise to the back': 'The camera counts your lifts and measures the angle. The app does not judge how you do it.',
  'Leg raise to the side': 'The camera counts your lifts. It cannot measure the angle well.',
  'Ankle pump': 'The camera counts your pumps. It does not check how far you move.',
  'Quadriceps set': 'The camera cannot see this effort. The app times your hold.',
  'Gluteal set': 'The camera cannot see this effort. The app times your hold.',
};

describe('PlanResult, the five exercises and text lines', () => {
  it('lists the five as normal exercise rows with their own honest line, and no group "At home" (A-05)', () => {
    render(<PlanResult draft={draftFor()} onUse={vi.fn()} onBack={vi.fn()} />);
    for (const name of FIVE_NAMES) expect(within(planRow(name)).getByText(HONEST[name]!)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'At home' })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Exercises that the app does not check' })).toBeNull();
    expect(screen.queryAllByText(NOT_CHECKED_GROUP)).toHaveLength(0);
    expect(screen.queryAllByText(NOT_CHECKED)).toHaveLength(0);
  });

  it('shows the dose of each row, and for the ankle pump the line that the guideline gives no dose', () => {
    render(<PlanResult draft={draftFor()} onUse={vi.fn()} onBack={vi.fn()} />);
    for (const name of ['Quadriceps set', 'Gluteal set', 'Leg raise to the side', 'Leg raise to the back']) {
      const row = planRow(name);
      expect(row).toHaveClass('dose-row');
      expect(row.querySelector('.dose')).toHaveTextContent('2 sets of 10 to 15, then 3 sets as tolerated');
    }
    expect(planRow('Ankle pump').querySelector('.dose')).toHaveTextContent('How many: ask your care team');
  });

  it('shows no Start button and no count in the plan', () => {
    render(<PlanResult draft={draftFor()} onUse={vi.fn()} onBack={vi.fn()} />);
    expect(within(planList()).queryByRole('button')).toBeNull();
  });

  it('shows the week-4 line and the physiotherapy line as plain notes in weeks 0 to 6', () => {
    const draft = draftFor();
    render(<PlanResult draft={draft} onUse={vi.fn()} onBack={vi.fn()} />);
    // The line uses the week of the person (D2), so the text is the one of the entry.
    expect(screen.getAllByText(draft.why.find((e) => e.ruleId === 'ROM_CHECK')!.text).length).toBeGreaterThan(0);
    expect(screen.getAllByText(RULES.PT_VISITS.text).length).toBeGreaterThan(0);
  });

  it('shows the physiotherapy line and not the week-4 line from week 7', () => {
    render(<PlanResult draft={draftFor(week8)} onUse={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getAllByText(RULES.PT_VISITS.text).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(RULES.ROM_CHECK.text)).toHaveLength(0);
    expect(within(planList()).queryByText('Ankle pump')).toBeNull();
    expect(within(planList()).getByText('Quadriceps set')).toBeInTheDocument();
  });

  it('opens a Why this plan entry for each new rule with its sources, grade and the population', () => {
    const draft = draftFor();
    render(<PlanResult draft={draft} onUse={vi.fn()} onBack={vi.fn()} />);
    for (const id of ['HOME', 'ANKLE', 'ROM_CHECK', 'PT_VISITS'] as const) {
      const entry = screen.getByRole('heading', { name: RULES[id].title, level: 3 }).closest('li') as HTMLElement;
      expect(entry).toHaveTextContent(draft.why.find((e) => e.ruleId === id)!.text);
      expect(entry).toHaveTextContent('Expert opinion (OPINION)');
      for (const s of RULES[id].sourceIds) expect(entry).toHaveTextContent(`${s}:`);
    }
  });

  it('holds no verdict word and shows the label Not approved by a clinician', () => {
    const { container } = render(<PlanResult draft={draftFor(week8)} onUse={vi.fn()} onBack={vi.fn()} />);
    expect(hasVerdictWord(container.textContent ?? '')).toBeNull();
    expect(screen.getAllByText(/Not approved by a clinician/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not approved by a clinician. No clinician has reviewed this value.').length).toBeGreaterThan(0);
    expect(container.querySelector('[style]')).toBeNull();
  });
});

describe('PlanResult, the mini squat and the seated hold', () => {
  const gates = { walksWithoutCrutches: 'yes', legRaiseStraight: 'yes' } as const;

  it('shows the mini squat with the limit of 50 degrees, the source note with the source that disagrees, and says that the answers are not checked', () => {
    render(<PlanResult draft={draftFor({ ...week8, ...gates })} onUse={vi.fn()} onBack={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Exercises in your plan' });
    const item = within(list).getByText('Mini squat').closest('li') as HTMLElement;
    expect(item).toHaveTextContent('Limit 50 degrees');
    expect(item).toHaveTextContent('2 sets of 10 to 15, then 3 sets as tolerated');
    expect(item).not.toHaveTextContent('Knee-bend limit: ask your surgeon');
    // The source notes show as one group under the exercises, in the fixed order, with the source that disagrees on the same screen.
    const note = screen.getByLabelText('Source of: Mini squat depth');
    const lines = within(note).getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(lines[0]).toMatch(/^Source: Hysing-Dahl, 2024, N3/);
    expect(lines[1]).toBe('Evidence: OPINION (level 5)');
    expect(lines[2]).toMatch(/^Population: N3: MPFL reconstruction, weeks 0 to 6\./);
    expect(lines[3]).toBe('Not approved by a clinician. No clinician has reviewed this value.');
    expect(lines[4]).toMatch(/^Another source: Cincinnati Children's, 2015, P2 starts wall squats at 45 degrees/);
    expect(item.textContent).not.toMatch(/undefined|NaN/);
    const entry = screen.getByRole('heading', { name: RULES.SQUAT_DEPTH.title, level: 3 }).closest('li') as HTMLElement;
    expect(entry).toHaveTextContent('N3:');
    expect(entry).toHaveTextContent(RULES.SQUAT_DEPTH.conservative as string);
    const gate = screen.getByRole('heading', { name: RULES.SQUAT_GATE.title, level: 3 }).closest('li') as HTMLElement;
    expect(gate).toHaveTextContent('Reported by you. Not checked by the app.');
  });

  it('lowers the limit of the mini squat to the surgeon number and never raises it above 50', () => {
    const limitOf = (degrees: number) => {
      const { unmount } = render(<PlanResult draft={draftFor({ ...week8, ...gates, surgeonLimit: { kind: 'degrees', degrees } })} onUse={vi.fn()} onBack={vi.fn()} />);
      const item = within(screen.getByRole('list', { name: 'Exercises in your plan' })).getByText('Mini squat').closest('li') as HTMLElement;
      const text = item.textContent ?? '';
      unmount();
      return text;
    };
    expect(limitOf(80)).toContain('Limit 50 degrees');
    expect(limitOf(40)).toContain('Limit 40 degrees');
    expect(limitOf(40)).not.toContain('Limit 50 degrees');
  });

  it('lists the mini squat among the refused rules when an answer is no', () => {
    render(<PlanResult draft={draftFor({ ...week8, ...gates, walksWithoutCrutches: 'no' })} onUse={vi.fn()} onBack={vi.fn()} />);
    expect(within(screen.getByRole('list', { name: 'Exercises in your plan' })).queryByText('Mini squat')).toBeNull();
    const refused = screen.getByRole('list', { name: 'Not in your plan, and why' });
    expect(within(refused).getByRole('heading', { name: RULES.SQUAT_P2.title, level: 3 })).toBeInTheDocument();
  });

  it('shows the seated hold with the arc end of 40 degrees, a note about the hold time and the source note with the source that disagrees', () => {
    render(<PlanResult draft={draftFor({ ...week8, seatedHoldCleared: 'yes' })} onUse={vi.fn()} onBack={vi.fn()} />);
    const item = within(screen.getByRole('list', { name: 'Exercises in your plan' })).getByText('Seated knee extension hold').closest('li') as HTMLElement;
    expect(item).toHaveTextContent('Straightest knee angle: 40 degrees');
    expect(item).toHaveTextContent('Hold time: no number in the guideline. The seated hold cannot start until a hold time is set.');
    expect(item).not.toHaveTextContent('How many: ask your care team');
    expect(item).not.toHaveTextContent('Hold time: ask your care team');
    const note = screen.getByLabelText('Source of: Seated hold arc');
    // The dose line names the exercises that it applies to. The seated hold is not one of them.
    const dose = screen.getByLabelText('Source of: Sets and reps').closest('.source-note') as HTMLElement;
    expect(dose.querySelector('.source-value')).toHaveTextContent(/^Sets and reps: straight leg raise, quadriceps set, gluteal set, leg raise to the side, leg raise to the back: 2 sets of 10 to 15/);
    expect(dose.querySelector('.source-value')?.textContent).not.toMatch(/seated|heel slide|ankle pump/i);
    const lines = within(note).getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(lines[0]).toMatch(/^Source: Hospital for Special Surgery, 2024, P1/);
    expect(lines[1]).toBe('Evidence: OPINION (level 5)');
    expect(lines[2]).toMatch(/^Population: Adults after a first, isolated MPFL reconstruction/);
    expect(lines[3]).toBe('Not approved by a clinician. No clinician has reviewed this value.');
    expect(lines[4]).toBe("Another source: Cincinnati Children's, 2015, P2 gives 90 to 30 degrees, in a Note.");
    expect(note.closest('.source-note')).toHaveTextContent('Arc from 90 to 40 degrees of knee bend');
    const entry = screen.getByRole('heading', { name: RULES.HOLD_P2.title, level: 3 }).closest('li') as HTMLElement;
    expect(entry).toHaveTextContent('P1:');
    expect(entry).toHaveTextContent('P2:');
  });

  it('shows no seated hold without the clearance answer yes, and says that the app adds none', () => {
    render(<PlanResult draft={draftFor({ ...week8, seatedHoldCleared: 'no' })} onUse={vi.fn()} onBack={vi.fn()} />);
    expect(within(screen.getByRole('list', { name: 'Exercises in your plan' })).queryByText('Seated knee extension hold')).toBeNull();
    const refused = screen.getByRole('list', { name: 'Not in your plan, and why' });
    expect(within(refused).getByRole('heading', { name: RULES.HOLD.title, level: 3 }).closest('li')).toHaveTextContent('The app adds no seated knee hold');
  });
});

describe('Home, a plan with the five exercises', () => {
  const protocol = (over: Partial<GeneratorInputs> = {}): Protocol => {
    const r = generateProtocol(inputs(over), TODAY);
    if (r.kind !== 'protocol') throw new Error('expected a plan');
    return r.protocol;
  };
  const show = (p: Protocol) => {
    const phase = p.phases.find((x) => x.id === p.activePhase);
    return render(<Home protocol={p} phase={phase} activePhase={p.activePhase} db={freshDb()} now={() => new Date(`${TODAY}T10:00:00`)} onStart={vi.fn()} onLoadProtocol={vi.fn()} />);
  };

  it('shows the five as rows with a Start button, and the lines of the plan', () => {
    show(protocol());
    const row = screen.getByText('Quadriceps set', { selector: '.v3-plan-name' }).closest('li') as HTMLElement;
    expect(within(row).getByRole('button', { name: 'Start Quadriceps set' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Start Straight leg raise' })).toBeEnabled();
    expect(screen.getByText(RULES.PT_VISITS.text)).toBeInTheDocument();
    expect(screen.getByText(RULES.ROM_CHECK.text)).toBeInTheDocument();
  });

  it('shows no generated lines for a plan from a care team file', async () => {
    const { protocolText } = await import('./helpers');
    const { loadProtocol } = await import('../../src/lib/protocol');
    const r = loadProtocol(protocolText(), 'demo');
    if (!r.ok) throw new Error(r.error.message);
    show(r.protocol);
    expect(screen.queryByRole('list', { name: 'Exercises that the app does not check' })).toBeNull();
    expect(screen.queryByText(RULES.PT_VISITS.text)).toBeNull();
  });

  it('shows the reference for the knee bend once, as typical practice and not a limit, with the source lines, and no per-week table', () => {
    const { container } = show(protocol());
    expect(container.querySelectorAll('.range-reference')).toHaveLength(1);
    expect(container.querySelector('.range-reference')).toHaveTextContent('Your surgeon sets your limit.');
    expect(screen.getByLabelText('Source of: Knee bend limit by week')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/week 3 |week 4 |week 5 /);
  });

  it('shows the dose range in the exercise chips and "ask your care team" for the heel slide, and no undefined or NaN', () => {
    const { container } = show(protocol({ ...week8, walksWithoutCrutches: 'yes', legRaiseStraight: 'yes', seatedHoldCleared: 'yes' }));
    expect(screen.queryByRole('button', { name: 'Start Seated knee extension hold' })).toBeNull(); // v3: no Start for a hold that cannot start
    expect(screen.getAllByText('Hold time: no number in the guideline. The seated hold cannot start until a hold time is set.')).toHaveLength(1);
    expect(screen.queryByText(/Hold time missing/)).toBeNull();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/undefined|NaN/);
    expect(screen.getAllByText(/Straightest knee angle: 40 degrees/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Limit 50 degrees/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2 sets of 10 to 15, then 3 sets as tolerated/).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/How many: ask your care team/).length).toBeGreaterThan(0);
    // The plan has the answer "No limit", so the heel slide row says that the surgeon gave none.
    expect(screen.getAllByText(/No knee-bend limit was given by your surgeon/).length).toBeGreaterThan(0);
  });
});

describe('PlanResult with the flag off (VITE_GENERATOR_EXTENDED=false)', () => {
  it('shows no mini squat and no seated hold, and tells the person to ask the care team', () => {
    vi.stubEnv('VITE_GENERATOR_EXTENDED', 'false');
    render(<PlanResult draft={draftFor({ ...week8, walksWithoutCrutches: 'yes', legRaiseStraight: 'yes', seatedHoldCleared: 'yes' })} onUse={vi.fn()} onBack={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Exercises in your plan' });
    expect(within(list).queryByText('Mini squat')).toBeNull();
    expect(within(list).queryByText('Seated knee extension hold')).toBeNull();
    const refused = screen.getByRole('list', { name: 'Not in your plan, and why' });
    const entry = within(refused).getByRole('heading', { name: RULES.EXTENDED_OFF.title, level: 3 }).closest('li') as HTMLElement;
    expect(entry).toHaveTextContent('Ask your care team');
  });
});

// The heel slide row names the answer. "No limit" is not "I do not know".
describe('the knee-bend limit line of the heel slide (A3-10)', () => {
  const NONE_LINE = 'No knee-bend limit was given by your surgeon';
  const rowOf = (over: Partial<GeneratorInputs>) => {
    const { unmount } = render(<PlanResult draft={draftFor(over)} onUse={vi.fn()} onBack={vi.fn()} />);
    const row = within(screen.getByRole('list', { name: 'Exercises in your plan' })).getByText('Heel slide').closest('li') as HTMLElement;
    const text = row.textContent ?? '';
    unmount();
    return text;
  };

  it('says that no limit was given for the answer "No limit", and keeps "ask your surgeon" for "I do not know"', () => {
    const none = rowOf({ ...week8, surgeonLimit: { kind: 'none' } });
    expect(none).toContain(NONE_LINE);
    expect(none).not.toContain('Knee-bend limit: ask your surgeon');
    const unknown = rowOf({ ...week8, surgeonLimit: { kind: 'unknown' } });
    expect(unknown).toContain('Knee-bend limit: ask your surgeon');
    expect(unknown).not.toContain(NONE_LINE);
    const number = rowOf({ ...week8, surgeonLimit: { kind: 'degrees', degrees: 60 } });
    expect(number).toContain('Limit 60 degrees');
    expect(number).not.toContain(NONE_LINE);
  });
});
