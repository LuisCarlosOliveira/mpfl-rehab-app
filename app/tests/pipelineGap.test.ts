import { describe, expect, it } from 'vitest';
import { createPipeline } from '../src/lib/exercises';
import type { Exercise } from '../src/lib/protocol';
import { legLandmarks } from './helpers/leg';

const ex = (o: Partial<Exercise> & Pick<Exercise, 'kind'>): Exercise => ({ source: 'PROPOSAL', ...o });

describe('a gap with no leg in view', () => {
  it('does not count a seated hold across 5 s of null frames', () => {
    const made = createPipeline(ex({ kind: 'seated-extension-hold', holdSeconds: 5, minFlexion: 40, targetFlexion: 60 }), 'right', 1, {});
    if (!made.ok) throw new Error('setup');
    const p = made.pipeline;
    let t = 0;
    for (; t <= 1000; t += 33) p.step(legLandmarks('right', 50), t);
    for (; t <= 6000; t += 33) p.step(null, t);
    p.step(legLandmarks('right', 50), t);
    expect(p.summary().holds).toBe(0);
  });

  it('restarts the rep timer across a gap (threshold needs the time again)', () => {
    const made = createPipeline(ex({ kind: 'heel-slide', targetFlexion: 90, maxFlexion: 120, returnWithinDeg: 10 } as never), 'right', 1, { baselineDeg: 5 });
    if (!made.ok) throw new Error('setup');
    const p = made.pipeline;
    let t = 0;
    const run = (deg: number | null, ms: number) => {
      const end = t + ms;
      do {
        p.step(deg === null ? null : legLandmarks('right', deg), t);
        t += 33;
      } while (t < end);
    };
    run(5, 400);
    run(95, 1);
    run(null, 400);
    run(95, 1);
    run(5, 1);
    run(null, 400);
    run(5, 1);
    expect(p.summary().reps).toBe(0);
  });
});
