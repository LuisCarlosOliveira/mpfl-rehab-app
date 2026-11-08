// FR29 and FR1. The patient picks the protocol file once. A refused file shows its named
// error as plain text. Text from the file is never shown as HTML and never as a link (NFR10).
import { useState } from 'react';
import { MAX_FILE_BYTES, type Mode } from '../lib/protocol';
import { saveProtocol, type MpflDb } from '../lib/storage';
import { Icon } from './Icon';
import { Notice } from './Notice';

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
  /** A stored file that the app refused at start-up. */
  initialError?: { title: string; message: string } | null;
  /** Opens the questions of "Create my plan". The button shows in demo mode only. Patient mode refuses a plan that the app made. */
  onCreatePlan?: () => void;
  /** Set when the app already has a protocol. It lets the patient go back to Home without a file. */
  onCancel?: () => void;
}

export function LoadProtocol({ db, mode, onLoaded, initialError = null, onCancel, onCreatePlan }: Props) {
  const [error, setError] = useState(initialError);

  async function onPick(file: File | undefined) {
    if (!file) return;
    // The size check also runs on the text. This one stops a huge read early.
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
    <section aria-labelledby="load-title" className="narrow">
      <header className="page-head">
        <h1 id="load-title" tabIndex={-1}>
          Load protocol file
        </h1>
      </header>
      <p className="lede">Your care team gives you a protocol file. Pick it once. The app keeps it on this device.</p>
      <div className="dropzone field mt">
        <span className="drop-icon">
          <Icon name="file-up" size={30} />
        </span>
        <label htmlFor="protocol-file">Protocol file (.json)</label>
        <input
          id="protocol-file"
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const input = e.target;
            void onPick(input.files?.[0]).finally(() => {
              input.value = ''; // the same file can be picked again after an error
            });
          }}
        />
      </div>
      {mode === 'demo' && onCreatePlan && (
        <section className="card stack-s mt" aria-labelledby="create-title">
          <h2 id="create-title">No file from your care team?</h2>
          <p>The app uses published protocols. No clinician checks this plan.</p>
          <div className="actions">
            <button type="button" className="btn" onClick={onCreatePlan}>
              <Icon name="sliders-horizontal" size={18} />
              Create my plan
            </button>
          </div>
        </section>
      )}
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
