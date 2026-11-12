import { describe, expect, it } from 'vitest';
import { flexion, kneeAngle, selectLeg, type Landmark } from '../../src/lib/angle';
import { legLandmarks } from '../helpers/leg';
import { makeSeries, type Series, type SeriesFrame } from '../helpers/landmarkSeries';

const nth = <T,>(a: T[], i: number): T => {
  const v = a[i];
  if (v === undefined) throw new Error('no item ' + i);
  return v;
};
const at = (l: Landmark[], id: number): Landmark => {
  const p = l[id];
  if (!p) throw new Error('no landmark ' + id);
  return p;
};
const knee = (f: SeriesFrame, aspect = 1, side: 'left' | 'right' = 'left') => {
  const [h, k, a] = selectLeg(f.landmarks as Landmark[], side);
  return flexion(kneeAngle(h, k, a, aspect));
};
const ankleAngle = (f: SeriesFrame, aspect = 1) => {
  const l = f.landmarks as Landmark[];
  return kneeAngle(at(l, 25), at(l, 27), at(l, 31), aspect); // knee, ankle, foot index: the angle sits at the ankle
};
/** Elevation of the segment from landmark a to landmark b above the horizontal, in degrees (pixel space). */
const elevation = (l: Landmark[], a: number, b: number, aspect: number) =>
  (Math.atan2(-(at(l, b).y - at(l, a).y), Math.abs(at(l, b).x - at(l, a).x) * aspect) * 180) / Math.PI;
/** Angle of the segment a to b against the vertical, positive when b is behind (smaller x). */
const fromVertical = (l: Landmark[], a: number, b: number, aspect: number) =>
  (Math.atan2(-(at(l, b).x - at(l, a).x) * aspect, at(l, b).y - at(l, a).y) * 180) / Math.PI;
/** Count of upward crossings of the middle level: one for each lift or cycle. */
const crossings = (s: Series) => {
  const mid = (s.rest + s.peak) / 2;
  const up = s.rest < s.peak;
  let n = 0;
  for (let i = 1; i < s.truth.length; i++) {
    const a = nth(s.truth, i - 1) - mid;
    const b = nth(s.truth, i) - mid;
    if (up ? a < 0 && b >= 0 : a > 0 && b <= 0) n++;
  }
  return n;
};
const maxErr = (s: Series, read: (f: SeriesFrame) => number | null) =>
  Math.max(...s.frames.map((f) => Math.abs((read(f) ?? Infinity) - f.truth)));

