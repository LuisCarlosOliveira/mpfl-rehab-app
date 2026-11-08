// The camera error margin for a knee angle, in degrees.
// A 2D webcam angle is an estimate. This value is the half-width of its error.
// It is a start value. It is UNVERIFIED for the lite model. T13 must replace it
// with a value that is measured on a real camera setup.

export const MARGIN_DEG = 9;

export const MARGIN_SOURCE = 'start value, UNVERIFIED for the lite model (Okuno 2026, highest-complexity model, tablet, healthy adults)';

export type LimitState = 'above' | 'below' | 'cannot-tell';

/**
 * Compare a measured value with a limit that a clinician set.
 * Above or below only when the difference is more than the margin.
 * Inside the margin, and for a missing value, the answer is cannot-tell.
 * The clinician summary and the exercise pipeline both use this one rule.
 */
export function classifyAgainstLimit(value: number | null, limit: number, margin: number): LimitState {
  if (value === null) return 'cannot-tell';
  if (value - limit > margin) return 'above';
  if (limit - value > margin) return 'below';
  return 'cannot-tell';
}
