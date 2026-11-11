// B3-01, B3-02, B3-03: the hip anchor. The anchor follows the person slowly. A far hip reads as not seen.
// After 4 s of that with the whole leg visible, the pipeline reports `lockedOut`. Only `followAgain()` (a press) re-anchors.
import { describe, expect, it } from 'vitest';
import { createPipeline } from '../src/lib/exercises';
import type { Exercise } from '../src/lib/protocol';
import { CLIP_FULL } from './fixtures/clipFull';
import { CLIP_SERIES } from './fixtures/clipSeries';
import { legLandmarks } from './helpers/leg';
import { rowFrame } from './helpers/clip';

const ex = (o: Partial<Exercise> & Pick<Exercise, 'kind'>): Exercise => ({ source: 'PROPOSAL', ...o });
const HS = ex({ kind: 'heel-slide', targetFlexion: 90, maxFlexion: 120, returnWithinDeg: 10 } as never);
const make = () => {
  const made = createPipeline(HS, 'right', 1, { baselineDeg: 5 });
  if (!made.ok) throw new Error('setup');
  return made.pipeline;
};
const at = (x: number, deg = 40) => legLandmarks('right', deg, { hip: { x, y: 0.3 } });

describe('B3-01: the anchor follows the person, and a press starts again', () => {
  it('accepts a person who moves from x 0.7 to x 0.5 slowly, and the count continues', () => {
    const p = make();
    let t = 0;
    let x = 0.7;
    const deg = (i: number) => (i % 80 < 40 ? 5 : 95); // reps on top of a slow move
    for (let i = 0; x > 0.5; i++, t += 33) {
      x -= 0.001;
      expect(p.step(at(x, deg(i)), t).flexion, `frame ${i}`).not.toBeNull();
    }
    expect(p.summary().reps).toBeGreaterThan(0);
  });

  // B4-01: the pose model follows ONE person. After a jump the new hip can be another person. A press that would anchor
  // far from the start hip does not move the anchor. The frames stay not seen until the person starts again from Setup.
  it('a jump to x 0.5 reads as not seen and lockedOut after 4 s. A press far from the start hip shows the other-person state, with no numbers', () => {
    const p = make();
    let t = 0;
    for (; t < 2500; t += 33) p.step(at(0.7), t);
    const jump = t;
    let lockedAt: number | null = null;
    for (; t < jump + 6000; t += 33) {
      const o = p.step(at(0.5), t);
      expect(o.flexion).toBeNull();
      if (o.lockedOut && lockedAt === null) lockedAt = t - jump;
    }
    expect(lockedAt).not.toBeNull();
    expect(lockedAt!).toBeGreaterThan(4000);
    expect(lockedAt!).toBeLessThan(4200);
    p.followAgain();
    const o = p.step(at(0.5), t);
    expect(o.flexion).toBeNull();
    expect(o.otherPerson).toBe(true);
    expect(o.lockedOut).toBeFalsy(); // the button has nothing more to do
    for (t += 33; t < 12000; t += 33) expect(p.step(at(0.5), t).flexion).toBeNull();
    expect(p.step(at(0.7), t).flexion).toBeNull(); // also when the first place is seen again: the person starts again from Setup
  });

  it('two people, one pose: the patient at x 0.7, then the therapist at x 0.3. The numbers never follow the therapist, also after a press', () => {
    const p = make();
    let t = 0;
    for (; t < 2500; t += 33) expect(p.step(at(0.7), t).flexion).not.toBeNull();
    for (let u = t + 8000; t < u; t += 33) expect(p.step(at(0.3, 100), t).flexion).toBeNull();
    p.followAgain();
    for (let u = t + 3000; t < u; t += 33) expect(p.step(at(0.3, 100), t).flexion).toBeNull();
  });

  it('a press re-anchors when the hip is back near the start hip (the anchor had drifted away)', () => {
    const p = make();
    let t = 0;
    for (; t < 2500; t += 33) p.step(at(0.5), t);
    for (let x = 0.5; x < 0.62; x += 0.0025, t += 33) p.step(at(x), t); // a slow drift, accepted, the anchor follows
    const jump = t;
    for (; t < jump + 5000; t += 33) expect(p.step(at(0.5), t).flexion).toBeNull(); // 0.12 from the anchor
    p.followAgain();
    const o = p.step(at(0.5), t);
    expect(o.flexion).not.toBeNull();
    expect(o.otherPerson).toBeFalsy();
  });

  it('is not lockedOut before 4 s, and never without a press when the leg is not whole in view', () => {
    const p = make();
    let t = 0;
    for (; t < 2500; t += 33) p.step(at(0.7), t);
    for (let u = t + 3900; t < u; t += 33) expect(p.step(at(0.5), t).lockedOut).toBeFalsy();
    const q = make();
    for (t = 0; t < 2500; t += 33) q.step(at(0.7), t);
    for (let u = t + 8000; t < u; t += 33) expect(q.step(null, t).lockedOut).toBeFalsy(); // no pose is the plain cue
  });

  it('followAgain with no hip seen does nothing', () => {
    const p = make();
    p.followAgain();
    expect(p.step(at(0.5), 0).flexion).not.toBeNull();
  });
});

describe('B3-02: a short bad pose does not drag the anchor', () => {
  it('15 frames of a hip that moves 0.04 each frame away, then back: the first hip reads again at once', () => {
    const p = make();
    let t = 0;
    for (; t < 2500; t += 33) expect(p.step(at(0.6), t).flexion).not.toBeNull();
    for (let i = 1; i <= 15; i++, t += 33) p.step(at(0.6 - 0.04 * i), t);
    expect(p.step(at(0.6), t).flexion).not.toBeNull();
  });
});

describe('the control clips keep their rep counts (B3-01)', () => {
  const run = (rows: never[], aspect: number, exercise: Exercise, side: 'left' | 'right') => {
    const made = createPipeline(exercise, side, aspect, { baselineDeg: 5 });
    if (!made.ok) throw new Error('setup');
    rows.forEach((r, i) => {
      const f = rowFrame(r, i);
      made.pipeline.step(f.landmarks, f.tMs);
    });
    return made.pipeline.summary().reps;
  };
  const slr = ex({ kind: 'straight-leg-raise' });
  const squat = ex({ kind: 'mini-squat', targetFlexion: 60, returnWithinDeg: 10 } as never);
  it('clip 03 right: 2, clip 04 left: 1 (leg raise)', () => {
    expect(run(CLIP_SERIES['03']!.rows as never[], CLIP_SERIES['03']!.aspect, slr, 'right')).toBe(2);
    expect(run(CLIP_SERIES['04']!.rows as never[], CLIP_SERIES['04']!.aspect, slr, 'left')).toBe(1);
  });
  it('clip 05 left: 2 (mini squat), clip 02 left: 2 (heel slide)', () => {
    expect(run(CLIP_FULL['05']!.rows as never[], CLIP_FULL['05']!.aspect, squat, 'left')).toBe(2);
    expect(run(CLIP_FULL['02']!.rows as never[], CLIP_FULL['02']!.aspect, HS, 'left')).toBe(2);
  });
});
