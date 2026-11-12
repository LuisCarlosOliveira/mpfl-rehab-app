// B6-01: a press before the probe has an answer must not decide. A person who is alone is never stuck with "someone else".
import { describe, expect, it } from 'vitest';
import { createPipeline } from '../src/lib/exercises';
import type { Landmark } from '../src/lib/angle';
import type { Exercise } from '../src/lib/protocol';
import { legLandmarks } from './helpers/leg';

const HS = { kind: 'heel-slide', targetFlexion: 60, maxFlexion: 120, returnWithinDeg: 10, source: 'PROPOSAL' } as Exercise;
const make = () => {
  const made = createPipeline(HS, 'right', 1, { baselineDeg: 5 });
  if (!made.ok) throw new Error('setup');
  return made.pipeline;
};
const wide = (x: number, deg = 20) => legLandmarks('right', deg, { hip: { x, y: 0.3 }, length: 0.2 });

/** The patient is confirmed at x 0.7, moves to x 0.4 and the lockout starts. Returns the time of the first probe frame. */
function toLockout(p: ReturnType<typeof make>) {
  let t = 0;
  for (; t < 2500; t += 33) p.step(wide(0.7), t);
  for (; t < 12000; t += 33) if (p.step(wide(0.4), t).probe) return t + 33;
  throw new Error('no probe');
}
const probeFrames = (p: ReturnType<typeof make>, from: number, ms: number, frame: () => Landmark[], extra: () => Landmark[][]) => {
  let t = from;
  const outs: ReturnType<typeof p.step>[] = [];
  for (; t < from + ms; t += 33) outs.push(p.step(frame(), t, extra()));
  return { t, outs };
};

describe('B6-01: the press waits for the probe', () => {
  it('a press 0.3 s after the box, with a probe that returns one pose later: re-anchored, never "someone else"', () => {
    const p = make();
    let t = toLockout(p);
    ({ t } = probeFrames(p, t, 300, () => wide(0.4), () => []));
    p.followAgain();
    const mid = probeFrames(p, t, 1700, () => wide(0.4), () => []);
    expect(mid.outs.every((o) => o.otherPerson !== true)).toBe(true);
    expect(mid.outs.every((o) => o.flexion === null)).toBe(true); // it does not decide yet
    expect(mid.outs.some((o) => o.looking === true)).toBe(true);
    t = mid.t;
    const after = p.step(wide(0.4), t); // the probe ended with one pose
    expect(after.otherPerson).not.toBe(true);
    expect(after.flexion).not.toBeNull();
    expect(p.step(wide(0.4), t + 33).flexion).not.toBeNull();
  });

  it('a press early with a probe that returns two poses: "someone else"', () => {
    const p = make();
    let t = toLockout(p);
    ({ t } = probeFrames(p, t, 300, () => wide(0.3, 100), () => [wide(0.7, 20)]));
    p.followAgain();
    ({ t } = probeFrames(p, t, 1700, () => wide(0.3, 100), () => [wide(0.7, 20)]));
    const after = p.step(wide(0.3, 100), t);
    expect(after.otherPerson).toBe(true);
    expect(after.flexion).toBeNull();
  });

  it('with no probe answer at all (a source without setPoses) the press falls back to the distance rule after the wait', () => {
    const p = make();
    let t = toLockout(p);
    p.followAgain();
    for (const end = t + 5000; t < end; t += 33) p.step(wide(0.4), t); // no extra frames arrive
    expect(p.step(wide(0.4), t).otherPerson).toBe(true); // 0.3 from the start hip
  });

  it('"someone else" from a probe is cleared by a later probe with one pose, and the numbers return', () => {
    const p = make();
    let t = toLockout(p);
    ({ t } = probeFrames(p, t, 2000, () => wide(0.3, 100), () => [wide(0.7, 20)]));
    expect(p.step(wide(0.3, 100), t).otherPerson).toBe(true);
    // 10 s later the probe runs again
    let asked = false;
    for (const end = t + 11000; t < end && !asked; t += 33) asked = p.step(wide(0.3, 100), t).probe === true;
    expect(asked).toBe(true);
    ({ t } = probeFrames(p, t, 2000, () => wide(0.7), () => [])); // the therapist is gone: one pose, at the first place
    const back = p.step(wide(0.7), t);
    expect(back.otherPerson).not.toBe(true);
    expect(back.flexion).not.toBeNull();
  });
});
