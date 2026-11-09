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
// The lowest steady angle is the lowest plateau of the whole capture so far (F3). It does not depend on the moment of the press.

/** Where the starting angle came from: a still window (the rule of Setup), or the choice of the person. */
export type BaselineSource = 'still' | 'lowest';

export interface CaptureConfig {
  limitMs: number; // time with no still window after which the choice shows
  plateauMs: number; // the knee must stay at or below one angle for this long to make a plateau
  minLowestSamples: number; // fewer angles than this give no lowest steady angle
}

// ENGINEERING values, not clinical. No source exists. They only decide when the app offers a choice
// and which angles it reads. The clips (docs/accuracy.md): a heel slide cycle takes about 4 s, so 15 s hold several cycles.
// plateauMs 0.5 s: shorter than one pause at the bottom of a rep, longer than a frame glitch.
export const CAPTURE_CONFIG: CaptureConfig = {
  limitMs: 15000,
  plateauMs: 500,
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

interface Sample {
  tMs: number;
  flexion: number;
}

/**
 * Keeps the newest samples of one unbroken run, enough to cover `plateauMs`, and the lowest plateau seen so far.
 * A plateau is a window of at least `plateauMs` with no break. Its level is the highest angle in the window.
 * The lowest plateau is the window with the lowest level. Its value is the median of the angles in that window.
 * A lost leg breaks the run, so two short dips never join. The lowest plateau only goes down while the capture runs.
 */
export function createLowestPlateau(plateauMs: number) {
  let run: Sample[] = [];
  let lowest: { level: number; value: number } | null = null;
  return {
    push(tMs: number, flexion: number) {
      run.push({ tMs, flexion });
      // Keep one sample at or before the window start, so the window is fully covered.
      while ((run[1]?.tMs ?? Infinity) <= tMs - plateauMs) run.shift();
      if (tMs - (run[0] as Sample).tMs < plateauMs) return;
      const values = run.map((r) => r.flexion);
      const level = Math.max(...values);
      if (lowest === null || level < lowest.level) lowest = { level, value: median(values) };
    },
    /** A lost leg: the next samples start a new run. */
    breakRun() {
      run = [];
    },
    get value(): number | null {
      return lowest?.value ?? null;
    },
  };
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
  const plateau = createLowestPlateau(config.plateauMs);
  let seen = 0; // angles with the whole leg in view
  let startMs: number | null = null;
  let chosen: { baselineDeg: number; source: BaselineSource } | null = null;
  let tooBent = false;
  let lowestRefused = false; // the person pressed the button, and the lowest angle was a bent knee

  const state = (tMs: number, progress: number): CaptureState => ({
    phase: chosen ? 'done' : tMs - (startMs ?? tMs) >= config.limitMs ? 'choose' : 'finding',
    progress: chosen ? 1 : progress,
    baselineDeg: chosen?.baselineDeg ?? null,
    source: chosen?.source ?? null,
    canUseLowest: seen >= config.minLowestSamples,
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
        plateau.breakRun();
        lastProgress = 0;
        tooBent = false;
        lowestRefused = false;
        return state(tMs, 0);
      }
      seen++;
      plateau.push(tMs, flexionDeg);
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
    /** The person pressed "use my lowest steady angle". Returns null when too few angles were seen, no plateau exists yet, or the lowest angle is a bent knee. */
    useLowest(): CaptureState | null {
      if (chosen) return state(lastMs, 1);
      const lowest = plateau.value;
      if (seen < config.minLowestSamples || lowest === null) return null;
      if (lowest >= startBelowDeg) {
        lowestRefused = true;
        return null;
      }
      chosen = { baselineDeg: lowest, source: 'lowest' };
      return state(lastMs, 1);
    },
  };
}
