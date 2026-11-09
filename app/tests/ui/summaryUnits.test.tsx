// F3 (R2-03): the unit agrees with the number in the Summary. "1 rep", "2 reps", "1 hold", "2 holds", "1 degree".
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Summary as PlainSummary } from '../../src/lib/exercises';
import { plural } from '../../src/lib/sets';
import { loadProtocol } from '../../src/lib/protocol';
import type { RunResult } from '../../src/ui/appState';
import { Summary } from '../../src/ui/Summary';
import { HEEL_SLIDE, freshDb, protocolText } from './helpers';

afterEach(cleanup);

const base: PlainSummary = {
  reps: 1,
  holds: null,
  peakFlexion: 1,
  topFlexion: null,
  topState: null,
  eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 },
};

function show(summary: PlainSummary, repsPerSet: number[]) {
  const r = loadProtocol(protocolText(), 'demo');
  if (!r.ok) throw new Error(r.error.message);
  const run: RunResult = {
    reason: 'stop',
    summary: {
      ...summary,
      sets: { prescription: { sets: 3, reps: 10 }, setIndex: repsPerSet.length - 1, repsInSet: 0, completedSets: 0, repsPerSet, phase: 'active', ended: true },
    },
  };
  render(<Summary run={run} exercise={HEEL_SLIDE} protocol={r.protocol} activePhase={1} redFlagBlocks={0} db={freshDb()} now={() => new Date('2026-03-04T10:00:00.000Z')} onDone={() => undefined} />);
}

describe('plural', () => {
  it('gives the singular for 1 only', () => {
    expect(plural(1, 'rep')).toBe('rep');
    expect(plural(0, 'rep')).toBe('reps');
    expect(plural(2, 'rep')).toBe('reps');
    expect(plural(null, 'degree')).toBe('degrees');
  });
});

describe('Summary units agree with the number (R2-03)', () => {
  it('writes "1 rep" and "2 reps" in the list of sets', () => {
    show(base, [10, 1, 2]);
    const list = screen.getByRole('list', { name: 'Reps in each set' });
    expect(list).toHaveTextContent('Set 1: 10 reps');
    expect(list).toHaveTextContent('Set 2: 1 rep');
    expect(list.textContent).not.toMatch(/1 reps/);
    expect(list).toHaveTextContent('Set 3: 2 reps');
  });

  it('writes "1 hold" and "2 holds" for the seated hold', () => {
    show({ ...base, reps: null, holds: 3 }, [1, 2]);
    const list = screen.getByRole('list', { name: 'Reps in each set' });
    expect(list).toHaveTextContent('Set 1: 1 hold');
    expect(list.textContent).not.toMatch(/1 holds/);
    expect(list).toHaveTextContent('Set 2: 2 holds');
  });

  it('writes the unit of the stat cards by the number', () => {
    show(base, [1]);
    expect(screen.getByText('Reps counted').nextElementSibling).toHaveTextContent(/^1 rep$/);
    expect(screen.getByText('Highest knee bend').nextElementSibling).toHaveTextContent(/^1 degree/);
    cleanup();
    show({ ...base, reps: null, holds: 1 }, [1]);
    expect(screen.getByText('Holds counted').nextElementSibling).toHaveTextContent(/^1 hold$/);
    cleanup();
    show({ ...base, reps: 0 }, [0]);
    expect(screen.getByText('Reps counted').nextElementSibling).toHaveTextContent(/^0 reps$/);
  });
});
