import { describe, expect, it } from 'vitest';
import { createPipeline } from '../src/lib/exercises';
import type { Exercise } from '../src/lib/protocol';
import { legLandmarks } from './helpers/leg';

const HS = { source: 'PROPOSAL', kind: 'heel-slide', targetFlexion: 90, maxFlexion: 120, returnWithinDeg: 10 } as unknown as Exercise;
const make = () => {
  const made = createPipeline(HS, 'right', 1, { baselineDeg: 5 });
  if (!made.ok) throw new Error('setup');
  return made.pipeline;
};
const whole = (x = 0.6) => legLandmarks('right', 40, { hip: { x, y: 0.3 } });
const noHip = () => {
  const l = whole();
  l[24] = { x: 0, y: 0, visibility: 0 };
  return l;
};

describe('the anchor is never null once it is confirmed', () => {
  it('every public path reaches confirmed without a throw, and the numbers appear after it', () => {
    const paths: Record<string, (p: ReturnType<typeof make>) => number> = {
      'frames from the start': (p) => {
        let t = 0;
        for (; t < 3000; t += 33) p.step(whole(), t);
        return t;
      },
      'no frame, no hip, then whole frames': (p) => {
        let t = 0;
        p.step(null, t);
        for (; t < 1000; t += 33) p.step(noHip(), t);
        for (; t < 4000; t += 33) p.step(whole(), t);
        return t;
      },
      'press before any hip, then whole frames': (p) => {
        p.followAgain();
        let t = 0;
        for (; t < 3000; t += 33) p.step(whole(), t);
        return t;
      },
      'press during the provisional anchor': (p) => {
        let t = 0;
        for (; t < 500; t += 33) p.step(whole(), t);
        p.followAgain();
        for (; t < 4000; t += 33) p.step(whole(), t);
        return t;
      },
      'hip lost then found again before the confirm': (p) => {
        let t = 0;
        for (; t < 1000; t += 33) p.step(whole(), t);
        for (; t < 2000; t += 33) p.step(noHip(), t);
        for (; t < 5000; t += 33) p.step(whole(), t);
        return t;
      },
      'probe frames with no second pose, then a press': (p) => {
        let t = 0;
        for (; t < 3000; t += 33) p.step(whole(), t, []);
        p.followAgain();
        for (; t < 4000; t += 33) p.step(whole(), t, []);
        return t;
      },
    };
    for (const [name, run] of Object.entries(paths)) {
      const p = make();
      let t = 0;
      expect(() => {
        t = run(p);
      }, name).not.toThrow();
      expect(p.step(whole(), t).flexion, name).not.toBeNull();
    }
  });
});
