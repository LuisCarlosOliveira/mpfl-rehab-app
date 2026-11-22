import { flexion, kneeAngle, type Landmark } from '../src/lib/angle';
import { holdInitial, holdStep, repsInitial, repsStep, type RepsConfig } from '../src/lib/counters';
import { MARGIN_DEG, MARGIN_SOURCE, MARGIN_SOURCE_TEXT, classifyAgainstLimit } from '../src/lib/margin';
import { OneEuroFilter } from '../src/lib/oneEuro';
import { PAIN_FLOOR, evaluateSession } from '../src/lib/safety';
import { gauss, rng } from './helpers/leg';

const P = (x: number, y: number): Landmark => ({ x, y, visibility: 1 });
const angleOf = (h: Landmark, k: Landmark, a: Landmark, aspect = 1) => kneeAngle(h, k, a, aspect) as number;

describe('kneeAngle: hand derived cases', () => {
  it('gives 90 degrees for a corner and 180 for a straight line', () => {
    expect(angleOf(P(0.4, 0.5), P(0.4, 0.2), P(0.7, 0.2))).toBeCloseTo(90, 9);
    expect(angleOf(P(0.1, 0.1), P(0.2, 0.2), P(0.3, 0.3))).toBeCloseTo(180, 4);
  });

  it('gives 60 degrees for an equilateral triangle', () => {
    const h = 0.2;
    expect(angleOf(P(0.3, 0.3), P(0.3 + h, 0.3), P(0.3 + h / 2, 0.3 + (h * Math.sqrt(3)) / 2))).toBeCloseTo(60, 9);
  });
});

describe('kneeAngle: invariance rules', () => {
  const next = rng(7);
  const pts = () => [P(next(), next()), P(next(), next()), P(next(), next())] as const;
  const cases = Array.from({ length: 50 }, pts);

  it('does not change when the pose moves in the image', () => {
    for (const [h, k, a] of cases) {
      const base = angleOf(h, k, a, 1.7);
      const shift = (p: Landmark) => P(p.x + 0.123, p.y - 0.077);
      expect(angleOf(shift(h), shift(k), shift(a), 1.7)).toBeCloseTo(base, 9);
    }
  });

  it('does not change when the pose turns (square image)', () => {
    for (const [h, k, a] of cases) {
      const th = 0.9;
      const rot = (p: Landmark) => P(p.x * Math.cos(th) - p.y * Math.sin(th), p.x * Math.sin(th) + p.y * Math.cos(th));
      expect(angleOf(rot(h), rot(k), rot(a))).toBeCloseTo(angleOf(h, k, a), 9);
    }
  });

  it('does not change when the pose is mirrored', () => {
    for (const [h, k, a] of cases) {
      const mir = (p: Landmark) => P(1 - p.x, p.y);
      expect(angleOf(mir(h), mir(k), mir(a), 1.3)).toBeCloseTo(angleOf(h, k, a, 1.3), 9);
    }
  });

  it('does not depend on the order of hip and ankle', () => {
    for (const [h, k, a] of cases) expect(angleOf(a, k, h, 1.3)).toBeCloseTo(angleOf(h, k, a, 1.3), 9);
  });

  it('stays between 0 and 180, and flexion stays between 0 and 180', () => {
    for (const [h, k, a] of cases) {
      const ang = angleOf(h, k, a, 1.3);
      expect(ang).toBeGreaterThanOrEqual(0);
      expect(ang).toBeLessThanOrEqual(180);
      expect(flexion(ang)).toBeCloseTo(180 - ang, 12);
    }
  });

  it('returns null when any one landmark sits just under the visibility gate', () => {
    const [h, k, a] = cases[0]!;
    expect(kneeAngle({ ...h, visibility: 0.4999 }, k, a, 1)).toBeNull();
    expect(kneeAngle(h, { ...k, visibility: 0.4999 }, a, 1)).toBeNull();
    expect(kneeAngle(h, k, { ...a, visibility: 0.4999 }, 1)).toBeNull();
    expect(kneeAngle({ ...h, visibility: 0.5 }, k, a, 1)).not.toBeNull();
  });
});

describe('OneEuroFilter: properties', () => {
  it('keeps every output between the lowest and highest input seen so far', () => {
    const next = rng(11);
    for (let run = 0; run < 20; run++) {
      const f = new OneEuroFilter({ minCutoff: 0.5 + next() * 3, beta: next() * 0.5 });
      let t = 0;
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < 200; i++) {
        t += 5 + next() * 60;
        const x = gauss(next, 20) + 40;
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
        const y = f.filter(x, t);
        expect(y).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(y).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
  });

  it('moves toward a constant input and never overshoots it', () => {
    const f = new OneEuroFilter({ minCutoff: 1.5, beta: 0.02 });
    f.filter(0, 0);
    let prev = 0;
    for (let t = 33; t < 3000; t += 33) {
      const y = f.filter(50, t);
      expect(y).toBeGreaterThanOrEqual(prev);
      expect(y).toBeLessThanOrEqual(50 + 1e-9);
      prev = y;
    }
    expect(prev).toBeGreaterThan(49);
  });

  it('survives equal and backward timestamps with a finite output', () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0.1 });
    f.filter(10, 100);
    expect(Number.isFinite(f.filter(20, 100))).toBe(true);
    expect(Number.isFinite(f.filter(30, 50))).toBe(true);
  });
});

