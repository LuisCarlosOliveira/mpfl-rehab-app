// B5-01, B5-05, B5-02: the anchor is provisional until a whole, plausible leg has been steady for 2 s. A close-up start cannot block the session.
// A confirmed anchor can lock the person out only with a plausible whole leg. A probe of two poses tells one person who moved from two people.
import { describe, expect, it } from 'vitest';
import { createPipeline } from '../src/lib/exercises';
import type { Landmark } from '../src/lib/angle';
import type { Exercise } from '../src/lib/protocol';
import { CLIP_FULL } from './fixtures/clipFull';
import { CLIP_SERIES } from './fixtures/clipSeries';
import { legLandmarks } from './helpers/leg';
import { rowFrame } from './helpers/clip';

const ex = (o: Partial<Exercise> & Pick<Exercise, 'kind'>): Exercise => ({ source: 'PROPOSAL', ...o });
const HS = ex({ kind: 'heel-slide', targetFlexion: 60, maxFlexion: 120, returnWithinDeg: 10 } as never);
const make = (exercise: Exercise = HS, aspect = 1) => {
  const made = createPipeline(exercise, 'right', aspect, { baselineDeg: 5 });
  if (!made.ok) throw new Error('setup');
  return made.pipeline;
};
const wide = (x: number, deg = 20) => legLandmarks('right', deg, { hip: { x, y: 0.3 }, length: 0.2 });
const shins = (x: number) => legLandmarks('right', 20, { hip: { x, y: 0.3 }, length: 0.01 }); // only a hip and a dot: not a plausible leg

describe('B5-01: a session that starts in a close-up counts from the wide frames', () => {
  it('a hip at x 0.93 with no plausible leg never anchors, so the wide frames read at once and reps count', () => {
    const p = make();
    let t = 0;
    for (; t < 3000; t += 33) p.step(shins(0.93), t);
    let reads = 0;
    for (let i = 0; i < 160; i++, t += 33) {
      const o = p.step(wide(0.5, i % 80 < 40 ? 5 : 95), t);
      if (o.flexion !== null) reads += 1;
      expect(o.lockedOut).toBeFalsy();
    }
    expect(reads).toBeGreaterThan(150);
    expect(p.summary().reps).toBeGreaterThan(0);
  });

  it('a whole leg steady for less than 2 s is provisional: the next steady whole leg elsewhere re-anchors by itself', () => {
    const p = make();
    let t = 0;
    for (; t < 1500; t += 33) p.step(wide(0.85), t);
    for (let i = 0; i < 60; i++, t += 33) expect(p.step(wide(0.5), t).flexion).not.toBeNull();
  });

  it('a whole leg steady for 2 s is confirmed: a far hip then reads as not seen, and lockedOut comes after 4 s', () => {
    const p = make();
    let t = 0;
    for (; t < 2500; t += 33) p.step(wide(0.85), t);
    let locked = false;
    const from = t;
    for (; t < from + 5000; t += 33) {
      const o = p.step(wide(0.5), t);
      expect(o.flexion).toBeNull();
      locked ||= o.lockedOut === true;
    }
    expect(locked).toBe(true);
  });
});

describe('B5-05: the lock needs a plausible whole leg', () => {
  it('a far hip with no plausible leg reads as not seen but never gives lockedOut', () => {
    const p = make();
    let t = 0;
    for (; t < 2500; t += 33) p.step(wide(0.5), t);
    for (const from = t; t < from + 8000; t += 33) {
      const o = p.step(shins(0.93), t);
      expect(o.flexion).toBeNull();
      expect(o.lockedOut).toBeFalsy();
    }
  });
});

