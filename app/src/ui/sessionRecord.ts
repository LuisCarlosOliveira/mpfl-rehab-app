// The record of one run. App writes it when the run ends. The Summary adds the two answers later.
// It holds numbers only. No frame, no image.
import type { Side } from '../lib/angle';
import { MARGIN_DEG, MARGIN_SOURCE } from '../lib/margin';
import type { PlanExercise, Protocol } from '../lib/protocol';
import { summarySets } from '../lib/sets';
import type { SessionInput } from '../lib/storage';
import type { RunResult } from './appState';
import type { SessionRunSummary } from './Session';

const clampAngle = (v: number | null) => (v === null ? null : Math.min(180, Math.max(0, Math.round(v * 10) / 10)));

/** The whole degree of the value that the record stores. The Summary uses it, so it agrees with Your sessions and the care team view. */
export const storedWhole = (v: number | null) => (v === null ? null : Math.round(clampAngle(v) as number));

export interface RunRecordArgs {
  run: Pick<RunResult, 'reason' | 'summary'>;
  exercise: PlanExercise;
  protocol: Protocol;
  phase: number;
  redFlagBlocks: number;
  /** T17: the leg that the pipeline tracked and the side of the person that the camera was on. */
  legTracked?: Side;
  cameraSide?: Side;
  now: () => Date;
}

/** The session input of a run, with no pain and no swelling answer. */
export function runToSessionInput({ run, exercise, protocol, phase, redFlagBlocks, legTracked, cameraSide, now }: RunRecordArgs): SessionInput {
  const { summary, reason } = run;
  const { setPain, repsBy } = summary as SessionRunSummary;
  const sets = summary.sets ?? null;
  const input: SessionInput = {
    date: now().toISOString(),
    exercise: exercise.kind,
    side: protocol.side,
    reps: summary.reps,
    peakFlexion: clampAngle(summary.peakFlexion),
    // The seated hold keeps its old rule. A hold that the person timed keeps its seconds in holdList.
    holdSeconds: summary.holds === null || summary.engine?.timedBy === 'person' ? null : summary.holds * (exercise.holdSeconds ?? 0),
    topFlexion: clampAngle(summary.topFlexion),
    marginDeg: MARGIN_DEG,
    marginSource: MARGIN_SOURCE,
    view: 'side',
    nearLimit: summary.eventCounts.nearLimit,
    overLimit: summary.eventCounts.overLimit,
    tooFast: summary.eventCounts.tooFast,
    gaveWayPresses: reason === 'gave-way' ? 1 : 0,
    redFlagBlocks,
    ...(setPain === undefined ? {} : { setPain }),
    ...(repsBy === undefined ? {} : { repsBy }),
    protocolId: protocol.id,
    phase,
    ...(legTracked === undefined ? {} : { legTracked }),
    ...(cameraSide === undefined ? {} : { cameraSide }),
    ...(summary.baselineSource === undefined ? {} : { baselineSource: summary.baselineSource }),
    // Exercise monitoring: the data of the engine for the five new kinds. Only the fields that the engine gave.
    ...(summary.engine?.holdList === undefined ? {} : { holdList: summary.engine.holdList }),
    ...(summary.engine?.timedBy === undefined ? {} : { timedBy: summary.engine.timedBy }),
    ...(summary.engine?.reportKey === undefined || summary.engine.reportValue === undefined ? {} : { reportKey: summary.engine.reportKey, reportValue: summary.engine.reportValue }),
    // T12b: the front-view record is for the clinician. The Summary never shows it.
    ...(summary.front === undefined
      ? {}
      : {
          secondView: 'front' as const,
          frontReps: summary.front.reps,
          ...(summary.front.changeDeg === undefined ? {} : { frontChangeDeg: Math.round(summary.front.changeDeg * 10) / 10 }),
        }),
  };
  return sets === null ? input : { ...input, ...summarySets(sets) };
}
