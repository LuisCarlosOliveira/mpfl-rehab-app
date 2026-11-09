// F3 (R2-06): the lowest steady angle must not depend on the moment of the press.
// The clips loop in the fake camera, so the rows repeat to cover 60 s. The angle goes through the same filter as Session.
// The numbers are engineering values. A clip is a smoke test and not a validation.
import { createBaselineCapture, CAPTURE_CONFIG } from '../src/lib/baseline';
import { createPipeline } from '../src/lib/exercises';
import { SETUP_CONFIG } from '../src/lib/setupRules';
import type { Exercise } from '../src/lib/protocol';
import { CLIP_FULL } from './fixtures/clipFull';
import { legLandmarks } from './helpers/leg';
import { rowFrame } from './helpers/clip';

const exercise = (kind: Exercise['kind'], target: number): Exercise => ({ kind, sets: 3, reps: 10, targetFlexion: target, maxFlexion: 150, returnWithinDeg: 20, source: 'test' }) as Exercise;
const CLIPS: [string, Exercise][] = [
  ['01', exercise('heel-slide', 60)],
  ['02', exercise('heel-slide', 60)],
  ['05', exercise('mini-squat', 30)],
];
const PRESS_MS = Array.from({ length: 24 }, (_, i) => 15000 + i * 2000); // every 2 s from 15 s to 61 s

/** The value of the button when it is pressed at `pressMs`. Each press is a new run. null: the app refused or had too few angles. */
function pressValue(clip: string, ex: Exercise, pressMs: number, startBelowDeg = Infinity): number | null {
  const s = CLIP_FULL[clip]!;
  const made = createPipeline(ex, 'left', s.aspect);
  if (!made.ok) throw new Error('bad exercise');
  const cap = createBaselineCapture('left', s.aspect, SETUP_CONFIG, startBelowDeg);
  for (let t = 0; t <= pressMs; t += 100) {
    const f = rowFrame(s.rows[(t / 100) % s.rows.length]!, 0);
    cap.push(f.landmarks, t, made.pipeline.step(f.landmarks, t).flexion);
  }
  return cap.useLowest()?.baselineDeg ?? null;
}
const pressValues = (clip: string, ex: Exercise, startBelowDeg = Infinity) => PRESS_MS.map((ms) => pressValue(clip, ex, ms, startBelowDeg));
const spread = (v: (number | null)[]) => Math.max(...(v as number[])) - Math.min(...(v as number[]));

describe('the lowest steady angle on real clips, pressed at 24 different moments', () => {
  it.each(CLIPS)('clip %s: the value moves by at most 2 degrees between 15 s and 61 s', (clip, ex) => {
    const v = pressValues(clip, ex);
    expect(v.every((x) => x !== null)).toBe(true);
    expect(spread(v)).toBeLessThanOrEqual(2);
  });

  it('refuses at every moment when the lowest plateau is a bent knee (the peak guard)', () => {
    // Clip 05 rests near 0 degrees. A start limit of 0.1 degrees makes every plateau a bent knee.
    expect(pressValues('05', CLIPS[2]![1], 0.1).every((x) => x === null)).toBe(true);
  });
});

describe('the lowest plateau (synthetic)', () => {
  const leg = (f: number) => legLandmarks('left', f, { hip: { x: 0.5, y: 0.3 } });
  const run = (c: ReturnType<typeof createBaselineCapture>, from: number, to: number, f: (t: number) => number | null) => {
    for (let t = from; t <= to; t += 100) {
      const v = f(t);
      c.push(v === null ? null : leg(v), t, v);
    }
  };

  it('ignores a dip that is shorter than the plateau time', () => {
    const c = createBaselineCapture('left', 1, SETUP_CONFIG);
    // A slow wave between 30 and 40 degrees, and one 0.2 s dip to 5 degrees.
    run(c, 0, 16000, (t) => (t >= 8000 && t < 8200 ? 5 : 35 + 5 * Math.sin(t / 700)));
    const v = c.useLowest()!.baselineDeg;
    expect(v).toBeGreaterThan(29);
  });

  it('keeps the lowest plateau after the knee bends more later', () => {
    const c = createBaselineCapture('left', 1, SETUP_CONFIG);
    run(c, 0, 5000, (t) => 10 + (t % 2000) / 100); // moves, so no still window
    run(c, 5100, 5900, () => 8); // a plateau of 0.8 s at 8 degrees
    run(c, 6000, 20000, (t) => 30 + (t % 1500) / 50);
    expect(c.useLowest()!.baselineDeg).toBeCloseTo(8, 0);
  });

  it('does not join two plateaus across a lost leg', () => {
    const c = createBaselineCapture('left', 1, SETUP_CONFIG);
    // 0.3 s low, a lost leg, 0.3 s low. No plateau of 0.5 s exists. The rest is a high wave.
    run(c, 0, 400, () => 4);
    run(c, 500, 700, () => null);
    run(c, 800, 1100, () => 4);
    run(c, 1200, 16000, (t) => 40 + 10 * Math.sin(t / 500));
    expect(c.useLowest()!.baselineDeg).toBeGreaterThan(29);
  });

  it('keeps the config an engineering value of 0.5 s', () => {
    expect(CAPTURE_CONFIG.plateauMs).toBe(500);
  });
});