describe('timing', () => {
  it('uses 30 fps by default and 10 fps on request', () => {
    const a = makeSeries({ pose: 'heel-slide', reps: 1 });
    const b = makeSeries({ pose: 'heel-slide', reps: 1, fps: 10 });
    expect(nth(a.tMs, 1) - nth(a.tMs, 0)).toBeGreaterThanOrEqual(33);
    expect(nth(a.tMs, 1) - nth(a.tMs, 0)).toBeLessThanOrEqual(34);
    expect(a.fps).toBe(30);
    expect(b.tMs.slice(0, 4)).toEqual([0, 100, 200, 300]);
    expect(Math.abs(a.tMs.length / b.tMs.length - 3)).toBeLessThan(0.1);
  });

  it('gives 33 landmarks with x, y, z and visibility, and a truth value for every frame', () => {
    const s = makeSeries({ pose: 'ankle-pump', cycles: 2 });
    expect(s.truth).toHaveLength(s.frames.length);
    for (const f of s.frames) {
      expect(f.landmarks).toHaveLength(33);
      for (const p of f.landmarks as Landmark[]) {
        expect(Object.keys(p).sort()).toEqual(['visibility', 'x', 'y', 'z']);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('shows the foot landmarks of the chosen leg, heel 29 and foot index 31 on the left, 30 and 32 on the right', () => {
    const l = makeSeries({ pose: 'quad-set', durationS: 1 }).frames[0]?.landmarks as Landmark[];
    const r = makeSeries({ pose: 'quad-set', durationS: 1, side: 'right' }).frames[0]?.landmarks as Landmark[];
    for (const id of [23, 25, 27, 29, 31]) expect(at(l, id).visibility).toBe(1);
    for (const id of [24, 26, 28, 30, 32]) expect(at(l, id).visibility).toBe(0);
    for (const id of [24, 26, 28, 30, 32]) expect(at(r, id).visibility).toBe(1);
  });
});

describe('quad set: supine, leg straight and still', () => {
  it('has a true knee flexion of 0 in every frame and no movement of the landmarks', () => {
    const s = makeSeries({ pose: 'quad-set', durationS: 5 });
    expect(Math.max(...s.truth.map(Math.abs))).toBe(0);
    expect(nth(s.frames, 0).landmarks).toEqual(nth(s.frames, s.frames.length - 1).landmarks);
    expect(maxErr(s, (f) => knee(f))).toBeLessThan(1e-3);
  });

  it('can add a very small movement that reaches the stated size', () => {
    const s = makeSeries({ pose: 'quad-set', durationS: 5, smallMovementDeg: 2 });
    expect(Math.min(...s.truth)).toBeCloseTo(0, 6);
    expect(Math.max(...s.truth)).toBeGreaterThan(1.99);
    expect(Math.max(...s.truth)).toBeLessThanOrEqual(2);
    expect(maxErr(s, (f) => knee(f))).toBeLessThan(1e-3);
  });
});

describe('ankle pump', () => {
  const s = makeSeries({ pose: 'ankle-pump', cycles: 4, periodS: 2, lowDeg: 75, highDeg: 125 });

  it('swings between the two stated ankle angles', () => {
    expect(Math.min(...s.truth)).toBe(75);
    expect(Math.max(...s.truth)).toBeGreaterThan(124.9);
    expect(Math.max(...s.truth)).toBeLessThanOrEqual(125);
    expect(s.rest).toBe(75);
    expect(s.peak).toBe(125);
  });

  it('makes the stated number of cycles with the stated period', () => {
    expect(crossings(s)).toBe(4);
    expect(s.lifts).toHaveLength(4);
    for (let i = 1; i < s.lifts.length; i++) expect(nth(s.lifts, i).startMs - nth(s.lifts, i - 1).startMs).toBe(2000);
    // The frames follow the stated period: the truth repeats after one period.
    const dt = nth(s.tMs, 1) - nth(s.tMs, 0);
    const lag = Math.round(2000 / dt);
    const i0 = Math.round(nth(s.lifts, 0).startMs / dt) + 3;
    expect(Math.abs(nth(s.truth, i0) - nth(s.truth, i0 + lag))).toBeLessThan(1.5);
  });

  it('puts the true angle at the knee, ankle and foot index triplet', () => {
    expect(maxErr(s, (f) => ankleAngle(f))).toBeLessThan(1e-3);
  });
});

describe('leg raise to the side, front-on', () => {
  const aspect = 16 / 9;
  const s = makeSeries({ pose: 'leg-raise-side', reps: 3, restValue: 2, peakValue: 35, aspect });

  it('rises from rest to the peak and back, for each lift', () => {
    expect(nth(s.truth, 0)).toBe(2);
    expect(nth(s.truth, s.truth.length - 1)).toBe(2);
    expect(Math.max(...s.truth)).toBe(35);
    expect(crossings(s)).toBe(3);
    expect(s.lifts).toHaveLength(3);
  });

  it('puts the segment from hip to ankle at the true angle against the horizontal', () => {
    expect(maxErr(s, (f) => elevation(f.landmarks as Landmark[], 23, 27, aspect))).toBeLessThan(1e-3);
  });

  it('shows the lower leg by default and hides it on request', () => {
    const shown = nth(s.frames, 0).landmarks as Landmark[];
    expect([24, 26, 28].every((i) => at(shown, i).visibility === 1)).toBe(true);
    const h = makeSeries({ pose: 'leg-raise-side', reps: 1, lowerLegHidden: true }).frames[0]?.landmarks as Landmark[];
    expect([24, 26, 28, 30, 32].every((i) => at(h, i).visibility === 0)).toBe(true);
  });
});

describe('leg raise to the back, side view standing', () => {
  const s = makeSeries({ pose: 'leg-raise-back', reps: 5, peakValue: 28 });

  it('goes back to the peak and returns, for each lift', () => {
    expect(nth(s.truth, 0)).toBe(0);
    expect(Math.max(...s.truth)).toBe(28);
    expect(Math.min(...s.truth)).toBe(0);
    expect(crossings(s)).toBe(5);
    expect(s.lifts).toHaveLength(5);
  });

  it('puts the thigh at the true angle against the vertical, going back', () => {
    expect(maxErr(s, (f) => fromVertical(f.landmarks as Landmark[], 23, 25, 1))).toBeLessThan(1e-3);
    const top = s.frames.reduce((a, b) => (b.truth > a.truth ? b : a));
    expect(at(top.landmarks as Landmark[], 25).x).toBeLessThan(at(top.landmarks as Landmark[], 23).x);
  });
});

describe('the four exercises that already exist', () => {
  it('heel slide: the app angle code reads the true knee flexion within 1 degree', () => {
    const s = makeSeries({ pose: 'heel-slide', reps: 2, restValue: 5, peakValue: 95 });
    expect(Math.max(...s.truth)).toBe(95);
    expect(Math.min(...s.truth)).toBe(5);
    expect(crossings(s)).toBe(2);
    expect(maxErr(s, (f) => knee(f))).toBeLessThan(1);
  });

  it('heel slide: the leg has the geometry of the helper legLandmarks (hip, knee, ankle)', () => {
    const s = makeSeries({ pose: 'heel-slide', reps: 1, restValue: 5, peakValue: 95, hip: { x: 0.2, y: 0.7 } });
    for (const f of s.frames.filter((_, i) => i % 7 === 0)) {
      const ref = legLandmarks('left', f.truth, { hip: { x: 0.2, y: 0.7 }, thighAngle: (-f.truth * Math.PI) / 360 });
      for (const id of [23, 25, 27]) {
        expect(at(f.landmarks as Landmark[], id).x).toBeCloseTo(at(ref, id).x, 9);
        expect(at(f.landmarks as Landmark[], id).y).toBeCloseTo(at(ref, id).y, 9);
      }
    }
  });

  it('heel slide with the right leg, mirrored, still reads the same angle', () => {
    const s = makeSeries({ pose: 'heel-slide', reps: 1, side: 'right', mirror: true, hip: { x: 0.7, y: 0.6 } });
    expect(maxErr(s, (f) => knee(f, 1, 'right'))).toBeLessThan(1);
  });

  it('straight leg raise: the truth is the height of the ankle above the hip, with a straight knee', () => {
    const s = makeSeries({ pose: 'straight-leg-raise', reps: 2, peakValue: 0.25 });
    expect(Math.max(...s.truth)).toBe(0.25);
    expect(nth(s.truth, 0)).toBe(0);
    expect(crossings(s)).toBe(2);
    for (const f of s.frames) {
      const l = f.landmarks as Landmark[];
      expect(at(l, 23).y - at(l, 27).y).toBeCloseTo(f.truth, 9);
      expect(knee(f)).toBeLessThan(1e-3);
    }
  });

  it('seated hold: the true knee flexion goes from 90 to the hold angle and holds', () => {
    const s = makeSeries({ pose: 'seated-extension-hold', reps: 1, peakValue: 60, holdMs: 3000 });
    expect(nth(s.truth, 0)).toBe(90);
    expect(Math.min(...s.truth)).toBe(60);
    expect(s.truth.filter((v) => v === 60).length * (nth(s.tMs, 1) - nth(s.tMs, 0))).toBeGreaterThanOrEqual(2900);
    expect(maxErr(s, (f) => knee(f))).toBeLessThan(1);
  });

  it('mini squat: the true knee flexion rises to the peak and returns, the ankle stays on the floor', () => {
    const s = makeSeries({ pose: 'mini-squat', reps: 3, peakValue: 40 });
    expect(Math.max(...s.truth)).toBe(40);
    expect(crossings(s)).toBe(3);
    expect(maxErr(s, (f) => knee(f))).toBeLessThan(1);
    const ys = s.frames.map((f) => at(f.landmarks as Landmark[], 27).y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1e-9);
  });
});
