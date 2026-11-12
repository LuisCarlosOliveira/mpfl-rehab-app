// The new modes of the engine (Step B of docs/exercise-monitoring-design.md): person-timer, reps-cycle and lift.
// Each one is a small state machine with no clock and no camera of its own. The caller gives the time in milliseconds.
// Every number here is ENGINEERING. No source sets it. The screen says so.

import { OneEuroFilter } from '../oneEuro';
import type { DirectionAux } from './measure';

/** The data that a session of a new exercise gives to the stored record (the fields of storage/db.ts). */
export interface EngineData {
  /** Whole seconds of each hold that the person timed. 1 to 3600, at most 50 entries. */
  holdList?: number[];
  timedBy?: 'person';
  reportKey?: 'ankle-range' | 'lift-angle';
  /** Degrees, every digit. A screen shows whole degrees. */
  reportValue?: number;
}

// ---- person-timer (quad set, gluteal set) -----------------------------------
// The camera has no signal for the effort. The person presses a button to start a hold and a button to end it.
// The screen (Step D) calls startHold and endHold. The timer never reads the camera.
// It gives no angle either (R-08): a knee angle next to a hold list reads as proof of effort, and the design forbids that.

export const HOLD_MIN_MS = 1000; // a shorter hold is dropped (a double press)
export const HOLD_MAX_S = 3600; // the limit of the stored field
export const HOLD_LIST_MAX = 50; // the limit of the stored field

/** The answer of endHold. The screen can show a polite line for a hold that is not saved. */
export interface EndHoldResult {
  saved: boolean;
  reason: 'ok' | 'too-short' | 'too-long' | 'list-full' | 'not-holding';
}

/**
 * The whole seconds of a hold: the time in milliseconds, rounded, at least 1. This is the value that the record stores.
 * The screen must use this function for the number that it shows, so the screen and the record agree (R-05).
 */
export const holdSeconds = (ms: number): number => Math.max(1, Math.round(ms / 1000));

export interface PersonTimer {
  startHold(tMs: number): void;
  endHold(tMs: number): EndHoldResult;
  holding(): boolean;
  count(): number;
  data(): EngineData;
}

export function createPersonTimer(): PersonTimer {
  let startedAt: number | null = null;
  const holdList: number[] = [];
  return {
    startHold(tMs) {
      if (startedAt === null) startedAt = tMs; // a second start while holding is ignored
    },
    endHold(tMs) {
      if (startedAt === null) return { saved: false, reason: 'not-holding' }; // an end with no start is ignored
      const ms = tMs - startedAt;
      startedAt = null;
      if (ms < HOLD_MIN_MS) return { saved: false, reason: 'too-short' };
      // A hold over the limit is dropped. A clamped value would not be the true time.
      if (holdSeconds(ms) > HOLD_MAX_S) return { saved: false, reason: 'too-long' };
      if (holdList.length >= HOLD_LIST_MAX) return { saved: false, reason: 'list-full' };
      holdList.push(holdSeconds(ms));
      return { saved: true, reason: 'ok' };
    },
    holding: () => startedAt !== null,
    count: () => holdList.length,
    data: () => ({ holdList: [...holdList], timedBy: 'person' }),
  };
}

// ---- reps-cycle (ankle pump) -------------------------------------------------
// One rep is one rise and one fall of the angle, each of at least `minAmplitude` degrees, each held for `minStateMs`.
// The first angle that the person shows is the baseline: a rise is measured from the lowest angle seen since the last rep.
// A null sample (the foot is not seen) restarts the time of a rise or a fall. The count stays.

export interface CycleConfig {
  minAmplitude: number; // degrees
  minStateMs: number;
  /** A rise that took longer than this, from the bottom to the amplitude, is a drift. It counts nothing. */
  maxRiseMs: number;
}

export interface CycleState {
  phase: 'low' | 'high';
  /** The lowest angle since the last rep (phase low), or the highest angle of this rise (phase high). */
  ref: number | null;
  /** The lowest angle before the present rise. */
  base: number | null;
  since: number | null;
  /** The last time the angle was near the bottom (within a quarter of the amplitude of the lowest angle). It starts the rise. */
  nearAt: number | null;
  reps: number;
  /** The largest rise seen, in degrees. */
  range: number;
}

export const cycleInitial = (): CycleState => ({ phase: 'low', ref: null, base: null, since: null, nearAt: null, reps: 0, range: 0 });

