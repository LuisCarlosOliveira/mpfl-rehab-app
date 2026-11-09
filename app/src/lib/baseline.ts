// The resting angle of the chosen leg (T17). It is the median flexion over the Setup hold-still.
// A rep ends when the knee is back within the protocol value `returnWithinDeg` of this angle.
// The estimated angle is not a medical measurement.
// The hold-still rule is the one of the setup check (isStill in still.ts). This file does not copy it.

import { flexion, kneeAngle, selectLeg, type Landmark, type Side } from './angle';
import type { SetupSample } from './setupRules';
import { calmRun, isStill, type StillConfig } from './still';

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

// ---- In-place capture (F1) -------------------------------------------------------------------
// Session uses this when Setup gave no resting angle. It runs the same still rule on the live samples.
// If the person never holds still, the person can choose the lowest steady angle. The app never takes it alone.

/** Where the starting angle came from: a still window (the rule of Setup), or the choice of the person. */
export type BaselineSource = 'still' | 'lowest';

export interface CaptureConfig {
  limitMs: number; // time with no still window after which the choice shows
  lowestWindowMs: number; // the angles of this last span count for the lowest steady angle
  lowestFraction: number; // the share of the lowest angles that the median is taken of
  minLowestSamples: number; // fewer angles than this give no lowest steady angle
}

// ENGINEERING values, not clinical. No source exists. They only decide when the app offers a choice
// and which angles it reads. The clips (docs/accuracy.md): a heel slide cycle takes about 4 s, so 15 s hold several cycles.
export const CAPTURE_CONFIG: CaptureConfig = {
  limitMs: 15000,
  lowestWindowMs: 15000,
  lowestFraction: 0.25,
  minLowestSamples: 20,
};

export interface CaptureState {
  phase: 'finding' | 'choose' | 'done';
  /** Share of the still window that the leg has held still, from 0 to 1. */
  progress: number;
  baselineDeg: number | null;
  source: BaselineSource | null;
  /** True when enough angles were seen for the lowest steady angle. */
  canUseLowest: boolean;
  /** True when the leg holds still but the knee is as bent as the start of a rep. That is a hold, not a resting angle. */
  tooBent: boolean;
}

/** The median of the lowest `fraction` of the angles. One outlier frame does not move it. */
export function lowestSteadyAngle(flexions: number[], fraction: number): number {
  const sorted = [...flexions].sort((a, b) => a - b);
  return median(sorted.slice(0, Math.max(1, Math.round(sorted.length * fraction))));
}

/**
 * `startBelowDeg` is the flexion at which the counter starts a rep (`enter`, 0.8 of the protocol target, a PROPOSAL).
 * A still window or a lowest angle at or above it is a hold at the bottom of a rep, not a start. The capture refuses it.
 * Without this check, a hold at the peak becomes the starting angle and every rep ends at once.
 *
 * `push` takes each pose result, with the filtered flexion of the chosen leg (null when the leg is not whole in view).
 * A lost leg starts the still window again. `useLowest` is for the button that the person presses. Nothing else sets that source.
 */
export function createBaselineCapture(
  side: Side,
  aspect: number,
  still: StillConfig,
  startBelowDeg: number = Infinity,
  config: CaptureConfig = CAPTURE_CONFIG,
) {
  let history: SetupSample[] = [];
  const angles: { tMs: number; flexion: number }[] = [];
  let startMs: number | null = null;
  let chosen: { baselineDeg: number; source: BaselineSource } | null = null;
  let tooBent = false;
  let lowestRefused = false; // the person pressed the button, and the lowest angle was a bent knee

  const state = (tMs: number, progress: number): CaptureState => ({
    phase: chosen ? 'done' : tMs - (startMs ?? tMs) >= config.limitMs ? 'choose' : 'finding',
    progress: chosen ? 1 : progress,
    baselineDeg: chosen?.baselineDeg ?? null,
    source: chosen?.source ?? null,
    canUseLowest: angles.length >= config.minLowestSamples,
    tooBent: tooBent || lowestRefused,
  });

  let lastMs = 0;
  let lastProgress = 0;
  return {
    push(landmarks: Landmark[] | null, tMs: number, flexionDeg: number | null): CaptureState {
      lastMs = tMs;
      startMs ??= tMs;
      if (chosen) return state(tMs, 1);
      if (landmarks === null || flexionDeg === null) {
        history = [];
        lastProgress = 0;
        tooBent = false;
        lowestRefused = false;
        return state(tMs, 0);
      }
      angles.push({ tMs, flexion: flexionDeg });
      while (angles[0] && angles[0].tMs < tMs - config.lowestWindowMs) angles.shift();
      history = calmRun([...history, { tMs, landmarks }], side, aspect, still.stillMaxMove);
      // Keep one sample at or before the window start, so the window is fully covered.
      while ((history[1]?.tMs ?? Infinity) <= tMs - still.stillWindowMs) history.shift();
      const first = history[0];
      lastProgress = first ? Math.min(1, (tMs - first.tMs) / still.stillWindowMs) : 0;
      tooBent = false;
      if (lastProgress >= 1) {
        const rest = restingBaseline(history, side, aspect, still);
        if (rest.ok && rest.baselineDeg < startBelowDeg) chosen = { baselineDeg: rest.baselineDeg, source: 'still' };
        else if (rest.ok) tooBent = true;
      }
      return state(tMs, lastProgress);
    },
    /** The person pressed "use my lowest steady angle". Returns null when too few angles were seen or the lowest angle is a bent knee. */
    useLowest(): CaptureState | null {
      if (chosen) return state(lastMs, 1);
      if (angles.length < config.minLowestSamples) return null;
      const lowest = lowestSteadyAngle(angles.map((a) => a.flexion), config.lowestFraction);
      if (lowest >= startBelowDeg) {
        lowestRefused = true;
        return null;
      }
      chosen = { baselineDeg: lowest, source: 'lowest' };
      return state(lastMs, 1);
    },
  };
}
