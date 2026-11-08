import { counterSetup, createPipeline, isLegRaised } from '../src/lib/exercises';
import type { Side } from '../src/lib/angle';
import type { Exercise } from '../src/lib/protocol';
import { MARGIN_DEG } from '../src/lib/margin';
import { gauss, legLandmarks, rng } from './helpers/leg';

const ex = (over: Partial<Exercise> & Pick<Exercise, 'kind'>): Exercise => ({ source: 'PROPOSAL', ...over });

describe('counterSetup', () => {
  it('builds rep thresholds from the protocol target for a heel slide', () => {
    const r = counterSetup(ex({ kind: 'heel-slide', targetFlexion: 60, maxFlexion: 90 }));
    expect(r).toMatchObject({ ok: true, kind: 'reps', config: { target: 60, maxFlexion: 90, minStateMs: 300 } });
    if (r.ok && r.kind === 'reps') {
      expect(r.config.enter).toBeCloseTo(48);
    }
  });

  it('builds rep thresholds for a mini squat and keeps the ceiling', () => {
    const r = counterSetup(ex({ kind: 'mini-squat', targetFlexion: 30, maxFlexion: 50 }));
    expect(r).toMatchObject({ ok: true, kind: 'reps', config: { target: 30, maxFlexion: 50 } });
  });

  it('asks the surgeon when a rep exercise has no target', () => {
    expect(counterSetup(ex({ kind: 'heel-slide' }))).toEqual({ ok: false, reason: 'ask-your-surgeon', missing: 'targetFlexion' });
    expect(counterSetup(ex({ kind: 'mini-squat', targetFlexion: 5 }))).toMatchObject({ ok: false, missing: 'targetFlexion' });
  });

  it('builds the hold between minFlexion and targetFlexion from the protocol', () => {
    const r = counterSetup(ex({ kind: 'seated-extension-hold', holdSeconds: 5, targetFlexion: 60, minFlexion: 40 }));
    expect(r).toMatchObject({
      ok: true,
      kind: 'hold',
      config: { direction: 'at-most', threshold: 60 + MARGIN_DEG, minHoldMs: 5000, arcEnd: { limit: 40, margin: MARGIN_DEG } },
    });
  });

  it('turns the arc end cue off when the clinician allows full extension with minFlexion 0', () => {
    const r = counterSetup(ex({ kind: 'seated-extension-hold', holdSeconds: 5, targetFlexion: 0, minFlexion: 0 }));
    expect(r).toMatchObject({ ok: true, kind: 'hold' });
    if (r.ok && r.kind === 'hold') expect(r.config.arcEnd).toBeUndefined();
  });

  it('asks the surgeon when a hold has no duration', () => {
    expect(counterSetup(ex({ kind: 'seated-extension-hold', targetFlexion: 60, minFlexion: 40 }))).toMatchObject({ ok: false, missing: 'holdSeconds' });
  });

  it('runs no hold without both angles and names the missing one', () => {
    const one = { kind: 'seated-extension-hold', holdSeconds: 5 } as const;
    expect(counterSetup(ex({ ...one, targetFlexion: 60 }))).toEqual({ ok: false, reason: 'ask-your-surgeon', missing: 'minFlexion' });
    expect(counterSetup(ex({ ...one, minFlexion: 40 }))).toEqual({ ok: false, reason: 'ask-your-surgeon', missing: 'targetFlexion' });
    expect(counterSetup(ex(one))).toMatchObject({ ok: false, missing: 'minFlexion' });
  });

  it('gives no default angle: a hold with a hold angle of 0 and no minFlexion does not run', () => {
    expect(counterSetup(ex({ kind: 'seated-extension-hold', holdSeconds: 5, targetFlexion: 0 }))).toMatchObject({ ok: false, missing: 'minFlexion' });
  });

  it('uses the lag counter for the straight leg raise', () => {
    expect(counterSetup(ex({ kind: 'straight-leg-raise' }))).toMatchObject({ ok: true, kind: 'lag' });
  });
});

describe('isLegRaised', () => {
  it('is true when the ankle is clearly above the hip', () => {
    expect(isLegRaised({ x: 0.3, y: 0.7, visibility: 1 }, { x: 0.7, y: 0.5, visibility: 1 })).toBe(true);
  });

  it('is false for a leg that lies flat', () => {
    expect(isLegRaised({ x: 0.3, y: 0.7, visibility: 1 }, { x: 0.7, y: 0.7, visibility: 1 })).toBe(false);
  });

  it('is false when a landmark is hidden', () => {
    expect(isLegRaised({ x: 0.3, y: 0.7, visibility: 1 }, { x: 0.7, y: 0.4, visibility: 0.2 })).toBe(false);
  });
});

