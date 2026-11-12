// Step B5: createPipeline runs the five new kinds through the definitions of lib/monitor/registry.ts.
// The anchor, the plausibility check, the lockout and the probe of the existing pipeline apply to them. The check of the leg comes from `needs`.
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60000 }); // the noise tests run minutes of frames
import { createPipeline, type Pipeline } from '../../src/lib/exercises';
import type { Landmark } from '../../src/lib/angle';
import { engineKinds, specFor } from '../../src/lib/monitor';
import { isMonitored } from '../../src/lib/monitor/monitored';
import type { PlanExercise } from '../../src/lib/protocol';
import { makeSeries, type PoseId, type Series, type SeriesFrame, type SeriesSpec } from '../helpers/landmarkSeries';

const KINDS = ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'] as const;
const ex = (kind: PlanExercise['kind']): PlanExercise => ({ kind, source: 'PROPOSAL' });
const make = (kind: PlanExercise['kind'], side: 'left' | 'right' = 'left', aspect = 1): Pipeline => {
  const made = createPipeline(ex(kind), side, aspect, {});
  if (!made.ok) throw new Error('setup');
  return made.pipeline;
};
const lm = (f: SeriesFrame) => f.landmarks as Landmark[] | null;
const PUMP = { pose: 'ankle-pump' } as const;
/** Feeds frames until `until` ms. Returns the outputs. */
function feed(p: Pipeline, s: Series, from = 0, until = Infinity, pick: (f: SeriesFrame) => Landmark[] | null = lm) {
  const outs = [];
  for (const f of s.frames) if (f.tMs >= from && f.tMs <= until) outs.push({ t: f.tMs, ...p.step(pick(f), f.tMs) });
  return outs;
}
/** N cycles or lifts and the end of the series after the last return to rest. */
const upto = (kind: string, n: number) => (kind === 'ankle-pump' ? (n + 0.15) * 2000 : Infinity);
const series = (pose: PoseId, n: number, extra: Partial<SeriesSpec> = {}) => makeSeries({ pose, reps: pose === 'ankle-pump' ? n + 1 : n, ...extra });

describe('engineKinds and isMonitored', () => {
  it('engineKinds lists the five kinds that the new modes run', () => {
    expect([...engineKinds()].sort()).toEqual([...KINDS].sort());
  });
  it('isMonitored stays false for the five until Step D turns them on', () => {
    for (const k of KINDS) expect(isMonitored(k), k).toBe(false);
  });
  it('every kind of the engine has a definition with a mode that the engine knows', () => {
    for (const k of engineKinds()) expect(['person-timer', 'reps-cycle', 'lift']).toContain(specFor(k)?.mode);
  });
});

describe('createPipeline for the five kinds', () => {
  it('returns a pipeline for each kind, with a summary and engineData', () => {
    for (const k of KINDS) {
      const made = createPipeline(ex(k), 'left', 1, {});
      expect(made.ok, k).toBe(true);
      if (made.ok) {
        expect(made.pipeline.summary().eventCounts).toEqual({ nearLimit: 0, overLimit: 0, tooFast: 0 });
        expect(made.pipeline.engineData?.()).toBeDefined();
      }
    }
  });

  it('the summary tells the leg role from the camera side', () => {
    const made = createPipeline(ex('ankle-pump'), 'left', 1, { cameraSide: 'left' });
    if (!made.ok) throw new Error('setup');
    expect(made.pipeline.summary().legRole).toBe('near');
  });
});

