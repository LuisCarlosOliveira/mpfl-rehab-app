// The new modes of the engine (Step B of docs/exercise-monitoring-design.md): person-timer, reps-cycle and lift.
// Each one is a small state machine with no clock and no camera of its own. The caller gives the time in milliseconds.
// Every number here is ENGINEERING. No source sets it. The screen says so.

import { OneEuroFilter } from '../oneEuro';

/** The data that a session of a new exercise gives to the stored record (the fields of storage/db.ts). */
export interface EngineData {
  /** Whole seconds of each hold that the person timed. 1 to 3600, at most 50 entries. */
  holdList?: number[];
  timedBy?: 'person';
  reportKey?: 'knee-angle-top' | 'ankle-range' | 'lift-angle';
  /** Degrees, every digit. A screen shows whole degrees. */
  reportValue?: number;
}

// ---- person-timer (quad set, gluteal set) -----------------------------------
// The camera has no signal for the effort. The person presses a button to start a hold and a button to end it.
// The screen (Step D) calls startHold and endHold. The timer never reads the camera for the effort.
// Only the knee flexion at the end of a hold is kept, as an optional report value, and only when the leg is seen.

export const HOLD_MIN_MS = 1000; // a shorter hold is dropped (a double press)
export const HOLD_MAX_S = 3600; // the limit of the stored field
export const HOLD_LIST_MAX = 50; // the limit of the stored field
export const KNEE_FRESH_MS = 500; // a knee reading older than this at the end of a hold is not used

export interface PersonTimer {
  startHold(tMs: number): void;
  endHold(tMs: number): void;
  /** The knee flexion in degrees, or null when the leg is not seen. It only feeds the report value. */
  sample(kneeFlexion: number | null, tMs: number): void;
  holding(): boolean;
  count(): number;
  data(): EngineData;
}

export function createPersonTimer(opts: { reportKnee: boolean }): PersonTimer {
  let startedAt: number | null = null;
  const holdList: number[] = [];
  let knee: { value: number; t: number } | null = null;
  let kneeTop: number | null = null;
  return {
    startHold(tMs) {
      if (startedAt === null) startedAt = tMs; // a second start while holding is ignored
    },
    endHold(tMs) {
      if (startedAt === null) return; // an end with no start is ignored
      const ms = tMs - startedAt;
      startedAt = null;
      if (ms < HOLD_MIN_MS || holdList.length >= HOLD_LIST_MAX) return;
      holdList.push(Math.min(HOLD_MAX_S, Math.round(ms / 1000)));
      if (opts.reportKnee && knee !== null && tMs - knee.t <= KNEE_FRESH_MS) {
        kneeTop = kneeTop === null ? knee.value : Math.max(kneeTop, knee.value);
      }
    },
    sample(kneeFlexion, tMs) {
      knee = opts.reportKnee && kneeFlexion !== null ? { value: kneeFlexion, t: tMs } : null;
    },
    holding: () => startedAt !== null,
    count: () => holdList.length,
    data() {
      const out: EngineData = { holdList: [...holdList], timedBy: 'person' };
      if (kneeTop !== null) {
        out.reportKey = 'knee-angle-top';
        out.reportValue = kneeTop;
      }
      return out;
    },
  };
}

// ---- reps-cycle (ankle pump) -------------------------------------------------
// One rep is one rise and one fall of the angle, each of at least `minAmplitude` degrees, each held for `minStateMs`.
// The first angle that the person shows is the baseline: a rise is measured from the lowest angle seen since the last rep.
// A null sample (the foot is not seen) restarts the time of a rise or a fall. The count stays.

export interface CycleConfig {
  minAmplitude: number; // degrees
  minStateMs: number;
}

export interface CycleState {
  phase: 'low' | 'high';
  /** The lowest angle since the last rep (phase low), or the highest angle of this rise (phase high). */
  ref: number | null;
  /** The lowest angle before the present rise. */
  base: number | null;
  since: number | null;
  reps: number;
  /** The largest rise seen, in degrees. */
  range: number;
}

