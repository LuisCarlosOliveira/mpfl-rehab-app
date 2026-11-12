// Exercise definitions and the pipeline: landmarks -> angle -> filter -> counter.
// Every threshold here is a TUNING START VALUE. It is not clinical evidence.
// The knowledge base has no source for any of them. They are PROPOSAL values for tuning on
// real video (T13). The only number with a source is the margin (margin.ts).
// The protocol (set by the clinician) supplies targets and ceilings.
// A missing value gives "ask your surgeon". The app sets no default.
// A rep ends when the knee is back within `returnWithinDeg` of the resting angle (T17, PROPOSAL). The old fixed
// fraction of the target is gone from the app path. Without a protocol value or a baseline no rep counts.

import { MIN_VISIBILITY, flexion, kneeAngle, selectFoot, selectLeg, type Landmark, type Side } from './angle';
import {
  countBlock,
  holdInitial,
  holdStep,
  lagInitial,
  lagStep,
  repsInitial,
  repsStep,
  type CountBlock,
  type HoldConfig,
  type RepsConfig,
} from './counters';
import { MARGIN_DEG, classifyAgainstLimit, type LimitState } from './margin';
import type { ExerciseSpec } from './monitor/spec';
import { OneEuroFilter } from './oneEuro';
import { engineSpecFor, trackFor } from './monitor/engine';
import { directionAux, readMeasure } from './monitor/measure';
import {
  createCycleDriver,
  createLiftDriver,
  createPersonTimer,
  facingFromCameraSide,
  liftStep,
  type CycleDriver,
  type EndHoldResult,
  type EngineData,
  type LiftDriver,
  type LiftState,
  type PersonTimer,
} from './monitor/modes';
import type { Exercise, PlanExercise } from './protocol';

const MIN_STATE_MS = 300; // start value. research/tech.md 3.3 says "for example 300 ms", not from a source
const ENTER_FRACTION = 0.8; // PROPOSAL, no source: a rep starts at 80 percent of the target
const MIN_TARGET = 10; // degrees. PROPOSAL, no source. Below this, noise decides the count.
const RAISE_MIN_HEIGHT = 0.05; // PROPOSAL, no source. Image fraction: ankle above hip by this much counts as raised
const LIFT_END_MS = 300; // ENGINEERING, not clinical. In clip 03 the shortest real return to rest lasted about 0.4 s, and a one-frame dip lasts 0.1 s or less.
// ENGINEERING, not clinical. No source sets these values. They were tuned on the saved clips 02, 03, 04 and 05 (the rep counts stay).
// A hip that is farther than HIP_JUMP_FRACTION of the picture width from the anchor hip is read as another person (B-03, B2-02).
// The anchor follows an accepted hip by at most ANCHOR_STEP for each update (B3-01, B3-02). A person who moves slowly stays in view.
// A short bad pose of 0.5 s drags the anchor by 0.075 at most, less than the limit, so the person is accepted again at once.
// After LOCKED_OUT_MS of far hips with the whole leg visible the pipeline reports `lockedOut`. Only `followAgain()` re-anchors.
const HIP_JUMP_FRACTION = 0.1;
const ANCHOR_STEP = 0.005;
const LOCKED_OUT_MS = 4000;
// ENGINEERING, not clinical. No source sets these values. A whole leg is plausible when hip, knee and ankle are visible and inside the
// picture (EDGE_MARGIN), both segments are at least MIN_SEGMENT of the picture width, and the thigh over the shin is in SEGMENT_RATIO.
// The saved clips 01 to 06 have segments of 0.08 to 0.37 and a ratio of 0.5 to 2. CONFIRM_MS is how long a plausible leg stays within
// STEADY_RADIUS before the anchor is confirmed. PROBE_MIN_FRAMES and PROBE_MANY_SHARE decide a probe: at least that share of its frames had a second pose.
const EDGE_MARGIN = 0.02;
const MIN_SEGMENT = 0.03;
const SEGMENT_RATIO: [number, number] = [0.4, 2.5];
// The ankle pump checks knee, ankle and foot index. The first segment is the shank and the second is the foot, so the ratio is large.
// The generated person has 2.5. Real feet in a side view give about 1.5 to 3. ENGINEERING, not tuned on real video.
const FOOT_RATIO: [number, number] = [1, 6];
const CONFIRM_MS = 2000;
const STEADY_RADIUS = 0.05;
const PROBE_MIN_FRAMES = 5;
// B6-01. A press before the probe has an answer waits. The wait ends at the probe answer, or after PROBE_WAIT_MS (the probe is 2000 ms
// plus a margin) when the source gives no answer. Then the distance rule of B4-01 decides. While "someone else" shows, the probe runs
// again every REPROBE_MS, so a person who is alone is never stuck. These values are ENGINEERING, not clinical.
const PROBE_WAIT_MS = 3000;
const REPROBE_MS = 10000;
const PROBE_MANY_SHARE = 0.2;
const RAISE_SETTLE_MS = 500; // PROPOSAL, no source. The filter needs time to settle before the top angle is read
// The camera count of the straight leg raise reuses both values above. A lift counts when it holds RAISE_SETTLE_MS, so a one-frame
// spike counts none. A lift ends when the leg stays below the start height for LIFT_END_MS, so a short dip in a hold counts no
// second rep. No resting height is used: Setup measures none, and a first try with the lowest height seen was thrown off by a
// close-up cut of clip 04 (-0.24 at the start). The end rule has no new number.

