import { describe, expect, it } from 'vitest';
import type { Landmark, Side } from '../src/lib/angle';
import { createFrontRecorder, frontKneeInward, MIN_FRONT_REPS, PAIR_TOLERANCE_MS } from '../src/lib/views';

const IDS: Record<Side, [number, number, number]> = { left: [23, 25, 27], right: [24, 26, 28] };

/** One front frame. The knee alignment is `alignmentDeg`. The image is not mirrored. */
function frontFrame(side: Side, alignmentDeg: number): Landmark[] {
  const m = side === 'right' ? 1 : -1;
  const tilt = (alignmentDeg / 2) * (Math.PI / 180);
  const hip = { x: 0.5, y: 0.3 };
  const knee = { x: hip.x + m * 0.2 * Math.sin(tilt), y: hip.y + 0.2 * Math.cos(tilt) };
  const ankle = { x: knee.x - m * 0.2 * Math.sin(tilt), y: knee.y + 0.2 * Math.cos(tilt) };
  const out: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const [h, k, a] = IDS[side];
  out[h] = { ...hip, visibility: 1 };
  out[k] = { ...knee, visibility: 1 };
  out[a] = { ...ankle, visibility: 1 };
  return out;
}

/** Frames every 100 ms from t0 to t1. The alignment rises from 0 to `peak` by the middle, so the change equals `peak`. */
function feed(rec: ReturnType<typeof createFrontRecorder>, side: Side, t0: number, t1: number, peak: number) {
  const n = Math.round((t1 - t0) / 100);
  for (let i = 0; i <= n; i++) rec.frame(frontFrame(side, (peak * Math.min(i, n / 2)) / (n / 2)), t0 + i * 100);
}

const recorder = (side: Side = 'right', limit?: number) => createFrontRecorder(side, () => 1, limit);

