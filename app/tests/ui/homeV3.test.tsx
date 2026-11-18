// Home and Summary on the v3 frame: today's plan as a list (Done, Next, Later), one big Start button,
// the last session, the surgery date in words, and the Done step with the next exercise.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Summary as PlainSummary } from '../../src/lib/exercises';
import { loadProtocol, type Protocol } from '../../src/lib/protocol';
import { saveGeneratorInputs, saveSession } from '../../src/lib/storage';
import { generateProtocol, type GeneratorInputs } from '../../src/lib/protocolGen';
import { Home } from '../../src/ui/Home';
import { Summary } from '../../src/ui/Summary';
import { NextCard } from '../../src/ui/PlanSession';
import { HEEL_SLIDE, freshDb, protocolText, sessionInput } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const protocol = (): Protocol => {
  const r = loadProtocol(protocolText(), 'demo');
  if (!r.ok) throw new Error(r.error.message);
  return r.protocol;
};
const TODAY = '2026-03-04';
const at = (hour: string) => `${TODAY}T${hour}:00:00.000`;

function renderHome(db = freshDb(), props: Record<string, unknown> = {}) {
  const p = protocol();
  const handlers = { onStart: vi.fn(), onStartSession: vi.fn(), onLoadProtocol: vi.fn() };
  render(<Home protocol={p} phase={p.phases[0]} activePhase={1} db={db} now={() => new Date(at('10'))} {...handlers} {...props} />);
  return { db, ...handlers };
}

describe('Home, today', () => {
  it('has the heading Today and the plan as a list with one next row', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: "Today's plan" });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('aria-current', 'step');
    expect(rows[0]).toHaveTextContent('Heel slide');
    expect(rows[0]).toHaveTextContent('Next');
    expect(rows[1]).toHaveTextContent('Later');
  });

  it('has one big Start button for the whole plan, and a quiet Start for each single exercise', () => {
    const { onStartSession, onStart } = renderHome();
    const big = screen.getByRole('button', { name: "Start today's session" });
    expect(big).toHaveClass('btn-primary');
    expect(screen.getAllByRole('button', { name: /^Start/ }).filter((b) => b.classList.contains('btn-primary'))).toHaveLength(1);
    fireEvent.click(big);
    expect(onStartSession).toHaveBeenCalledWith(['heel-slide', 'straight-leg-raise']);
    fireEvent.click(screen.getByRole('button', { name: 'Start Straight leg raise' }));
    expect(onStart).toHaveBeenCalledWith('straight-leg-raise');
  });

  it('puts the big Start button in the sticky action region', () => {
    renderHome();
    expect(within(screen.getByRole('region', { name: 'Start' })).getByRole('button', { name: "Start today's session" })).toBeInTheDocument();
  });

  it('marks an exercise that is saved today as Done and continues with the next one', async () => {
    const db = freshDb();
    await saveSession(db, { ...sessionInput(), date: new Date(at('08')).toISOString(), exercise: 'heel-slide' });
    const { onStartSession } = renderHome(db);
    await waitFor(() => expect(within(screen.getByRole('list', { name: "Today's plan" })).getAllByRole('listitem')[0]).toHaveTextContent('Done'));
    const rows = within(screen.getByRole('list', { name: "Today's plan" })).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Heel slide');
    expect(rows[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Start Heel slide' })).toBeInTheDocument(); // a done exercise can run again
    fireEvent.click(screen.getByRole('button', { name: "Continue today's session" }));
    expect(onStartSession).toHaveBeenCalledWith(['straight-leg-raise']);
  });

  it('shows the last session in one line', async () => {
    const db = freshDb();
    await saveSession(db, { ...sessionInput(), date: new Date('2026-03-02T09:00:00').toISOString() });
    renderHome(db);
    expect(await screen.findByText(/^Last session: 2026-03-02, heel slide/)).toBeInTheDocument();
  });

  it('shows the surgery date in words when the app has it', async () => {
    const db = freshDb();
    const inputs: GeneratorInputs = {
      writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
      surgeryDate: '2026-02-11', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
    };
    await saveGeneratorInputs(db, inputs);
    const r = generateProtocol(inputs, TODAY);
    if (r.kind !== 'protocol') throw new Error('plan');
    const p = r.protocol;
    render(<Home protocol={p} phase={p.phases.find((x) => x.id === p.activePhase)} activePhase={p.activePhase} db={db} now={() => new Date(at('10'))} onStart={vi.fn()} onLoadProtocol={vi.fn()} />);
    expect(await screen.findByText(/11 February 2026, week 3/)).toBeInTheDocument();
  });

  it('shows no verdict word', () => {
    renderHome();
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });
});

const summary: PlainSummary = { reps: 4, holds: null, peakFlexion: 62.3, topFlexion: null, topState: null, eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 } };
const ITEMS = [
  { id: 'heel-slide', name: 'Heel slide', dose: '3 sets of 10 reps' },
  { id: 'quad-set', name: 'Quadriceps set', dose: '2 sets' },
  { id: 'ankle-pump', name: 'Ankle pump', dose: '2 sets' },
];

describe('Summary, the Done step of today\'s session', () => {
  const setup = (over: Record<string, unknown> = {}) => {
    const onDone = vi.fn();
    render(
      <Summary run={{ reason: 'stop', summary }} exercise={HEEL_SLIDE} protocol={protocol()} activePhase={1} redFlagBlocks={0} db={freshDb()} now={() => new Date(at('10'))}
        plan={{ index: 0, total: 3, items: ITEMS }} onDone={onDone} {...over} />,
    );
    return { onDone };
  };

  it('shows the progress bar and the plan with the next exercise marked', () => {
    setup();
    expect(screen.getByRole('progressbar', { name: 'Session progress' })).toHaveAttribute('aria-valuetext', 'Exercise 1 of 3');
    const rows = within(screen.getByRole('list', { name: "Today's plan" })).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Done');
    expect(rows[1]).toHaveAttribute('aria-current', 'step');
    expect(rows[1]).toHaveTextContent('Quadriceps set');
  });

  it('names the next exercise on the continue button area and keeps one click to go on', async () => {
    const { onDone } = setup();
    expect(screen.getByText('Next: Quadriceps set')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip the questions' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows no plan list for a single exercise', () => {
    render(<Summary run={{ reason: 'stop', summary }} exercise={HEEL_SLIDE} protocol={protocol()} activePhase={1} redFlagBlocks={0} db={freshDb()} now={() => new Date(at('10'))} onDone={vi.fn()} />);
    expect(screen.queryByRole('list', { name: "Today's plan" })).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows no verdict word', () => {
    setup();
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });
});

describe('Next card with the plan', () => {
  it('shows the session progress bar and the plan list', () => {
    render(<NextCard name="Quadriceps set" index={1} total={3} items={ITEMS} onStart={vi.fn()} onSkip={vi.fn()} onStop={vi.fn()} />);
    expect(screen.getByRole('progressbar', { name: 'Session progress' })).toHaveAttribute('aria-valuetext', 'Exercise 2 of 3');
    expect(within(screen.getByRole('list', { name: "Today's plan" })).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
  });
});
