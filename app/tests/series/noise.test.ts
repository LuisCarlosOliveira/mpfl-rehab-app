import { describe, expect, it } from 'vitest';
import { MIN_VISIBILITY, flexion, kneeAngle, selectLeg, type Landmark } from '../../src/lib/angle';
import { makeSeries, type Series, type SeriesFrame } from '../helpers/landmarkSeries';
import { DROPOUT_VISIBILITY, KNEE_RMS_WORST_DEG, legIds, sigmaForKneeRms } from '../helpers/seriesNoise';

const kneeFlex = (f: SeriesFrame): number | null => {
  if (!f.landmarks) return null;
  const [h, k, a] = selectLeg(f.landmarks as Landmark[], 'left');
  return flexion(kneeAngle(h, k, a, 1));
};
const rms = (s: Series) => Math.sqrt(s.frames.reduce((sum, f) => sum + ((kneeFlex(f) as number) - f.truth) ** 2, 0) / s.frames.length);
const lm = (f: SeriesFrame, id: number): Landmark => {
  const p = f.landmarks?.[id];
  if (!p) throw new Error('no landmark');
  return p;
};

describe('noise model', () => {
  it('states the scale: 9 degrees RMS for a straight leg with segments of 0.2, that is 0.0128 per coordinate', () => {
    expect(KNEE_RMS_WORST_DEG).toBe(9);
    expect(sigmaForKneeRms(9)).toBeCloseTo(0.01282, 4);
    expect(sigmaForKneeRms(0)).toBe(0);
  });

  // 901 frames at 30 fps, six independent coordinates for each frame: the RMS has a relative standard error of about 2.4 percent.
  // A tolerance of 10 percent is four times that error, so the fixed seed passes with a wide margin and a wrong scale fails.
  it('gives about 9 degrees RMS of knee angle error for a straight leg (the worst case)', () => {
    const s = makeSeries({ pose: 'quad-set', durationS: 30, noise: { kneeRmsDeg: 9 }, seed: 1 });
    expect(s.frames).toHaveLength(901);
    expect(rms(s)).toBeGreaterThan(8.1);
    expect(rms(s)).toBeLessThan(9.9);
  });

  it('gives less error with a bent knee, never more than the stated worst case', () => {
    const s = makeSeries({ pose: 'heel-slide', reps: 4, noise: { kneeRmsDeg: 9 }, seed: 2 });
    expect(rms(s)).toBeGreaterThan(5.5);
    expect(rms(s)).toBeLessThan(9.9);
  });

  it('adds no noise without the option and keeps the truth values the same', () => {
    const clean = makeSeries({ pose: 'heel-slide', reps: 1 });
    const noisy = makeSeries({ pose: 'heel-slide', reps: 1, noise: { kneeRmsDeg: 9 }, seed: 3 });
    expect(noisy.truth).toEqual(clean.truth);
    expect(noisy.tMs).toEqual(clean.tMs);
    expect(noisy.frames[5]?.landmarks).not.toEqual(clean.frames[5]?.landmarks);
    expect(makeSeries({ pose: 'heel-slide', reps: 1, noise: { kneeRmsDeg: 0 }, seed: 3 }).frames).toEqual(clean.frames);
  });

  it('keeps every landmark inside the image and leaves hidden landmarks hidden', () => {
    const s = makeSeries({ pose: 'heel-slide', reps: 1, noise: { kneeRmsDeg: 30 }, seed: 4 });
    for (const f of s.frames) {
      for (const p of f.landmarks ?? []) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
      expect(lm(f, 24)).toMatchObject({ x: 0, y: 0, visibility: 0 });
    }
  });
});

