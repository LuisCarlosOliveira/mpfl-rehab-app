// Skeleton fix C: the ankle pump anchors on the hip (landmark 23 or 24), like the other exercises. Before, its anchor was the KNEE (the first
// point of knee, ankle, foot index), so a knee that moved by 0.1 of the width started the lockout and the probe for a second person.
import { describe, expect, it } from 'vitest';
import { createPipeline, type Pipeline } from '../src/lib/exercises';
import type { Landmark } from '../src/lib/angle';
import { makeSeries, type SeriesFrame } from './helpers/landmarkSeries';

const KNEE = 25; // left leg
const CYCLES = 12; // 24 s of pumps at the default period of 2 s
const make = (): Pipeline => {
  const made = createPipeline({ kind: 'ankle-pump', source: 'PROPOSAL' }, 'left', 1, {});
  if (!made.ok) throw new Error('setup');
  return made.pipeline;
};
const base = () => makeSeries({ pose: 'ankle-pump', cycles: CYCLES + 1 });
const until = (CYCLES + 0.15) * 2000;

/** Moves the knee along the leg (toward the hip), so the angle at the ankle stays as it is. `dx` is in fractions of the width. */
const withKnee = (dx: (tMs: number) => number) =>
  base().frames.map((f): SeriesFrame => {
    const lm = (f.landmarks as Landmark[]).map((p) => ({ ...p }));
    lm[KNEE] = { ...lm[KNEE]!, x: lm[KNEE]!.x - dx(f.tMs) };
    return { ...f, landmarks: lm as SeriesFrame['landmarks'] };
  });

function run(frames: SeriesFrame[]) {
  const p = make();
  let locked = false;
  let probe = false;
  let seen = 0;
  for (const f of frames) {
    if (f.tMs > until) break;
    const o = p.step(f.landmarks as Landmark[], f.tMs);
    locked ||= !!o.lockedOut;
    probe ||= !!o.probe;
    if (o.flexion !== null) seen += 1;
  }
  return { locked, probe, seen, reps: p.summary().reps };
}

describe('ankle pump: the knee is not the anchor', () => {
  const still = run(base().frames);

  it('the series with no knee move counts every pump and has no lockout (the reference)', () => {
    expect(still).toMatchObject({ locked: false, probe: false, reps: CYCLES });
  });

  it('a knee that drifts 0.12 of the width in 5 s: no lockout, no probe, the same reps', () => {
    const r = run(withKnee((t) => 0.12 * Math.min(1, t / 5000)));
    expect(r).toMatchObject({ locked: false, probe: false, reps: CYCLES });
    expect(r.seen).toBe(still.seen);
  });

  it('a knee that steps by 0.12 of the width and stays there (a far knee for 20 s): no lockout, no probe, the same reps', () => {
    const r = run(withKnee((t) => (t >= 3000 ? 0.12 : 0)));
    expect(r).toMatchObject({ locked: false, probe: false, reps: CYCLES });
    expect(r.seen).toBe(still.seen);
  });

  it('a knee that moves with each pump by 0.12 (a fast bob): no lockout, no probe', () => {
    const r = run(withKnee((t) => 0.06 * (1 - Math.cos((2 * Math.PI * t) / 2000))));
    expect(r.locked).toBe(false);
    expect(r.probe).toBe(false);
  });

  it('the protection stays: a hip that jumps by 0.3 of the width (another person) reads as not seen and starts the lockout after 4 s', () => {
    const frames = base().frames.map((f): SeriesFrame => {
      if (f.tMs < 3000) return f;
      const lm = (f.landmarks as Landmark[]).map((p) => (p.visibility! > 0 ? { ...p, x: p.x + 0.3 } : p));
      return { ...f, landmarks: lm as SeriesFrame['landmarks'] };
    });
    const r = run(frames);
    expect(r.locked).toBe(true);
    expect(r.probe).toBe(true);
  });
});
