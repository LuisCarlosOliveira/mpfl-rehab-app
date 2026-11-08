// Fixed cue texts. A cue states what was measured against a limit that the care team set.
// It never rates the movement. An in-range rep gets no cue, because "within range" reads
// as an approval. Wording rules: `.claude/skills/mpfl-clinical-guardrails/SKILL.md`.
// The text of a cue is a key into this list. Nothing here comes from a file or from the user.

export type CueEvent = 'rep' | 'shallow' | 'near-limit' | 'over-limit' | 'too-fast' | 'paused' | null;

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
} as const;

const seconds = (ms: number) => (ms / 1000).toFixed(1);

const tooFastText = (repMs: number, minRepMs: number) =>
  `Rep time ${seconds(repMs)} s. Your care team set at least ${seconds(minRepMs)} s.`;

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
    case 'too-fast':
      return typeof ctx.repMs === 'number' && typeof ctx.minRepMs === 'number' ? tooFastText(ctx.repMs, ctx.minRepMs) : null;
    default:
      return null; // 'rep' and no event: no message
  }
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
    tooFastText(1200, 2000),
    topAngleText(12) as string,
  ];
}
