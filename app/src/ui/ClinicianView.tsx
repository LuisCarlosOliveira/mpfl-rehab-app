import { useMemo, useState, type ReactNode } from 'react';
import { PEAK_UNREADABLE_TEXT, peakUnreadable, topUnreadable } from '../lib/cues';
import { loadProtocol, MAX_FILE_BYTES, type Mode, type Protocol } from '../lib/protocol';
import { BANNER, buildReviewSummary, EVENT_LABEL, holdsText, measuredText, painText, TIMED_BY_PERSON, type ReviewRow, type ReviewSummary } from '../lib/reviewSummary';
import { MAX_IMPORT_BYTES, parseExport, type ExportFile, type SessionRecord } from '../lib/storage';
import { DashboardCharts, TableScroll, WhenCell } from './Dashboard';
import { isEngineKind } from '../lib/monitor/monitored';
import { ANGLE_LABEL, EXERCISE_NAMES } from './labels';
import { stripHidden } from '../lib/plainText';
import { Icon } from './Icon';
import { Notice } from './Notice';
import './dashboard.css';

const NOT_APPLICABLE = 'Not applicable';
const NO_VALUE = 'No value';
const FRONT_HEADER = 'Front-view change, estimated, not a medical measurement';
const FRONT_NOTE = 'Median of N reps, inward positive, a logged number for your care team, not a diagnosis. N is the number of reps in the cell. It comes from the second camera.';
const FRONT_NOT_ENOUGH = 'Not enough front-view data';
const COUNTED_BY_HAND = 'counted by hand';

const utcMinute = (iso: string) => iso.slice(0, 16).replace('T', ' ');

const NOT_ANSWERED = 'Not answered';
const SWELLING_TEXT = { none: 'No swelling', some: 'Some swelling', more: 'More than before' } as const;

async function readText(file: File, maxBytes: number): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  if (file.size > maxBytes) return { ok: false, message: 'The file is larger than 5 MB.' };
  try {
    return { ok: true, text: await file.text() };
  } catch {
    return { ok: false, message: 'The app cannot read this file. Try again.' };
  }
}

function frontCell(s: SessionRecord): string {
  if (s.frontChangeDeg !== undefined) return s.frontReps === undefined ? wholeDegrees(s.frontChangeDeg) : `${wholeDegrees(s.frontChangeDeg)} (${s.frontReps} reps)`;
  return s.secondView === undefined ? NOT_APPLICABLE : FRONT_NOT_ENOUGH;
}

const wholeDegrees = (value: number) => (Number.isFinite(value) ? String(Math.round(value)) : NO_VALUE);
const orNone = (value: number | null) => (value === null ? NO_VALUE : String(value));
const orNoneRounded = (value: number | null) => (value === null ? NO_VALUE : wholeDegrees(value));

const repsCell = (s: SessionRecord) => (s.repsBy === 'hand' && s.reps !== null ? `${s.reps} (${COUNTED_BY_HAND})` : orNone(s.reps));

const peakCell = (s: SessionRecord) => (isEngineKind(s.exercise) && peakUnreadable(s.exercise, s.peakFlexion) ? PEAK_UNREADABLE_TEXT : orNoneRounded(s.peakFlexion));

function Table({ label, head, natural, children }: { label: string; head: ReactNode[]; natural?: boolean; children: ReactNode }) {
  return (
    <TableScroll label={label} natural={natural}>
      <table className="data-table" aria-label={label}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </TableScroll>
  );
}

function CriterionRow({ row }: { row: ReviewRow }) {
  return (
    <tr>
      <td>{row.criterion}</td>
      <td>{row.limitText ?? NOT_APPLICABLE}</td>
      <td>{row.evidenceLabel}</td>
      <td>{row.measuredText}</td>
      <td>
        {row.marginText ?? NOT_APPLICABLE}
        {row.marginSource && ` (${row.marginSource})`}
      </td>
      <td>{row.state ?? NOT_APPLICABLE}</td>
      <td>{row.dataText}</td>
    </tr>
  );
}

const NAME_LIMIT = 80;
const shownName = (name: string) => {
  const clean = stripHidden(name);
  return clean.length > NAME_LIMIT ? `${clean.slice(0, NAME_LIMIT)}…` : clean;
};

interface Props {
  onBack: () => void;
  mode: Mode;
  now?: () => Date;
}

