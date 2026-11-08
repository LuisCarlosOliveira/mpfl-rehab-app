// Pure counters. Each one is (state, sample) -> { state, event }.
// A null flexion (leg not visible) pauses counting and keeps the state.
// All thresholds are tuning start values from the exercise definition.
// They are not clinical evidence.

export interface Sample {
  flexion: number | null; // degrees, 0 is full extension
  t: number; // milliseconds
}

// ---- Reps by peak (heel slide, mini squat) ---------------------------------

export interface RepsConfig {
  enter: number; // flexion that starts a rep
  exit: number; // flexion that ends a rep
  target: number; // the peak must reach this to count
  minStateMs: number; // a threshold must hold this long
  maxFlexion?: number; // ceiling from the protocol. Above it: alert, no count.
}

export interface RepsState {
  phase: 'EXTENDED' | 'FLEXED';
  candidateSince: number | null;
  peak: number;
  overLimit: boolean;
  reps: number;
}

export type RepsEvent = 'rep' | 'shallow' | 'over-limit' | 'paused' | null;

export const repsInitial = (): RepsState => ({
  phase: 'EXTENDED',
  candidateSince: null,
  peak: 0,
  overLimit: false,
  reps: 0,
});

export function repsStep(
  state: RepsState,
  sample: Sample,
  cfg: RepsConfig,
): { state: RepsState; event: RepsEvent } {
  if (sample.flexion === null) return { state, event: 'paused' };
  const { flexion, t } = sample;
  const s = { ...state };
  let event: RepsEvent = null;

  if (cfg.maxFlexion !== undefined && flexion > cfg.maxFlexion && !s.overLimit) {
    s.overLimit = true;
    event = 'over-limit';
  }

  if (s.phase === 'EXTENDED') {
    if (flexion >= cfg.enter) {
      if (s.candidateSince === null) {
        s.candidateSince = t;
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
      s.peak = 0;
      s.overLimit = false;
    }
  } else {
    s.peak = Math.max(s.peak, flexion);
    if (flexion <= cfg.exit) {
      if (s.candidateSince === null) s.candidateSince = t;
      if (t - s.candidateSince >= cfg.minStateMs) {
        if (!s.overLimit) {
          if (s.peak >= cfg.target) {
            s.reps += 1;
            event = 'rep';
          } else {
            event = 'shallow';
          }
        }
        s.phase = 'EXTENDED';
        s.candidateSince = null;
        s.peak = 0;
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
  enter: number; // flexion that counts as "in position"
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
  if (sample.flexion === null) return { state, event: 'paused' };
  const s = { ...state };
  let event: HoldEvent = null;
  if (sample.flexion >= cfg.enter) {
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
// The caller feeds samples while the leg is raised. The lag is the smallest
// flexion seen: the closest the knee came to full extension.

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
