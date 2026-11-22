import { describe, expect, it } from 'vitest';
import { pick, selectFoot, type Landmark, type Side } from '../../src/lib/angle';
import { jointAngle, normalisedDistance, readMeasure, segmentAngle } from '../../src/lib/monitor/measure';
import { makeSeries, type SeriesSpec } from '../helpers/landmarkSeries';
import { compareToTruth } from '../helpers/compareToTruth';

const lm = (f: { landmarks: unknown }) => f.landmarks as Landmark[];

/** The measure of every frame of a series (null for a frame with no person). */
const measureAll = (spec: SeriesSpec, read: (pose: Landmark[], side: Side, aspect: number) => number | null) => {
  const s = makeSeries(spec);
  const side = spec.side ?? 'left';
  const aspect = spec.aspect ?? 1;
  return { s, values: s.frames.map((f) => (f.landmarks ? read(lm(f), side, aspect) : null)) };
};

const ANKLE = { kind: 'joint-angle', joint: 'knee-ankle-footIndex' } as const;
const KNEE = { kind: 'joint-angle', joint: 'hip-knee-ankle' } as const;
const SIDE = { kind: 'segment-angle', from: 'hip', to: 'ankle', against: 'horizontal' } as const;
const BACK = { kind: 'segment-angle', from: 'hip', to: 'knee', against: 'vertical' } as const;

describe('landmark ids 29 to 32', () => {
  it('reads the heel and the foot index of each leg', () => {
    const s = makeSeries({ pose: 'ankle-pump', cycles: 1 });
    const l = lm(s.frames[3] as never);
    expect(pick(l, 'left', 'heel')).toBe(l[29]);
    expect(pick(l, 'left', 'footIndex')).toBe(l[31]);
    expect(pick(l, 'right', 'heel')).toBe(l[30]);
    expect(pick(l, 'right', 'footIndex')).toBe(l[32]);
    expect(selectFoot(l, 'left')).toEqual([l[25], l[27], l[31]]);
    expect(selectFoot(l, 'right')).toEqual([l[26], l[28], l[32]]);
  });
  it('throws when the list is too short', () => {
    expect(() => pick([{ x: 0, y: 0 }], 'left', 'footIndex')).toThrow();
  });
});

describe('measures equal the truth of every frame (no noise, within 1e-3)', () => {
  const near = (spec: SeriesSpec, measure: Parameters<typeof readMeasure>[0], truthOf: (v: number) => number) => {
    const { s, values } = measureAll(spec, (p, side, a) => readMeasure(measure, p, side, a));
    const c = compareToTruth(values.map((v) => (v === null ? null : truthOf(v))), s.truth, 1e-3);
    expect(c.compared).toBe(s.frames.length);
    expect(c.outside, `max error ${c.max}`).toBe(0);
  };
  const same = (v: number) => v;
  const flexionOf = (v: number) => 180 - v;

  it('joint angle at the ankle (ankle pump), also with aspect 16/9, a mirror and the right leg', () => {
    near({ pose: 'ankle-pump', cycles: 2 }, ANKLE, same);
    near({ pose: 'ankle-pump', cycles: 2, aspect: 16 / 9 }, ANKLE, same);
    near({ pose: 'ankle-pump', cycles: 2, mirror: true, side: 'right', hip: { x: 0.7, y: 0.6 } }, ANKLE, same);
  });
  it('joint angle at the knee (heel slide, quad set small movement)', () => {
    near({ pose: 'heel-slide', reps: 2 }, KNEE, flexionOf);
    near({ pose: 'heel-slide', reps: 1, aspect: 16 / 9, side: 'right' }, KNEE, flexionOf);
    near({ pose: 'quad-set', smallMovementDeg: 6 }, KNEE, flexionOf);
  });
  it('segment angle against the horizontal (leg raise to the side), also with a mirror and a hidden lower leg', () => {
    near({ pose: 'leg-raise-side', reps: 3 }, SIDE, same);
    near({ pose: 'leg-raise-side', reps: 2, aspect: 16 / 9, mirror: true, hip: { x: 0.7, y: 0.6 } }, SIDE, same);
    near({ pose: 'leg-raise-side', reps: 2, lowerLegHidden: true, side: 'right' }, SIDE, same);
  });
  it('segment angle against the vertical (leg raise to the back)', () => {
    near({ pose: 'leg-raise-back', reps: 3 }, BACK, same);
    near({ pose: 'leg-raise-back', reps: 2, aspect: 16 / 9, mirror: true, side: 'right' }, BACK, same);
  });
  it('distance along an axis over the leg length: the ankle offset of the back raise is sin of the angle', () => {
    const d = { kind: 'distance', from: 'hip', to: 'ankle', axis: 'x', normalisedBy: 'leg-length' } as const;
    const { s, values } = measureAll({ pose: 'leg-raise-back', reps: 2 }, (p, side, a) => readMeasure(d, p, side, a));
    const c = compareToTruth(values, s.truth.map((t) => Math.sin((t * Math.PI) / 180)), 1e-6);
    expect(c.outside, `max error ${c.max}`).toBe(0);
  });
});