export const cycleInitial = (): CycleState => ({ phase: 'low', ref: null, base: null, since: null, reps: 0, range: 0 });

export function cycleStep(state: CycleState, angle: number | null, t: number, cfg: CycleConfig): { state: CycleState; event: 'rep' | null } {
  if (angle === null) return { state: { ...state, since: null }, event: null };
  const s = { ...state };
  let event: 'rep' | null = null;
  if (s.phase === 'low') {
    s.ref = s.ref === null ? angle : Math.min(s.ref, angle);
    if (angle >= s.ref + cfg.minAmplitude) {
      s.since ??= t;
      if (t - s.since >= cfg.minStateMs) {
        s.phase = 'high';
        s.base = s.ref;
        s.ref = angle;
        s.since = null;
      }
    } else s.since = null;
  } else {
    s.ref = Math.max(s.ref as number, angle);
    s.range = Math.max(s.range, s.ref - (s.base as number));
    if (angle <= s.ref - cfg.minAmplitude) {
      s.since ??= t;
      if (t - s.since >= cfg.minStateMs) {
        s.reps += 1;
        s.phase = 'low';
        s.ref = angle;
        s.base = null;
        s.since = null;
        event = 'rep';
      }
    } else s.since = null;
  }
  return { state: s, event };
}

/**
 * The filter of the ankle angle. ENGINEERING, measured on the synthetic series of tests/monitor/repsCycle.test.ts.
 * The angle at the ankle uses the foot index, 0.08 of the picture from the ankle, so the 9 degree RMS noise model gives about 11 degrees
 * RMS on this angle (raw peak to peak 140 degrees in 2 minutes). The filter of the other exercises (1.5 Hz, beta 0.02) leaves a peak to peak of 90 degrees.
 * A plain low pass at 1.2 Hz with no speed term (beta 0) leaves about 3 degrees RMS at 30 frames each second. A pump of 0.5 Hz keeps 85 percent of its size.
 */
export const CYCLE_FILTER = { minCutoff: 1.2, beta: 0 };

/**
 * The smallest rise and fall that counts as a pump, in degrees. ENGINEERING, not clinical. No source sets it.
 * Measured on series of 3 minutes with a constant angle and the 9 degree RMS noise, through CYCLE_FILTER, at 30 frames each second:
 * 24 to 28 degrees counted a false pump in some series (up to 2 in one series). 30 degrees counted none in 30 series of 3 minutes.
 * The normal pump of the series (75 to 125 degrees) is 50 degrees. At 30 degrees, 40 series of 10 pumps gave 10 reps in 37 series and 9 in 3 (never more).
 * LIMIT: at 10 frames each second the same white noise has 3 times fewer samples to average. 30 series of 3 minutes gave 93 false pumps
 * (5 in the worst series) and 10 true pumps gave 6 to 10 reps. The value fits a camera at 30 frames each second. No real foot clip was tested.
 */
export const ANKLE_MIN_AMPLITUDE = 30;

export interface CycleDriver {
  /** `raw` is the angle at the ankle in degrees, or null when the foot is not seen. Returns the filtered angle. */
  sample(raw: number | null, t: number): { value: number | null; event: 'rep' | null };
  reps(): number;
  /** The largest rise seen, in degrees, or null before the first rise. */
  range(): number | null;
  data(): EngineData;
}

export function createCycleDriver(cfg: CycleConfig): CycleDriver {
  const filter = new OneEuroFilter(CYCLE_FILTER);
  let state = cycleInitial();
  return {
    sample(raw, t) {
      if (raw === null) {
        filter.reset();
        state = cycleStep(state, null, t, cfg).state;
        return { value: null, event: null };
      }
      const value = filter.filter(raw, t);
      const out = cycleStep(state, value, t, cfg);
      state = out.state;
      return { value, event: out.event };
    },
    reps: () => state.reps,
    range: () => (state.range > 0 ? state.range : null),
    data: () => (state.range > 0 ? { reportKey: 'ankle-range', reportValue: Math.min(180, state.range) } : {}),
  };
}
