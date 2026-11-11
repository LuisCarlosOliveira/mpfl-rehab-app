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

describe('B-03: a second person takes over the hip', () => {
  const make = () => {
    const made = createPipeline(ex({ kind: 'heel-slide', targetFlexion: 90, maxFlexion: 120, returnWithinDeg: 10 } as never), 'right', 1, { baselineDeg: 5 });
    if (!made.ok) throw new Error('setup');
    return made.pipeline;
  };
  const at = (x: number) => legLandmarks('right', 40, { hip: { x, y: 0.3 } });

  it('reads the frames as not seen when the hip jumps, until the hip is steady', () => {
    const p = make();
    let t = 0;
    for (; t < 500; t += 33) expect(p.step(at(0.3), t).flexion).not.toBeNull();
    expect(p.step(at(0.7), t).flexion).toBeNull(); // another person: the hip jumps 0.4 of the width
    t += 33;
    expect(p.step(at(0.7), t).flexion).toBeNull(); // still not steady
    for (t += 33; t < 3000; t += 33) p.step(at(0.7), t);
    expect(p.step(at(0.7), t).flexion).not.toBeNull(); // steady again
  });

  it('keeps a slow hip drift in view', () => {
    const p = make();
    let x = 0.3;
    for (let t = 0; t < 3000; t += 33) {
      x += 0.003;
      expect(p.step(at(x), t).flexion).not.toBeNull();
    }
  });
});
