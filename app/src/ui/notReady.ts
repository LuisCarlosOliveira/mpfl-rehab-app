// The notice for an exercise that has no value to run with. The app sets no value (T4).
// Source: docs/design-reconciliation.md section 3, texts T4. P1 "unless cleared by surgeon", P2 rec 29.
import type { Exercise } from '../lib/protocol';
import { ASK_HOLD_ANGLE_TEXT, ASK_SURGEON_TEXT } from './askSurgeon';

const MISSING_LABEL = {
  targetFlexion: 'Target',
  holdSeconds: 'Hold time',
  minFlexion: 'Straightest knee angle',
} as const;

export function notReadyText(kind: Exercise['kind'], missing: keyof typeof MISSING_LABEL): string {
  const isHold = kind === 'seated-extension-hold';
  const label = isHold && missing === 'targetFlexion' ? 'Hold angle' : MISSING_LABEL[missing];
  if (isHold && missing !== 'holdSeconds') return `${label} missing. ${ASK_HOLD_ANGLE_TEXT}`;
  return `${label} missing. ${ASK_SURGEON_TEXT}.`;
}
