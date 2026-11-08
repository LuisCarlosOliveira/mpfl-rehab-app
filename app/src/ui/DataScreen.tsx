// Data screen (FR14, FR16, FR17). Export as a JSON or CSV text file, import check, erase with a confirmation.
// The export is a text file. The app builds a Blob from the text and a download link. It never makes a Blob from a camera frame.
// The confirmation is a native dialog: showModal gives the focus trap and Escape (research/ui-decisions.md section 2).
import { useEffect, useRef, useState } from 'react';
import { MAX_IMPORT_BYTES, eraseAll, exportCsv, exportJson, getLastExport, importSessions, markExported, type MpflDb } from '../lib/storage';
import { Icon } from './Icon';
import { Notice } from './Notice';
import './dashboard.css';

const REVOKE_DELAY_MS = 1000;

interface Props {
  db: MpflDb;
  onBack: () => void;
  onErased: () => void;
  /** Shows the button that opens the care team view. */
  onOpenClinician?: () => void;
}

/** Start a download of a text file, then free the Blob URL. */
function download(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

type Notice = { kind: 'status' | 'alert'; text: string } | null;

export function DataScreen({ db, onBack, onErased, onOpenClinician }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [lastExport, setLastExport] = useState(getLastExport());
  const [notice, setNotice] = useState<Notice>(null);
  const [eraseError, setEraseError] = useState(false);
  const [erasing, setErasing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const eraseButton = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);

  const refreshCount = () => db.sessions.count().then(setCount, () => setCount(0));
  useEffect(() => {
    let alive = true;
    db.sessions.count().then(
      (n) => alive && setCount(n),
      () => alive && setCount(0),
    );
    return () => {
      alive = false;
    };
  }, [db]);

  async function exportAs(kind: 'json' | 'csv') {
    try {
      const day = new Date().toISOString().slice(0, 10);
      if (kind === 'json') download(await exportJson(db), `mpfl-sessions-${day}.json`, 'application/json');
      else download(await exportCsv(db), `mpfl-sessions-${day}.csv`, 'text/csv');
    } catch {
      setNotice({ kind: 'alert', text: 'The export did not work. Try again.' });
      return;
    }
    markExported(new Date());
    setLastExport(getLastExport());
    setNotice({ kind: 'status', text: 'The file is ready. Look in your downloads folder.' });
  }

  async function importFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = ''; // the same file can be picked again
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setNotice({ kind: 'alert', text: 'The file is larger than 5 MB.' });
      return;
    }
    try {
      const result = await importSessions(db, await file.text());
      if (result.ok) {
        setNotice({ kind: 'status', text: `Imported ${result.imported} ${result.imported === 1 ? 'session' : 'sessions'}.` });
        void refreshCount();
      } else {
        setNotice({ kind: 'alert', text: result.error.message });
      }
    } catch {
      setNotice({ kind: 'alert', text: 'The app cannot read or save this file on this device. Try again.' });
    }
  }

  function openDialog() {
    setEraseError(false);
    dialog.current?.showModal();
    keepButton.current?.focus(); // the button that keeps the data is the first choice
  }

  async function erase() {
    setErasing(true);
    try {
      await eraseAll(db);
    } catch {
      setEraseError(true);
      setErasing(false);
      return;
    }
    setErasing(false);
    dialog.current?.close();
    onErased();
  }

  const noSessions = count === null || count === 0;

  return (
    <section aria-labelledby="data-title">
      <header className="page-head">
        <h1 id="data-title" tabIndex={-1}>
          My data
        </h1>
        <button type="button" className="btn" onClick={onBack}>
          <Icon name="arrow-left" size={18} />
          Back
        </button>
      </header>

      <div className="stack">
        <Notice role="note" icon="shield-check">
          <p>
            This file holds health data. Send it only by the secure channel of your clinic. Do not send it by normal email or chat.
          </p>
        </Notice>

        {notice && (
          <p className="status-line" role={notice.kind}>
            <Icon name={notice.kind === 'alert' ? 'triangle-alert' : 'check'} size={20} />
            {notice.text}
          </p>
        )}

        <div className="data-grid">
          <section className="card stack-s" aria-labelledby="export-title">
            <h2 id="export-title">Export</h2>
            <ul className="chips">
              <li className="chip chip-soft">
                <Icon name="database" size={16} />
                {count === null ? 'Counting sessions.' : count === 0 ? 'No sessions are stored yet.' : `${count} ${count === 1 ? 'session' : 'sessions'} on this device.`}
              </li>
              <li className="chip">
                <Icon name="calendar-check" size={16} />
                {lastExport ? `Last export: ${lastExport.slice(0, 10)}` : 'You have not exported yet.'}
              </li>
            </ul>
            <div className="actions">
              <button type="button" className="btn btn-primary" disabled={noSessions} onClick={() => void exportAs('json')}>
                <Icon name="download" size={18} />
                Export JSON file
              </button>
              <button type="button" className="btn" disabled={noSessions} onClick={() => void exportAs('csv')}>
                <Icon name="download" size={18} />
                Export CSV file
              </button>
            </div>
            <p className="detail">The JSON file can be imported again. The CSV file is for reading in a spreadsheet.</p>
          </section>

          <section className="card stack-s" aria-labelledby="import-title">
            <h2 id="import-title">Import</h2>
            <p>Import adds the sessions of a file to this device. It stops and adds nothing if any session is already stored.</p>
            <div className="dropzone field">
              <span className="drop-icon">
                <Icon name="upload" size={26} />
              </span>
              <label htmlFor="import-file">Import a session file (.json)</label>
              <input id="import-file" type="file" accept=".json,application/json" onChange={(e) => void importFile(e.target)} />
            </div>
          </section>

          {onOpenClinician && (
            <section className="card stack-s" aria-labelledby="care-title">
              <h2 id="care-title">Care team</h2>
              <p>Care team members can read a session file here. The app keeps the file in memory only.</p>
              <div className="actions">
                <button type="button" className="btn" onClick={onOpenClinician}>
                  <Icon name="stethoscope" size={18} />
                  Open a session file (care team)
                </button>
              </div>
            </section>
          )}

          <section className="card card-erase stack-s" aria-labelledby="erase-heading">
            <h2 id="erase-heading">Erase</h2>
            <p>Erase removes all data of this app from this device.</p>
            <div className="actions">
              <button type="button" className="btn btn-danger" ref={eraseButton} onClick={openDialog}>
                <Icon name="trash-2" size={18} />
                Erase all my data
              </button>
            </div>
          </section>
        </div>
      </div>

      <dialog
        ref={dialog}
        className="erase-dialog"
        aria-labelledby="erase-title"
        onClose={() => eraseButton.current?.focus()}
      >
        <h2 id="erase-title">Erase all your data?</h2>
        <p>This removes your sessions, your protocol file and your settings from this device. You cannot undo it.</p>
        <p>If you want a copy, export the file first.</p>
        {eraseError && (
          <p className="status-line mt-s" role="alert">
            <Icon name="triangle-alert" size={20} />
            The app did not erase everything. Try again.
          </p>
        )}
        <div className="actions">
          <button type="button" className="btn btn-primary" ref={keepButton} onClick={() => dialog.current?.close()}>
            Keep my data
          </button>
          <button type="button" className="btn btn-danger btn-strong" disabled={erasing} onClick={() => void erase()}>
            <Icon name="trash-2" size={18} />
            Erase my data
          </button>
        </div>
      </dialog>
    </section>
  );
}
