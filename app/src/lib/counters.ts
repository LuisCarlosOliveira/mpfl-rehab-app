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
  overLimit: boolean; // the knee went above the limit plus the margin in this rep. The rep does not count.
  overAlerted: boolean; // the alert fired for the present time above the limit. A gap of no leg clears it (B4-02).
  reps: number;
  lastRepMs: number | null;
  blocked: CountBlock | null; // why no rep can count, or null
  lostSince: number | null; // the time of the first sample with no leg in the present gap (B4-02)
  repAfterGap: boolean; // the present rep began right after a gap of no leg. Its start time is unknown, so it gives no too-fast event (B5-06).
}

/** Why no rep can count: the protocol sets no return value, or Setup measured no resting angle. */
export type CountBlock = 'no-return-value' | 'no-baseline';

export function countBlock(cfg: Pick<RepsConfig, 'baseline' | 'returnWithin'>): CountBlock | null {
  if (cfg.returnWithin === undefined) return 'no-return-value';
  if (cfg.baseline === undefined) return 'no-baseline';
  return null;
}

export type RepsEvent = 'rep' | 'too-fast' | 'shallow' | 'near-limit' | 'over-limit' | 'paused' | null;

// ENGINEERING, not clinical. No source sets this value. A gap of no leg of this length ends the present time above the limit,
// so the alert fires again when the knee comes back above it (B4-02, FR8). A shorter gap, for example one lost frame, does not repeat it.
export const LIMIT_GAP_RESET_MS = 500;

export const repsInitial = (): RepsState => ({
  phase: 'EXTENDED',
  candidateSince: null,
  repStart: null,
  peak: 0,
  nearLimit: false,
  overLimit: false,
  overAlerted: false,
  reps: 0,
  lastRepMs: null,
  blocked: null,
  lostSince: null,
  repAfterGap: false,
});

export function repsStep(
  state: RepsState,
  sample: Sample,
  cfg: RepsConfig,
): { state: RepsState; event: RepsEvent } {
  if (sample.flexion === null) {
    const lostSince = state.lostSince ?? sample.t;
    const longGap = sample.t - lostSince >= LIMIT_GAP_RESET_MS;
    return {
      state: { ...state, candidateSince: null, lostSince, nearLimit: longGap ? false : state.nearLimit, overAlerted: longGap ? false : state.overAlerted },
      event: 'paused',
    };
  }
  const { flexion, t } = sample;
  const margin = cfg.margin ?? 0;
  const afterGap = state.lostSince !== null && t - state.lostSince >= LIMIT_GAP_RESET_MS;
  const s = { ...state, blocked: countBlock(cfg), lostSince: null };
  const exit = s.blocked === null ? (cfg.baseline as number) + (cfg.returnWithin as number) : null;
  let event: RepsEvent = null;

  if (cfg.maxFlexion !== undefined) {
    if (flexion > cfg.maxFlexion + margin && !s.overAlerted) {
      s.overLimit = true;
      s.overAlerted = true;
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
      s.overAlerted = false;
    }
    return { state: s, event };
  }

  if (s.phase === 'EXTENDED') {
    if (flexion >= cfg.enter) {
      if (s.candidateSince === null) {
        s.candidateSince = t;
        s.repStart = t;
        s.repAfterGap = afterGap;
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
      s.overAlerted = false;
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
            const fast = !s.repAfterGap && cfg.minRepMs !== undefined && s.lastRepMs !== null && s.lastRepMs < cfg.minRepMs;
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
        s.overAlerted = false;
      s.overAlerted = false;
      }
    } else {
      s.candidateSince = null;
    }
  }
  return { state: s, event };
}

// ---- Hold timer (seated knee extension hold) -------------------------------
// The hold runs between the straightest angle that the clinician allows (`arcEnd.limit`, the field minFlexion)
// and the hold angle (`threshold`, the field targetFlexion plus the margin). Margin rule (FR8, T28):
// - Flexion below the limit minus the margin: over-limit. The knee is straighter than allowed. No count, the timer restarts.
// - Flexion from there up to the limit plus the margin: near-limit once. The hold still counts.
// - Flexion above the threshold while the timer runs: hold-restart. The knee left the hold angle.
// A hold that is already counted gives no restart cue when the foot goes down.

export interface HoldConfig {
  direction: 'at-least' | 'at-most'; // in position when flexion is at least or at most the threshold
  threshold: number;
  minHoldMs: number;
  /** The straightest allowed angle. Missing means no arc end check (minFlexion 0 allows full extension). */
  arcEnd?: { limit: number; margin: number };
}

export interface HoldState {
  since: number | null;
  counted: boolean;
  holds: number;
  nearLimit: boolean;
  overLimit: boolean;
}

export type HoldEvent = 'hold-complete' | 'hold-restart' | 'near-limit' | 'over-limit' | 'paused' | null;

export const holdInitial = (): HoldState => ({ since: null, counted: false, holds: 0, nearLimit: false, overLimit: false });

export function holdStep(
  state: HoldState,
  sample: Sample,
  cfg: HoldConfig,
): { state: HoldState; event: HoldEvent } {
  if (sample.flexion === null) return { state: { ...state, since: null, counted: false }, event: 'paused' };
  const s = { ...state };
  const { flexion } = sample;
  const arc = cfg.arcEnd;
  const over = arc !== undefined && flexion < arc.limit - arc.margin;
  const near = arc !== undefined && !over && flexion <= arc.limit + arc.margin;
  let event: HoldEvent = null;
  if (over && !s.overLimit) {
    s.overLimit = true;
    event = 'over-limit';
  } else if (near && !s.nearLimit && !s.overLimit) {
    s.nearLimit = true;
    event = 'near-limit';
  }
  if (arc !== undefined && flexion > arc.limit + arc.margin) {
    s.nearLimit = false;
    s.overLimit = false;
  }
  const inPosition = !over && (cfg.direction === 'at-least' ? flexion >= cfg.threshold : flexion <= cfg.threshold);
  if (inPosition) {
    if (s.since === null) s.since = sample.t;
    if (!s.counted && sample.t - s.since >= cfg.minHoldMs) {
      s.counted = true;
      s.holds += 1;
      event = 'hold-complete';
    }
  } else {
    if (s.since !== null && !s.counted && !over && event === null) event = 'hold-restart';
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