// ---- Replay: synthetic landmarks through the whole chain --------------------

const FPS = 30;
const DT = 1000 / FPS;

// A rep trace: flexion rises from 0 to `peak` and returns, `period` ms for each rep.
function trace(reps: number, peak: number, period = 3000, dwellMs = 1000): number[] {
  const out: number[] = [];
  const n = Math.round((reps * period) / DT);
  for (let i = 0; i < n; i++) out.push((peak / 2) * (1 - Math.cos((2 * Math.PI * i * DT) / period)));
  for (let i = 0; i < dwellMs / DT; i++) out.push(0);
  return out;
}

function run(
  exercise: Exercise,
  flexions: number[],
  opts: { noise?: number; lose?: [number, number]; baseline?: number | null; leg?: Side; cameraSide?: Side } = {},
) {
  const leg = opts.leg ?? 'left';
  const baselineDeg = opts.baseline === undefined ? 0 : opts.baseline;
  const made = createPipeline(exercise, leg, 1, { baselineDeg, cameraSide: opts.cameraSide });
  if (!made.ok) throw new Error('setup failed');
  const next = rng(11);
  const events: string[] = [];
  flexions.forEach((f, i) => {
    const lost = opts.lose && i >= opts.lose[0] && i < opts.lose[1];
    const landmarks = lost
      ? null
      : legLandmarks(leg, f, { noise: opts.noise ? () => gauss(next, opts.noise as number) : undefined });
    const out = made.pipeline.step(landmarks, i * DT);
    if (out.event) events.push(out.event);
  });
  return { summary: made.pipeline.summary(), events };
}

describe('replay: heel slide through the whole chain', () => {
  const heel = ex({ kind: 'heel-slide', targetFlexion: 60, maxFlexion: 90, returnWithinDeg: 18 });

  it('counts 10 reps from 10 synthetic heel slides with landmark noise', () => {
    const { summary } = run(heel, trace(10, 70), { noise: 0.004 });
    expect(summary.reps).toBe(10);
    expect(summary.peakFlexion).toBeGreaterThan(65);
    expect(summary.peakFlexion).toBeLessThan(75);
  });

  it('counts none and alerts when the peak is above the ceiling', () => {
    const { summary, events } = run(heel, trace(3, 100));
    expect(summary.reps).toBe(0);
    expect(events).toContain('over-limit');
  });

  it('counts none when the peak stays below the target', () => {
    expect(run(heel, trace(5, 40)).summary.reps).toBe(0);
  });

  it('pauses while the leg is lost and keeps the count', () => {
    const t = trace(4, 70);
    const withLoss = run(heel, t, { lose: [100, 130] });
    expect(withLoss.events).toContain('paused');
    expect(withLoss.summary.reps).toBeGreaterThanOrEqual(3);
  });
});

describe('replay: mini squat ceiling', () => {
  it('alerts when depth goes above the protocol limit', () => {
    const squat = ex({ kind: 'mini-squat', targetFlexion: 30, maxFlexion: 50, returnWithinDeg: 15 });
    const { summary, events } = run(squat, trace(3, 70));
    expect(events).toContain('over-limit');
    expect(summary.reps).toBe(0);
  });

  it('counts reps that stay inside the limit', () => {
    const squat = ex({ kind: 'mini-squat', targetFlexion: 30, maxFlexion: 50, returnWithinDeg: 15 });
    expect(run(squat, trace(5, 40)).summary.reps).toBe(5);
  });
});

