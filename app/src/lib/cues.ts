import { MARGIN_DEG } from './margin';
import type { Exercise } from './protocol';
import { plural } from './sets';

export type CueEvent = 'rep' | 'shallow' | 'near-limit' | 'over-limit' | 'too-fast' | 'paused' | 'not-side-on' | 'hold-restart' | 'hold-complete' | null;

interface CueContext {
  repMs?: number | null;
  minRepMs?: number | null;
}

const LABEL = 'estimated angle, not a medical measurement';

const FIXED = {
  shallow: 'Depth below your target.',
  nearLimit: 'Close to your limit, stop.',
  overLimit: 'Stop at your limit, do not push.',
  paused: 'Show your whole leg.',
  notSideOn: 'Turn so that your side faces the camera.',
  aboveTopLimit: 'Above the limit your care team set.',
  holdRestart: 'The knee left the hold angle. The hold timer starts again.',
} as const;

const seconds = (ms: number) => (ms / 1000).toFixed(1);

const tooFastText = (repMs: number, minRepMs: number) =>
  `Slow down. Rep time ${seconds(repMs)} s. Your care team set at least ${seconds(minRepMs)} s.`;

export function cueFor(event: CueEvent, ctx: CueContext): string | null {
  switch (event) {
    case 'shallow':
      return FIXED.shallow;
    case 'near-limit':
      return FIXED.nearLimit;
    case 'over-limit':
      return FIXED.overLimit;
    case 'paused':
      return FIXED.paused;
    case 'not-side-on':
      return FIXED.notSideOn;
    case 'hold-restart':
      return FIXED.holdRestart;
    case 'too-fast':
      return typeof ctx.repMs === 'number' && typeof ctx.minRepMs === 'number' ? tooFastText(ctx.repMs, ctx.minRepMs) : null;
    default:
      return null; // 'rep', 'hold-complete' and no event: no message
  }
}

// ENGINEERING values. They set how often a text appears. They are not clinical values and have no clinical source.
// Reason: too many texts in a row hide the one that matters, and one text must not repeat as a storm.
export const CUE_MIN_GAP_MS = 3000; // ENGINEERING: at most one non-safety cue in this time
export const CUE_REPEAT_MS = 10000; // ENGINEERING: the same text does not come again in this time
export const PAUSED_CUE_MS = 500; // ENGINEERING: the leg must stay out of view this long before the cue shows, and in view this long before it hides. The body map uses the same time (no blink).

const CUE_ORDER: CueEvent[] = ['over-limit', 'near-limit', 'paused', 'not-side-on', 'too-fast', 'shallow', 'hold-restart'];

export const cuePriority = (event: CueEvent): number => {
  const i = CUE_ORDER.indexOf(event);
  return i === -1 ? CUE_ORDER.length : i;
};

const isSafety = (event: CueEvent) => event === 'over-limit' || event === 'near-limit';

interface CueGate {
  note(event: CueEvent | null, nowMs: number): void;
  pausedVisible(nowMs: number): boolean;
  allow(event: CueEvent, text: string, nowMs: number, safetyActive: boolean): boolean;
}

export function createCueGate(): CueGate {
  let lastAt = -Infinity;
  const lastText = new Map<string, number>();
  let pausedSince: number | null = null;
  let seenSince: number | null = null;
  let shown = false;
  return {
    note(event, nowMs) {
      if (event !== 'paused') {
        pausedSince = null;
        seenSince ??= nowMs;
        if (shown && nowMs - seenSince >= PAUSED_CUE_MS) shown = false;
      } else {
        seenSince = null;
        pausedSince ??= nowMs;
        if (nowMs - pausedSince >= PAUSED_CUE_MS) shown = true;
      }
    },
    pausedVisible: () => shown,
    allow(event, text, nowMs, safetyActive) {
      if (isSafety(event)) return true;
      if (event === 'paused') return shown;
      if (safetyActive) return false;
      if (nowMs - lastAt < CUE_MIN_GAP_MS) return false;
      if (nowMs - (lastText.get(text) ?? -Infinity) < CUE_REPEAT_MS) return false;
      lastAt = nowMs;
      lastText.set(text, nowMs);
      return true;
    },
  };
}

export function stillOverLimit(exercise: Pick<Exercise, 'kind' | 'maxFlexion' | 'minFlexion'>, flexion: number | null): boolean {
  if (flexion === null) return false;
  if (exercise.kind === 'seated-extension-hold') {
    return exercise.minFlexion !== undefined && exercise.minFlexion > 0 && flexion < exercise.minFlexion - MARGIN_DEG;
  }
  return exercise.maxFlexion !== undefined && flexion > exercise.maxFlexion + MARGIN_DEG;
}

// ENGINEERING plausibility value, not clinical (M8): the knee of a straight leg raise stays near straight. A peak above this
// many degrees is a camera misread (live test: 165 and 85 degrees for a leg that stayed straight). No source sets it.
// CLINICIAN BLOCKER: no source sets 30. Open questions: is any limit valid, and is a chart of the top angle useful at all?
// Your sessions draws no straight leg raise angle chart for this reason. The stored numbers stay in the export and the care team view.
const SLR_PEAK_PLAUSIBLE_MAX_DEG = 30;
export const PEAK_UNREADABLE_TEXT = 'The camera could not read this leg raise.';
export const PEAK_NO_VALUE_TEXT = 'No value to show.';

export const peakUnreadable = (kind: Exercise['kind'], peakFlexion: number | null): boolean =>
  kind === 'straight-leg-raise' && peakFlexion !== null && peakFlexion > SLR_PEAK_PLAUSIBLE_MAX_DEG;

/** True when the top angle of a straight leg raise is too high to trust. The same ENGINEERING limit as the peak. The stored value stays. */
export const topUnreadable = (topFlexion: number | null): boolean => topFlexion !== null && topFlexion > SLR_PEAK_PLAUSIBLE_MAX_DEG;

export function topAngleText(topFlexion: number | null): string | null {
  if (topUnreadable(topFlexion)) return PEAK_NO_VALUE_TEXT; // Neutral, because reps and a number can show next to it
  return topFlexion === null ? null : `Estimated angle at the top: ${Math.round(topFlexion)} ${plural(Math.round(topFlexion), 'degree')} (${LABEL}).`;
}

const TOP_NOTE = `The sources describe a straight knee. The camera error is about ${MARGIN_DEG} degrees or more (${LABEL}).`;

export const topAngleNote = (topFlexion: number | null): string | null =>
  topFlexion !== null && topFlexion > MARGIN_DEG && !topUnreadable(topFlexion) ? TOP_NOTE : null;

export function allCueTexts(): string[] {
  return [
    FIXED.shallow,
    FIXED.nearLimit,
    FIXED.overLimit,
    FIXED.paused,
    FIXED.aboveTopLimit,
    FIXED.holdRestart,
    tooFastText(1200, 2000),
    topAngleText(12) as string,
    TOP_NOTE,
  ];
}