describe('quad-set and gluteal-set (person-timer)', () => {
  it('holds come from startHold and endHold only, and the data has the shape of the record', () => {
    const p = make('quad-set');
    const s = makeSeries({ pose: 'quad-set', durationS: 12, smallMovementDeg: 6 });
    for (const f of s.frames) {
      if (f.tMs === 1000) p.startHold?.(f.tMs);
      p.step(lm(f), f.tMs);
      if (f.tMs === 4000) p.endHold?.(f.tMs);
    }
    expect(p.summary().holds).toBe(1);
    expect(p.summary().reps).toBeNull();
    const d = p.engineData?.();
    expect(d?.holdList).toEqual([3]);
    expect(d?.timedBy).toBe('person');
    expect(d?.reportKey).toBeUndefined(); // R-08: no knee angle next to a hold list
    expect(d?.reportValue).toBeUndefined();
  });

  it('counts no hold from the camera: a moving knee gives no hold', () => {
    const p = make('quad-set');
    feed(p, makeSeries({ pose: 'quad-set', durationS: 12, smallMovementDeg: 20 }));
    expect(p.summary().holds).toBe(0);
    expect(p.engineData?.().holdList).toEqual([]);
  });

  it('gluteal set works with no camera at all: no landmarks, no report key', () => {
    const p = make('gluteal-set');
    for (let t = 0; t < 8000; t += 100) {
      if (t === 1000) p.startHold?.(t);
      if (t === 7000) p.endHold?.(t);
      expect(p.step(null, t).event).toBeNull();
    }
    expect(p.engineData?.()).toEqual({ holdList: [6], timedBy: 'person' });
    expect(p.summary().holds).toBe(1);
  });

  it('gluteal set reports no knee angle even when a leg is in view', () => {
    const p = make('gluteal-set');
    const s = makeSeries({ pose: 'quad-set', durationS: 6, smallMovementDeg: 6 });
    for (const f of s.frames) {
      if (f.tMs === 500) p.startHold?.(f.tMs);
      p.step(lm(f), f.tMs);
      if (f.tMs === 4000) p.endHold?.(f.tMs);
    }
    expect(p.engineData?.().reportKey).toBeUndefined();
  });

  it('never locks out or probes: a person who moves far is not an error for a timer', () => {
    const p = make('quad-set');
    const s = makeSeries({ pose: 'quad-set', durationS: 20, smallMovementDeg: 6 });
    const outs = feed(p, s);
    expect(outs.some((o) => o.lockedOut || o.probe || o.otherPerson)).toBe(false);
  });

  it('a startHold during a frame with no person still times the hold', () => {
    const p = make('quad-set');
    p.startHold?.(0);
    p.step(null, 500);
    p.endHold?.(5000);
    expect(p.engineData?.().holdList).toEqual([5]);
  });
});

