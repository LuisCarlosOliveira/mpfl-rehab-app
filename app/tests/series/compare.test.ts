import { describe, expect, it } from 'vitest';
import { compareToTruth } from '../helpers/compareToTruth';

describe('compareToTruth', () => {
  it('gives max error, RMS error and the count outside the tolerance', () => {
    const r = compareToTruth([1, 2, 5, 4], [1, 4, 5, 0], 2);
    expect(r.max).toBe(4);
    expect(r.rms).toBeCloseTo(Math.sqrt((0 + 4 + 0 + 16) / 4), 12);
    expect(r.outside).toBe(1); // only the error 4 is more than 2. The error 2 is inside.
    expect(r.compared).toBe(4);
    expect(r.missing).toBe(0);
  });

  it('counts a null measurement as missing and not as an error', () => {
    const r = compareToTruth([null, 3, null], [0, 2, 0], 0.5);
    expect(r.compared).toBe(1);
    expect(r.missing).toBe(2);
    expect(r.max).toBe(1);
    expect(r.outside).toBe(1);
  });

  it('gives zeros for a perfect match and NaN for nothing to compare', () => {
    expect(compareToTruth([1, 2], [1, 2], 0)).toMatchObject({ max: 0, rms: 0, outside: 0 });
    expect(compareToTruth([null], [1], 1).rms).toBeNaN();
  });

  it('throws when the lengths differ', () => {
    expect(() => compareToTruth([1], [1, 2])).toThrow(/length/);
  });

  it('reads the knee angle of a noisy series against its truth', async () => {
    const { makeSeries } = await import('../helpers/landmarkSeries');
    const { flexion, kneeAngle, selectLeg } = await import('../../src/lib/angle');
    const s = makeSeries({ pose: 'heel-slide', reps: 1 });
    const measured = s.frames.map((f) => {
      if (!f.landmarks) return null;
      const [h, k, a] = selectLeg(f.landmarks, 'left');
      return flexion(kneeAngle(h, k, a, 1));
    });
    const r = compareToTruth(measured, s.truth, 1);
    expect(r.max).toBeLessThan(1);
    expect(r.outside).toBe(0);
  });
});