describe('a hidden landmark gives null', () => {
  it('for each measure', () => {
    const drop = (ids: number[]) => makeSeries({ pose: 'leg-raise-side', reps: 1, dropouts: [{ ids, startMs: 0, durationMs: 100000 }] });
    const l = lm(drop([27]).frames[5] as never);
    expect(readMeasure(SIDE, l, 'left', 1)).toBeNull();
    expect(readMeasure(KNEE, l, 'left', 1)).toBeNull();
    const foot = makeSeries({ pose: 'ankle-pump', cycles: 1, dropouts: [{ ids: [31], startMs: 0, durationMs: 100000 }] });
    expect(readMeasure(ANKLE, lm(foot.frames[5] as never), 'left', 1)).toBeNull();
    expect(readMeasure({ kind: 'none' }, lm(foot.frames[5] as never), 'left', 1)).toBeNull();
  });
  it('and a zero-length segment gives null, not NaN', () => {
    const p = { x: 0.5, y: 0.5, visibility: 1 };
    expect(segmentAngle(p, p, 'vertical', 1)).toBeNull();
    expect(jointAngle(p, p, p, 1)).toBeNull();
    expect(normalisedDistance(p, p, 'x', 0, 1)).toBeNull();
  });
  it('a segment angle is never -0 or NaN', () => {
    const o = { x: 0.5, y: 0.5, visibility: 1 };
    const at = (dx: number, dy: number) => ({ x: 0.5 + dx, y: 0.5 + dy, visibility: 1 });
    expect(segmentAngle(o, at(0, 0.2), 'vertical', 1)).toBe(0);
    expect(Object.is(segmentAngle(o, at(0, 0.2), 'vertical', 1), -0)).toBe(false);
    expect(segmentAngle(o, at(0, -0.2), 'vertical', 1)).toBeCloseTo(180, 9);
    expect(segmentAngle(o, at(0.2, 0), 'vertical', 1)).toBeCloseTo(90, 9);
    expect(segmentAngle(o, at(0.2, 0), 'horizontal', 1)).toBe(0);
    expect(segmentAngle(o, at(-0.2, 0), 'horizontal', 1)).toBe(0);
  });
  it('the angle against the horizontal is signed: the end point above the start is plus (image up), below is minus', () => {
    const o = { x: 0.5, y: 0.5, visibility: 1 };
    const at = (dx: number, dy: number) => ({ x: 0.5 + dx, y: 0.5 + dy, visibility: 1 });
    expect(segmentAngle(o, at(0.2, -0.2), 'horizontal', 1)).toBeCloseTo(45, 9);
    expect(segmentAngle(o, at(-0.2, -0.2), 'horizontal', 1)).toBeCloseTo(45, 9); // a mirror image gives the same value
    expect(segmentAngle(o, at(0.2, 0.2), 'horizontal', 1)).toBeCloseTo(-45, 9);
    expect(segmentAngle(o, at(0, 0.2), 'horizontal', 1)).toBeCloseTo(-90, 9); // a standing leg reads -90, never raised
    expect(segmentAngle(o, at(0, -0.2), 'horizontal', 1)).toBeCloseTo(90, 9);
  });
});

describe('with noise the measure stays within the stated RMS', () => {
  // The noise model (helpers/seriesNoise.ts) is 9 degrees RMS of knee angle for a straight leg: 0.0128 of the image on each coordinate.
  // The RMS of a measure is about sigma times a geometry factor over the segment length. The bounds below are the result of the
  // formula (see measure.ts) with 25 percent room. They are NOT clinical values.
  const rmsOf = (spec: SeriesSpec, measure: Parameters<typeof readMeasure>[0]) => {
    const { s, values } = measureAll({ ...spec, noise: { kneeRmsDeg: 9 }, seed: 7 }, (p, side, a) => readMeasure(measure, p, side, a));
    return compareToTruth(values, s.truth).rms;
  };
  it('segment hip to ankle (0.4 long): about 2.6 degrees', () => {
    const r = rmsOf({ pose: 'leg-raise-side', reps: 6, fps: 30 }, SIDE);
    expect(r).toBeGreaterThan(1.9);
    expect(r).toBeLessThan(3.3);
  });
  it('segment hip to knee (0.2 long): about 5.2 degrees', () => {
    const r = rmsOf({ pose: 'leg-raise-back', reps: 6 }, BACK);
    expect(r).toBeGreaterThan(3.9);
    expect(r).toBeLessThan(6.6);
  });
  it('angle at the ankle (foot of 0.08): more than the knee, because the foot is short', () => {
    const r = rmsOf({ pose: 'ankle-pump', cycles: 10 }, ANKLE);
    expect(r).toBeGreaterThan(8);
    expect(r).toBeLessThan(16);
  });
});
