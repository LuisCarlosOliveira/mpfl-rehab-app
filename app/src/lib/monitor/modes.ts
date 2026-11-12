// The new modes of the engine (Step B of docs/exercise-monitoring-design.md): person-timer, reps-cycle and lift.
// Each one is a small state machine with no clock and no camera of its own. The caller gives the time in milliseconds.
// Every number here is ENGINEERING. No source sets it. The screen says so.

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