/** The exercises that count reps. Only these need a return value and a resting angle. */
export const countsReps = (kind: Exercise['kind']) => kind === 'heel-slide' || kind === 'mini-squat';

/** The exercises that the person does lying down. The setup texts then ask to move the camera and not to turn (F1). Same as the posture of figure.ts. */
export const doneLying = (kind: Exercise['kind']) => kind === 'heel-slide' || kind === 'straight-leg-raise';

export type SetupResult =
  | { ok: true; kind: 'reps'; config: RepsConfig }
  | { ok: true; kind: 'hold'; config: HoldConfig }
  | { ok: true; kind: 'lag' }
  | { ok: false; reason: 'ask-your-surgeon'; missing: 'targetFlexion' | 'holdSeconds' | 'minFlexion' };

export function counterSetup(exercise: Exercise): SetupResult {
  switch (exercise.kind) {
    case 'heel-slide':
    case 'mini-squat': {
      const target = exercise.targetFlexion;
      if (target === undefined || target < MIN_TARGET) {
        return { ok: false, reason: 'ask-your-surgeon', missing: 'targetFlexion' };
      }
      return {
        ok: true,
        kind: 'reps',
        config: {
          enter: target * ENTER_FRACTION,
          returnWithin: exercise.returnWithinDeg, // PROPOSAL (T17): no default. A missing value counts no rep.
          target,
          minStateMs: MIN_STATE_MS,
          maxFlexion: exercise.maxFlexion,
          margin: MARGIN_DEG,
          minRepMs: exercise.minRepSeconds === undefined ? undefined : exercise.minRepSeconds * 1000,
        },
      };
    }
    case 'seated-extension-hold': {
      // The hold runs between minFlexion (the straightest angle allowed) and targetFlexion (the hold angle).
      // Both come from the clinician. The app sets no default (T28, P1, P2 rec 29). A missing value runs no hold.
      if (exercise.holdSeconds === undefined) {
        return { ok: false, reason: 'ask-your-surgeon', missing: 'holdSeconds' };
      }
      if (exercise.minFlexion === undefined) {
        return { ok: false, reason: 'ask-your-surgeon', missing: 'minFlexion' };
      }
      if (exercise.targetFlexion === undefined) {
        return { ok: false, reason: 'ask-your-surgeon', missing: 'targetFlexion' };
      }
      return {
        ok: true,
        kind: 'hold',
        config: {
          direction: 'at-most',
          threshold: exercise.targetFlexion + MARGIN_DEG, // the band is the target plus the margin (research/form-opus.md, C5)
          minHoldMs: exercise.holdSeconds * 1000,
          // minFlexion 0: the clinician allows full extension, so the arc end cue is off.
          arcEnd: exercise.minFlexion > 0 ? { limit: exercise.minFlexion, margin: MARGIN_DEG } : undefined,
        },
      };
    }
    case 'straight-leg-raise':
      return { ok: true, kind: 'lag' };
  }
}

