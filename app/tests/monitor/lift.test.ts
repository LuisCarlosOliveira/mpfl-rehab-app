// Step B4: the mode lift for the leg raise to the side (segment hip to ankle against the horizontal, front-on)
// and to the back (segment hip to knee against the vertical, side view). The logic of the straight leg raise is liftStep.
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60000 }); // the noise tests run minutes of frames
import type { Landmark } from '../../src/lib/angle';
import { directionAux, readMeasure } from '../../src/lib/monitor/measure';
import { LIFT_ANGLE_BACK, LIFT_ANGLE_SIDE, createLiftDriver, liftStep, type LiftState } from '../../src/lib/monitor/modes';
import { specFor } from '../../src/lib/monitor/registry';
import { makeSeries, type PoseId, type Series, type SeriesSpec } from '../helpers/landmarkSeries';

type LiftPose = 'leg-raise-side' | 'leg-raise-back';
const POSES: LiftPose[] = ['leg-raise-side', 'leg-raise-back'];
const spec = (pose: LiftPose) => specFor(pose);
const value = (pose: LiftPose, name: string) => spec(pose)?.thresholds.find((t) => t.name === name)?.value as number;
const driverFor = (pose: LiftPose, cameraFacing: 1 | -1 | null = null) =>
  createLiftDriver({
    liftAngle: value(pose, 'lift-angle'),
    settleMs: value(pose, 'raise-settle-ms'),
    endMs: value(pose, 'lift-end-ms'),
    // R-02: the lift to the back counts the backward direction only.
    directional: pose === 'leg-raise-back' ? { cameraFacing } : undefined,
  });

function run(pose: LiftPose, s: Series, side: 'left' | 'right' = 'left', cameraFacing: 1 | -1 | null = null) {
  const d = driverFor(pose, cameraFacing);
  const events: Array<{ t: number; seen: boolean }> = [];
  for (const f of s.frames) {
    const raw = f.landmarks ? readMeasure((spec(pose) as NonNullable<ReturnType<typeof spec>>).measure, f.landmarks as Landmark[], side, 1) : null;
    const out = d.sample(raw, f.tMs, f.landmarks ? (directionAux(f.landmarks as Landmark[], side, 1) ?? undefined) : undefined);
    if (out.event === 'rep') events.push({ t: f.tMs, seen: raw !== null });
  }
  return { d, events };
}
const lifts = (pose: LiftPose, n: number, extra: Partial<SeriesSpec> = {}) => makeSeries({ pose: pose as PoseId, reps: n, ...extra });

describe('the values of the definitions', () => {
  it('sets lift-angle with origin engineering, and keeps the settle and end times of the straight leg raise', () => {
    expect(value('leg-raise-side', 'lift-angle')).toBe(LIFT_ANGLE_SIDE);
    expect(value('leg-raise-back', 'lift-angle')).toBe(LIFT_ANGLE_BACK);
    for (const p of POSES) {
      expect(spec(p)?.thresholds.find((t) => t.name === 'lift-angle')?.origin).toBe('engineering');
      expect(value(p, 'raise-settle-ms')).toBe(500);
      expect(value(p, 'lift-end-ms')).toBe(300);
    }
  });
});

describe('liftStep (the logic of the straight leg raise)', () => {
  const cfg = { settleMs: 500, endMs: 300 };
  /** Runs [raised, ms] steps with a frame each 100 ms. */
  const drive = (steps: Array<[boolean | null, number]>) => {
    let lift: LiftState | null = null;
    let counted = 0;
    let closed = 0;
    let t = 0;
    for (const [raised, ms] of steps)
      for (const end = t + ms; t < end; t += 100) {
        const o = liftStep(lift, raised, t, cfg);
        lift = o.lift;
        if (o.counted) counted += 1;
        if (o.closed) closed += 1;
      }
    return { counted, closed, lift };
  };
  it('counts once when the leg holds the settle time, and not at the first frame', () => {
    expect(drive([[true, 500]]).counted).toBe(0);
    expect(drive([[true, 700]]).counted).toBe(1);
    expect(drive([[true, 3000]]).counted).toBe(1);
  });
  it('a dip in the settle time starts it again, a short dip in a counted hold counts no second rep', () => {
    expect(drive([[true, 400], [false, 100], [true, 400]]).counted).toBe(0);
    expect(drive([[true, 800], [false, 200], [true, 800]]).counted).toBe(1);
  });
  it('a lift ends after the end time and the next lift counts again', () => {
    const r = drive([[true, 800], [false, 400], [true, 800]]);
    expect(r.closed).toBe(1);
    expect(r.counted).toBe(2);
  });
  it('a leg that is not seen starts the settle time again and never closes or counts', () => {
    expect(drive([[true, 400], [null, 600], [true, 400]]).counted).toBe(0);
    const r = drive([[true, 800], [null, 2000]]);
    expect(r.closed).toBe(0);
    expect(r.counted).toBe(1);
  });
});

