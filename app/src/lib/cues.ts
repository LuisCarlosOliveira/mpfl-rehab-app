// Fixed cue texts. A cue states what was measured against a limit that the care team set.
// It never rates the movement. An in-range rep gets no cue, because "within range" reads
// as an approval. Wording rules: `.claude/skills/mpfl-clinical-guardrails/SKILL.md`.
// The text of a cue is a key into this list. Nothing here comes from a file or from the user.

import { MARGIN_DEG } from './margin';
import type { Exercise } from './protocol';

export type CueEvent = 'rep' | 'shallow' | 'near-limit' | 'over-limit' | 'too-fast' | 'paused' | 'hold-restart' | 'hold-complete' | null;

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

// Order, first to last. The "knee gave way or hurts" button is before all of them and is not a cue.
const CUE_ORDER: CueEvent[] = ['over-limit', 'near-limit', 'paused', 'too-fast', 'shallow', 'hold-restart'];

/** Lower is more urgent. A cue that is not in the list gets the last rank. */
export const cuePriority = (event: CueEvent): number => {
  const i = CUE_ORDER.indexOf(event);
  return i === -1 ? CUE_ORDER.length : i;
};

const isSafety = (event: CueEvent) => event === 'over-limit' || event === 'near-limit';

export interface CueGate {
  /** True when the cue can show now. `safetyActive` is true while a limit alert is on screen. */
  allow(event: CueEvent, text: string, nowMs: number, safetyActive: boolean): boolean;
}

export function createCueGate(): CueGate {
  let lastAt = -Infinity;
  const lastText = new Map<string, number>();
  return {
    allow(event, text, nowMs, safetyActive) {
      // A limit cue is never delayed or dropped. The leg gate cue is a state: it stays while the leg is lost.
      if (isSafety(event) || event === 'paused') return true;
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

/** The angle at the top of the straight leg raise, as a number with its label. */
export function topAngleText(topFlexion: number | null): string | null {
  return topFlexion === null ? null : `Estimated angle at the top: ${Math.round(topFlexion)} degrees (${LABEL}).`;
}

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
  ];
}
