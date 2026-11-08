// Pure counters. Each one is (state, sample) -> { state, event }.
// A null flexion (leg not visible) pauses counting. The count stays. A timer that was running
// restarts, because time with the leg out of view must not count as time in a state.
// The internal name `lag` stays for the straight leg raise. It now holds the top angle.
// All thresholds are tuning start values from the exercise definition.
// They are not clinical evidence.

export interface Sample {
  flexion: number | null; // degrees, 0 is full extension
  t: number; // milliseconds
}

// ---- Reps by peak (heel slide, mini squat) ---------------------------------
// Margin rule (FR8). `margin` is the camera error in degrees (see margin.ts).
// - A rep counts if the peak reaches the target minus the margin.
// - From the ceiling minus the margin the event is near-limit. The rep still counts.
// - Above the ceiling plus the margin the event is over-limit. The rep does not count.
// A rep ends when the flexion is back within `returnWithin` degrees of the `baseline`, the resting
// angle that Setup measured (PROPOSAL, T17: the knowledge base has no source for a fixed return value).
// The protocol sets `returnWithin`. The app has no default. Without it, or without a baseline, no rep counts
// and the state says why (`blocked`). The ceiling alerts stay on, because they are a safety rule.
// The rep time runs from the first sample at the entry threshold to the first sample at
// the end of the rep. It does not include the slow start of the movement.

export interface RepsConfig {
  enter: number; // flexion that starts a rep
  baseline?: number; // resting flexion measured in Setup. Missing means no rep counts.
  returnWithin?: number; // protocol value: a rep ends within this many degrees of the baseline. Missing means no rep counts.
  target: number; // the peak must reach this, minus the margin, to count
  minStateMs: number; // a threshold must hold this long
  maxFlexion?: number; // ceiling from the protocol
  margin?: number; // camera error in degrees. Zero or missing means no margin.
  minRepMs?: number; // from the protocol. Missing means no too-fast event.
}

export interface RepsState {
  phase: 'EXTENDED' | 'FLEXED';
  candidateSince: number | null;
  repStart: number | null;
  peak: number;
  nearLimit: boolean;
  overLimit: boolean;
  reps: number;
  lastRepMs: number | null;
  blocked: CountBlock | null; // why no rep can count, or null
}

/** Why no rep can count: the protocol sets no return value, or Setup measured no resting angle. */
export type CountBlock = 'no-return-value' | 'no-baseline';

export function countBlock(cfg: Pick<RepsConfig, 'baseline' | 'returnWithin'>): CountBlock | null {
  if (cfg.returnWithin === undefined) return 'no-return-value';
  if (cfg.baseline === undefined) return 'no-baseline';
  return null;
}

export type RepsEvent = 'rep' | 'too-fast' | 'shallow' | 'near-limit' | 'over-limit' | 'paused' | null;

export const repsInitial = (): RepsState => ({
  phase: 'EXTENDED',
  candidateSince: null,
  repStart: null,
  peak: 0,
  nearLimit: false,
  overLimit: false,
  reps: 0,
  lastRepMs: null,
  blocked: null,
});

export function repsStep(
  state: RepsState,
  sample: Sample,
  cfg: RepsConfig,
): { state: RepsState; event: RepsEvent } {
  if (sample.flexion === null) return { state: { ...state, candidateSince: null }, event: 'paused' };
  const { flexion, t } = sample;
  const margin = cfg.margin ?? 0;
  const s = { ...state, blocked: countBlock(cfg) };
  const exit = s.blocked === null ? (cfg.baseline as number) + (cfg.returnWithin as number) : null;
  let event: RepsEvent = null;

  if (cfg.maxFlexion !== undefined) {
    if (flexion > cfg.maxFlexion + margin && !s.overLimit) {
      s.overLimit = true;
      event = 'over-limit';
    } else if (flexion >= cfg.maxFlexion - margin && !s.nearLimit && !s.overLimit) {
      s.nearLimit = true;
      event = 'near-limit';
    }
  }

  if (exit === null) {
    // No rep can count. A lift ends for the ceiling alerts when the knee goes below the enter value.
    if (flexion < cfg.enter) {
      s.nearLimit = false;
      s.overLimit = false;
    }
    return { state: s, event };
  }

  if (s.phase === 'EXTENDED') {
    if (flexion >= cfg.enter) {
      if (s.candidateSince === null) {
        s.candidateSince = t;
        s.repStart = t;
        s.peak = flexion;
      } else {
        s.peak = Math.max(s.peak, flexion);
      }
      if (t - s.candidateSince >= cfg.minStateMs) {
        s.phase = 'FLEXED';
        s.candidateSince = null;
      }
    } else {
      s.candidateSince = null;
      s.repStart = null;
      s.peak = 0;
      s.nearLimit = false;
      s.overLimit = false;
    }
  } else {
    s.peak = Math.max(s.peak, flexion);
    if (flexion <= exit) {
      if (s.candidateSince === null) s.candidateSince = t;
      if (t - s.candidateSince >= cfg.minStateMs) {
        if (!s.overLimit) {
          if (s.peak >= cfg.target - margin) {
            s.reps += 1;
            s.lastRepMs = s.repStart === null ? null : s.candidateSince - s.repStart;
            const fast = cfg.minRepMs !== undefined && s.lastRepMs !== null && s.lastRepMs < cfg.minRepMs;
            event = fast ? 'too-fast' : 'rep';
          } else {
            event = 'shallow';
          }
        }
        s.phase = 'EXTENDED';
        s.candidateSince = null;
        s.repStart = null;
        s.peak = 0;
        s.nearLimit = false;
        s.overLimit = false;
      }
    } else {
      s.candidateSince = null;
    }
  }
  return { state: s, event };
}

// ---- Hold timer (seated knee extension hold) -------------------------------

export interface HoldConfig {
  direction: 'at-least' | 'at-most'; // in position when flexion is at least or at most the threshold
  threshold: number;
  minHoldMs: number;
}

export interface HoldState {
  since: number | null;
  counted: boolean;
  holds: number;
}

export type HoldEvent = 'hold-complete' | 'paused' | null;

export const holdInitial = (): HoldState => ({ since: null, counted: false, holds: 0 });

export function holdStep(
  state: HoldState,
  sample: Sample,
  cfg: HoldConfig,
): { state: HoldState; event: HoldEvent } {
  if (sample.flexion === null) return { state: { ...state, since: null, counted: false }, event: 'paused' };
  const s = { ...state };
  let event: HoldEvent = null;
  const inPosition = cfg.direction === 'at-least' ? sample.flexion >= cfg.threshold : sample.flexion <= cfg.threshold;
  if (inPosition) {
    if (s.since === null) s.since = sample.t;
    if (!s.counted && sample.t - s.since >= cfg.minHoldMs) {
      s.counted = true;
      s.holds += 1;
      event = 'hold-complete';
    }
  } else {
    s.since = null;
    s.counted = false;
  }
  return { state: s, event };
}

// ---- Extension lag (straight leg raise) ------------------------------------
// The caller feeds samples while the leg is raised. The value is the smallest
// flexion seen: the closest the knee came to full extension. The pipeline reports it
// as the estimated angle at the top. The word "lag" is only an internal name.

export interface LagState {
  lag: number | null;
}

export type LagEvent = 'paused' | null;

export const lagInitial = (): LagState => ({ lag: null });

export function lagStep(state: LagState, sample: Sample): { state: LagState; event: LagEvent } {
  if (sample.flexion === null) return { state, event: 'paused' };
  const lag = state.lag === null ? sample.flexion : Math.min(state.lag, sample.flexion);
  return { state: { lag }, event: null };
}
