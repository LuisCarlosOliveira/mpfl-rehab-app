// The camera error margin for a knee angle, in degrees.
// A 2D webcam angle is an estimate. This value is the half-width of its error.
// It is a start value. It is UNVERIFIED for the lite model. T13 must replace it
// with a value that is measured on a real camera setup.

export const MARGIN_DEG = 9;

export const MARGIN_SOURCE_IDS = ['lite-start-v0', 'lite-start-v1'] as const;
export type MarginSourceId = (typeof MARGIN_SOURCE_IDS)[number];

export const MARGIN_SOURCE: MarginSourceId = 'lite-start-v1';

export const MARGIN_SOURCE_TEXT: Record<MarginSourceId, string> = {
  'lite-start-v0': 'start value, UNVERIFIED for the lite model (Okuno 2026, heavy model, still photos)',
  'lite-start-v1': 'start value, UNVERIFIED for the lite model (Okuno 2026, highest-complexity model, tablet, healthy adults)',
};

export const LEGACY_MARGIN_SOURCES: Readonly<Record<string, MarginSourceId>> = {
  'start value, UNVERIFIED for the lite model (Okuno 2026, heavy model, still photos)': 'lite-start-v0',
  'start value, UNVERIFIED for the lite model (Okuno 2026, highest-complexity model, tablet, healthy adults)': 'lite-start-v1',
};

export type LimitState = 'above' | 'below' | 'cannot-tell';

export function classifyAgainstLimit(value: number | null, limit: number, margin: number): LimitState {
  if (value === null) return 'cannot-tell';
  if (value - limit > margin) return 'above';
  if (limit - value > margin) return 'below';
  return 'cannot-tell';
}