const visible = (p: Landmark) => (p.visibility ?? 1) >= MIN_VISIBILITY;

/** The leg is raised when the ankle is clearly above the hip in the image. */
export function isLegRaised(hip: Landmark, ankle: Landmark): boolean {
  return visible(hip) && visible(ankle) && hip.y - ankle.y > RAISE_MIN_HEIGHT;
}

/** The leg that the person exercises, seen from the camera: on the camera side (near) or on the other side (far). */
export type LegRole = 'near' | 'far';

export const legRoleOf = (leg: Side, cameraSide: Side): LegRole => (leg === cameraSide ? 'near' : 'far');

export interface EventCounts {
  nearLimit: number;
  overLimit: number;
  tooFast: number;
}

export interface Summary {
  reps: number | null;
  holds: number | null;
  peakFlexion: number | null;
  // Estimated angle at the top of the straight leg raise. The highest value over the lifts.
  topFlexion: number | null;
  // The same for the present set only. `newSet()` clears it (U3). The live screen shows this one.
  setTopFlexion?: number | null;
  // The top angle against maxTopFlexion: above, below or cannot-tell. 'no-limit' when the
  // protocol sets none. null for any other exercise.
  topState: LimitState | 'no-limit' | null;
  eventCounts: EventCounts;
  // Why no rep can count (T17): no protocol return value, or no resting angle. null when reps can count.
  countBlock?: CountBlock | null;
  // Near or far from the camera. null when the camera side is not known.
  legRole?: LegRole | null;
}

export interface StepOutput {
  flexion: number | null; // filtered, degrees
  event: string | null;
  repMs: number | null; // rep time when a rep was counted on this sample
  // True when the hip was far from the anchor for more than 4 s with hip, knee and ankle visible. The person moved, or the camera follows another person (B3-01).
  lockedOut?: boolean;
  // True once, on the frame where the lockout starts. The source then returns two poses for a short probe (B5-02).
  probe?: boolean;
  // True while a press waits for the answer of the probe (B6-01). The screen shows that it looks for the camera view.
  looking?: boolean;
  // True after a press when the hip is far from the start hip. The camera follows someone else, or the person moved far. No numbers show (B4-01).
  otherPerson?: boolean;
}

export interface Pipeline {
  /** `extra` holds the other poses of the frame. It is given during a probe only (B5-02). */
  step(landmarks: Landmark[] | null, tMs: number, extra?: Landmark[][]): StepOutput;
  /** Gives the resting flexion after the start (the in-place capture of Session). Reps count from the next sample. */
  setBaseline(deg: number): void;
  /** A new set starts. The top angle of the present set clears. The top angle of the session stays for the Summary (U3). */
  newSet(): void;
  /** The person pressed "Follow me again". The anchor moves to the newest hip. It never runs by itself (B3-01). */
  followAgain(): void;
  summary(): Summary;
  /** Mode person-timer only (quad set, gluteal set). The screen calls these from its buttons. The camera never decides the effort. */
  startHold?(tMs: number): void;
  /** Says whether the hold was saved, and why not when it was not (the screen shows a polite line). */
  endHold?(tMs: number): EndHoldResult;
  /** The five new kinds only. The data for the stored record: holdList, timedBy, reportKey, reportValue. */
  engineData?(): EngineData;
}

export type PipelineResult = { ok: true; pipeline: Pipeline } | Extract<SetupResult, { ok: false }>;

export interface PipelineOptions {
  /** Resting flexion measured in Setup. null or missing: no rep counts. */
  baselineDeg?: number | null;
  /** The side of the person that the camera is on. It sets `legRole`. */
  cameraSide?: Side;
}

