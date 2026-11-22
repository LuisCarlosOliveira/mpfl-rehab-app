// The only path that saves a protocol which the app made. The generator is pure and never saves.
// A person confirms each plan and each change. This file checks that the confirmation is real, recent and unused.
// It does not stop script in the same page: such script can call any function. It stops a plan or a phase change
// that no click of a person asked for. FR4 and FR30 to FR31 of the plan.

import { HOLD_PAIN_LIMIT, losesPainLimit, movesForward } from '../planView';
import { loadStoredProtocol, saveProtocol, type MpflDb } from '../storage/db';
import type { Mode } from './loader';
import { protocolSchema, type Protocol } from './schema';
import { isTrustedClick } from './trustedClick';

/** A confirmation older than this is stale. The click and the save are one step, so ten seconds is long. ENGINEERING value. */
export const CONFIRMATION_MAX_AGE_MS = 10_000;

declare const confirmationBrand: unique symbol;
/** Proof of one click. Only `confirmByPerson` makes it, and `acceptProposal` accepts it once. */
export type PersonConfirmation = { readonly [confirmationBrand]: true };

// The age of a confirmation comes from performance.now(). The wall clock can step back or forward when a device
// syncs its time, and a step back would make an old confirmation look new.
// The values that this file made. A copy, a literal or a forged object is not in the map.
const issued = new WeakMap<object, { at: number; used: boolean }>();

/** Call this in the click handler of the Confirm button. It gives null for anything that is not a trusted click event. */
export function confirmByPerson(event: Event): PersonConfirmation | null {
  if (!isTrustedClick(event)) return null;
  const confirmation = Object.freeze({}) as PersonConfirmation;
  issued.set(confirmation, { at: performance.now(), used: false });
  return confirmation;
}

/**
 * Self progression is off by default (decision of the user, 2026-11-22). Only the exact text "true" or "1" in
 * VITE_SELF_PROGRESSION turns it on. A person still confirms each change, and a stored clinician pain limit stays whatever the flag says.
 */
export const selfProgressionOn = (): boolean => {
  const flag = import.meta.env.VITE_SELF_PROGRESSION;
  return flag === 'true' || flag === '1';
};

/** The result of `generateProtocol` with kind "protocol" fits this type. */
export interface Proposal {
  readonly protocol: Protocol;
}

export type AcceptCode =
  | 'no-confirmation'
  | 'reused'
  | 'stale'
  | 'invalid'
  | 'not-generated'
  | 'has-approval'
  | 'progression-off'
  | 'pain-limit'
  | 'refused-by-loader'
  | 'save-failed';

export type AcceptResult = { ok: true; protocol: Protocol } | { ok: false; code: AcceptCode; message: string };

const refuse = (code: AcceptCode, message: string): AcceptResult => ({ ok: false, code, message });

/**
 * Save a generated plan after a confirmation of a person. It uses the same `saveProtocol` path as a loaded file,
 * so the loader checks the saved text again. The stored `activePhase` field is the only source of the phase.
 * A proposal that moves forward (a later phase, a higher or removed limit) is refused unless VITE_SELF_PROGRESSION is "true" or "1".
 * A proposal that removes or raises a stored clinician pain limit is refused whatever the flag says.
 */
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