describe.each(POSES)('%s', (pose) => {
  it('N lifts give N reps (1, 5 and 12), at 30 and at 10 frames each second', () => {
    for (const fps of [30, 10] as const)
      for (const n of [1, 5, 12]) expect(run(pose, lifts(pose, n, { fps })).d.reps(), `n ${n} fps ${fps}`).toBe(n);
  });
  it('N lifts give N reps with the 9 degree RMS noise (10 seeds of 10 lifts)', () => {
    for (let seed = 1; seed <= 10; seed++) expect(run(pose, lifts(pose, 10, { noise: { kneeRmsDeg: 9 }, seed })).d.reps(), `seed ${seed}`).toBe(10);
  });
  it('noise alone gives 0 reps (a leg at rest, 12 seeds of 2 minutes)', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const s = makeSeries({ pose, reps: 60, restValue: pose === 'leg-raise-side' ? -10 : 0, peakValue: pose === 'leg-raise-side' ? -10 : 0, noise: { kneeRmsDeg: 9 }, seed: 50 + seed });
      expect(run(pose, s).d.reps(), `seed ${seed}`).toBe(0);
    }
  });
  it('a lift under the lift angle counts no rep', () => {
    const small = value(pose, 'lift-angle') * 0.5;
    expect(run(pose, lifts(pose, 4, { peakValue: small })).d.reps()).toBe(0);
  });
  it('works for the right leg and a mirrored person', () => {
    const s = lifts(pose, 4, { side: 'right', mirror: true, hip: { x: 0.7, y: pose === 'leg-raise-back' ? 0.3 : 0.6 } });
    expect(run(pose, s, 'right').d.reps()).toBe(4);
  });
  it('a dropout that covers the whole raised part counts no rep, and no rep comes while the leg is not seen', () => {
    // The first lift: up from 1000 to 2000 ms, hold to 2500 ms, down to 3500 ms. The foot, knee and hip are lost from 1000 to 3600 ms.
    const s = lifts(pose, 2, { dropouts: [{ ids: [23, 25, 27], startMs: 1000, durationMs: 2600 }] });
    const r = run(pose, s);
    expect(r.events.every((e) => e.seen)).toBe(true);
    expect(r.d.reps()).toBe(1); // only the second lift
  });
  it('a dropout of 500 ms never makes an extra rep', () => {
    const base = run(pose, lifts(pose, 5)).d.reps();
    for (const startMs of [1500, 2000, 2400, 3500, 6200]) {
      const r = run(pose, lifts(pose, 5, { dropouts: [{ ids: [25, 27], startMs, durationMs: 500 }] }));
      expect(r.d.reps(), `start ${startMs}`).toBeLessThanOrEqual(base);
      expect(r.d.reps(), `start ${startMs}`).toBeGreaterThanOrEqual(base - 1);
    }
  });
  it('frames with no person keep the count', () => {
    const r = run(pose, lifts(pose, 3, { noPerson: [{ startMs: 5000, durationMs: 400 }] }));
    expect(r.d.reps()).toBeGreaterThanOrEqual(2);
  });
  it('gives the largest peak of the session as lift-angle, near the true peak, and a new set clears the set peak only', () => {
    const s = lifts(pose, 3, { peakValue: 30 });
    const { d } = run(pose, s);
    expect(d.data().reportKey).toBe('lift-angle');
    expect(d.data().reportValue).toBeGreaterThan(28);
    expect(d.data().reportValue).toBeLessThanOrEqual(30.001);
    expect(d.peak()).toBe(d.data().reportValue);
    d.newSet();
    expect(d.setPeak()).toBeNull();
    expect(d.peak()).toBe(d.data().reportValue);
  });
  it('gives no report before a lift', () => {
    expect(driverFor(pose).data()).toEqual({});
  });
});

describe('leg raise to the side with the lower leg hidden', () => {
  it('still counts', () => {
    const s = makeSeries({ pose: 'leg-raise-side', reps: 5, lowerLegHidden: true, noise: { kneeRmsDeg: 9 }, seed: 4 });
    expect(run('leg-raise-side', s).d.reps()).toBe(5);
  });
});

describe('R-01: a lift counts only after the angle was seen below the gate (a rest state)', () => {
  const mk = () => createLiftDriver({ liftAngle: 10, settleMs: 500, endMs: 300 });
  const feed = (d: ReturnType<typeof mk>, steps: Array<[number, number]>) => {
    let t = 0;
    for (const [deg, ms] of steps) for (const end = t + ms; t < end; t += 33) d.sample(deg, t);
    return d;
  };
  it('a leg that starts raised and stays raised counts 0 and gives no report value', () => {
    const d = feed(mk(), [[40, 5000]]);
    expect(d.reps()).toBe(0);
    expect(d.data()).toEqual({});
  });
  it('a leg that starts raised, goes down and lifts again counts the second raise only', () => {
    const d = feed(mk(), [[40, 3000], [0, 1000], [40, 2000], [0, 1000]]);
    expect(d.reps()).toBe(1);
  });
  it('a leg that starts at rest counts the first lift', () => {
    expect(feed(mk(), [[0, 500], [40, 1500], [0, 600]]).reps()).toBe(1);
  });
  it('a standing front-on pose with a still leg (hip to ankle near vertical, signed -88 degrees) gives 0 reps and no report value, with noise too', () => {
    for (const noise of [undefined, { kneeRmsDeg: 9 }])
      for (let seed = 1; seed <= 4; seed++) {
        const s = makeSeries({ pose: 'leg-raise-side', reps: 20, restValue: -88, peakValue: -88, seed, noise });
        const r = run('leg-raise-side', s);
        expect(r.d.reps()).toBe(0);
        expect(r.d.data()).toEqual({});
      }
  });
  it('a side-lying pose with a real lift still gives N reps', () => {
    expect(run('leg-raise-side', lifts('leg-raise-side', 6)).d.reps()).toBe(6);
  });
});

