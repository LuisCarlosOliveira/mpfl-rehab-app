// The refusal. The app made no plan and saved nothing. The text is the text of the generator for the case.
import type { PlanDraft } from '../lib/planView';
import { Icon } from './Icon';
import { Notice } from './Notice';

interface Props {
  draft: Extract<PlanDraft, { kind: 'referral' }>;
  onLoadFile: () => void;
  onBack: () => void;
}

export function Referral({ draft, onLoadFile, onBack }: Props) {
  // A red flag or the pain rule is a safety message. The other cases are a plain refusal.
  const safety = draft.reason === 'R8' || draft.reason === 'R9';
  return (
    <section aria-labelledby="referral-title" className="narrow">
      <header className="page-head">
        <h1 id="referral-title" tabIndex={-1}>
          No plan from the app
        </h1>
      </header>
      <div className="stack">
        <Notice tone={safety ? 'strong' : 'soft'} role={safety ? 'alert' : 'status'} icon={safety ? 'heart-pulse' : 'phone'}>
          <p>{draft.text}</p>
        </Notice>
        <p className="detail">The app saved nothing from your answers.</p>
      </div>
      <div className="action-bar">
        <button type="button" className="btn btn-primary btn-lg" onClick={onLoadFile}>
          <Icon name="file-up" size={20} />
          Load a plan file
        </button>
        <button type="button" className="btn btn-lg" onClick={onBack}>
          <Icon name="arrow-left" size={18} />
          Back to the start
        </button>
      </div>
    </section>
  );
}