describe('visibility dropouts', () => {
  const s = makeSeries({
    pose: 'heel-slide',
    reps: 2,
    dropouts: [{ ids: legIds('left'), startMs: 2000, durationMs: 1500 }],
  });

  it('sets the stated low visibility on the stated landmarks for the stated frames only', () => {
    expect(DROPOUT_VISIBILITY).toBeLessThan(MIN_VISIBILITY);
    let inside = 0;
    for (const f of s.frames) {
      const inWindow = f.tMs >= 2000 && f.tMs < 3500;
      if (inWindow) inside++;
      for (const id of legIds('left')) expect(lm(f, id).visibility).toBe(inWindow ? DROPOUT_VISIBILITY : 1);
    }
    expect(inside).toBeGreaterThanOrEqual(44);
    expect(inside).toBeLessThanOrEqual(46);
  });

  it('makes the app angle code return null in the window, and the truth stays', () => {
    for (const f of s.frames) expect(kneeFlex(f) === null).toBe(f.tMs >= 2000 && f.tMs < 3500);
    expect(s.truth.some((v, i) => v > 5 && (s.tMs[i] ?? 0) >= 2000)).toBe(true);
  });
});

describe('frame drops and frames with no person', () => {
  it('removes the frames of a stated range, with their truth values', () => {
    const full = makeSeries({ pose: 'heel-slide', reps: 1 });
    const s = makeSeries({ pose: 'heel-slide', reps: 1, frameDrops: { ranges: [{ startMs: 1000, durationMs: 500 }] } });
    expect(s.tMs.some((t) => t >= 1000 && t < 1500)).toBe(false);
    expect(s.frames).toHaveLength(full.frames.length - full.tMs.filter((t) => t >= 1000 && t < 1500).length);
    expect(s.truth).toHaveLength(s.tMs.length);
    expect(s.frames.find((f) => f.tMs === 1500)?.truth).toBe(full.frames.find((f) => f.tMs === 1500)?.truth);
  });

  it('drops about half of the frames with probability 0.5 and the same seed drops the same frames', () => {
    const full = makeSeries({ pose: 'quad-set', durationS: 20 });
    const a = makeSeries({ pose: 'quad-set', durationS: 20, frameDrops: { probability: 0.5 }, seed: 9 });
    const b = makeSeries({ pose: 'quad-set', durationS: 20, frameDrops: { probability: 0.5 }, seed: 9 });
    // 601 frames: the standard deviation of the kept count is 12, so 60 frames is five times that.
    expect(Math.abs(a.frames.length - full.frames.length / 2)).toBeLessThan(60);
    expect(a.tMs).toEqual(b.tMs);
  });

  it('gives null landmarks for a stated range of no person', () => {
    const s = makeSeries({ pose: 'heel-slide', reps: 1, noPerson: [{ startMs: 500, durationMs: 300 }] });
    for (const f of s.frames) expect(f.landmarks === null).toBe(f.tMs >= 500 && f.tMs < 800);
  });
});

describe('second person', () => {
  const s = makeSeries({ pose: 'heel-slide', reps: 1, secondPerson: true });

  it('adds 33 landmarks in every frame, far from the first person', () => {
    for (const f of s.frames) {
      const second = f.secondPerson;
      expect(second).toHaveLength(33);
      const hip1 = lm(f, 23);
      for (const id of legIds('left')) {
        const p = second?.[id];
        if (!p) throw new Error('missing');
        expect(Math.hypot(p.x - hip1.x, p.y - hip1.y)).toBeGreaterThan(0.3);
      }
    }
  });

  it('has no second person by default', () => {
    expect(makeSeries({ pose: 'heel-slide', reps: 1 }).frames[0]?.secondPerson).toBeUndefined();
  });
});

describe('seed', () => {
  const spec = { pose: 'heel-slide', reps: 2, noise: { kneeRmsDeg: 9 }, frameDrops: { probability: 0.1 }, secondPerson: true } as const;

  it('gives the same series twice with the same seed', () => {
    expect(makeSeries({ ...spec, seed: 7 })).toEqual(makeSeries({ ...spec, seed: 7 }));
  });

  it('gives another series with another seed', () => {
    expect(makeSeries({ ...spec, seed: 7 })).not.toEqual(makeSeries({ ...spec, seed: 8 }));
  });
});
