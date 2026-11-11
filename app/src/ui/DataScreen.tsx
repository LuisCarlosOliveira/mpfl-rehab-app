// Data screen (FR14, FR16, FR17). Export as a JSON or CSV text file, import check, erase with a confirmation.
// The export is a text file. The app builds a Blob from the text and a download link. It never makes a Blob from a camera frame.
// The confirmation is a native dialog: showModal gives the focus trap and Escape (research/ui-decisions.md section 2).
import { useEffect, useRef, useState } from 'react';
import { MAX_IMPORT_BYTES, eraseAll, exportCsv, exportJson, getLastExport, importSessions, markExported, readValidRows, type MpflDb } from '../lib/storage';
import { Icon } from './Icon';
import { Notice } from './Notice';
import './dashboard.css';
import './screensV2.css';

const REVOKE_DELAY_MS = 1000;
const DONE_LABEL_MS = 2500; // how long an export button shows "Done" before it shows its first label again

interface Props {
  db: MpflDb;
  onBack: () => void;
  onOpenPrivacy?: () => void;
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

/** The steps of the import drop area (U12). The text of a refusal and the name of the file come as plain text. */
type Drop =
  | { kind: 'idle' }
  | { kind: 'reading'; file: string }
  | { kind: 'refused'; text: string }
  | { kind: 'imported'; text: string };

const sizeText = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const fileText = (file: File) => `${file.name} (${sizeText(file.size)})`;
const isJsonFile = (file: File) => /\.json$/i.test(file.name) || file.type === 'application/json';
const DROP_TEXT = { idle: 'Drop the session file here, or choose a file', over: 'Drop to open' } as const;

export function DataScreen({ db, onBack, onErased, onOpenClinician, onOpenPrivacy }: Props) {
  // The count is the number of rows that the export holds. A stored row that fails the schema is left out of the file, so it is left out here and named in a line.
  const [count, setCount] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [lastExport, setLastExport] = useState(getLastExport());
  const [notice, setNotice] = useState<Notice>(null);
  const [drop, setDrop] = useState<Drop>({ kind: 'idle' });
  const [over, setOver] = useState(false);
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
  const [exported, setExported] = useState<'json' | 'csv' | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [eraseError, setEraseError] = useState(false);
  const [erasing, setErasing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const eraseButton = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  const readCount = () => db.sessions.toArray().then((all) => readValidRows(all));
  const refreshCount = () =>
    readCount().then(
      (r) => {
        setCount(r.rows.length);
        setSkipped(r.skipped);
      },
      () => setCount(0),
    );
  useEffect(() => {
    let alive = true;
    readCount().then(
      (r) => {
        if (!alive) return;
        setCount(r.rows.length);
        setSkipped(r.skipped);
      },
      () => alive && setCount(0),
    );
    return () => {
      alive = false;
    };
  }, [db]);

  async function exportAs(kind: 'json' | 'csv') {
    if (exporting !== null || exported !== null) return; // the buttons use aria-disabled, so they keep the focus. A press in this time does nothing.
    const day = new Date().toISOString().slice(0, 10);
    const filename = `mpfl-sessions-${day}.${kind}`;
    setExporting(kind);
    setNotice(null);
    try {
      if (kind === 'json') download(await exportJson(db), filename, 'application/json');
      else download(await exportCsv(db), filename, 'text/csv');
    } catch {
      setExporting(null);
      setNotice({ kind: 'alert', text: 'The export did not work. Try again.' });
      return;
    }
    markExported(new Date());
    setLastExport(getLastExport());
    setExporting(null);
    setExported(kind);
    doneTimer.current = setTimeout(() => setExported(null), DONE_LABEL_MS);
    setNotice({ kind: 'status', text: `File saved: ${filename}. Look in your downloads folder.` });
  }

  async function importFrom(file: File) {
    if (file.size > MAX_IMPORT_BYTES) {
      setDrop({ kind: 'refused', text: `The file is larger than 5 MB. File: ${fileText(file)}.` });
      return;
    }
    if (!isJsonFile(file)) {
      setDrop({ kind: 'refused', text: `The app opens JSON session files only. File: ${fileText(file)}.` });
      return;
    }
    setDrop({ kind: 'reading', file: fileText(file) });
    try {
      const result = await importSessions(db, await file.text());
      if (result.ok) {
        setDrop({ kind: 'imported', text: `Imported ${result.imported} ${result.imported === 1 ? 'session' : 'sessions'}. File: ${fileText(file)}.` });
        void refreshCount();
      } else {
        setDrop({ kind: 'refused', text: `${result.error.message} File: ${fileText(file)}.` });
      }
    } catch {
      setDrop({ kind: 'refused', text: 'The app cannot read or save this file on this device. Try again.' });
    }
  }

  function importChosen(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = ''; // the same file can be picked again
    if (file) void importFrom(file);
  }

  const reading = drop.kind === 'reading';
  const state = reading ? 'reading' : over ? 'over' : drop.kind;

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
  const busy = exporting !== null || exported !== null;
  const countText = count === null || count === 0 ? '' : ` ${count} ${count === 1 ? 'session' : 'sessions'}`;
  const exportLabel = (kind: 'json' | 'csv') => (exporting === kind ? 'Exporting' : exported === kind ? 'Done' : `Export${countText} as ${kind.toUpperCase()}`);

  return (
    <section aria-labelledby="data-title" className="v2-screens v2-data">
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

        <div className="data-sections">
          <section className="data-section stack-s" aria-labelledby="export-title">
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
            {skipped > 0 && (
              <p className="detail">
                {skipped === 1 ? '1 saved row is' : `${skipped} saved rows are`} left out of the export because the app cannot read {skipped === 1 ? 'it' : 'them'}.
              </p>
            )}
            <div className="actions">
              <button type="button" className="btn btn-primary btn-keep" disabled={noSessions} aria-disabled={busy || undefined} onClick={() => void exportAs('json')}>
                <Icon name={exported === 'json' ? 'check' : 'download'} size={18} />
                {exportLabel('json')}
              </button>
              <button type="button" className="btn btn-keep" disabled={noSessions} aria-disabled={busy || undefined} onClick={() => void exportAs('csv')}>
                <Icon name={exported === 'csv' ? 'check' : 'download'} size={18} />
                {exportLabel('csv')}
              </button>
            </div>
            <p className="detail">The JSON file can be imported again. The CSV file is for reading in a spreadsheet.</p>
          </section>

          <section className="data-section stack-s" aria-labelledby="import-title">
            <h2 id="import-title">Import</h2>
            <p>Import adds the sessions of a file to this device. It adds nothing if a session of the file is already stored, or if the file belongs to another record.</p>
            <div
              className="dropzone field"
              data-state={state}
              onDragEnter={(e) => {
                e.preventDefault();
                if (!reading) setOver(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                const file = e.dataTransfer.files[0];
                if (file && !reading) void importFrom(file);
              }}
            >
              <span className="drop-icon">
                <Icon name="upload" size={26} />
              </span>
              <label htmlFor="import-file">Import a session file (.json)</label>
              <input id="import-file" type="file" accept=".json,application/json" disabled={reading} onChange={(e) => importChosen(e.target)} />
              {drop.kind === 'refused' && !over ? (
                <p className="drop-line" role="alert">
                  <Icon name="triangle-alert" size={20} />
                  {drop.text}
                </p>
              ) : drop.kind === 'imported' && !over ? (
                <p className="drop-line" role="status">
                  <Icon name="check" size={20} />
                  {drop.text}
                </p>
              ) : (
                <p className="drop-line">{over ? DROP_TEXT.over : drop.kind === 'reading' ? `Reading ${drop.file}` : DROP_TEXT.idle}</p>
              )}
            </div>
          </section>

          <section className="data-section stack-s" aria-label="More">
            <ul className="action-rows">
              {onOpenPrivacy && (
                <li>
                  <button type="button" className="action-row" onClick={onOpenPrivacy}>
                    <Icon name="lock" size={22} />
                    <span className="row-title">Privacy notice</span>
                    <Icon name="chevron-right" size={20} />
                  </button>
                </li>
              )}
              {onOpenClinician && (
                <li>
                  <button type="button" className="action-row" onClick={onOpenClinician} aria-describedby="care-row-detail">
                    <Icon name="stethoscope" size={22} />
                    <span className="row-title">Open a session file (care team)</span>
                    <Icon name="chevron-right" size={20} />
                  </button>
                  <p className="row-detail row-detail-out" id="care-row-detail">
                    The app keeps the file in memory only.
                  </p>
                </li>
              )}
            </ul>
          </section>

          <section className="data-section card-erase stack-s" aria-labelledby="erase-heading">
            <h2 id="erase-heading">Erase</h2>
            <p>Erase removes all data of this app from this device. Files that you already exported stay where you saved them.</p>
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
        <p>This removes your sessions, your protocol file, your plan answers and your settings from this device. You cannot undo it.</p>
        <p>Files that you already exported stay where you saved them. If you want a copy, export the file first.</p>
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
