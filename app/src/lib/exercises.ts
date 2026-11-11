// Exercise definitions and the pipeline: landmarks -> angle -> filter -> counter.
// Every threshold here is a TUNING START VALUE. It is not clinical evidence.
// The knowledge base has no source for any of them. They are PROPOSAL values for tuning on
// real video (T13). The only number with a source is the margin (margin.ts).
// The protocol (set by the clinician) supplies targets and ceilings.
// A missing value gives "ask your surgeon". The app sets no default.
// A rep ends when the knee is back within `returnWithinDeg` of the resting angle (T17, PROPOSAL). The old fixed
// fraction of the target is gone from the app path. Without a protocol value or a baseline no rep counts.

import { MIN_VISIBILITY, flexion, kneeAngle, selectLeg, type Landmark, type Side } from './angle';
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
import { OneEuroFilter } from './oneEuro';
import type { Exercise } from './protocol';

const MIN_STATE_MS = 300; // start value. research/tech.md 3.3 says "for example 300 ms", not from a source
const ENTER_FRACTION = 0.8; // PROPOSAL, no source: a rep starts at 80 percent of the target
const MIN_TARGET = 10; // degrees. PROPOSAL, no source. Below this, noise decides the count.
const RAISE_MIN_HEIGHT = 0.05; // PROPOSAL, no source. Image fraction: ankle above hip by this much counts as raised
const LIFT_END_MS = 300; // ENGINEERING, not clinical. In clip 03 the shortest real return to rest lasted about 0.4 s, and a one-frame dip lasts 0.1 s or less.
// ENGINEERING, not clinical. No source sets this value. A hip that is farther than this fraction of the picture width from the
// last known hip of the person is read as another person (B-03, B2-02). A steady far hip is still another person.
const HIP_JUMP_FRACTION = 0.1;
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
}

export interface Pipeline {
  step(landmarks: Landmark[] | null, tMs: number): StepOutput;
  /** Gives the resting flexion after the start (the in-place capture of Session). Reps count from the next sample. */
  setBaseline(deg: number): void;
  summary(): Summary;
}

export type PipelineResult = { ok: true; pipeline: Pipeline } | Extract<SetupResult, { ok: false }>;

export interface PipelineOptions {
  /** Resting flexion measured in Setup. null or missing: no rep counts. */
  baselineDeg?: number | null;
  /** The side of the person that the camera is on. It sets `legRole`. */
  cameraSide?: Side;
}

/** `side` is the leg that the person chose. `aspect` is video width divided by video height. */
export function createPipeline(exercise: Exercise, side: Side, aspect: number, options: PipelineOptions = {}): PipelineResult {
  const made = counterSetup(exercise);
  if (!made.ok) return made;
  let setup =
    made.kind === 'reps' ? { ...made, config: { ...made.config, baseline: options.baselineDeg ?? undefined } } : made;

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
  let lift: { settleSince: number | null; counted: boolean; belowSince: number | null } | null = null;
  let lifts = 0;

  const closeLift = () => {
    if (top.lag !== null) highestTop = highestTop === null ? top.lag : Math.max(highestTop, top.lag);
    top = lagInitial();
    lift = null;
  };
  // The leg left the view: a lift that is not settled starts its settle time again. A counted lift stays counted.
  const pauseLift = () => {
    if (lift !== null) lift.settleSince = null;
  };

  // B-03, B2-02: the pose model follows one person. A second person can take the place of the first. The pipeline remembers the last
  // known hip of the person. It keeps it through frames with no pose. A hip far from it is another body and counts as not seen.
  // The memory ends only when the pipeline ends (the person starts again from Setup). A slow drift moves the memory with the person.
  let knownHip: Landmark | null = null;
  const hipIsOther = (hip: Landmark): boolean => {
    if (!visible(hip)) return false;
    if (knownHip !== null && Math.hypot(hip.x - knownHip.x, (hip.y - knownHip.y) / aspect) > HIP_JUMP_FRACTION) return true;
    knownHip = hip;
    return false;
  };

  // The leg is not in view. The counters get a null sample, so a running timer restarts (header of counters.ts).
  const unseen = (t: number): StepOutput => {
    filter.reset();
    pauseLift();
    if (setup.kind === 'reps') reps = repsStep(reps, { flexion: null, t }, setup.config).state;
    else if (setup.kind === 'hold') hold = holdStep(hold, { flexion: null, t }, setup.config).state;
    return { flexion: null, event: 'paused', repMs: null };
  };

  return {
    ok: true,
    pipeline: {
      setBaseline(deg) {
        if (setup.kind === 'reps') setup = { ...setup, config: { ...setup.config, baseline: deg } };
      },
      step(landmarks, t) {
        if (landmarks === null) return unseen(t);
        const [hip, knee, ankle] = selectLeg(landmarks, side);
        if (hipIsOther(hip)) return unseen(t);
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
        if (!visible(hip) || !visible(ankle)) pauseLift();
        else if (lift === null) {
          if (isLegRaised(hip, ankle)) lift = { settleSince: t, counted: false, belowSince: null };
        } else if (!isLegRaised(hip, ankle)) {
          lift.belowSince ??= t;
          if (!lift.counted) lift.settleSince = null; // the settle time must run without a dip
          if (t - lift.belowSince >= LIFT_END_MS) closeLift();
        } else {
          lift.belowSince = null;
          lift.settleSince ??= t;
          if (t - lift.settleSince >= RAISE_SETTLE_MS) {
            top = lagStep(top, sample).state;
            if (!lift.counted) {
              lift.counted = true;
              lifts += 1;
              return { flexion: f, event: 'rep', repMs: null };
            }
          }
        }
        return { flexion: f, event: null, repMs: null };
      },
      summary() {
        const current = top.lag;
        const topFlexion =
          setup.kind === 'lag' ? (highestTop === null ? current : current === null ? highestTop : Math.max(highestTop, current)) : null;
        let topState: Summary['topState'] = null;
        if (setup.kind === 'lag') {
          topState =
            exercise.maxTopFlexion === undefined ? 'no-limit' : classifyAgainstLimit(topFlexion, exercise.maxTopFlexion, MARGIN_DEG);
        }
        return {
          reps: setup.kind === 'reps' ? reps.reps : setup.kind === 'lag' ? lifts : null,
          holds: setup.kind === 'hold' ? hold.holds : null,
          peakFlexion: peak,
          topFlexion,
          topState,
          eventCounts: { ...counts },
          countBlock: setup.kind === 'reps' ? countBlock(setup.config) : null,
          legRole: options.cameraSide === undefined ? null : legRoleOf(side, options.cameraSide),
        };
      },
    },
  };
}
