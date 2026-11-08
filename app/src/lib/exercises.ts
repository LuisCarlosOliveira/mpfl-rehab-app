// Exercise definitions and the pipeline: landmarks -> angle -> filter -> counter.
// Every threshold here is a TUNING START VALUE. It is not clinical evidence.
// The protocol (set by the clinician) supplies targets and ceilings.
// A missing value gives "ask your surgeon". The app sets no default.

import { flexion, kneeAngle, selectLeg, type Landmark, type Side } from './angle';
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
import { OneEuroFilter } from './oneEuro';
import type { Exercise } from './protocol';

const MIN_STATE_MS = 300; // start value
const ENTER_FRACTION = 0.8; // start value: a rep starts at 80 percent of the target
const EXIT_FRACTION = 0.3; // start value: a rep ends at 30 percent of the target
const MIN_TARGET = 10; // degrees. Below this, noise decides the count.
const HOLD_EXTENSION_MARGIN = 10; // start value: degrees of flexion that still count as extended
const RAISE_MIN_HEIGHT = 0.05; // image fraction: ankle above hip by this much counts as raised
const RAISE_SETTLE_MS = 500; // the filter needs time to settle before the lag is read

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
        config: {
          direction: 'at-most',
          threshold: (exercise.targetFlexion ?? 0) + HOLD_EXTENSION_MARGIN,
          minHoldMs: exercise.holdSeconds * 1000,
        },
      };
    }
    case 'straight-leg-raise':
      return { ok: true, kind: 'lag' };
  }
}

const visible = (p: Landmark) => (p.visibility ?? 1) >= 0.5;

/** The leg is raised when the ankle is clearly above the hip in the image. */
export function isLegRaised(hip: Landmark, ankle: Landmark): boolean {
  return visible(hip) && visible(ankle) && hip.y - ankle.y > RAISE_MIN_HEIGHT;
}

export interface Summary {
  reps: number | null;
  holds: number | null;
  peakFlexion: number | null;
  extensionLag: number | null;
}

export interface StepOutput {
  flexion: number | null; // filtered, degrees
  event: string | null;
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

  const filter = new OneEuroFilter({ minCutoff: 1.5, beta: 0.02 });
  let peak: number | null = null;

  let reps = repsInitial();
  let hold = holdInitial();

  // Straight leg raise state
  let lag = lagInitial();
  let raisedSince: number | null = null;
  let worstLag: number | null = null;

  const closeLift = () => {
    if (lag.lag !== null) worstLag = worstLag === null ? lag.lag : Math.max(worstLag, lag.lag);
    lag = lagInitial();
    raisedSince = null;
  };

  return {
    ok: true,
    pipeline: {
      step(landmarks, t) {
        if (landmarks === null) {
          filter.reset();
          return { flexion: null, event: 'paused' };
        }
        const [hip, knee, ankle] = selectLeg(landmarks, side);
        const raw = flexion(kneeAngle(hip, knee, ankle, aspect));
        if (raw === null) {
          filter.reset();
          return { flexion: null, event: 'paused' };
        }
        const f = filter.filter(raw, t);
        peak = peak === null ? f : Math.max(peak, f);
        const sample = { flexion: f, t };

        if (setup.kind === 'reps') {
          const out = repsStep(reps, sample, setup.config);
          reps = out.state;
          return { flexion: f, event: out.event };
        }
        if (setup.kind === 'hold') {
          const out = holdStep(hold, sample, setup.config);
          hold = out.state;
          return { flexion: f, event: out.event };
        }
        // Straight leg raise: read the lag only while the leg is raised and settled.
        if (isLegRaised(hip, ankle)) {
          if (raisedSince === null) raisedSince = t;
          if (t - raisedSince >= RAISE_SETTLE_MS) lag = lagStep(lag, sample).state;
        } else if (raisedSince !== null) {
          closeLift();
        }
        return { flexion: f, event: null };
      },
      summary() {
        const current = lag.lag;
        const extensionLag =
          setup.kind === 'lag' ? (worstLag === null ? current : current === null ? worstLag : Math.max(worstLag, current)) : null;
        return {
          reps: setup.kind === 'reps' ? reps.reps : null,
          holds: setup.kind === 'hold' ? hold.holds : null,
          peakFlexion: peak,
          extensionLag,
        };
      },
    },
  };
}