describe('ankle-pump through the pipeline', () => {
  it('N pumps give N reps, and the range is the ankle-range', () => {
    for (const n of [1, 4, 9]) {
      const p = make('ankle-pump');
      feed(p, series('ankle-pump', n), 0, upto('ankle-pump', n));
      expect(p.summary().reps, `n ${n}`).toBe(n);
    }
    const p = make('ankle-pump');
    feed(p, series('ankle-pump', 3), 0, upto('ankle-pump', 3));
    expect(p.engineData?.().reportKey).toBe('ankle-range');
    expect(p.engineData?.().reportValue).toBeGreaterThan(40);
  });

  it('emits one rep event for each rep', () => {
    const p = make('ankle-pump');
    const outs = feed(p, series('ankle-pump', 5), 0, upto('ankle-pump', 5));
    expect(outs.filter((o) => o.event === 'rep')).toHaveLength(5);
  });

  it('with 9 degree RMS noise, within one rep and never more (6 seeds)', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const p = make('ankle-pump');
      feed(p, series('ankle-pump', 8, { noise: { kneeRmsDeg: 9 }, seed }), 0, upto('ankle-pump', 8));
      expect(p.summary().reps, `seed ${seed}`).toBeGreaterThanOrEqual(7);
      expect(p.summary().reps, `seed ${seed}`).toBeLessThanOrEqual(8);
    }
  });

  it('noise alone gives 0 reps (6 seeds of 2 minutes)', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const p = make('ankle-pump');
      feed(p, makeSeries({ ...PUMP, cycles: 60, lowDeg: 100, highDeg: 100, noise: { kneeRmsDeg: 9 }, seed: 40 + seed }));
      expect(p.summary().reps, `seed ${seed}`).toBe(0);
    }
  });

  it('needs knee, ankle and foot index: a hidden hip does not matter', () => {
    const p = make('ankle-pump');
    const s = series('ankle-pump', 4, { dropouts: [{ ids: [23], startMs: 0, durationMs: 100000 }] });
    feed(p, s, 0, upto('ankle-pump', 4));
    expect(p.summary().reps).toBe(4);
  });

  it('a hidden foot index reads as not seen and counts nothing', () => {
    const p = make('ankle-pump');
    const s = series('ankle-pump', 4, { dropouts: [{ ids: [31], startMs: 0, durationMs: 100000 }] });
    const outs = feed(p, s, 0, upto('ankle-pump', 4));
    expect(outs.every((o) => o.flexion === null)).toBe(true);
    expect(p.summary().reps).toBe(0);
  });

  it('a dropout of 500 ms never makes an extra rep, and gives no value while it lasts', () => {
    const p = make('ankle-pump');
    const s = series('ankle-pump', 6, { dropouts: [{ ids: [27, 31], startMs: 5300, durationMs: 500 }] });
    const outs = feed(p, s, 0, upto('ankle-pump', 6));
    expect(outs.filter((o) => o.t >= 5300 && o.t < 5800).every((o) => o.flexion === null && o.event === 'paused')).toBe(true);
    expect(p.summary().reps).toBeLessThanOrEqual(6);
    expect(p.summary().reps).toBeGreaterThanOrEqual(5);
  });

  it('a second person is ignored: the numbers never follow the second person, also after the probe', () => {
    const p = make('ankle-pump');
    const s = makeSeries({ ...PUMP, cycles: 20, secondPerson: true });
    const first = feed(p, s, 0, 5000);
    expect(first.every((o) => o.flexion !== null)).toBe(true); // person 1, 2.5 pumps
    const repsBefore = p.summary().reps;
    const second = feed(p, s, 5033, 40000, (f) => (f.secondPerson as Landmark[] | undefined) ?? null);
    expect(second.every((o) => o.flexion === null)).toBe(true);
    expect(p.summary().reps).toBe(repsBefore);
    expect(second.some((o) => o.lockedOut)).toBe(true); // after 4 s of a far hip with a whole leg
  });

  it('when the model also returns both people (a probe), the person who is nearest the anchor counts', () => {
    const p = make('ankle-pump');
    const s = makeSeries({ ...PUMP, cycles: 8, secondPerson: true });
    feed(p, s, 0, 3000); // the anchor is confirmed after 2 s
    const outs = [];
    for (const f of s.frames.filter((x) => x.tMs > 3000 && x.tMs <= 12000)) outs.push(p.step(f.secondPerson as Landmark[], f.tMs, [f.landmarks as Landmark[]]));
    expect(outs.every((o) => o.flexion !== null)).toBe(true);
    expect(p.summary().reps).toBeGreaterThanOrEqual(3);
  });

  it('a close-up start that is not a plausible leg does not anchor: the wide frames read at once', () => {
    const p = make('ankle-pump');
    const s = series('ankle-pump', 3);
    const dot = (l: Landmark[]) => l.map((q) => (q.visibility === 0 ? q : { ...q, x: 0.93 + (q.x - 0.25) * 0.01, y: 0.3 + (q.y - 0.6) * 0.01 }));
    for (const f of s.frames.filter((x) => x.tMs < 3000)) expect(p.step(dot(lm(f) as Landmark[]), f.tMs).lockedOut).toBeFalsy();
    const outs = feed(p, s, 3033, upto('ankle-pump', 3));
    expect(outs.filter((o) => o.flexion !== null).length).toBeGreaterThan(outs.length * 0.95);
  });
});

