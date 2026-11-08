// Plain helpers for the Setup screen. No React here, so a test can read them directly.
// The rule order is the priority order of src/lib/setupRules.ts (research/ux-flow.md section 6.2).
import type { SetupRuleId } from '../lib/setupRules';

export interface RuleRow {
  label: string;
  /** Rule ids of the setup check that make this row "not seen". */
  failedBy: SetupRuleId[];
}

export const RULE_ROWS: RuleRow[] = [
  { label: 'Person in the view', failedBy: ['no-pose'] },
  { label: 'Hip, knee and ankle', failedBy: ['turn-leg', 'show-leg'] },
  { label: 'Whole leg in the frame', failedBy: ['whole-leg'] },
  { label: 'Leg big enough in the frame', failedBy: ['closer'] },
  { label: 'Side-on to the camera', failedBy: ['side-on'] },
  { label: 'Leg held still', failedBy: ['still'] },
];

export interface RuleRowState {
  label: string;
  word: 'seen' | 'not seen';
}

/**
 * The check shows the first failed rule only. A rule before it was seen.
 * The failed rule and each rule after it are "not seen", because the check did not see them yet.
 */
export function ruleRows(current: SetupRuleId): RuleRowState[] {
  const failedAt = RULE_ROWS.findIndex((row) => row.failedBy.includes(current));
  return RULE_ROWS.map((row, i) => ({
    label: row.label,
    word: failedAt === -1 || i < failedAt ? 'seen' : 'not seen',
  }));
}

/** Whole seconds left, rounded up, or null when no countdown runs. */
export function countdownSeconds(leftMs: number | null): number | null {
  return leftMs === null ? null : Math.ceil(leftMs / 1000);
}
