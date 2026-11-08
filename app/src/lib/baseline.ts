// The resting angle of the chosen leg (T17). It is the median flexion over the Setup hold-still.
// A rep ends when the knee is back within the protocol value `returnWithinDeg` of this angle.
// The estimated angle is not a medical measurement.
// The hold-still rule is the one of the setup check (isStill in still.ts). This file does not copy it.

import { flexion, kneeAngle, selectLeg, type Side } from './angle';
import type { SetupSample } from './setupRules';
import { isStill, type StillConfig } from './still';

// PROPOSAL, no source: a median of fewer samples is not steady enough to use. T13 must tune it on real video.
export const BASELINE_MIN_SAMPLES = 20;

export type BaselineResult =
  | { ok: true; baselineDeg: number }
  | { ok: false; reason: 'too-few-samples' | 'not-steady' };

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/**
 * `history` holds the Setup samples of the still window, newest last. `side` is the chosen leg.
 * The answer is a refusal when the leg did not hold still, or when too few samples show the whole leg.
 */
export function restingBaseline(
  history: SetupSample[],
  side: Side,
  aspect: number,
  config: StillConfig,
  minSamples: number = BASELINE_MIN_SAMPLES,
): BaselineResult {
  const values = history.flatMap((s) => {
    const [hip, knee, ankle] = selectLeg(s.landmarks, side);
    return flexion(kneeAngle(hip, knee, ankle, aspect)) ?? [];
  });
  if (values.length < minSamples) return { ok: false, reason: 'too-few-samples' };
  if (!isStill(history, side, aspect, config)) return { ok: false, reason: 'not-steady' };
  return { ok: true, baselineDeg: median(values) };
}