describe('createFrontRecorder', () => {
  it('records nothing and says so when no front frame arrived', () => {
    const rec = recorder();
    rec.rep(5000, 2000);
    expect(rec.finish()).toBeNull();
  });

  /** Feed `peaks.length` reps. Rep i lasts 2 s and ends at 5 s + 6 s * i. Its change is peaks[i]. */
  const reps = (rec: ReturnType<typeof recorder>, peaks: number[], side: Side = 'right') =>
    peaks.forEach((peak, i) => {
      const end = 5000 + 6000 * i;
      feed(rec, side, end - 2000, end, peak);
      rec.rep(end, 2000);
    });

  it('gives the median of the signed change of the reps, with the count of reps used', () => {
    const rec = recorder();
    reps(rec, [4, 12, 8]);
    const r = rec.finish();
    expect(r?.reps).toBe(3);
    expect(Math.abs((r?.changeDeg ?? 0) - 8)).toBeLessThan(0.5);
  });

  it('takes the mean of the two middle values for an even number of reps', () => {
    const rec = recorder();
    reps(rec, [4, 6, 10, 20]);
    expect(Math.abs((rec.finish()?.changeDeg ?? 0) - 8)).toBeLessThan(0.5);
  });

  it('does not move the median for one odd rep', () => {
    const clean = recorder();
    reps(clean, [9, 10, 11, 10, 9]);
    const odd = recorder();
    reps(odd, [9, 10, 11, 10, -57]);
    const [a, b] = [clean.finish()?.changeDeg ?? 0, odd.finish()?.changeDeg ?? 0];
    expect(Math.abs(a - 10)).toBeLessThan(0.5);
    expect(Math.abs(b - 9.5)).toBeLessThan(1); // the median of 9, 9, 10, 10, 11 moved by one rep position only
    expect(b).toBeGreaterThan(5);
  });

  it('ignores a frame with low visibility, even when its position is wild', () => {
    const rec = recorder();
    reps(rec, [8, 8]);
    feed(rec, 'right', 15000, 17000, 8);
    const wild = frontFrame('right', -80).map((p) => ({ ...p, visibility: 0.1 }));
    rec.frame(wild, 16050);
    rec.rep(17000, 2000);
    const r = rec.finish();
    expect(r?.reps).toBe(3);
    expect(Math.abs((r?.changeDeg ?? 0) - 8)).toBeLessThan(0.5);
  });

  it('gives a rep value that ignores a wild frame with low visibility', () => {
    const frames = Array.from({ length: 12 }, (_, i) => frontFrame('right', i === 0 ? 0 : 8));
    frames[6] = frontFrame('right', -80).map((p) => ({ ...p, visibility: 0.1 }));
    const r = frontKneeInward(frames, 'right', 1);
    expect(Math.abs((r?.changeDeg ?? 0) - 8)).toBeLessThan(0.5);
  });

  it('keeps the sign of a negative series', () => {
    const rec = recorder();
    reps(rec, [-6, -8, -10]);
    const change = rec.finish()?.changeDeg ?? 0;
    expect(change).toBeLessThan(0);
    expect(Math.abs(change + 8)).toBeLessThan(0.5);
  });

  it('stores no value when fewer reps than the minimum have enough frames, and still counts them', () => {
    const rec = recorder();
    reps(rec, [8, 8]);
    expect(MIN_FRONT_REPS).toBe(3);
    const r = rec.finish();
    expect(r).toEqual({ reps: 2 });
    expect(r).not.toHaveProperty('changeDeg');
  });

  it('counts only the reps with enough frames: a rep with 3 frames adds nothing', () => {
    const rec = recorder();
    reps(rec, [8, 8]);
    feed(rec, 'right', 16800, 17000, 8);
    rec.rep(17000, 2000);
    expect(rec.finish()).toEqual({ reps: 2 });
  });

  it('counts a rep with too few front frames as no value', () => {
    const rec = recorder();
    feed(rec, 'right', 4800, 5000, 8); // 3 frames only
    rec.rep(5000, 2000);
    const r = rec.finish();
    expect(r?.reps).toBe(0);
    expect(r?.changeDeg).toBeUndefined();
  });

  it('uses a window that is wider than the rep by the pair tolerance', () => {
    const rec = recorder();
    // The frames start 400 ms before the rep and end 400 ms after it: inside the tolerance.
    feed(rec, 'right', 2600, 5400, 8);
    rec.rep(5000, 2000);
    expect(rec.finish()?.reps).toBe(1);
    expect(PAIR_TOLERANCE_MS).toBeGreaterThanOrEqual(400);
  });

  it('ignores frames that are far outside the rep window', () => {
    const rec = recorder();
    feed(rec, 'right', 20000, 22000, 8);
    rec.rep(5000, 2000);
    expect(rec.finish()?.reps).toBe(0);
  });

  it('follows the leg that the person chose: the other leg gives no value', () => {
    const rec = recorder('left');
    feed(rec, 'right', 3000, 5000, 8); // only the right leg is visible
    rec.rep(5000, 2000);
    expect(rec.finish()?.reps).toBe(0);
    const own = recorder('left');
    feed(own, 'left', 3000, 5000, 8);
    own.rep(5000, 2000);
    expect(own.finish()?.reps).toBe(1);
  });

  it('skips a frame with no landmarks and keeps going', () => {
    const rec = recorder();
    feed(rec, 'right', 3000, 5000, 8);
    rec.frame(null, 4050);
    rec.rep(5000, 2000);
    expect(rec.finish()?.reps).toBe(1);
  });

  it('keeps the memory small: old frames go away', () => {
    const rec = recorder();
    for (let t = 0; t < 200_000; t += 100) rec.frame(frontFrame('right', 0), t);
    expect(rec.buffered()).toBeLessThan(1000);
  });

  it('finishes a rep that ended before the last frames arrived, and a rep at the end of the session', () => {
    const rec = recorder();
    feed(rec, 'right', 3000, 5600, 8);
    rec.rep(5000, 2000);
    expect(rec.finish()?.reps).toBe(1);
  });
});
