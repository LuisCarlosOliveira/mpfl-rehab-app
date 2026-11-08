// Home. Source: research/ux-flow.md sections 3.1 (F2, F3) and 8.1, plan FR2, FR4, FR17, FR29.
// Text from the protocol file shows as plain text. The app never sets the phase (FR4):
// the active phase comes in as a prop from the read-only store.
import { useEffect, useState } from 'react';
import { counterSetup } from '../lib/exercises';
import { surgeonField, SURGEON_FIELDS, type Exercise, type Protocol, type SurgeonField } from '../lib/protocol';
import { exportReminderDue, getLastExport, type MpflDb } from '../lib/storage';
import { ASK_SURGEON_ITEMS, ASK_SURGEON_TEXT } from './askSurgeon';
import { EXERCISE_NAMES } from './labels';
import type { ExerciseKind } from './appState';

const SURGEON_LABELS: Record<SurgeonField, string> = {
  brace: 'Brace',
  weightBearing: 'Weight bearing',
  depthLimit: 'Depth limit',
  phaseClearance: 'Permission to start a new phase',
  concurrentProcedures: 'Other procedures at the same surgery',
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What the protocol sets for one exercise, as short plain lines. */
function prescription(e: Exercise): string[] {
  const lines: string[] = [];
  if (e.sets !== undefined && e.reps !== undefined) lines.push(`${plural(e.sets, 'set')} of ${plural(e.reps, 'rep')}`);
  else if (e.sets !== undefined) lines.push(plural(e.sets, 'set'));
  if (e.holdSeconds !== undefined) lines.push(`Hold ${plural(e.holdSeconds, 'second')}`);
  if (e.targetFlexion !== undefined) lines.push(`Target knee bend ${e.targetFlexion} degrees`);
  if (e.maxFlexion !== undefined) lines.push(`Limit ${e.maxFlexion} degrees`);
  return lines;
}

interface Props {
  protocol: Protocol;
  /** The active phase, looked up once by the app shell. Undefined if the protocol has no such phase. */
  phase: Protocol['phases'][number] | undefined;
  activePhase: number;
  db: MpflDb;
  now: () => Date;
  onStart: (kind: ExerciseKind) => void;
  onOpenPrivacy: () => void;
  /** Goes to the Load screen. It erases nothing. Old sessions stay (ux-flow U6). */
  onLoadProtocol: () => void;
}

export function Home({ protocol, phase, activePhase, db, now, onStart, onOpenPrivacy, onLoadProtocol }: Props) {
  const lastExport = getLastExport();
  const [hasSessions, setHasSessions] = useState(false);
  useEffect(() => {
    let alive = true;
    void db.sessions.count().then((n) => alive && setHasSessions(n > 0));
    return () => {
      alive = false;
    };
  }, [db]);
  const reminder = exportReminderDue(lastExport, now(), hasSessions);

  return (
    <section aria-labelledby="home-title">
      <h1 id="home-title" tabIndex={-1}>
        Home
      </h1>

      <div className="block">
        <h2>Your protocol</h2>
        <dl className="facts">
          <dt>Operated side</dt>
          <dd>{protocol.side === 'left' ? 'Left' : 'Right'}</dd>
          <dt>Written by</dt>
          <dd>{protocol.authoredBy ?? 'Not recorded'}</dd>
          <dt>Approval</dt>
          <dd>
            {protocol.approvedOn ? (
              <>
                Approved on <span className="num">{protocol.approvedOn}</span>
              </>
            ) : (
              'No clinician approval recorded'
            )}
          </dd>
          <dt>Active phase</dt>
          <dd>{phase ? `${phase.id}, ${phase.name}` : activePhase}</dd>
        </dl>
        <div className="actions">
          <button type="button" className="btn" onClick={onLoadProtocol}>
            Load a new protocol file
          </button>
        </div>
      </div>

      <div className="block">
        <h2>Your exercises</h2>
        <ul className="exercise-list">
          {(phase?.exercises ?? []).map((e) => {
            const ready = counterSetup(e).ok;
            const name = EXERCISE_NAMES[e.kind];
            return (
              <li key={e.kind} className="exercise">
                <div>
                  <p className="exercise-name">{name}</p>
                  {prescription(e).map((line) => (
                    <p key={line} className="detail">
                      {line}
                    </p>
                  ))}
                  {!ready && <p className="detail">Target missing. {ASK_SURGEON_TEXT}.</p>}
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!ready}
                  aria-label={`Start ${name}`}
                  onClick={() => onStart(e.kind)}
                >
                  Start
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="block">
        <h2>Decisions for your surgeon</h2>
        <dl className="facts">
          {SURGEON_FIELDS.map((key) => {
            const v = surgeonField(protocol, key);
            return (
              <div key={key} className="fact-row">
                <dt>{SURGEON_LABELS[key]}</dt>
                <dd>{v.set ? v.value : v.text}</dd>
              </div>
            );
          })}
          {ASK_SURGEON_ITEMS.map((item) => (
            <div key={item} className="fact-row">
              <dt>{item}</dt>
              <dd>{ASK_SURGEON_TEXT}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="block">
        <h2>Your data</h2>
        <p>
          Last export:{' '}
          {lastExport ? <span className="num">{lastExport.slice(0, 10)}</span> : 'No export yet'}
        </p>
        {reminder && (
          <p className="attention" role="status">
            It is 7 days or more since your last export, or you have not exported yet. Export your sessions. Send the file
            to your care team.
          </p>
        )}
        <button type="button" className="btn" onClick={onOpenPrivacy}>
          Privacy notice
        </button>
      </div>
    </section>
  );
}