describe('replay: seated extension hold', () => {
  const hold = ex({ kind: 'seated-extension-hold', holdSeconds: 2, minFlexion: 40, targetFlexion: 60 });
  const still = (deg: number, ms: number) => Array.from({ length: Math.round(ms / DT) }, () => deg);

  it('completes one hold after 2 seconds at the hold angle', () => {
    const r = run(hold, still(55, 2500));
    expect(r.summary.holds).toBe(1);
    expect(r.events).toEqual(['hold-complete']);
  });

  it('counts no hold at a straight knee and gives the stop cue once', () => {
    const r = run(hold, still(3, 3000));
    expect(r.summary.holds).toBe(0);
    expect(r.events.filter((e) => e === 'over-limit')).toHaveLength(1);
    expect(r.summary.eventCounts.overLimit).toBe(1);
  });

  it('counts a hold near the limit and counts the warning', () => {
    const r = run(hold, still(45, 2500));
    expect(r.summary.holds).toBe(1);
    expect(r.summary.eventCounts.nearLimit).toBe(1);
  });

  it('starts again with the restart cue when the knee bends more', () => {
    const r = run(hold, [...still(55, 1500), ...still(95, 300), ...still(55, 1500)]);
    expect(r.summary.holds).toBe(0);
    expect(r.events).toContain('hold-restart');
  });

  it('starts again when the knee goes straighter than the limit', () => {
    const r = run(hold, [...still(55, 1500), ...still(10, 300), ...still(55, 1500)]);
    expect(r.summary.holds).toBe(0);
    expect(r.events).toContain('over-limit');
  });
});

describe('replay: straight leg raise, angle at the top', () => {
  const slr = ex({ kind: 'straight-leg-raise' });

  function lifts(minFlexions: number[]) {
    const made = createPipeline(slr, 'left', 1);
    if (!made.ok) throw new Error('setup failed');
    let t = 0;
    const lying = { hip: { x: 0.3, y: 0.7 } };
    const frames = (flex: number, angle: number, n: number) => {
      for (let i = 0; i < n; i++, t += DT) made.pipeline.step(legLandmarks('left', flex, { ...lying, thighAngle: angle }), t);
    };
    for (const m of minFlexions) {
      frames(0, 0, 15); // leg flat
      frames(m, -Math.PI / 6, 30); // leg raised, knee at best flexion m
      frames(0, 0, 15); // lowered
    }
    return made.pipeline.summary();
  }

  it('reports the highest angle at the top over the lifts', () => {
    const s = lifts([8, 4, 6]);
    expect(s.topFlexion).not.toBeNull();
    expect(s.topFlexion as number).toBeGreaterThan(6);
    expect(s.topFlexion as number).toBeLessThan(10);
  });

  it('reports no angle at the top when the leg never rises', () => {
    const made = createPipeline(slr, 'left', 1);
    if (!made.ok) throw new Error('setup failed');
    for (let i = 0; i < 30; i++) made.pipeline.step(legLandmarks('left', 0, { hip: { x: 0.3, y: 0.7 }, thighAngle: 0 }), i * DT);
    expect(made.pipeline.summary().topFlexion).toBeNull();
  });
});

describe('pipeline: return to the resting angle (T17)', () => {
  const heel = ex({ kind: 'heel-slide', targetFlexion: 60, maxFlexion: 90, returnWithinDeg: 18 });
  const fromRest = (rest: number, peak: number, reps: number) => trace(reps, peak - rest).map((f) => rest + f);

  it('counts the reps of a person who rests at 25 degrees', () => {
    expect(run(heel, fromRest(25, 70, 4), { baseline: 25 }).summary.reps).toBe(4);
  });

  it('counts none for the same movement when the baseline is 0, because the knee never comes back that far', () => {
    expect(run(heel, fromRest(25, 70, 4), { baseline: 0 }).summary.reps).toBe(0);
  });

  it('counts none and says why when no baseline was measured', () => {
    const r = run(heel, fromRest(0, 70, 3), { baseline: null });
    expect(r.summary.reps).toBe(0);
    expect(r.summary.countBlock).toBe('no-baseline');
    expect(r.summary.peakFlexion).toBeGreaterThan(65);
  });

  it('counts none and says why when the protocol has no return value, and still shows the peak', () => {
    const noValue = ex({ kind: 'heel-slide', targetFlexion: 60, maxFlexion: 90 });
    const r = run(noValue, fromRest(0, 70, 3));
    expect(r.summary.reps).toBe(0);
    expect(r.summary.countBlock).toBe('no-return-value');
    expect(r.summary.peakFlexion).toBeGreaterThan(65);
  });

  it('has no count block when both values are present', () => {
    expect(run(heel, fromRest(0, 70, 2)).summary.countBlock).toBeNull();
  });
});

