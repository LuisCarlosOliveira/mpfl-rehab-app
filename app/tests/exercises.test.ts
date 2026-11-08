import { counterSetup, createPipeline, isLegRaised } from '../src/lib/exercises';
import type { Exercise } from '../src/lib/protocol';
import { gauss, legLandmarks, rng } from './helpers/leg';

const ex = (over: Partial<Exercise> & Pick<Exercise, 'kind'>): Exercise => ({ source: 'PROPOSAL', ...over });

describe('counterSetup', () => {
  it('builds rep thresholds from the protocol target for a heel slide', () => {
    const r = counterSetup(ex({ kind: 'heel-slide', targetFlexion: 60, maxFlexion: 90 }));
    expect(r).toMatchObject({ ok: true, kind: 'reps', config: { target: 60, maxFlexion: 90, minStateMs: 300 } });
    if (r.ok && r.kind === 'reps') {
      expect(r.config.enter).toBeCloseTo(48);
      expect(r.config.exit).toBeCloseTo(18);
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

  it('builds an extended hold from holdSeconds', () => {
    const r = counterSetup(ex({ kind: 'seated-extension-hold', holdSeconds: 5, targetFlexion: 0 }));
    expect(r).toMatchObject({ ok: true, kind: 'hold', config: { direction: 'at-most', threshold: 10, minHoldMs: 5000 } });
  });

  it('asks the surgeon when a hold has no duration', () => {
    expect(counterSetup(ex({ kind: 'seated-extension-hold' }))).toMatchObject({ ok: false, missing: 'holdSeconds' });
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

function run(exercise: Exercise, flexions: number[], opts: { noise?: number; lose?: [number, number] } = {}) {
  const made = createPipeline(exercise, 'left', 1);
  if (!made.ok) throw new Error('setup failed');
  const next = rng(11);
  const events: string[] = [];
  flexions.forEach((f, i) => {
    const lost = opts.lose && i >= opts.lose[0] && i < opts.lose[1];
    const landmarks = lost
      ? null
      : legLandmarks('left', f, { noise: opts.noise ? () => gauss(next, opts.noise as number) : undefined });
    const out = made.pipeline.step(landmarks, i * DT);
    if (out.event) events.push(out.event);
  });
  return { summary: made.pipeline.summary(), events };
}

describe('replay: heel slide through the whole chain', () => {
  const heel = ex({ kind: 'heel-slide', targetFlexion: 60, maxFlexion: 90 });

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
    const squat = ex({ kind: 'mini-squat', targetFlexion: 30, maxFlexion: 50 });
    const { summary, events } = run(squat, trace(3, 70));
    expect(events).toContain('over-limit');
    expect(summary.reps).toBe(0);
  });

  it('counts reps that stay inside the limit', () => {
    const squat = ex({ kind: 'mini-squat', targetFlexion: 30, maxFlexion: 50 });
    expect(run(squat, trace(5, 40)).summary.reps).toBe(5);
  });
});

describe('replay: seated extension hold', () => {
  const hold = ex({ kind: 'seated-extension-hold', holdSeconds: 2, targetFlexion: 0 });

  it('completes one hold after 2 seconds in extension', () => {
    const f = Array.from({ length: Math.round(2500 / DT) }, () => 3);
    expect(run(hold, f).summary.holds).toBe(1);
  });

  it('resets when the knee bends', () => {
    const f = [
      ...Array.from({ length: Math.round(1500 / DT) }, () => 3),
      ...Array.from({ length: 10 }, () => 40),
      ...Array.from({ length: Math.round(1500 / DT) }, () => 3),
    ];
    expect(run(hold, f).summary.holds).toBe(0);
  });
});

describe('replay: straight leg raise lag', () => {
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

  it('reports the worst lag over the lifts', () => {
    const s = lifts([8, 4, 6]);
    expect(s.extensionLag).not.toBeNull();
    expect(s.extensionLag as number).toBeGreaterThan(6);
    expect(s.extensionLag as number).toBeLessThan(10);
  });

  it('reports null lag when the leg never rises', () => {
    const made = createPipeline(slr, 'left', 1);
    if (!made.ok) throw new Error('setup failed');
    for (let i = 0; i < 30; i++) made.pipeline.step(legLandmarks('left', 0, { hip: { x: 0.3, y: 0.7 }, thighAngle: 0 }), i * DT);
    expect(made.pipeline.summary().extensionLag).toBeNull();
  });
});

describe('createPipeline', () => {
  it('fails with ask-your-surgeon when a setting is missing', () => {
    expect(createPipeline(ex({ kind: 'heel-slide' }), 'left', 1)).toMatchObject({ ok: false, reason: 'ask-your-surgeon' });
  });
});