export function ClinicianView({ onBack, mode, now = () => new Date() }: Props) {
  const [file, setFile] = useState<ExportFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [protocolError, setProtocolError] = useState<string | null>(null);
  const [phaseId, setPhaseId] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [protocolName, setProtocolName] = useState<string | null>(null);

  const sessions = useMemo<SessionRecord[]>(() => (file ? file.sessions.map((s, i) => ({ ...s, id: i + 1 })) : []), [file]);

  const summary = useMemo(
    () =>
      file && protocol && phaseId !== null
        ? buildReviewSummary({ protocol, phaseId, sessions, lastExportAt: null, now: now(), pseudonymId: file.pseudonymId })
        : null,
    [file, protocol, phaseId, sessions, now],
  );

  const showFront = sessions.some((s) => s.secondView !== undefined || s.frontChangeDeg !== undefined);

  async function onSessionFile(input: HTMLInputElement) {
    const picked = input.files?.[0];
    input.value = '';
    if (!picked) return;
    setFile(null);
    setFileName(null);
    const read = await readText(picked, MAX_IMPORT_BYTES);
    if (!read.ok) return setFileError(read.message);
    const parsed = parseExport(read.text);
    if (parsed.ok) {
      setFileError(null);
      setFile(parsed.file);
      setFileName(shownName(picked.name));
    } else {
      setFileError(parsed.error.message);
    }
  }

  async function onProtocolFile(input: HTMLInputElement) {
    const picked = input.files?.[0];
    input.value = '';
    if (!picked) return;
    setProtocol(null);
    setProtocolName(null);
    const read = await readText(picked, MAX_FILE_BYTES);
    if (!read.ok) return setProtocolError(read.message);
    const result = loadProtocol(read.text, mode);
    if (result.ok) {
      setProtocolError(null);
      setProtocol(result.protocol);
      setProtocolName(shownName(picked.name));
      setPhaseId(result.protocol.activePhase);
    } else {
      setProtocolError(result.error.message);
    }
  }

  return (
    <section aria-labelledby="clinician-title">
      <header className="page-head">
        <h1 id="clinician-title" tabIndex={-1}>
          Care team view
        </h1>
        <button type="button" className="btn" onClick={onBack}>
          <Icon name="arrow-left" size={18} />
          Back
        </button>
      </header>

      <div className="stack">
        <div className="dropzone field">
          <span className="drop-icon">
            <Icon name="file-text" size={26} />
          </span>
          <label htmlFor="clinician-session-file">Session file (.json)</label>
          <input id="clinician-session-file" type="file" accept=".json,application/json" onChange={(e) => void onSessionFile(e.target)} />
        </div>
        {fileName !== null && <p className="dash-note">{`Session file loaded: ${fileName}`}</p>}
        {fileError && (
          <Notice role="alert" icon="triangle-alert" title="Session file not opened">
            <p>{fileError}</p>
          </Notice>
        )}

        {file && (
          <>
            <Notice tone="strong" icon="shield-check">
              <p className="banner-text" role="note">
                {BANNER}
              </p>
            </Notice>
            <p className="dash-note">This file stays in memory. The app does not store it. It is gone when you close or reload this page.</p>

            <div className="dropzone field">
              <span className="drop-icon">
                <Icon name="list-checks" size={26} />
              </span>
              <label htmlFor="clinician-protocol-file">Protocol file (.json), for the review summary</label>
              <input id="clinician-protocol-file" type="file" accept=".json,application/json" onChange={(e) => void onProtocolFile(e.target)} />
            </div>
            {protocolName !== null && <p className="dash-note">{`Protocol file loaded: ${protocolName}`}</p>}
            {protocolError && (
              <Notice role="alert" icon="triangle-alert" title="Protocol file not opened">
                <p>{protocolError}</p>
              </Notice>
            )}

            {protocol && summary ? (
              <ReviewSummaryBlock protocol={protocol} phaseId={summary.header.phase.id} onPhase={setPhaseId} summary={summary} />
            ) : (
              <p>Pick a protocol file to see the review summary.</p>
            )}

            <h2 className="section-gap">Session list</h2>
            <p className="dash-note">Angles are estimates: {ANGLE_LABEL}.</p>
            {showFront && <p className="dash-note">{FRONT_NOTE}</p>}
            <Table
              label="Session list"
              head={[
                'Date and time (UTC)', 'Exercise', 'Phase', 'Protocol id', 'Reps', 'Hold (seconds)', 'Peak knee bend (degrees)', 'Angle at the top (degrees)', 'Measured value', 'Holds timed by the person', 'Pain (0 to 10)', 'Swelling', 'Bends near the limit', 'Bends over the limit',
                ...(showFront ? [FRONT_HEADER] : []),
              ]}
            >
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <WhenCell when={s.date} />
                  </td>
                  <td>{s.timedBy === 'person' ? `${EXERCISE_NAMES[s.exercise]} (${TIMED_BY_PERSON})` : EXERCISE_NAMES[s.exercise]}</td>
                  <td className="num-cell">{s.phase}</td>
                  <td>{s.protocolId}</td>
                  <td className="num-cell">{repsCell(s)}</td>
                  <td className="num-cell">{orNone(s.holdSeconds)}</td>
                  <td className="num-cell">{peakCell(s)}</td>
                  <td className="num-cell">{topUnreadable(s.topFlexion) ? PEAK_UNREADABLE_TEXT : orNoneRounded(s.topFlexion)}</td>
                  <td>{measuredText(s) ?? NOT_APPLICABLE}</td>
                  <td className="num-cell">{holdsText(s) ?? NOT_APPLICABLE}</td>
                  <td className="num-cell">{painText(s)}</td>
                  <td>{s.swelling === undefined ? NOT_ANSWERED : SWELLING_TEXT[s.swelling]}</td>
                  <td className="num-cell">{s.nearLimit}</td>
                  <td className="num-cell">{s.overLimit}</td>
                  {showFront && <td className="num-cell">{frontCell(s)}</td>}
                </tr>
              ))}
            </Table>

            <DashboardCharts sessions={sessions} />
          </>
        )}
      </div>
    </section>
  );
}