describe.each(['leg-raise-side', 'leg-raise-back'] as const)('%s through the pipeline', (pose) => {
  it('N lifts give N reps and the lift-angle report', () => {
    for (const n of [1, 5, 10]) {
      const p = make(pose);
      feed(p, series(pose, n));
      expect(p.summary().reps, `n ${n}`).toBe(n);
    }
    const p = make(pose);
    feed(p, series(pose, 3, { peakValue: 30 }));
    expect(p.engineData?.().reportKey).toBe('lift-angle');
    expect(p.engineData?.().reportValue).toBeGreaterThan(28);
  });

  it('with 9 degree RMS noise, N lifts give N reps (6 seeds)', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const p = make(pose);
      feed(p, series(pose, 8, { noise: { kneeRmsDeg: 9 }, seed }));
      expect(p.summary().reps, `seed ${seed}`).toBe(8);
    }
  });

  it('noise alone gives 0 reps (6 seeds of 2 minutes)', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const p = make(pose);
      feed(p, makeSeries({ pose, reps: 60, restValue: 0, peakValue: 0, noise: { kneeRmsDeg: 9 }, seed: 70 + seed }));
      expect(p.summary().reps, `seed ${seed}`).toBe(0);
    }
  });

  it('needs hip, knee and ankle: a hidden knee reads as not seen', () => {
    const p = make(pose);
    const outs = feed(p, series(pose, 3, { dropouts: [{ ids: [25], startMs: 0, durationMs: 100000 }] }));
    expect(outs.every((o) => o.flexion === null)).toBe(true);
    expect(p.summary().reps).toBe(0);
  });

  it('a dropout across the whole first lift counts only the second, and no rep comes during the dropout', () => {
    const p = make(pose);
    const outs = feed(p, series(pose, 2, { dropouts: [{ ids: [23, 25, 27], startMs: 1000, durationMs: 2600 }] }));
    expect(outs.filter((o) => o.t >= 1000 && o.t < 3600).every((o) => o.event !== 'rep')).toBe(true);
    expect(p.summary().reps).toBe(1);
  });

  it('a second person is ignored, and a press after the lockout does not count that person', () => {
    const p = make(pose);
    const s = makeSeries({ pose, reps: 12, secondPerson: true });
    feed(p, s, 0, 3000);
    const repsBefore = p.summary().reps;
    const second = feed(p, s, 3033, 30000, (f) => (f.secondPerson as Landmark[] | undefined) ?? null);
    expect(second.every((o) => o.flexion === null)).toBe(true);
    expect(p.summary().reps).toBe(repsBefore);
    expect(second.some((o) => o.lockedOut)).toBe(true);
  });

  it('newSet keeps the reps and the session peak', () => {
    const p = make(pose);
    feed(p, series(pose, 2));
    const d = p.engineData?.();
    p.newSet();
    expect(p.summary().reps).toBe(2);
    expect(p.engineData?.()).toEqual(d);
  });
});

describe('leg-raise-side, lower leg hidden', () => {
  it('still counts', () => {
    const p = make('leg-raise-side');
    feed(p, makeSeries({ pose: 'leg-raise-side', reps: 5, lowerLegHidden: true }));
    expect(p.summary().reps).toBe(5);
  });
});

describe('R-01 and R-02 through the pipeline', () => {
  const makeWith = (kind: PlanExercise['kind'], cameraSide?: 'left' | 'right') => {
    const made = createPipeline(ex(kind), 'left', 1, { cameraSide });
    if (!made.ok) throw new Error('setup');
    return made.pipeline;
  };
  it('a standing front-on pose with a still leg gives 0 reps and no report value', () => {
    const p = make('leg-raise-side');
    feed(p, makeSeries({ pose: 'leg-raise-side', reps: 10, restValue: 88, peakValue: 88 }));
    expect(p.summary().reps).toBe(0);
    expect(p.engineData?.()).toEqual({});
  });
  it('a side-lying pose with a real lift gives N reps', () => {
    const p = make('leg-raise-side');
    feed(p, makeSeries({ pose: 'leg-raise-side', reps: 4 }));
    expect(p.summary().reps).toBe(4);
  });
  it('a forward swing of the leg raise to the back counts 0, backward counts N, also for the mirrored person', () => {
    for (const mirror of [false, true]) {
      const hip = { x: mirror ? 0.7 : 0.3, y: 0.3 };
      const a = make('leg-raise-back');
      feed(a, makeSeries({ pose: 'leg-raise-back', reps: 4, mirror, hip }));
      expect(a.summary().reps, `back, mirror ${mirror}`).toBe(4);
      const b = make('leg-raise-back');
      feed(b, makeSeries({ pose: 'leg-raise-back', reps: 4, mirror, hip, forward: true }));
      expect(b.summary().reps, `forward, mirror ${mirror}`).toBe(0);
    }
  });
  it('without a foot the camera side decides, and without both nothing counts and the readout is empty', () => {
    const hide = [{ ids: [29, 31], startMs: 0, durationMs: 100000 }];
    const s = makeSeries({ pose: 'leg-raise-back', reps: 4, dropouts: hide });
    const known = makeWith('leg-raise-back', 'right'); // the camera sees the right side: the person looks to the right
    feed(known, s);
    expect(known.summary().reps).toBe(4);
    const unknown = makeWith('leg-raise-back');
    const outs = feed(unknown, s);
    expect(unknown.summary().reps).toBe(0);
    expect(outs.every((o) => o.flexion === null)).toBe(true);
  });
});
