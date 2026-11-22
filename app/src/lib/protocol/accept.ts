import { HOLD_PAIN_LIMIT, losesPainLimit, movesForward } from '../planView';
import { loadStoredProtocol, saveProtocol, type MpflDb } from '../storage/db';
import type { Mode } from './loader';
import { protocolSchema, type Protocol } from './schema';
import { isTrustedClick } from './trustedClick';

/** A confirmation older than this is stale. The click and the save are one step, so ten seconds is long. ENGINEERING value. */
export const CONFIRMATION_MAX_AGE_MS = 10_000;

declare const confirmationBrand: unique symbol;
export type PersonConfirmation = { readonly [confirmationBrand]: true };

const issued = new WeakMap<object, { at: number; used: boolean }>();

export function confirmByPerson(event: Event): PersonConfirmation | null {
  if (!isTrustedClick(event)) return null;
  const confirmation = Object.freeze({}) as PersonConfirmation;
  issued.set(confirmation, { at: performance.now(), used: false });
  return confirmation;
}

export const selfProgressionOn = (): boolean => {
  const flag = import.meta.env.VITE_SELF_PROGRESSION;
  return flag === 'true' || flag === '1';
};

interface Proposal {
  readonly protocol: Protocol;
}

type AcceptCode =
  | 'no-confirmation'
  | 'reused'
  | 'stale'
  | 'invalid'
  | 'not-generated'
  | 'has-approval'
  | 'progression-off'
  | 'stored-plan-unreadable'
  | 'pain-limit'
  | 'refused-by-loader'
  | 'save-failed';

type AcceptResult = { ok: true; protocol: Protocol } | { ok: false; code: AcceptCode; message: string };

const refuse = (code: AcceptCode, message: string): AcceptResult => ({ ok: false, code, message });

export async function acceptProposal(db: MpflDb, proposal: Proposal, confirmation: PersonConfirmation, mode: Mode): Promise<AcceptResult> {
  const record = typeof confirmation === 'object' && confirmation !== null ? issued.get(confirmation) : undefined;
  if (record === undefined) return refuse('no-confirmation', 'The plan needs a confirmation from a person.');
  if (record.used) return refuse('reused', 'This confirmation was used before. Press Confirm again.');
  record.used = true;
  if (performance.now() - record.at > CONFIRMATION_MAX_AGE_MS) return refuse('stale', 'The confirmation is too old. Press Confirm again.');

  const parsed = protocolSchema.safeParse(proposal?.protocol);
  if (!parsed.success) return refuse('invalid', 'The plan is not valid. Nothing was saved.');
  const next = parsed.data;
  if (next.generated === undefined) return refuse('not-generated', 'Only a plan that the app made can be saved here.');
  if (next.approvedOn !== undefined) return refuse('has-approval', 'A plan that the app made cannot carry an approval.');

  try {
    const stored = await loadStoredProtocol(db, mode);
    if (stored && !stored.ok && !selfProgressionOn()) {
      return refuse('stored-plan-unreadable', 'The app cannot read your stored plan. Ask your care team. The plan did not change.');
    }
    if (stored === null && next.activePhase > 1 && !selfProgressionOn()) {
      return refuse('progression-off', 'Ask your care team about the next stage. The plan did not change.');
    }
    if (stored?.ok && movesForward(stored.protocol, next)) {
      if (!selfProgressionOn()) return refuse('progression-off', 'Ask your care team about the next stage. The plan did not change.');
      if (losesPainLimit(stored.protocol, next)) return refuse('pain-limit', HOLD_PAIN_LIMIT);
    }
    const saved = await saveProtocol(db, JSON.stringify(next), mode);
    return saved.ok ? { ok: true, protocol: saved.protocol } : refuse('refused-by-loader', saved.error.message);
  } catch {
    return refuse('save-failed', 'The app cannot save the plan. Nothing changed.');
  }
}
