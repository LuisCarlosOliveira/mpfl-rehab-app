// The one screen that saves a plan that the app made. It is the only file that calls confirmByPerson and acceptProposal
// (scripts/phase-check.sh enforces this). A plan or a change is saved only after a real click on Confirm.
// "Keep my plan" changes nothing. A plan that a clinician approved is never replaced without the warning on this screen.
import { useRef, useState } from 'react';
import type { Mode, Protocol } from '../lib/protocol';
import { acceptProposal, confirmByPerson, selfProgressionOn } from '../lib/protocol/accept';
import { describeNewPlan, doseScope, holdTextFor, losesPainLimit, movesForward, type PlanDraft } from '../lib/planView';
import { SourceNote } from './SourceNote';
import { saveGeneratorInputs, type MpflDb } from '../lib/storage';
import { Icon } from './Icon';
import { Notice } from './Notice';
import './screensV2.css';

type PlanOnly = Extract<PlanDraft, { kind: 'plan' }>;

interface Props {
  db: MpflDb;
  mode: Mode;
  draft: PlanOnly;
  current: Protocol | null;
  onAccepted: (protocol: Protocol) => void;
  onKeep: () => void;
}

interface ChangeView {
  title: string;
  before: string | null;
  after: string | null;
  reason: string | null;
}

const NOT_IN_PLAN = 'Not in your plan';
const IN_PLAN = 'In your plan';

export function splitChange(line: string): ChangeView {
  const at = line.indexOf('. Reason: ');
  const what = at < 0 ? line.replace(/\.$/, '') : line.slice(0, at);
  const reason = at < 0 ? null : line.slice(at + 2).replace(/\.$/, '').replace(/\s\([A-Z][A-Z0-9_]*\)$/, '');
  let m = /^Knee-bend limit in your plan: from (.+) to (.+)$/.exec(what);
  if (m) return { title: 'Knee-bend limit in your plan', before: m[1]!, after: m[2]!, reason };
  m = /^(.+?) changes to (.+)$/.exec(what);
  if (m) return { title: 'Stage', before: m[1]!, after: m[2]!, reason };
  m = /^(.+) added$/.exec(what);
  if (m) return { title: m[1]!, before: NOT_IN_PLAN, after: IN_PLAN, reason };
  m = /^(.+) removed$/.exec(what);
  if (m) return { title: m[1]!, before: IN_PLAN, after: NOT_IN_PLAN, reason };
  return { title: what, before: null, after: null, reason };
}

export function ConfirmPlan({ db, mode, draft, current, onAccepted, onKeep }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const update = draft.origin === 'update';
  const lines = update ? draft.changes : describeNewPlan(draft.protocol);
  const noChange = update && draft.changes.length === 0;
  const hold =
    draft.hold ?? (!update && current !== null && movesForward(current, draft.protocol) && (!selfProgressionOn() || losesPainLimit(current, draft.protocol)) ? holdTextFor(current, draft.protocol) : null);
  const canConfirm = hold === null && !noChange;

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
    try {
      await saveGeneratorInputs(db, draft.inputs);
    } catch {
    }
    onAccepted(result.protocol);
  }

  return (
    <section aria-labelledby="confirm-title" className="narrow v2-screens">
      <header className="page-head">
        <h1 id="confirm-title" tabIndex={-1}>
          {update ? (canConfirm || noChange ? 'Confirm the change' : 'Change held') : 'Confirm your plan'}
        </h1>
      </header>
      <div className="stack">
        <p className="lede">
          {!canConfirm
            ? 'The app changes nothing. Your plan stays as it is.'
            : update
              ? 'You asked the app to check your plan again. The app changes nothing until you press Confirm.'
              : 'You asked the app to make a plan from your answers. The app saves it on this device only when you press Confirm.'}
        </p>

        {hold === null && current?.approvedOn && (
          <Notice tone="strong" role="alert" icon="triangle-alert" title="Your plan would be replaced">
            <p>
              Your stored plan was approved by a clinician on <span className="num">{current.approvedOn}</span>. If you confirm, the app replaces it with a plan that
              no clinician approved.
            </p>
          </Notice>
        )}
        {hold === null && current && !current.approvedOn && !update && (
          <Notice role="status" icon="info">
            <p>If you confirm, the plan that is stored on this device is replaced.</p>
          </Notice>
        )}
        {hold !== null && (
          <Notice role="status" icon="phone">
            <p>{hold}</p>
          </Notice>
        )}

        {hold === null && (
          <section className="stack-s" aria-labelledby="confirm-what">
            <h2 id="confirm-what">{update ? 'What changes' : 'Your new plan'}</h2>
            {noChange ? (
              <p>No change to your plan today.</p>
            ) : update ? (
              <ul className="change-list change-rows">
                {lines.map((line) => {
                  const c = splitChange(line);
                  return (
                    <li key={line} className="change-row">
                      <p className="change-title">{c.title}</p>
                      {c.before !== null && c.after !== null && (
                        <dl className="before-after">
                          <div>
                            <dt>Before</dt>
                            <dd className="before">{c.before}</dd>
                          </div>
                          <div>
                            <dt>After</dt>
                            <dd className="after">{c.after}</dd>
                          </div>
                        </dl>
                      )}
                      {c.reason && <p className="change-reason">{c.reason}.</p>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="change-list">
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {hold === null && !noChange && draft.protocol.generated?.rules.includes('DOSE') === true && (!update || draft.changes.some((l) => l.startsWith('Sets and reps added'))) && (
          <SourceNote rule="DOSE" label="Sets and reps" scope={doseScope(draft.protocol)} hideValue />
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
