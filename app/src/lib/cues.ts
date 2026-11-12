// Fixed cue texts. A cue states what was measured against a limit that the care team set.
// It never rates the movement. An in-range rep gets no cue, because "within range" reads
// as an approval. Wording rules: `.claude/skills/mpfl-clinical-guardrails/SKILL.md`.
// The text of a cue is a key into this list. Nothing here comes from a file or from the user.

import { MARGIN_DEG } from './margin';
import type { Exercise } from './protocol';
import { plural } from './sets';

export type CueEvent = 'rep' | 'shallow' | 'near-limit' | 'over-limit' | 'too-fast' | 'paused' | 'not-side-on' | 'hold-restart' | 'hold-complete' | null;

export interface CueContext {
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
  // T5. It states what the timer does. It does not ask for a straight knee, because P1 and P2 avoid full extension early.
  holdRestart: 'The knee left the hold angle. The hold timer starts again.',
} as const;

const seconds = (ms: number) => (ms / 1000).toFixed(1);

// "Slow down." is an instruction. The numbers state the clinician value (adaptation design 4.1).
const tooFastText = (repMs: number, minRepMs: number) =>
  `Slow down. Rep time ${seconds(repMs)} s. Your care team set at least ${seconds(minRepMs)} s.`;

/** The text for a counter event, or null when no message is shown. */
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

// ---- Order and rate limit of the cues -----------------------------------------------------
// ENGINEERING values. They set how often a text appears. They are not clinical values and have no clinical source.
// Reason: too many texts in a row hide the one that matters, and one text must not repeat as a storm.
export const CUE_MIN_GAP_MS = 3000; // ENGINEERING: at most one non-safety cue in this time
export const CUE_REPEAT_MS = 10000; // ENGINEERING: the same text does not come again in this time
export const PAUSED_CUE_MS = 500; // ENGINEERING: the leg must stay out of view this long before the cue shows, and in view this long before it hides. The body map uses the same time (no blink).

// Order, first to last. The "knee gave way or hurts" button is before all of them and is not a cue.
const CUE_ORDER: CueEvent[] = ['over-limit', 'near-limit', 'paused', 'not-side-on', 'too-fast', 'shallow', 'hold-restart'];

/** Lower is more urgent. A cue that is not in the list gets the last rank. */
export const cuePriority = (event: CueEvent): number => {
  const i = CUE_ORDER.indexOf(event);
  return i === -1 ? CUE_ORDER.length : i;
};

const isSafety = (event: CueEvent) => event === 'over-limit' || event === 'near-limit';

export interface CueGate {
  /** Call on every frame with its event. The leg gate cue waits until the leg has been out of view for PAUSED_CUE_MS. */
  note(event: CueEvent | null, nowMs: number): void;
  /** True while the leg gate cue is on screen. It shows after PAUSED_CUE_MS of no pose. It hides after PAUSED_CUE_MS of a seen leg (B2-04). */
  pausedVisible(nowMs: number): boolean;
  /** True when the cue can show now. `safetyActive` is true while a limit alert is on screen. */
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
      // A limit cue is never delayed or dropped. The leg gate cue is a state: it stays while the leg is lost, after PAUSED_CUE_MS.
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

/**
 * True while the knee is past the limit by more than the margin. The alert stays on screen while this holds.
 * Heel slide and mini squat: above `maxFlexion`. Seated hold: below `minFlexion` (the arc end).
 * `minFlexion` 0 allows full extension, so the arc end is off.
 */
export function stillOverLimit(exercise: Pick<Exercise, 'kind' | 'maxFlexion' | 'minFlexion'>, flexion: number | null): boolean {
  if (flexion === null) return false;
  if (exercise.kind === 'seated-extension-hold') {
    return exercise.minFlexion !== undefined && exercise.minFlexion > 0 && flexion < exercise.minFlexion - MARGIN_DEG;
  }
  return exercise.maxFlexion !== undefined && flexion > exercise.maxFlexion + MARGIN_DEG;
}

// ENGINEERING plausibility value, not clinical (M8): the knee of a straight leg raise stays near straight. A peak above this
// many degrees is a camera misread (live test R2-08: 165 and 85 degrees for a leg that stayed straight). No source sets it.
// CLINICIAN BLOCKER: no source sets 30. Open questions: is any limit valid, and is a chart of the top angle useful at all?
// Your sessions draws no straight leg raise angle chart for this reason. The stored numbers stay in the export and the care team view.
export const SLR_PEAK_PLAUSIBLE_MAX_DEG = 30;
export const PEAK_UNREADABLE_TEXT = 'The camera could not read this leg raise.';
// C-06: the Summary shows camera numbers (reps, top angle) next to the peak. A line that says the camera could not read would contradict them.
export const PEAK_NO_VALUE_TEXT = 'No value to show.';

/** True when the stored peak of a straight leg raise is too high to trust. The stored value stays as it is. */
export const peakUnreadable = (kind: Exercise['kind'], peakFlexion: number | null): boolean =>
  kind === 'straight-leg-raise' && peakFlexion !== null && peakFlexion > SLR_PEAK_PLAUSIBLE_MAX_DEG;

/** True when the top angle of a straight leg raise is too high to trust. The same ENGINEERING limit as the peak. The stored value stays. */
export const topUnreadable = (topFlexion: number | null): boolean => topFlexion !== null && topFlexion > SLR_PEAK_PLAUSIBLE_MAX_DEG;

/** The angle at the top of the straight leg raise, as a number with its label. Above the limit it shows the plain sentence. */
export function topAngleText(topFlexion: number | null): string | null {
  if (topUnreadable(topFlexion)) return PEAK_NO_VALUE_TEXT; // B2-06: neutral, because reps and a number can show next to it
  return topFlexion === null ? null : `Estimated angle at the top: ${Math.round(topFlexion)} ${plural(Math.round(topFlexion), 'degree')} (${LABEL}).`;
}

// C-prime live fact (form-evidence check 5, technique S2). The sources describe a straight knee. The camera error is as large as
// the 10 degree limit of P2, so a smaller angle says nothing and shows nothing. The text states a fact, not a rating.
const TOP_NOTE = `The sources describe a straight knee. The camera error is about ${MARGIN_DEG} degrees or more (${LABEL}).`;

/** The note under the top angle. Only for an angle above the camera error that the camera could read. Otherwise null. */
export const topAngleNote = (topFlexion: number | null): string | null =>
  topFlexion !== null && topFlexion > MARGIN_DEG && !topUnreadable(topFlexion) ? TOP_NOTE : null;

/** Every text this module can produce, with sample numbers. The tests check them. */
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