function ReviewSummaryBlock({
  protocol,
  phaseId,
  onPhase,
  summary,
}: {
  protocol: Protocol;
  phaseId: number;
  onPhase: (id: number) => void;
  summary: ReviewSummary;
}) {
  const { header, events, rows, clinicianChecks, painSwellingTable } = summary;
  return (
    <>
      <h2 className="section-gap">Review summary</h2>
      <div className="field">
        <label htmlFor="clinician-phase">Phase to review</label>
        <select id="clinician-phase" value={phaseId} onChange={(e) => onPhase(Number(e.target.value))}>
          {protocol.phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id}: {p.name}
            </option>
          ))}
        </select>
      </div>

      <section className="card" role="region" aria-label="Summary header">
        <dl className="facts facts-split">
          {(
            [
              ['Pseudonymous id', header.pseudonymId ?? 'Not set'],
              ['Protocol id', header.protocolId],
              ['Phase', `${header.phase.id}: ${header.phase.name}`],
              ['Review date', header.reviewDate ?? 'Not set'],
              ['Last session', header.lastSessionDate === null ? 'No sessions' : `${utcMinute(header.lastSessionDate)} (UTC)`],
              ['Sessions in this file', String(header.sessionsSinceExport)],
            ] as const
          ).map(([label, value]) => (
            <div className="fact-row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <h3 className="section-gap">Events in this file</h3>
      <Table natural label="Events in this file" head={['Event', 'Count']}>
        {(Object.keys(EVENT_LABEL) as (keyof typeof EVENT_LABEL)[]).map((key) => (
          <tr key={key}>
            <td>{EVENT_LABEL[key]}</td>
            <td className="num-cell">{events[key]}</td>
          </tr>
        ))}
      </Table>

      <h3 className="section-gap">Review criteria</h3>
      {rows.length === 0 ? (
        <p>This phase has no review criteria.</p>
      ) : (
        <Table natural label="Review criteria" head={['Criterion', 'Limit', 'Evidence', 'Measured', 'Margin', 'State', 'Data']}>
          {rows.map((row, i) => (
            <CriterionRow key={i} row={row} />
          ))}
        </Table>
      )}

      <h3 className="section-gap">Checks for the visit</h3>
      <ul className="points" aria-label="Checks for the visit">
        {clinicianChecks.map((c) => (
          <li key={c.key} className="point">
            <p>
              {c.text} <span className="detail">{c.evidenceLabel}</span>
            </p>
          </li>
        ))}
      </ul>

      <h3 className="section-gap">Pain and swelling by session</h3>
      <Table label="Pain and swelling by session" head={['Date and time (UTC)', 'Exercise', 'Pain (0 to 10)', 'Swelling']}>
        {painSwellingTable.map((r) => (
          <tr key={r.sessionId}>
            <td>
              <WhenCell when={r.date} />
            </td>
            <td>{EXERCISE_NAMES[r.exerciseKind] ?? r.exercise}</td>
            <td className="num-cell">{r.painText}</td>
            <td>{r.swelling === undefined ? NOT_ANSWERED : SWELLING_TEXT[r.swelling]}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
