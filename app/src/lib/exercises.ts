// Exercise definitions and the pipeline: landmarks -> angle -> filter -> counter.
// Every threshold here is a TUNING START VALUE. It is not clinical evidence.
// The knowledge base has no source for any of them. They are PROPOSAL values for tuning on
// real video (T13). The only number with a source is the margin (margin.ts).
// The protocol (set by the clinician) supplies targets and ceilings.
// A missing value gives "ask your surgeon". The app sets no default.

import { MIN_VISIBILITY, flexion, kneeAngle, selectLeg, type Landmark, type Side } from './angle';
import {
  holdInitial,
  holdStep,
  lagInitial,
  lagStep,
  repsInitial,
  repsStep,
  type HoldConfig,
  type RepsConfig,
} from './counters';
import { MARGIN_DEG, classifyAgainstLimit, type LimitState } from './margin';
import { OneEuroFilter } from './oneEuro';
import type { Exercise } from './protocol';

const MIN_STATE_MS = 300; // start value. research/tech.md 3.3 says "for example 300 ms", not from a source
const ENTER_FRACTION = 0.8; // PROPOSAL, no source: a rep starts at 80 percent of the target
const EXIT_FRACTION = 0.3; // PROPOSAL, no source: a rep ends at 30 percent of the target
const MIN_TARGET = 10; // degrees. PROPOSAL, no source. Below this, noise decides the count.
const RAISE_MIN_HEIGHT = 0.05; // PROPOSAL, no source. Image fraction: ankle above hip by this much counts as raised
const RAISE_SETTLE_MS = 500; // PROPOSAL, no source. The filter needs time to settle before the top angle is read

export type SetupResult =
  | { ok: true; kind: 'reps'; config: RepsConfig }
  | { ok: true; kind: 'hold'; config: HoldConfig }
  | { ok: true; kind: 'lag' }
  | { ok: false; reason: 'ask-your-surgeon'; missing: 'targetFlexion' | 'holdSeconds' };

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
          exit: target * EXIT_FRACTION,
          target,
          minStateMs: MIN_STATE_MS,
          maxFlexion: exercise.maxFlexion,
          margin: MARGIN_DEG,
          minRepMs: exercise.minRepSeconds === undefined ? undefined : exercise.minRepSeconds * 1000,
        },
      };
    }
    case 'seated-extension-hold': {
      if (exercise.holdSeconds === undefined) {
        return { ok: false, reason: 'ask-your-surgeon', missing: 'holdSeconds' };
      }
      return {
        ok: true,
        kind: 'hold',
        // The band is the target plus the margin (research/form-opus.md, C5). A missing target
        // reads as full extension (0). This is a PROPOSAL. A clinician must confirm it.
        config: {
          direction: 'at-most',
          threshold: (exercise.targetFlexion ?? 0) + MARGIN_DEG,
          minHoldMs: exercise.holdSeconds * 1000,
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
}

export interface StepOutput {
  flexion: number | null; // filtered, degrees
  event: string | null;
  repMs: number | null; // rep time when a rep was counted on this sample
}

export interface Pipeline {
  step(landmarks: Landmark[] | null, tMs: number): StepOutput;
  summary(): Summary;
}

export type PipelineResult = { ok: true; pipeline: Pipeline } | Extract<SetupResult, { ok: false }>;

/** `aspect` is video width divided by video height. */
export function createPipeline(exercise: Exercise, side: Side, aspect: number): PipelineResult {
  const setup = counterSetup(exercise);
  if (!setup.ok) return setup;

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
  let raisedSince: number | null = null;
  let highestTop: number | null = null;

  const closeLift = () => {
    if (top.lag !== null) highestTop = highestTop === null ? top.lag : Math.max(highestTop, top.lag);
    top = lagInitial();
    raisedSince = null;
  };

  return {
    ok: true,
    pipeline: {
      step(landmarks, t) {
        if (landmarks === null) {
          filter.reset();
          return { flexion: null, event: 'paused', repMs: null };
        }
        const [hip, knee, ankle] = selectLeg(landmarks, side);
        const raw = flexion(kneeAngle(hip, knee, ankle, aspect));
        if (raw === null) {
          filter.reset();
          return { flexion: null, event: 'paused', repMs: null };
        }
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
          return { flexion: f, event: out.event, repMs: null };
        }
        // Straight leg raise: read the top angle only while the leg is raised and settled.
        if (isLegRaised(hip, ankle)) {
          if (raisedSince === null) raisedSince = t;
          if (t - raisedSince >= RAISE_SETTLE_MS) top = lagStep(top, sample).state;
        } else if (raisedSince !== null) {
          closeLift();
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
          reps: setup.kind === 'reps' ? reps.reps : null,
          holds: setup.kind === 'hold' ? hold.holds : null,
          peakFlexion: peak,
          topFlexion,
          topState,
          eventCounts: { ...counts },
        };
      },
    },
  };
}