describe('R-02: the leg raise to the back counts the backward direction only', () => {
  const hipFor = (mirror: boolean) => ({ x: mirror ? 0.7 : 0.3, y: 0.3 });
  for (const mirror of [false, true]) {
    const label = mirror ? 'a mirrored person (looks to the left)' : 'a person who looks to the right';
    it(`backward lifts count N for ${label}, from the foot`, () => {
      const s = makeSeries({ pose: 'leg-raise-back', reps: 5, mirror, hip: hipFor(mirror) });
      expect(run('leg-raise-back', s).d.reps()).toBe(5);
    });
    it(`a forward swing counts 0 for ${label}, also with noise`, () => {
      for (let seed = 1; seed <= 3; seed++) {
        const s = makeSeries({ pose: 'leg-raise-back', reps: 5, mirror, forward: true, hip: hipFor(mirror), seed, noise: seed === 1 ? undefined : { kneeRmsDeg: 9 } });
        const r = run('leg-raise-back', s);
        expect(r.d.reps(), `seed ${seed}`).toBe(0);
        expect(r.d.data()).toEqual({});
      }
    });
    it(`uses the camera side when the foot is not seen, for ${label}`, () => {
      const hide = [{ ids: [29, 31], startMs: 0, durationMs: 100000 }];
      const facing = mirror ? -1 : 1;
      const back = makeSeries({ pose: 'leg-raise-back', reps: 4, mirror, hip: hipFor(mirror), dropouts: hide });
      expect(run('leg-raise-back', back, 'left', facing).d.reps()).toBe(4);
      const fwd = makeSeries({ pose: 'leg-raise-back', reps: 4, mirror, forward: true, hip: hipFor(mirror), dropouts: hide });
      expect(run('leg-raise-back', fwd, 'left', facing).d.reps()).toBe(0);
    });
  }
  it('counts nothing and gives no value when neither the foot nor the camera side is known', () => {
    const s = makeSeries({ pose: 'leg-raise-back', reps: 4, dropouts: [{ ids: [29, 31], startMs: 0, durationMs: 100000 }] });
    const d = driverFor('leg-raise-back', null);
    const values = s.frames.map((f) =>
      d.sample(readMeasure(spec('leg-raise-back')!.measure, f.landmarks as Landmark[], 'left', 1), f.tMs, directionAux(f.landmarks as Landmark[], 'left', 1) ?? undefined).value,
    );
    expect(values.every((v) => v === null)).toBe(true);
    expect(d.reps()).toBe(0);
  });
  it('keeps the 0 to 180 value of the angle for the report', () => {
    const { d } = run('leg-raise-back', makeSeries({ pose: 'leg-raise-back', reps: 3, peakValue: 30 }));
    expect(d.data().reportKey).toBe('lift-angle');
    expect(d.data().reportValue).toBeGreaterThan(28);
    expect(d.data().reportValue).toBeLessThanOrEqual(30.001);
  });
});

describe('the side-on check of the lift to the back (R-02b)', () => {
  // The leg is down (angle 0) for 1 s, up (40 degrees) for 1.5 s, then down again. The knee is behind the hip for a camera on the left.
  const play = (width: number | null) => {
    const d = createLiftDriver({
      liftAngle: LIFT_ANGLE_BACK,
      settleMs: value('leg-raise-back', 'raise-settle-ms'),
      endMs: value('leg-raise-back', 'lift-end-ms'),
      directional: { cameraFacing: -1, maxWidth: value('leg-raise-back', 'side-on-width') },
    });
    let turned = 0;
    for (let t = 0; t < 4000; t += 100) {
      const up = t >= 1000 && t < 2500;
      const out = d.sample(up ? 40 : 0, t, { footDx: -0.08, kneeDx: up ? 0.05 : 0, width });
      if (out.notSideOn) turned += 1;
    }
    return { reps: d.reps(), turned };
  };
  it('counts the lift of a side-on person and of a person with an unknown width', () => {
    expect(play(0.05)).toEqual({ reps: 1, turned: 0 });
    expect(play(null)).toEqual({ reps: 1, turned: 0 });
  });
  it('counts nothing and says not side-on when the hips are wide in the picture', () => {
    const r = play(0.35);
    expect(r.reps).toBe(0);
    expect(r.turned).toBeGreaterThan(0);
  });
});