export function cycleStep(state: CycleState, angle: number | null, t: number, cfg: CycleConfig): { state: CycleState; event: 'rep' | null } {
  if (angle === null) return { state: { ...state, since: null }, event: null };
  const s = { ...state };
  let event: 'rep' | null = null;
  if (s.phase === 'low') {
    s.ref = s.ref === null ? angle : Math.min(s.ref, angle);
    if (angle <= s.ref + cfg.minAmplitude / 4) s.nearAt = t;
    if (angle >= s.ref + cfg.minAmplitude) {
      s.since ??= t;
      if (s.nearAt !== null && t - s.nearAt > cfg.maxRiseMs) {
        // R-10: the rise is too slow. It is a drift, not a pump. The reference moves to the present angle.
        s.ref = angle;
        s.nearAt = t;
        s.since = null;
      } else if (t - s.since >= cfg.minStateMs) {
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

/**
 * The longest rise of a pump, in milliseconds (R-10). ENGINEERING, not clinical. No source sets it.
 * A normal pump of the series rises 30 degrees in about 0.5 s and a slow pump (period 3 s) in about 0.8 s. A drift of 30 degrees over any time
 * would count as a pump without this limit. 4 s keeps the slowest pump of a person who moves with control and cuts a drift that takes 20 s.
 */
export const ANKLE_MAX_RISE_MS = 4000;

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

// ---- lift (leg raise to the side and to the back, and the straight leg raise) ------------------------------
// A lift counts once when the leg holds the raised state for `settleMs`. A lift ends when the leg stays down for `endMs`.
// A short dip in a hold counts no second rep. The state time of a lift that is not counted yet starts again after a dip.
// This is the logic of the straight leg raise (exercises.ts). The straight leg raise and the new lifts both use it (DRY).

export interface LiftConfig {
  settleMs: number;
  endMs: number;
}

export interface LiftState {
  settleSince: number | null;
  counted: boolean;
  belowSince: number | null;
}

export interface LiftOutput {
  lift: LiftState | null;
  /** The lift has held the settle time: the caller reads the top value now. */
  settled: boolean;
  /** The lift is counted on this sample. */
  counted: boolean;
  /** The lift ended on this sample. The caller closes it and the state is null. */
  closed: boolean;
}

/**
 * `raised` is true or false for a seen leg, and null when the leg is not seen. A leg that is not seen restarts the settle time
 * of a lift. A lift that is counted stays counted.
 */
export function liftStep(lift: LiftState | null, raised: boolean | null, t: number, cfg: LiftConfig): LiftOutput {
  const out: LiftOutput = { lift, settled: false, counted: false, closed: false };
  if (raised === null) {
    if (lift !== null) out.lift = { ...lift, settleSince: null };
    return out;
  }
  if (lift === null) {
    if (raised) out.lift = { settleSince: t, counted: false, belowSince: null };
    return out;
  }
  const l = { ...lift };
  out.lift = l;
  if (!raised) {
    l.belowSince ??= t;
    if (!l.counted) l.settleSince = null; // the settle time must run without a dip
    if (t - l.belowSince >= cfg.endMs) {
      out.lift = null;
      out.closed = true;
    }
    return out;
  }
  l.belowSince = null;
  l.settleSince ??= t;
  if (t - l.settleSince >= cfg.settleMs) {
    out.settled = true;
    if (!l.counted) {
      l.counted = true;
      out.counted = true;
    }
  }
  return out;
}

/** The filter of a segment angle. The same start values as the knee filter of exercises.ts. ENGINEERING. */
export const LIFT_FILTER = { minCutoff: 1.5, beta: 0.02 };

/** The foot must point at least this far from the ankle (square pixels) to give a vote for the facing direction. ENGINEERING. The foot of the series is 0.08. */
export const FOOT_MIN_DX = 0.02;
/** The votes of the foot that make the facing direction sure. */
const FACING_VOTES = 3;
const FACING_VOTES_MAX = 20;

export interface LiftDriver {
  /**
   * `raw` is the segment angle in degrees, or null when a landmark is not seen. Returns the filtered angle.
   * `aux` is needed for a directional lift only (the lift to the back).
   */
  sample(raw: number | null, t: number, aux?: DirectionAux): { value: number | null; event: 'rep' | null };
  /** A new set starts. The peak of the present lift is closed. The peak of the session stays. */
  newSet(): void;
  reps(): number;
  /** The largest peak of the session or of the present set. null before a lift. */
  peak(): number | null;
  setPeak(): number | null;
  data(): EngineData;
}

export interface LiftDriverConfig extends LiftConfig {
  liftAngle: number;
  /**
   * R-02: the lift counts only when the knee is BEHIND the hip along the facing direction (a forward swing counts nothing).
   * The facing direction comes from the foot index at rest: the foot points forward. Without a sure foot, `cameraFacing` is used
   * (+1 the person looks to the right of the picture, -1 to the left). Without both the driver does not guess: no count and no value.
   */
  directional?: { cameraFacing: 1 | -1 | null };
}

/**
 * The facing direction that follows from the camera side. A camera on the left of the person sees the left side of the person,
 * so the person looks to the left of the picture. The picture is the raw image of the pose model.
 */
export const facingFromCameraSide = (cameraSide: 'left' | 'right' | undefined): 1 | -1 | null =>
  cameraSide === undefined ? null : cameraSide === 'left' ? -1 : 1;

export function createLiftDriver(cfg: LiftDriverConfig): LiftDriver {
  const filter = new OneEuroFilter(LIFT_FILTER);
  let lift: LiftState | null = null;
  let top: number | null = null; // the largest angle of the present lift, read while the lift is settled
  let best: number | null = null;
  let setBest: number | null = null;
  let reps = 0;
  // R-01: no lift counts until the angle was seen below the gate. A person who is upright, or a leg that starts raised, is not a lift.
  let armed = false;
  let votes = 0;
  const close = () => {
    if (top !== null) {
      best = best === null ? top : Math.max(best, top);
      setBest = setBest === null ? top : Math.max(setBest, top);
    }
    top = null;
    lift = null;
  };
  const withNow = (b: number | null) => (top === null ? b : b === null ? top : Math.max(b, top));
  return {
    sample(raw, t, aux) {
      if (raw === null) {
        filter.reset();
        lift = liftStep(lift, null, t, cfg).lift;
        return { value: null, event: null };
      }
      const value = filter.filter(raw, t);
      if (value < cfg.liftAngle) armed = true;
      let backward = true;
      if (cfg.directional !== undefined) {
        // The foot votes at rest, when the leg is down and the foot lies flat.
        if (value < cfg.liftAngle && aux?.footDx != null && Math.abs(aux.footDx) >= FOOT_MIN_DX) {
          votes = Math.max(-FACING_VOTES_MAX, Math.min(FACING_VOTES_MAX, votes + Math.sign(aux.footDx)));
        }
        const facing = Math.abs(votes) >= FACING_VOTES ? Math.sign(votes) : cfg.directional.cameraFacing;
        if (facing === null || aux === undefined) {
          lift = liftStep(lift, null, t, cfg).lift;
          return { value: null, event: null };
        }
        backward = Math.sign(aux.kneeDx) === -facing;
      }
      const out = liftStep(lift, armed && backward && value >= cfg.liftAngle, t, cfg);
      lift = out.lift;
      if (out.settled) top = top === null ? value : Math.max(top, value);
      if (out.closed) close();
      if (out.counted) reps += 1;
      return { value, event: out.counted ? 'rep' : null };
    },
    newSet() {
      close();
      setBest = null;
    },
    reps: () => reps,
    peak: () => withNow(best),
    setPeak: () => withNow(setBest),
    data() {
      const p = withNow(best);
      return p === null ? {} : { reportKey: 'lift-angle', reportValue: Math.min(180, p) };
    },
  };
}

/**
 * The lift angle: a leg is raised when the filtered segment angle is at least this many degrees. ENGINEERING, not clinical. No source sets it.
 * Measured on 20 series of 3 minutes with a leg at rest (angle 0) and the 9 degree RMS noise, through LIFT_FILTER and the settle time of 500 ms:
 * - Side (hip to ankle, 0.4 long, noise about 2.6 degrees RMS): 4 degrees and more counted no lift, at 30 and at 10 frames each second. 3 degrees counted one (7 at 10 frames).
 * - Back (hip to knee, 0.2 long, noise about 5.2 degrees RMS): 8 degrees and more counted no lift. 6 degrees counted 8 at 10 frames. 5 degrees counted 4 (24 at 10 frames).
 * The values keep 2 to 2.5 times the noise limit. A normal lift of the series is 35 degrees (side) and 25 degrees (back): 10 lifts gave 10 reps in 20 of 20 series at both values.
 * A real lift to the back is smaller than the series. A lift that stays under the value counts no rep: this is a limit of the camera.
 * Real clips (CC BY, landmarks only, tests/fixtures/clipLifts.ts) changed both values:
 * - Back: a leg at rest reads 11 to 15 degrees on a real clip, so the gate 12 never ended a lift (B2: 1 rep, the eye counts 3). The gate 20 gave B2 3 of 3. The real peaks are 43 to 58 degrees.
 * - Side: the measure is the SIGNED angle of the hip to ankle line against the horizontal (the ankle above the hip is plus). A leg at rest reads -10 to -12 degrees.
 *   A raised leg reads +3 to +48. Signed gates 0, 2 and 4 gave S1 4, S2 2 and S3 2, the counts of the eye. The gate 3 is in the middle. This is a count on 3 clips, not a validation.
 */
export const LIFT_ANGLE_SIDE = 3;
export const LIFT_ANGLE_BACK = 20;
