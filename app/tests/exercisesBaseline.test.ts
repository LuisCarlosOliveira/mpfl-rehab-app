import { createPipeline } from '../src/lib/exercises';
import type { Exercise } from '../src/lib/protocol';
import { legLandmarks } from './helpers/leg';

const HEEL: Exercise = { kind: 'heel-slide', sets: 3, reps: 10, targetFlexion: 60, maxFlexion: 90, returnWithinDeg: 18, minRepSeconds: 2, source: 'test' };

function made(ex: Exercise = HEEL, baselineDeg?: number | null) {
  const r = createPipeline(ex, 'left', 1, { baselineDeg });
  if (!r.ok) throw new Error('pipeline');
  return r.pipeline;
}
function rep(p: ReturnType<typeof made>, t0: number): number {
  let t = t0;
  const go = (f: number) => {
    p.step(legLandmarks('left', f), t);
    t += 100;
  };
  for (let i = 0; i < 10; i++) go(0);
  for (let i = 1; i <= 10; i++) go(7 * i);
  for (let i = 0; i < 10; i++) go(70);
  for (let i = 9; i >= 0; i--) go(7 * i);
  for (let i = 0; i < 20; i++) go(0);
  return t;
}

describe('Pipeline.setBaseline', () => {
  it('counts no rep before a baseline and says why', () => {
    const p = made(HEEL, null);
    rep(p, 0);
    expect(p.summary().reps).toBe(0);
    expect(p.summary().countBlock).toBe('no-baseline');
  });

  it('counts reps from the moment a baseline is set, and clears the block', () => {
    const p = made(HEEL, null);
    const t = rep(p, 0);
    p.setBaseline(5);
    expect(p.summary().countBlock).toBeNull();
    rep(p, t);
    expect(p.summary().reps).toBe(1);
  });

  it('keeps the angle and the peak while it waits for a baseline', () => {
    const p = made(HEEL, null);
    rep(p, 0);
    expect(p.summary().peakFlexion).toBeGreaterThan(60);
  });

  it('does nothing for a pipeline that has no rep counter', () => {
    const r = createPipeline({ kind: 'straight-leg-raise', sets: 1, reps: 5, source: 'test' } as Exercise, 'left', 1);
    if (!r.ok) throw new Error('pipeline');
    expect(() => r.pipeline.setBaseline(3)).not.toThrow();
  });

  it('does not give a protocol return value that is missing: it still counts no rep', () => {
    const p = made({ ...HEEL, returnWithinDeg: undefined }, null);
    p.setBaseline(5);
    rep(p, 0);
    expect(p.summary().reps).toBe(0);
    expect(p.summary().countBlock).toBe('no-return-value');
  });
});