describe('pipeline: the chosen leg and the leg role (T17)', () => {
  const heel = ex({ kind: 'heel-slide', targetFlexion: 60, maxFlexion: 90, returnWithinDeg: 18 });

  it('tracks the right leg when the right leg is chosen', () => {
    expect(run(heel, trace(3, 70), { leg: 'right' }).summary.reps).toBe(3);
  });

  it('does not read the other leg: a left leg that moves gives no angle for a right pipeline', () => {
    const made = createPipeline(heel, 'right', 1, { baselineDeg: 0 });
    if (!made.ok) throw new Error('setup failed');
    const out = made.pipeline.step(legLandmarks('left', 60), 0);
    expect(out.flexion).toBeNull();
  });

  it('records the role near when the chosen leg is on the camera side', () => {
    expect(run(heel, trace(1, 70), { leg: 'left', cameraSide: 'left' }).summary.legRole).toBe('near');
  });

  it('records the role far when the chosen leg is on the other side', () => {
    expect(run(heel, trace(1, 70), { leg: 'left', cameraSide: 'right' }).summary.legRole).toBe('far');
    expect(run(heel, trace(1, 70), { leg: 'right', cameraSide: 'left' }).summary.legRole).toBe('far');
  });

  it('records no role when the camera side is not known', () => {
    expect(run(heel, trace(1, 70)).summary.legRole).toBeNull();
  });
});

describe('createPipeline', () => {
  it('fails with ask-your-surgeon when a setting is missing', () => {
    expect(createPipeline(ex({ kind: 'heel-slide' }), 'left', 1)).toMatchObject({ ok: false, reason: 'ask-your-surgeon' });
  });
});

describe('pipeline: margin events and tallies', () => {
  const heel = ex({ kind: 'heel-slide', targetFlexion: 45, maxFlexion: 50, returnWithinDeg: 18 });

  it('gives near-limit and counts the rep when the peak is inside the margin of the limit', () => {
    const { summary, events } = run(heel, trace(3, 52));
    expect(events).toContain('near-limit');
    expect(summary.reps).toBe(3);
    expect(summary.eventCounts.nearLimit).toBeGreaterThanOrEqual(1);
    expect(summary.eventCounts.overLimit).toBe(0);
  });

  it('gives over-limit and no count when the peak is above limit plus margin', () => {
    const { summary, events } = run(heel, trace(3, 75));
    expect(events).toContain('over-limit');
    expect(summary.reps).toBe(0);
    expect(summary.eventCounts.overLimit).toBeGreaterThanOrEqual(1);
  });

  it('gives too-fast only when the protocol sets minRepSeconds', () => {
    const fast = run(ex({ kind: 'heel-slide', targetFlexion: 45, minRepSeconds: 4, returnWithinDeg: 18 }), trace(4, 70, 2000));
    expect(fast.events).toContain('too-fast');
    expect(fast.summary.eventCounts.tooFast).toBeGreaterThanOrEqual(1);
    const none = run(ex({ kind: 'heel-slide', targetFlexion: 45, returnWithinDeg: 18 }), trace(4, 70, 2000));
    expect(none.events).not.toContain('too-fast');
  });
});

describe('pipeline: top angle against maxTopFlexion', () => {
  const slr = (over: Partial<Exercise> = {}) => ex({ kind: 'straight-leg-raise', ...over });

  function lift(exercise: Exercise, flex: number) {
    const made = createPipeline(exercise, 'left', 1);
    if (!made.ok) throw new Error('setup failed');
    let t = 0;
    const lying = { hip: { x: 0.3, y: 0.7 } };
    const frames = (f: number, angle: number, n: number) => {
      for (let i = 0; i < n; i++, t += DT) made.pipeline.step(legLandmarks('left', f, { ...lying, thighAngle: angle }), t);
    };
    frames(0, 0, 15);
    frames(flex, -Math.PI / 6, 40);
    frames(0, 0, 15);
    return made.pipeline.summary();
  }

  it('reports no state when the protocol sets no limit', () => {
    expect(lift(slr(), 25).topState).toBe('no-limit');
  });

  it('says above when the top angle is more than the margin over the limit', () => {
    expect(lift(slr({ maxTopFlexion: 10 }), 30).topState).toBe('above');
  });

  it('says cannot tell inside the margin', () => {
    expect(lift(slr({ maxTopFlexion: 20 }), 24).topState).toBe('cannot-tell');
  });

  it('says below when the top angle is more than the margin under the limit', () => {
    expect(lift(slr({ maxTopFlexion: 40 }), 10).topState).toBe('below');
  });

  it('says nothing for an exercise that is not a leg raise', () => {
    const made = createPipeline(ex({ kind: 'heel-slide', targetFlexion: 45 }), 'left', 1);
    if (!made.ok) throw new Error('setup failed');
    expect(made.pipeline.summary().topState).toBeNull();
  });
});
