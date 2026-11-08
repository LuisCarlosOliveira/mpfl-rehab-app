// The one screen that saves a plan that the app made. It is the only file that calls confirmByPerson and acceptProposal
// (scripts/phase-check.sh enforces this). A plan or a change is saved only after a real click on Confirm.
// "Keep my plan" changes nothing. A plan that a clinician approved is never replaced without the warning on this screen.
import { useRef, useState } from 'react';
import type { Mode, Protocol } from '../lib/protocol';
import { acceptProposal, confirmByPerson } from '../lib/protocol/accept';
import { describeNewPlan, type PlanDraft } from '../lib/planView';
import { saveGeneratorInputs, type MpflDb } from '../lib/storage';
import { Icon } from './Icon';
import { Notice } from './Notice';

type PlanOnly = Extract<PlanDraft, { kind: 'plan' }>;

interface Props {
  db: MpflDb;
  mode: Mode;
  draft: PlanOnly;
  /** The plan that is stored now, or null when none is stored. */
  current: Protocol | null;
  /** The plan was saved. The app shows it. */
  onAccepted: (protocol: Protocol) => void;
  /** The person keeps what is stored. Nothing was saved. */
  onKeep: () => void;
}

export function ConfirmPlan({ db, mode, draft, current, onAccepted, onKeep }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const update = draft.origin === 'update';
  const lines = update ? draft.changes : describeNewPlan(draft.protocol);
  const noChange = update && draft.changes.length === 0;
  const canConfirm = draft.hold === null && !noChange;

  async function onConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    if (saving.current) return;
    const confirmation = confirmByPerson(event.nativeEvent);
    if (confirmation === null) {
      setError('The app did not read this as a click of a person. Press Confirm again.');
      return;
    }
    saving.current = true;
    setBusy(true);
    setError(null);
    const result = await acceptProposal(db, { protocol: draft.protocol }, confirmation, mode);
    if (!result.ok) {
      saving.current = false;
      setBusy(false);
      setError(result.message);
      return;
    }
    // The answers of the person stay on this device, so "Update my plan" can use them. A failed write does not undo the plan.
    try {
      await saveGeneratorInputs(db, draft.inputs);
    } catch {
      // Update my plan then asks for the answers again.
    }
    onAccepted(result.protocol);
  }

  return (
    <section aria-labelledby="confirm-title" className="narrow">
      <header className="page-head">
        <h1 id="confirm-title" tabIndex={-1}>
          {update ? 'Confirm the change' : 'Confirm your plan'}
        </h1>
      </header>
      <div className="stack">
        <p className="lede">
          {update
            ? 'You asked the app to check your plan again. The app changes nothing until you press Confirm.'
            : 'You asked the app to make a plan from your answers. The app saves it on this device only when you press Confirm.'}
        </p>

        {current?.approvedOn && (
          <Notice tone="strong" role="alert" icon="triangle-alert" title="Your plan would be replaced">
            <p>
              Your stored plan was approved by a clinician on <span className="num">{current.approvedOn}</span>. If you confirm, the app replaces it with a plan that
              no clinician approved.
            </p>
          </Notice>
        )}
        {current && !current.approvedOn && !update && (
          <Notice role="status" icon="info">
            <p>If you confirm, the plan that is stored on this device is replaced.</p>
          </Notice>
        )}
        {draft.hold !== null && (
          <Notice role="status" icon="phone">
            <p>{draft.hold}</p>
          </Notice>
        )}

        {/* A change on hold is not listed, because the app will not make it. */}
        {draft.hold === null && (
          <section className="card stack-s" aria-labelledby="confirm-what">
            <h2 id="confirm-what">{update ? 'What changes' : 'Your new plan'}</h2>
            {noChange ? (
              <p>No change to your plan today.</p>
            ) : (
              <ul className="change-list">
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {error && (
          <Notice role="alert" icon="triangle-alert">
            <p>{error}</p>
          </Notice>
        )}
      </div>

      <div className="action-bar">
        {canConfirm && (
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={(e) => void onConfirm(e)}>
            <Icon name="check" size={20} />
            Confirm
          </button>
        )}
        <button type="button" className="btn btn-lg" disabled={busy} onClick={onKeep}>
          {current ? 'Keep my plan' : 'Do not save this plan'}
        </button>
      </div>
    </section>
  );
}
