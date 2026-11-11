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

  it('B2-02: a far hip is never accepted by steadiness alone, even after a no-pose gap', () => {
    const p = make();
    let t = 0;
    for (; t < 500; t += 33) expect(p.step(at(0.7), t).flexion).not.toBeNull();
    for (; t < 800; t += 33) p.step(null, t); // no pose
    for (; t < 3800; t += 33) expect(p.step(at(0.25), t).flexion).toBeNull(); // another person, steady for 3 s
    expect(p.step(at(0.7), t).flexion).not.toBeNull(); // the first hip returns
    expect(p.step(at(0.7), t + 33).flexion).not.toBeNull();
  });

  it('reads the frames as not seen when the hip jumps, with no gap', () => {
    const p = make();
    let t = 0;
    for (; t < 500; t += 33) expect(p.step(at(0.3), t).flexion).not.toBeNull();
    for (; t < 3000; t += 33) expect(p.step(at(0.7), t).flexion).toBeNull();
    expect(p.step(at(0.3), t).flexion).not.toBeNull();
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

// B4-02: the over-limit alert fires once for each time the knee goes above the limit. A gap of no pose of 500 ms or more ends that time.
describe('B4-02: the over-limit alert fires again after a gap of no pose', () => {
  const make = () => {
    const made = createPipeline(ex({ kind: 'heel-slide', targetFlexion: 60, maxFlexion: 90, returnWithinDeg: 10 } as never), 'right', 1, { baselineDeg: 5 });
    if (!made.ok) throw new Error('setup');
    return made.pipeline;
  };
  const run = (p: ReturnType<typeof make>, from: number, ms: number, deg: number | null, alerts: number[]) => {
    let t = from;
    for (; t < from + ms; t += 33) if (p.step(deg === null ? null : legLandmarks('right', deg), t).event === 'over-limit') alerts.push(t);
    return t;
  };
  it('two alerts for above the limit, 2 s of no pose, above the limit again', () => {
    const p = make();
    const alerts: number[] = [];
    let t = run(p, 0, 500, 5, alerts);
    t = run(p, t, 1500, 120, alerts);
    expect(alerts).toHaveLength(1); // not repeated while the knee stays above
    t = run(p, t, 2000, null, alerts);
    run(p, t, 1500, 120, alerts);
    expect(alerts).toHaveLength(2);
  });
  it('a gap shorter than 500 ms gives no second alert', () => {
    const p = make();
    const alerts: number[] = [];
    let t = run(p, 0, 500, 5, alerts);
    t = run(p, t, 1000, 120, alerts);
    t = run(p, t, 200, null, alerts);
    run(p, t, 1000, 120, alerts);
    expect(alerts).toHaveLength(1);
  });
});
