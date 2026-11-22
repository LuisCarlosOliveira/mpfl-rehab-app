import { useState } from 'react';
import { MAX_FILE_BYTES, type Mode } from '../lib/protocol';
import { saveProtocol, type MpflDb } from '../lib/storage';
import { Icon } from './Icon';
import { Notice } from './Notice';
import './screensV2.css';

const ERROR_TITLES: Record<string, string> = {
  'too-large': 'File too large',
  'invalid-json': 'File not readable',
  schema: 'Protocol not valid',
  'example-in-patient-mode': 'Example not allowed',
  'not-approved': 'No approval recorded',
  'generated-not-approved': 'Plan from the app not allowed',
};

interface Props {
  db: MpflDb;
  mode: Mode;
  onLoaded: () => void;
  initialError?: { title: string; message: string } | null;
  onCreatePlan?: () => void;
  onCancel?: () => void;
}

export function LoadProtocol({ db, mode, onLoaded, initialError = null, onCancel, onCreatePlan }: Props) {
  const [error, setError] = useState(initialError);

  async function onPick(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError({ title: ERROR_TITLES['too-large']!, message: 'The file is larger than 5 MB.' });
      return;
    }
    let result;
    try {
      result = await saveProtocol(db, await file.text(), mode);
    } catch {
      setError({ title: 'File not saved', message: 'The file could not be read or saved on this device. Try again.' });
      return;
    }
    if (result.ok) {
      setError(null);
      onLoaded();
    } else {
      setError({ title: ERROR_TITLES[result.error.code] ?? 'File refused', message: result.error.message });
    }
  }

  return (
    <section
      aria-labelledby="load-title"
      className="narrow v2-screens v2-load"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void onPick(e.dataTransfer.files[0]);
      }}
    >
      <header className="page-head">
        <h1 id="load-title" tabIndex={-1}>
          Load protocol file
        </h1>
      </header>
      <p className="lede">Your care team gives you a protocol file. Pick it once. The app keeps it on this device.</p>
      <ul className="action-rows mt">
        <li>
          <label className="action-row" htmlFor="protocol-file">
            <Icon name="file-up" size={24} />
            <span className="row-title">Choose a file from your care team</span>
            <Icon name="chevron-right" size={20} />
            <input
              id="protocol-file"
              className="row-file-input"
              type="file"
              accept=".json,application/json"
              aria-describedby="protocol-file-detail"
              onChange={(e) => {
                const input = e.target;
                void onPick(input.files?.[0]).finally(() => {
                  input.value = '';
                });
              }}
            />
          </label>
          <p className="row-detail row-detail-out" id="protocol-file-detail">
            A .json file. You can also drop it on this page.
          </p>
        </li>
        {mode === 'demo' && onCreatePlan && (
          <li>
            <button type="button" className="action-row" onClick={onCreatePlan} aria-describedby="create-plan-detail">
              <Icon name="sliders-horizontal" size={24} />
              <span className="row-title">Create my plan</span>
              <Icon name="chevron-right" size={20} />
            </button>
            <p className="row-detail row-detail-out" id="create-plan-detail">
              The app uses published protocols. No clinician checks this plan.
            </p>
          </li>
        )}
      </ul>
      {error && (
        <div className="stack-s mt-s">
          <Notice role="alert" icon="triangle-alert" title={error.title}>
            <p>{error.message}</p>
          </Notice>
        </div>
      )}
      {onCancel && (
        <div className="actions">
          <button type="button" className="btn" onClick={onCancel}>
            <Icon name="arrow-left" size={18} />
            Back to Home
          </button>
        </div>
      )}
    </section>
  );
}
