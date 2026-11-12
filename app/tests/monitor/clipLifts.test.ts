// Real clips (CC BY, landmarks only, tests/fixtures/clipLifts.ts) through the real measure and the real lift driver of the registry.
// The eye counts come from a person who watched each clip. The back lift of the cross clips 03 and 04 is a straight leg raise, so it must count 0 or 1.
import { describe, expect, it } from 'vitest';
import type { Landmark } from '../../src/lib/angle';
import { directionAux, readMeasure } from '../../src/lib/monitor/measure';
import { createLiftDriver, facingFromCameraSide } from '../../src/lib/monitor/modes';
import { specFor } from '../../src/lib/monitor/registry';
import * as clips from '../fixtures/clipLifts';

type Pose = 'leg-raise-side' | 'leg-raise-back';
const thr = (pose: Pose, name: string) => specFor(pose)!.thresholds.find((t) => t.name === name)!.value as number;

/** Builds the 33 landmark list with only the four ids of one leg set (hip, knee, ankle, foot index). */
function frame(row: number[], side: 'left' | 'right'): Landmark[] | null {
  if (row.length === 1) return null;
  const ids = side === 'left' ? [23, 25, 27, 31] : [24, 26, 28, 32];
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  ids.forEach((id, i) => (lm[id] = { x: row[1 + 3 * i] ?? 0, y: row[2 + 3 * i] ?? 0, visibility: row[3 + 3 * i] ?? 0 }));
  return lm;
}

function count(pose: Pose, clip: clips.ClipWindow, camera?: 'left' | 'right'): number {
  const spec = specFor(pose)!;
  const d = createLiftDriver({
    liftAngle: thr(pose, 'lift-angle'),
    settleMs: thr(pose, 'raise-settle-ms'),
    endMs: thr(pose, 'lift-end-ms'),
    directional: pose === 'leg-raise-back' ? { cameraFacing: facingFromCameraSide(camera) } : undefined,
  });
  for (const row of clip.rows) {
    const lm = frame(row, clip.side);
    const raw = lm ? readMeasure(spec.measure, lm, clip.side, clip.aspect) : null;
    d.sample(raw, row[0] ?? 0, lm ? (directionAux(lm, clip.side, clip.aspect) ?? undefined) : undefined);
  }
  return d.reps();
}

describe('leg raise to the back on real clips (gate 20 degrees)', () => {
  it('counts the 3 lifts that B2 shows (a resting leg reads 11 to 15 degrees, so a gate of 12 never ends a lift)', () => {
    expect(count('leg-raise-back', clips.B2, 'right')).toBe(3);
  });
  it('counts the lifts of B3 (3 in this window)', () => {
    expect(count('leg-raise-back', clips.B3, 'right')).toBe(3);
  });
  it('counts 0 or 1 on the straight leg raise clips 03 and 04, with the camera on either side', () => {
    for (const cam of ['left', 'right'] as const)
      for (const c of [clips.C03, clips.C04]) expect(count('leg-raise-back', c, cam)).toBeLessThanOrEqual(1);
  });
});

describe('leg raise to the side on real clips (signed angle, gate 3 degrees)', () => {
  // The eye counts of the whole clips are S1 4, S2 2 and S3 2. The window of S1 holds 3 of the 4 lifts.
  it('S1 gives 3 in its window', () => expect(count('leg-raise-side', clips.S1)).toBe(3));
  it('S2 gives 2 (the leg rests at -10 degrees and rises to +5 to +8)', () => expect(count('leg-raise-side', clips.S2)).toBe(2));
  it('S3 gives 2', () => expect(count('leg-raise-side', clips.S3)).toBe(2));
});