/** `side` is the leg that the person chose. `aspect` is video width divided by video height. */
export function createPipeline(planned: PlanExercise, side: Side, aspect: number, options: PipelineOptions = {}): PipelineResult {
  // The five new kinds run through the definitions of lib/monitor/registry.ts. The four old kinds keep the code below.
  const engine = engineSpecFor(planned.kind);
  if (engine?.mode === 'person-timer') return { ok: true, pipeline: createTimerPipeline(side, options) };
  const exercise = planned as Exercise;
  const made = engine === undefined ? counterSetup(exercise) : ({ ok: true, kind: 'engine' } as const);
  if (!made.ok) return made;
  let setup =
    made.kind === 'reps' ? { ...made, config: { ...made.config, baseline: options.baselineDeg ?? undefined } } : made;
  // The new modes of the engine. `driver` counts. The person check below is the same for every kind, with the landmarks of `needs`.
  const driver: CycleDriver | LiftDriver | null =
    engine === undefined
      ? null
      : engine.mode === 'reps-cycle'
        ? createCycleDriver({ minAmplitude: thresholdOf(engine, 'min-amplitude'), minStateMs: thresholdOf(engine, 'min-state-ms'), maxRiseMs: thresholdOf(engine, 'max-rise-ms') })
        : createLiftDriver({
            liftAngle: thresholdOf(engine, 'lift-angle'),
            settleMs: thresholdOf(engine, 'raise-settle-ms'),
            endMs: thresholdOf(engine, 'lift-end-ms'),
            // R-02: a lift against the vertical (the leg raise to the back) counts the backward direction only.
            directional: engine.measure.kind === 'segment-angle' && engine.measure.against === 'vertical' ? { cameraFacing: facingFromCameraSide(options.cameraSide) } : undefined,
          });
  const trio = (pose: Landmark[]): [Landmark, Landmark, Landmark] =>
    engine !== undefined && trackFor(engine.needs) === 'knee-to-toe' ? selectFoot(pose, side) : selectLeg(pose, side);
  const ratio = engine !== undefined && trackFor(engine.needs) === 'knee-to-toe' ? FOOT_RATIO : SEGMENT_RATIO;

  // Start values. tech.md 3.2 advises minCutoff near 1 Hz, then a higher beta. Not tuned on real video.
  const filter = new OneEuroFilter({ minCutoff: 1.5, beta: 0.02 });
  let peak: number | null = null;

  let reps = repsInitial();
  let hold = holdInitial();
  const counts: EventCounts = { nearLimit: 0, overLimit: 0, tooFast: 0 };
  const tally = (event: string | null) => {
    if (event === 'near-limit') counts.nearLimit += 1;
    else if (event === 'over-limit') counts.overLimit += 1;
    else if (event === 'too-fast') counts.tooFast += 1;
  };

  // Straight leg raise state. `top` is the angle at the top of the current lift.
  let top = lagInitial();
  let highestTop: number | null = null;
  let setHighest: number | null = null; // the highest top angle of the present set (U3)
  let lift: LiftState | null = null;
  let lifts = 0;

  const closeLift = () => {
    if (top.lag !== null) {
      highestTop = highestTop === null ? top.lag : Math.max(highestTop, top.lag);
      setHighest = setHighest === null ? top.lag : Math.max(setHighest, top.lag);
    }
    top = lagInitial();
    lift = null;
  };
  // The leg left the view: a lift that is not settled starts its settle time again. A counted lift stays counted.
  const pauseLift = () => {
    if (lift !== null) lift = { ...lift, settleSince: null };
  };

  // B-03, B2-02, B3-01, B5-01: the pose model follows one person. A second person can take the place of the first, or the person can move.
  // The anchor is the hip of the person. It is PROVISIONAL until a whole, plausible leg has been steady for CONFIRM_MS. A provisional anchor
  // moves by itself to any whole-leg hip, so a close-up at the start cannot block the wide frames. Only a CONFIRMED anchor reads a far hip as
  // not seen, and only a plausible whole leg can start the lockout (B5-05). A confirmed anchor follows the accepted frames slowly.
  let anchor: Landmark | null = null;
  let confirmed = false;
  let candidate: { pos: Landmark; since: number } | null = null; // the place where the whole leg has been steady, and since when
  // B4-01: the first confirmed anchor is where the patient was at the start. Without a pose count (no probe), a press never anchors
  // farther than HIP_JUMP_FRACTION from there. Then every frame reads as not seen until the person starts again from Setup.
  let startHip: Landmark | null = null;
  let otherPerson = false;
  let latestHip: Landmark | null = null; // the newest hip of a plausible whole leg, also when it was refused. `followAgain()` uses it.
  let farSince: number | null = null; // the time of the first refused frame of the present run
  // B5-02: when the lockout starts, the source returns two poses for a short probe (frames carry `extra`). One pose: the patient moved alone.
  // Two or more: another person is in view. The decision comes at the first frame after the probe.
  let probeAsked = false;
  let probeAt = 0; // the time when the last probe was asked (B6-01)
  let pendingPress = false; // the person pressed before the probe had an answer
  let probeFrames = 0;
  let probeMany = 0;
  let poseCount: 'one' | 'many' | null = null;
  const resetProbe = () => {
    farSince = null;
    probeAsked = false;
    probeFrames = 0;
    probeMany = 0;
    poseCount = null;
    pendingPress = false;
  };
  const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, (a.y - b.y) / aspect);
  const plausibleLeg = (hip: Landmark, knee: Landmark, ankle: Landmark): boolean => {
    if (!visible(hip) || !visible(knee) || !visible(ankle)) return false;
    if (![hip, knee, ankle].every((q) => q.x > EDGE_MARGIN && q.x < 1 - EDGE_MARGIN && q.y > EDGE_MARGIN && q.y < 1 - EDGE_MARGIN)) return false;
    const thigh = dist(hip, knee);
    const shin = dist(knee, ankle);
    return thigh >= MIN_SEGMENT && shin >= MIN_SEGMENT && thigh / shin >= ratio[0] && thigh / shin <= ratio[1];
  };
  const follow = (hip: Landmark) => {
    const d = dist(hip, anchor as Landmark);
    const k = d > ANCHOR_STEP ? ANCHOR_STEP / d : 1;
    anchor = { ...(anchor as Landmark), x: (anchor as Landmark).x + (hip.x - (anchor as Landmark).x) * k, y: (anchor as Landmark).y + (hip.y - (anchor as Landmark).y) * k };
  };
  /** `far` is true when a confirmed anchor reads this frame as another place. `plausible` is true for a whole, plausible leg. */
  const checkHip = (hip: Landmark, knee: Landmark, ankle: Landmark, t: number): { far: boolean; plausible: boolean } => {
    const plausible = plausibleLeg(hip, knee, ankle);
    if (plausible) latestHip = hip;
    if (!confirmed) {
      if (!plausible) return { far: false, plausible };
      if (anchor === null || dist(hip, anchor) > HIP_JUMP_FRACTION) anchor = hip;
      else follow(hip);
      if (candidate === null || dist(hip, candidate.pos) > STEADY_RADIUS) candidate = { pos: hip, since: t };
      else if (t - candidate.since >= CONFIRM_MS) {
        confirmed = true;
        startHip = anchor;
      }
      return { far: false, plausible };
    }
    if (!visible(hip)) return { far: false, plausible };
    if (dist(hip, anchor as Landmark) > HIP_JUMP_FRACTION) return { far: true, plausible };
    if (plausible) follow(hip);
    return { far: false, plausible };
  };

  // The leg is not in view. The counters get a null sample, so a running timer restarts (header of counters.ts).
  const unseen = (t: number, lockedOut = false, probe = false): StepOutput => {
    if (probe) probeAt = t;
    filter.reset();
    pauseLift();
    if (setup.kind === 'reps') reps = repsStep(reps, { flexion: null, t }, setup.config).state;
    else if (setup.kind === 'hold') hold = holdStep(hold, { flexion: null, t }, setup.config).state;
    else if (driver !== null) driver.sample(null, t);
    return { flexion: null, event: 'paused', repMs: null, lockedOut: lockedOut && !otherPerson && !pendingPress, otherPerson, probe, looking: pendingPress };
  };

  return {
    ok: true,
    pipeline: {
      newSet() {
        closeLift();
        setHighest = null;
        if (driver !== null && 'newSet' in driver) driver.newSet();
      },
      setBaseline(deg) {
        if (setup.kind === 'reps') setup = { ...setup, config: { ...setup.config, baseline: deg } };
      },
      followAgain() {
        if (otherPerson || latestHip === null) return;
        if (poseCount === 'one') {
          // One pose was in view during the probe: the patient moved alone. The press anchors with no distance limit.
          anchor = latestHip;
          startHip = latestHip;
        } else if (probeAsked) {
          pendingPress = true; // B6-01: the probe has no answer yet. Do not decide.
          return;
        } else if (startHip !== null && dist(latestHip, startHip) > HIP_JUMP_FRACTION) {
          otherPerson = true;
          return;
        } else anchor = latestHip;
        resetProbe();
      },
      step(landmarks, t, extra) {
        if (extra !== undefined) {
          probeFrames += 1;
          if (extra.length > 0) probeMany += 1;
        } else if (probeFrames > 0) {
          // The probe ended. Many poses: another person is in view. Few frames: ask again at the next lockout.
          if (probeFrames >= PROBE_MIN_FRAMES) {
            poseCount = probeMany / probeFrames >= PROBE_MANY_SHARE ? 'many' : 'one';
            if (poseCount === 'many') {
              otherPerson = true;
              pendingPress = false;
            } else if (otherPerson) {
              // One pose again: the person is alone. Clear the state (B6-01).
              otherPerson = false;
              resetProbe();
            } else if (pendingPress && latestHip !== null) {
              anchor = latestHip; // the press waited: the patient moved alone, so it anchors with no distance limit
              startHip = latestHip;
              resetProbe();
            }
          } else probeAsked = false;
          probeFrames = 0;
          probeMany = 0;
        } else if (pendingPress && probeFrames === 0 && t - probeAt > PROBE_WAIT_MS) {
          // The source gave no answer (it cannot probe). The distance rule of B4-01 decides.
          pendingPress = false;
          if (latestHip !== null && startHip !== null && dist(latestHip, startHip) > HIP_JUMP_FRACTION) otherPerson = true;
          else {
            if (latestHip !== null) anchor = latestHip;
            resetProbe();
          }
        }
        if (landmarks === null) return unseen(t);
        // During a probe the pose whose hip is nearest the confirmed anchor is the patient (the continuity rule).
        let chosen = landmarks;
        if (confirmed && anchor !== null && extra !== undefined && extra.length > 0) {
          let best = Infinity;
          for (const pose of [landmarks, ...extra]) {
            const h = trio(pose)[0];
            if (!visible(h)) continue;
            const d = dist(h, anchor);
            if (d < best) {
              best = d;
              chosen = pose;
            }
          }
        }
        const [hip, knee, ankle] = trio(chosen);
        if (otherPerson) {
          // B6-01: ask again while "someone else" shows, so a person who is alone is not stuck.
          const again = probeFrames === 0 && t - probeAt >= REPROBE_MS;
          return unseen(t, false, again);
        }
        const check = checkHip(hip, knee, ankle, t);
        if (check.far) {
          farSince ??= t;
          const locked = check.plausible && t - farSince > LOCKED_OUT_MS;
          const probe = locked && !probeAsked && poseCount === null;
          if (probe) probeAsked = true;
          return unseen(t, locked, probe);
        }
        if (probeFrames === 0 && poseCount !== 'many') {
          farSince = null;
          if (poseCount === 'one') poseCount = null;
          probeAsked = false;
        }
        if (driver !== null && engine !== undefined) {
          // A new mode. The value is the measure of the definition (an angle in degrees), filtered inside the driver.
          // The leg of `needs` must be whole in view, also when the measure uses two of its points (the leg raise to the side).
          const value = [hip, knee, ankle].every(visible) ? readMeasure(engine.measure, chosen, side, aspect) : null;
          if (value === null) return unseen(t);
          const out = 'newSet' in driver ? driver.sample(value, t, directionAux(chosen, side, aspect) ?? undefined) : driver.sample(value, t);
          return { flexion: out.value, event: out.event, repMs: null };
        }
        const raw = flexion(kneeAngle(hip, knee, ankle, aspect));
        if (raw === null) return unseen(t);
        const f = filter.filter(raw, t);
        peak = peak === null ? f : Math.max(peak, f);
        const sample = { flexion: f, t };

        if (setup.kind === 'reps') {
          const out = repsStep(reps, sample, setup.config);
          reps = out.state;
          tally(out.event);
          const counted = out.event === 'rep' || out.event === 'too-fast';
          return { flexion: f, event: out.event, repMs: counted ? out.state.lastRepMs : null };
        }
        if (setup.kind === 'hold') {
          const out = holdStep(hold, sample, setup.config);
          hold = out.state;
          tally(out.event);
          return { flexion: f, event: out.event, repMs: null };
        }
        // Straight leg raise: a rep counts once when the leg holds the settle time. The top angle is read only while settled.
        // The logic is liftStep of monitor/modes.ts, shared with the new lifts. A hidden hip or ankle is "not seen".
        const o = liftStep(lift, !visible(hip) || !visible(ankle) ? null : isLegRaised(hip, ankle), t, { settleMs: RAISE_SETTLE_MS, endMs: LIFT_END_MS });
        lift = o.lift;
        if (o.settled) top = lagStep(top, sample).state;
        if (o.closed) closeLift();
        if (o.counted) {
          lifts += 1;
          return { flexion: f, event: 'rep', repMs: null };
        }
        return { flexion: f, event: null, repMs: null };
      },
      summary() {
        const current = top.lag;
        const topFlexion =
          setup.kind === 'lag' ? (highestTop === null ? current : current === null ? highestTop : Math.max(highestTop, current)) : null;
        const setTopFlexion =
          setup.kind === 'lag' ? (setHighest === null ? current : current === null ? setHighest : Math.max(setHighest, current)) : null;
        let topState: Summary['topState'] = null;
        if (setup.kind === 'lag') {
          topState =
            exercise.maxTopFlexion === undefined ? 'no-limit' : classifyAgainstLimit(topFlexion, exercise.maxTopFlexion, MARGIN_DEG);
        }
        return {
          reps: setup.kind === 'reps' ? reps.reps : setup.kind === 'lag' ? lifts : driver !== null ? driver.reps() : null,
          holds: setup.kind === 'hold' ? hold.holds : null,
          peakFlexion: peak,
          topFlexion,
          setTopFlexion,
          topState,
          eventCounts: { ...counts },
          countBlock: setup.kind === 'reps' ? countBlock(setup.config) : null,
          legRole: options.cameraSide === undefined ? null : legRoleOf(side, options.cameraSide),
        };
      },
      engineData: driver === null ? undefined : () => driver.data(),
    },
  };
}

const thresholdOf = (spec: ExerciseSpec, name: string): number => {
  const v = spec.thresholds.find((t) => t.name === name)?.value;
  if (v === null || v === undefined) throw new Error(`${spec.id}: threshold ${name} has no value`);
  return v;
};

/**
 * The pipeline of the mode person-timer. It reads no landmark: the timer has no anchor, no lockout and no angle (R-08).
 * A timer must work with no person in view.
 */
function createTimerPipeline(side: Side, options: PipelineOptions): Pipeline {
  const timer: PersonTimer = createPersonTimer();
  return {
    step: () => ({ flexion: null, event: null, repMs: null }),
    setBaseline() {},
    newSet() {},
    followAgain() {},
    startHold: (t) => timer.startHold(t),
    endHold: (t) => timer.endHold(t),
    engineData: () => timer.data(),
    summary() {
      return {
        reps: null,
        holds: timer.count(),
        peakFlexion: null,
        topFlexion: null,
        topState: null,
        eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 },
        countBlock: null,
        legRole: options.cameraSide === undefined ? null : legRoleOf(side, options.cameraSide),
      };
    },
  };
}