describe('repsStep: properties', () => {
  const cfg: RepsConfig = { enter: 36, baseline: 0, returnWithin: 15, target: 45, minStateMs: 300, maxFlexion: 50, margin: 9 };

  it('never counts when flexion stays below the entry threshold', () => {
    const next = rng(5);
    let state = repsInitial();
    for (let i = 0; i < 3000; i++) {
      const flex = next() * (cfg.enter - 0.01);
      state = repsStep(state, { flexion: flex, t: i * 33 }, cfg).state;
    }
    expect(state.reps).toBe(0);
  });

  it('never counts more reps than the number of separate visits above the entry threshold', () => {
    const next = rng(9);
    for (let run = 0; run < 20; run++) {
      let state = repsInitial();
      let visits = 0;
      let above = false;
      for (let i = 0; i < 1500; i++) {
        const flex = next() * 70;
        if (flex >= cfg.enter && !above) visits += 1;
        above = flex >= cfg.enter;
        state = repsStep(state, { flexion: flex, t: i * 33 }, cfg).state;
      }
      expect(state.reps).toBeLessThanOrEqual(visits);
    }
  });

  it('does not count a rep whose peak is above the ceiling plus the margin', () => {
    let state = repsInitial();
    let t = 0;
    const feed = (f: number, n: number) => {
      for (let i = 0; i < n; i++) state = repsStep(state, { flexion: f, t: (t += 33) }, cfg).state;
    };
    feed(0, 10);
    feed(40, 20);
    feed(50 + 9 + 0.5, 20);
    feed(40, 20);
    feed(0, 20);
    expect(state.reps).toBe(0);
  });

  it('does not count the time of a lost leg as time in a state', () => {
    let state = repsInitial();
    state = repsStep(state, { flexion: 40, t: 0 }, cfg).state;
    state = repsStep(state, { flexion: null, t: 100 }, cfg).state;
    state = repsStep(state, { flexion: 40, t: 5000 }, cfg).state;
    expect(state.phase).toBe('EXTENDED');
  });
});

describe('holdStep: properties', () => {
  const hcfg = { direction: 'at-least' as const, threshold: 60, minHoldMs: 1000 };

  it('does not credit hold time while the leg is not visible', () => {
    let state = holdInitial();
    state = holdStep(state, { flexion: 70, t: 0 }, hcfg).state;
    state = holdStep(state, { flexion: null, t: 100 }, hcfg).state;
    const out = holdStep(state, { flexion: 70, t: 5000 }, hcfg);
    expect(out.event).toBeNull();
    expect(out.state.holds).toBe(0);
  });

  it('counts one hold, not many, for one long hold', () => {
    let state = holdInitial();
    for (let t = 0; t <= 20000; t += 100) state = holdStep(state, { flexion: 70, t }, hcfg).state;
    expect(state.holds).toBe(1);
  });
});

describe('classifyAgainstLimit and the margin', () => {
  it('is cannot-tell exactly at the margin and on both sides inside it', () => {
    expect(classifyAgainstLimit(50 + MARGIN_DEG, 50, MARGIN_DEG)).toBe('cannot-tell');
    expect(classifyAgainstLimit(50 - MARGIN_DEG, 50, MARGIN_DEG)).toBe('cannot-tell');
    expect(classifyAgainstLimit(50 + MARGIN_DEG + 0.01, 50, MARGIN_DEG)).toBe('above');
    expect(classifyAgainstLimit(50 - MARGIN_DEG - 0.01, 50, MARGIN_DEG)).toBe('below');
  });

  it('does not claim a source that the knowledge base did not verify', () => {
    expect(MARGIN_SOURCE_TEXT[MARGIN_SOURCE]).not.toMatch(/still photos/i);
    expect(MARGIN_SOURCE_TEXT[MARGIN_SOURCE]).toMatch(/UNVERIFIED/);
  });
});

describe('evaluateSession: properties of the safety floor', () => {
  it('pauses for every pain value at or above the floor and for none below it', () => {
    for (let pain = 0; pain <= 10; pain++) {
      expect(evaluateSession({ pain, swelling: 'none' }).pause).toBe(pain >= PAIN_FLOOR);
    }
  });

  it('never lets a protocol threshold lift the floor', () => {
    for (let th = 0; th <= 10; th++) {
      for (let pain = 0; pain <= 10; pain++) {
        const paused = evaluateSession({ pain, swelling: 'none', painPauseThreshold: th }).pause;
        expect(paused).toBe(pain >= Math.min(th, PAIN_FLOOR));
      }
    }
  });

  it('pauses on a pain value that is not a whole number from 0 to 10', () => {
    for (const pain of [-1, 11, 3.5, NaN, Infinity]) expect(evaluateSession({ pain, swelling: 'none' }).pause).toBe(true);
  });
});