describe('the saved clips, started in a close-up', () => {
  const run = (rows: never[], aspect: number, exercise: Exercise, side: 'left' | 'right', fromMs: number) => {
    const made = createPipeline(exercise, side, aspect, { baselineDeg: 5 });
    if (!made.ok) throw new Error('setup');
    let locked = false;
    let afterWide = 0;
    let readsLate = 0;
    rows.forEach((r, i) => {
      const f = rowFrame(r, i);
      if (f.tMs < fromMs) return;
      const o = made.pipeline.step(f.landmarks, f.tMs);
      locked ||= o.lockedOut === true;
      if (f.tMs >= fromMs + 4000) {
        afterWide += 1;
        if (o.flexion !== null) readsLate += 1;
      }
    });
    return { locked, share: afterWide === 0 ? 0 : readsLate / afterWide, reps: made.pipeline.summary().reps };
  };
  it('clip 02 from 5.4 s (the leg fills the picture): the wide frames read, no lockout', () => {
    const s = CLIP_FULL['02']!;
    const r = run(s.rows as never[], s.aspect, ex({ kind: 'heel-slide', targetFlexion: 60, returnWithinDeg: 10 } as never), 'left', 5400);
    expect(r.locked).toBe(false);
    expect(r.share).toBeGreaterThan(0.8);
  });
  it('clip 06 from 14 s: the wide frames read, no lockout', () => {
    const s = CLIP_SERIES['06']!;
    const r = run(s.rows as never[], s.aspect, ex({ kind: 'seated-extension-hold', holdSeconds: 5, minFlexion: 0, targetFlexion: 60 } as never), 'left', 14000);
    expect(r.locked).toBe(false);
  });
});

describe('B5-02: a probe of two poses', () => {
  const confirm = (p: ReturnType<typeof make>, x: number) => {
    let t = 0;
    for (; t < 2500; t += 33) p.step(wide(x), t);
    return t;
  };
  /** Runs to the first lockedOut frame. Returns the time and whether the probe was asked. */
  const toLock = (p: ReturnType<typeof make>, t0: number, frame: () => Landmark[]) => {
    let t = t0;
    let probe = 0;
    for (; t < t0 + 6000; t += 33) {
      const o = p.step(frame(), t);
      if (o.probe) probe += 1;
      if (o.lockedOut) break;
    }
    return { t: t + 33, probe };
  };

  it('one pose in view: the patient moved alone. The press re-anchors with no distance limit, and the other-person text never shows', () => {
    const p = make();
    let t = confirm(p, 0.7);
    const lock = toLock(p, t, () => wide(0.5));
    expect(lock.probe).toBe(1);
    t = lock.t;
    for (const end = t + 2000; t < end; t += 33) expect(p.step(wide(0.5), t, []).flexion).toBeNull(); // the probe: no second pose
    expect(p.step(wide(0.5), t).otherPerson).toBeFalsy(); // the probe ended
    p.followAgain();
    const o = p.step(wide(0.5), t + 33);
    expect(o.flexion).not.toBeNull();
    expect(o.otherPerson).toBeFalsy();
  });

  it('two poses: the readout follows the pose near the anchor and never the pose at x 0.3. After the probe the text shows, with no button', () => {
    const p = make();
    let t = confirm(p, 0.7);
    const lock = toLock(p, t, () => wide(0.3, 100));
    t = lock.t;
    for (const end = t + 2000; t < end; t += 33) {
      const o = p.step(wide(0.3, 100), t, [wide(0.7, 20)]);
      expect(o.flexion).not.toBeNull();
      expect(o.flexion!).toBeLessThan(40); // the patient (20 degrees), not the therapist (100 degrees)
    }
    const after = p.step(wide(0.3, 100), t);
    expect(after.flexion).toBeNull();
    expect(after.otherPerson).toBe(true);
    expect(after.lockedOut).toBeFalsy();
    p.followAgain();
    expect(p.step(wide(0.3, 100), t + 33).flexion).toBeNull(); // a press does nothing
  });

  it('without a probe (no pose count) a press far from the start hip still shows the other-person state (B4-01)', () => {
    const p = make();
    let t = confirm(p, 0.7);
    for (const end = t + 6000; t < end; t += 33) p.step(wide(0.4), t);
    p.followAgain();
    expect(p.step(wide(0.4), t).otherPerson).toBe(true);
  });
});
