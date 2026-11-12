// Position guide data (FR28). ONE place: the registry (lib/monitor/registry.ts) holds the texts of all nine exercises.
// Wording follows mpfl-clinical-guardrails: no verdict words, and no number that the protocol sets.
// Each sentence has 25 words at most. The five new exercises are a PROPOSAL of the app (see basis in the registry).
import type { LegLegend } from './figure';
import { specFor } from './monitor/registry';
import type { EXERCISE_KINDS, HOME_EXERCISE_KINDS } from './protocol/schema';

/** The four exercises that a plan sets with numbers. */
export type GuideKind = (typeof EXERCISE_KINDS)[number];
/** The five exercises that the camera times or counts without a clinician number. */
export type NewGuideKind = (typeof HOME_EXERCISE_KINDS)[number];
export type AnyGuideKind = GuideKind | NewGuideKind;

export interface Guide {
  startPosition: string;
  legFacingCamera: string;
  handsAndSupport: string;
  range: string;
  speed: string;
  cameraMustSee: string;
}

/**
 * The guide text. When the person chose the leg that is not the operated leg, "operated" becomes "chosen" (L1-06).
 * The text then names the leg that the app follows, and not the operated side of the protocol.
 */
export function guideFor(kind: AnyGuideKind, legend: LegLegend = 'operated'): Guide {
  const spec = specFor(kind);
  if (!spec) throw new Error(`No guide for ${kind}`);
  const { startPosition, legFacingCamera, handsAndSupport, range, speed, cameraMustSee } = spec.guide;
  const guide: Guide = { startPosition, legFacingCamera, handsAndSupport, range, speed, cameraMustSee };
  if (legend === 'operated') return guide;
  const own = (text: string) => text.replace(/operated (leg|side)/g, 'chosen $1');
  return Object.fromEntries(Object.entries(guide).map(([key, text]) => [key, own(text)])) as unknown as Guide;
}
