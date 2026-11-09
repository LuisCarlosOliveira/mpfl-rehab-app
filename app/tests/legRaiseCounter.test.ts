// The camera count of the straight leg raise (live test 2026-11-09). A rep is a lift that holds the settle time. It ends when
// the leg is back near its resting height. The numbers are ENGINEERING or PROPOSAL values and none is clinical.
import { createPipeline } from '../src/lib/exercises';
import type { Landmark } from '../src/lib/angle';
import type { Exercise } from '../src/lib/protocol';
import { legLandmarks } from './helpers/leg';
import { rowFrame } from './helpers/clip';
import { CLIP_SERIES } from './fixtures/clipSeries';

const SLR: Exercise = { kind: 'straight-leg-raise', sets: 2, reps: 10, source: 'PROPOSAL' };
const DT = 100; // 10 frames each second, as the saved clip fixtures

/**
 * A person who lies on the side, seen from the camera. The hip is at y 0.7. `height` is the hip minus the ankle in the image
 * (0.2 is a clear lift, 0 is a leg that lies flat). The knee stays straight.
 */
function leg(height: number, flexion = 0): Landmark[] {
  const hip = { x: 0.3, y: 0.7 };
  const thighAngle = -Math.asin(Math.min(Math.max(height / 0.4, -1), 1));
  return legLandmarks('left', flexion, { hip, thighAngle });
}

/** Feeds a list of [height, milliseconds] steps. A null height is a frame with no person. Returns the events and the summary. */
function run(steps: Array<[number | null, number]>) {
  const made = createPipeline(SLR, 'left', 1);
  if (!made.ok) throw new Error('setup failed');
  const events: Array<{ event: string; t: number }> = [];
  let t = 0;
  for (const [height, ms] of steps) {
    for (const end = t + ms; t < end; t += DT) {
      const out = made.pipeline.step(height === null ? null : leg(height), t);
      if (out.event) events.push({ event: out.event, t });
    }
  }
  return { events, reps: events.filter((e) => e.event === 'rep'), summary: made.pipeline.summary() };
}

const lift = (ms = 2000): Array<[number, number]> => [
  [0.25, ms],
  [0, 1500],
];

describe('the straight leg raise camera count', () => {
  it('counts one rep for one clean lift', () => {
    const r = run([[0, 1500], ...lift()]);
    expect(r.reps).toHaveLength(1);
    expect(r.summary.reps).toBe(1);
  });

  it('counts the rep when the leg has held the settle time, not at the first frame above the start height', () => {
    const r = run([[0, 1500], ...lift()]);
    expect(r.reps[0]!.t).toBeGreaterThanOrEqual(1500 + 500);
    expect(r.reps[0]!.t).toBeLessThan(1500 + 700);
  });

  it('counts one rep, not many, for a lift that is held for 10 seconds', () => {
    expect(run([[0, 1500], ...lift(10_000)]).reps).toHaveLength(1);
  });

  it('counts 10 reps for 10 lifts', () => {
    const steps: Array<[number, number]> = [[0, 1500]];
    for (let i = 0; i < 10; i++) steps.push(...lift(1500));
    expect(run(steps).reps).toHaveLength(10);
  });

  it('counts none for a shaky small movement under the start height', () => {
    const steps: Array<[number, number]> = [];
    for (let i = 0; i < 20; i++) steps.push([0.04, 200], [-0.01, 200]);
    const r = run(steps);
    expect(r.reps).toHaveLength(0);
    expect(r.summary.reps).toBe(0);
  });

  it('counts none for a one-frame spike, even one with a glitch angle of 172 degrees', () => {
    const made = createPipeline(SLR, 'left', 1);
    if (!made.ok) throw new Error('setup failed');
    let reps = 0;
    for (let i = 0; i < 40; i++) {
      const frame = i === 20 ? leg(0.3, 172) : leg(0);
      if (made.pipeline.step(frame, i * DT).event === 'rep') reps += 1;
    }
    expect(reps).toBe(0);
  });

  it('counts none for a rise that stays shorter than the settle time', () => {
    expect(run([[0, 1500], [0.25, 400], [0, 2000]]).reps).toHaveLength(0);
  });

  it('restarts the settle time after the leg is out of view', () => {
    const r = run([[0, 1000], [0.25, 300], [null, 200], [0.25, 300], [0, 2000]]);
    expect(r.reps).toHaveLength(0);
  });

  it('keeps one rep when the leg is out of view during a counted lift', () => {
    const r = run([[0, 1000], [0.25, 1000], [null, 1000], [0.25, 1500], [0, 1500]]);
    expect(r.reps).toHaveLength(1);
  });

  it('counts a second rep only after the leg came back down', () => {
    const r = run([[0, 1000], [0.25, 1500], [0.25, 1500], [0, 1500], [0.25, 1500], [0, 1500]]);
    expect(r.reps).toHaveLength(2);
  });

  it('ends a lift when the leg stays down for 300 ms, and not for a short dip in the hold', () => {
    const dip = run([[0, 1500], [0.2, 1500], [0.02, 300], [0.2, 1500], [0, 1500]]);
    expect(dip.reps).toHaveLength(1);
    const down = run([[0, 1500], [0.2, 1500], [0.02, 700], [0.2, 1500], [0, 1500]]);
    expect(down.reps).toHaveLength(2);
  });

  it('counts the lifts of a person whose leg rests far below the hip, as the first frames of clip 04 do', () => {
    const r = run([[-0.24, 800], [0, 1500], ...lift(), ...lift(), [-0.2, 1000]]);
    expect(r.reps).toHaveLength(2);
  });

  it('counts none for a leg that flickers around the start height, as the unmoving leg of clip 04 does', () => {
    const steps: Array<[number, number]> = [];
    for (let i = 0; i < 30; i++) steps.push([0.08, 200], [0.02, 100]);
    expect(run(steps).reps).toHaveLength(0);
  });

  it('keeps the angle at the top and the lowering', () => {
    const r = run([[0, 1000], [0.25, 2000], [0, 1000]]);
    expect(r.summary.topFlexion).not.toBeNull();
  });
});

// Saved landmarks of real public clips (first 18 s, tests/fixtures/clipSeries.ts). There is NO ground truth for these clips.
// The expected numbers are the lifts that I counted by eye on stills of the same seconds. They pin what the rule gives today.
// Full clips (eye count next to the camera count) are in docs/live-test/leg-raise-count.md.
describe('the straight leg raise camera count on saved real landmarks', () => {
  const count = (clip: string, leg: 'left' | 'right') => {
    const made = createPipeline(SLR, leg, CLIP_SERIES[clip]!.aspect);
    if (!made.ok) throw new Error('setup failed');
    CLIP_SERIES[clip]!.rows.forEach((row, i) => {
      const f = rowFrame(row, i);
      made.pipeline.step(f.landmarks, f.tMs);
    });
    return made.pipeline.summary().reps;
  };

  it('clip 03, the lifting leg: 2 lifts in the first 18 s, at 10 s and 17 s', () => {
    expect(count('03', 'right')).toBe(2);
  });

  it('clip 03, the leg that stays down: none', () => {
    expect(count('03', 'left')).toBe(0);
  });

  it('clip 04, the lifting leg: 1 lift in the first 18 s, at 15 s', () => {
    expect(count('04', 'left')).toBe(1);
  });

  it('clip 04, the leg that stays down: none', () => {
    expect(count('04', 'right')).toBe(0);
  });
});
