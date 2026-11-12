// Step D2: the Summary of the five new kinds. Whole degrees, the angle caption, no verdict and no target comparison.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlanExercise, Protocol } from '../../src/lib/protocol';
import { loadProtocol } from '../../src/lib/protocol';
import type { RunSummary } from '../../src/ui/appState';
import { Summary } from '../../src/ui/Summary';
import { freshDb, protocolText } from './helpers';
import { hasVerdictWord } from './verdict';

afterEach(cleanup);

const protocol: Protocol = (() => {
  const r = loadProtocol(protocolText(), 'demo');
  if (!r.ok) throw new Error(r.error.message);
  return r.protocol;
})();
const base: RunSummary = { reps: null, holds: null, peakFlexion: null, topFlexion: null, topState: null, eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 } };
const CAPTION = '(estimated angle, not a medical measurement)';

function show(exercise: PlanExercise, summary: RunSummary) {
  return render(
    <Summary run={{ reason: 'stop', summary }} exercise={exercise} protocol={protocol} activePhase={1} redFlagBlocks={0} db={freshDb()} now={() => new Date('2026-03-04T10:00:00.000Z')} onDone={vi.fn()} />,
  );
}
const QUAD: PlanExercise = { kind: 'quad-set', sets: 1, reps: 3, holdSeconds: 10, source: 'test' };

describe('Summary of a timer kind', () => {
  const timer: RunSummary = { ...base, holds: 3, engine: { holdList: [5, 8, 6], timedBy: 'person' } };

  it('shows the holds that the person timed, in seconds, and says that the camera did not check them', () => {
    const v = show(QUAD, timer);
    expect(screen.getByText('Holds timed by you')).toBeInTheDocument();
    expect(screen.getByText('Holds timed by you').nextElementSibling!.textContent).toMatch(/^3 holds$/);
    expect(screen.getByText('Holds: 5, 8, 6 seconds')).toBeInTheDocument();
    expect(screen.getByText('The camera did not check these holds.')).toBeInTheDocument();
    expect(screen.queryByText('Holds counted')).toBeNull();
    expect(hasVerdictWord(v.container.textContent ?? '')).toBeNull();
    expect(v.container.textContent).not.toMatch(/10 seconds|target/i); // no comparison with the target
  });

  it('shows no knee angle line for a timer kind', () => {
    show(QUAD, timer);
    expect(screen.queryByText(/Knee angle/)).toBeNull();
    expect(screen.queryByText(/estimated angle/)).toBeNull();
  });

  it('shows no knee angle when the report is missing, and no list for no holds', () => {
    show({ kind: 'gluteal-set', sets: 1, reps: 1, source: 'test' }, { ...base, holds: 0, engine: { holdList: [], timedBy: 'person' } });
    expect(screen.queryByText(/Knee angle/)).toBeNull();
    expect(screen.queryByText(/^Holds: /)).toBeNull();
    expect(screen.getByText('The camera did not check these holds.')).toBeInTheDocument();
  });
});

describe('Summary of a camera kind', () => {
  it('shows reps and the largest ankle range', () => {
    show({ kind: 'ankle-pump', sets: 1, reps: 10, source: 'test' }, { ...base, reps: 9, engine: { reportKey: 'ankle-range', reportValue: 52.4 } });
    expect(screen.getByText('Reps counted').nextElementSibling!.textContent).toContain('9');
    const dd = screen.getByText('Largest ankle range').nextElementSibling!;
    expect(dd.textContent).toContain('52 degrees');
    expect(dd.textContent).toContain(CAPTION);
    expect(screen.queryByText('Highest knee bend')).toBeNull();
    expect(screen.queryByText(/timed by you/)).toBeNull();
  });

  it.each(['leg-raise-side', 'leg-raise-back'] as const)('shows the largest lift angle of %s', (kind) => {
    const v = show({ kind, sets: 1, reps: 5, source: 'test' }, { ...base, reps: 5, engine: { reportKey: 'lift-angle', reportValue: 37.5 } });
    const dd = screen.getByText('Largest lift angle').nextElementSibling!;
    expect(dd.textContent).toContain('38 degrees');
    expect(dd.textContent).toContain(CAPTION);
    expect(hasVerdictWord(v.container.textContent ?? '')).toBeNull();
  });

  it('shows no angle line when no value was read', () => {
    show({ kind: 'ankle-pump', sets: 1, reps: 10, source: 'test' }, { ...base, reps: 0, engine: {} });
    expect(screen.queryByText('Largest ankle range')).toBeNull();
  });
});
