// Generator version 2 on the screens: home exercises, the two text lines, the mini squat and the seated hold.
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { draftOf, type PlanDraft } from '../../src/lib/planView';
import type { Protocol } from '../../src/lib/protocol';
import { generateProtocol, RULES, type GeneratorInputs } from '../../src/lib/protocolGen';
import { Home } from '../../src/ui/Home';
import { PlanResult } from '../../src/ui/PlanResult';
import { freshDb } from './helpers';
import { hasVerdictWord } from './verdict';

// The extended generator items are behind VITE_GENERATOR_EXTENDED (off by default). This file tests them with the flag on.
// The default (off) is tested in protocolGenV2.test.ts, onboardingModel.test.ts and ui/updatePlanV2.test.tsx.
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

describe('PlanResult, home exercises and text lines', () => {
  it('lists the home exercises that the camera does not count, each with its dose and the note', () => {
    render(<PlanResult draft={draftFor()} onUse={vi.fn()} onBack={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Exercises that the app does not check' });
    for (const name of ['Quadriceps set', 'Gluteal set', 'Ankle pump', 'Leg raise to the side', 'Leg raise to the back']) {
      expect(within(list).getByText(name)).toBeInTheDocument();
    }
    expect(within(list).getAllByText('2 sets of 10')).toHaveLength(4);
    expect(within(list).getByText('How many: ask your care team')).toBeInTheDocument();
    expect(within(list).getAllByText(NOT_CHECKED)).toHaveLength(5);
  });

  it('shows the home exercises as dose rows like the plan, with the same text and no cards', () => {
    const { container } = render(<PlanResult draft={draftFor()} onUse={vi.fn()} onBack={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Exercises that the app does not check' });
    expect(list).toHaveClass('dose-list');
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row).toHaveClass('dose-row');
      expect(row).not.toHaveClass('card');
      expect(row.querySelector('.dose-name')).not.toBeNull();
      expect(row.querySelector('.dose')).not.toBeNull();
      expect(within(row).getByText(NOT_CHECKED)).toHaveClass('dose-note');
    }
    expect(within(rows[0]!).getByText('Quadriceps set')).toBeInTheDocument();
    expect(container.querySelectorAll('.plan-exercises .card')).toHaveLength(0);
  });

  it('shows no Start button and no count for a home exercise', () => {
    render(<PlanResult draft={draftFor()} onUse={vi.fn()} onBack={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Exercises that the app does not check' });
    expect(within(list).queryByRole('button')).toBeNull();
  });

  it('shows the week-4 line and the physiotherapy line as plain notes in weeks 0 to 6', () => {
    render(<PlanResult draft={draftFor()} onUse={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getAllByText(RULES.ROM_CHECK.text).length).toBeGreaterThan(0);
    expect(screen.getAllByText(RULES.PT_VISITS.text).length).toBeGreaterThan(0);
  });

  it('shows the physiotherapy line and not the week-4 line from week 7', () => {
    render(<PlanResult draft={draftFor(week8)} onUse={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getAllByText(RULES.PT_VISITS.text).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(RULES.ROM_CHECK.text)).toHaveLength(0);
    const list = screen.getByRole('list', { name: 'Exercises that the app does not check' });
    expect(within(list).queryByText('Ankle pump')).toBeNull();
  });

  it('opens a Why this plan entry for each new rule with its sources, grade and the population', () => {
    render(<PlanResult draft={draftFor()} onUse={vi.fn()} onBack={vi.fn()} />);
    for (const id of ['HOME', 'ANKLE', 'ROM_CHECK', 'PT_VISITS'] as const) {
      const entry = screen.getByRole('heading', { name: RULES[id].title, level: 3 }).closest('li') as HTMLElement;
      expect(entry).toHaveTextContent(RULES[id].text);
      expect(entry).toHaveTextContent('Expert opinion (OPINION)');
      for (const s of RULES[id].sourceIds) expect(entry).toHaveTextContent(`${s}:`);
    }
  });

  it('holds no verdict word and shows the label Not approved by a clinician', () => {
    const { container } = render(<PlanResult draft={draftFor(week8)} onUse={vi.fn()} onBack={vi.fn()} />);
    expect(hasVerdictWord(container.textContent ?? '')).toBeNull();
    expect(screen.getByText(/Not approved by a clinician/)).toBeInTheDocument();
    expect(container.querySelector('[style]')).toBeNull();
  });
});

describe('PlanResult, the mini squat and the seated hold', () => {
  const gates = { walksWithoutCrutches: 'yes', legRaiseStraight: 'yes' } as const;

  it('shows the mini squat with the limit of 50 degrees and says that the answers are not checked', () => {
    render(<PlanResult draft={draftFor({ ...week8, ...gates })} onUse={vi.fn()} onBack={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Exercises in your plan' });
    const item = within(list).getByText('Mini squat').closest('li') as HTMLElement;
    expect(item).toHaveTextContent('Limit 50 degrees');
    expect(item).toHaveTextContent('2 sets of 10 reps');
    const entry = screen.getByRole('heading', { name: RULES.SQUAT_DEPTH.title, level: 3 }).closest('li') as HTMLElement;
    expect(entry).toHaveTextContent('N3:');
    expect(entry).toHaveTextContent(RULES.SQUAT_DEPTH.conservative as string);
    const gate = screen.getByRole('heading', { name: RULES.SQUAT_GATE.title, level: 3 }).closest('li') as HTMLElement;
    expect(gate).toHaveTextContent('Reported by you. Not checked by the app.');
  });

  it('lists the mini squat among the refused rules when an answer is no', () => {
    render(<PlanResult draft={draftFor({ ...week8, ...gates, walksWithoutCrutches: 'no' })} onUse={vi.fn()} onBack={vi.fn()} />);
    expect(within(screen.getByRole('list', { name: 'Exercises in your plan' })).queryByText('Mini squat')).toBeNull();
    const refused = screen.getByRole('list', { name: 'Not in your plan, and why' });
    expect(within(refused).getByRole('heading', { name: RULES.SQUAT_P2.title, level: 3 })).toBeInTheDocument();
  });

  it('shows the seated hold with the arc end of 40 degrees, a note about the hold time and no Start button', () => {
    render(<PlanResult draft={draftFor({ ...week8, seatedHoldCleared: 'yes' })} onUse={vi.fn()} onBack={vi.fn()} />);
    const item = within(screen.getByRole('list', { name: 'Exercises in your plan' })).getByText('Seated knee extension hold').closest('li') as HTMLElement;
    expect(item).toHaveTextContent('Straightest knee angle: 40 degrees');
    expect(item).toHaveTextContent('Hold time: ask your care team');
    const entry = screen.getByRole('heading', { name: RULES.HOLD_P2.title, level: 3 }).closest('li') as HTMLElement;
    expect(entry).toHaveTextContent('P1:');
    expect(entry).toHaveTextContent('P2:');
  });
});

describe('Home, a plan with home exercises', () => {
  const protocol = (over: Partial<GeneratorInputs> = {}): Protocol => {
    const r = generateProtocol(inputs(over), TODAY);
    if (r.kind !== 'protocol') throw new Error('expected a plan');
    return r.protocol;
  };
  const show = (p: Protocol) => {
    const phase = p.phases.find((x) => x.id === p.activePhase);
    return render(<Home protocol={p} phase={phase} activePhase={p.activePhase} db={freshDb()} now={() => new Date(`${TODAY}T10:00:00`)} onStart={vi.fn()} onLoadProtocol={vi.fn()} />);
  };

  it('shows the home exercises as a list with no Start button, and the lines of the plan', () => {
    show(protocol());
    const list = screen.getByRole('list', { name: 'Exercises that the app does not check' });
    expect(within(list).getByText('Quadriceps set')).toBeInTheDocument();
    expect(within(list).queryByRole('button')).toBeNull();
    expect(screen.getByRole('button', { name: 'Start Straight leg raise' })).toBeEnabled();
    expect(screen.getByText(RULES.PT_VISITS.text)).toBeInTheDocument();
    expect(screen.getByText(RULES.ROM_CHECK.text)).toBeInTheDocument();
  });

  it('shows no list and no generated lines for a plan from a care team file', async () => {
    const { protocolText } = await import('./helpers');
    const { loadProtocol } = await import('../../src/lib/protocol');
    const r = loadProtocol(protocolText(), 'demo');
    if (!r.ok) throw new Error(r.error.message);
    show(r.protocol);
    expect(screen.queryByRole('list', { name: 'Exercises that the app does not check' })).toBeNull();
    expect(screen.queryByText(RULES.PT_VISITS.text)).toBeNull();
  });

  it('shows a seated hold with no hold time as not ready and keeps Start closed', () => {
    show(protocol({ ...week8, seatedHoldCleared: 'yes' }));
    expect(screen.getByRole('button', { name: 'Start Seated knee extension hold' })).toBeDisabled();
    expect(screen.getByText(/Hold time missing/)).toBeInTheDocument();
  });
});

describe('PlanResult with the flag off (the default)', () => {
  it('shows no mini squat and no seated hold, and tells the person to ask the care team', () => {
    vi.unstubAllEnvs();
    render(<PlanResult draft={draftFor({ ...week8, walksWithoutCrutches: 'yes', legRaiseStraight: 'yes', seatedHoldCleared: 'yes' })} onUse={vi.fn()} onBack={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Exercises in your plan' });
    expect(within(list).queryByText('Mini squat')).toBeNull();
    expect(within(list).queryByText('Seated knee extension hold')).toBeNull();
    const refused = screen.getByRole('list', { name: 'Not in your plan, and why' });
    const entry = within(refused).getByRole('heading', { name: RULES.EXTENDED_OFF.title, level: 3 }).closest('li') as HTMLElement;
    expect(entry).toHaveTextContent('Ask your care team');
  });
});
