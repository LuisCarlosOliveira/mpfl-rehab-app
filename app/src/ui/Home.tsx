// Home. Source: research/ux-flow.md sections 3.1 (F2, F3) and 8.1, plan FR2, FR4, FR17, FR29.
// Text from the protocol file shows as plain text. The app never sets the phase (FR4):
// the active phase comes in as a prop from the read-only store.
import { useEffect, useState } from 'react';
import { counterSetup } from '../lib/exercises';
import { surgeonField, SURGEON_FIELDS, type Exercise, type Protocol, type SurgeonField } from '../lib/protocol';
import { CONTACT_TITLE, contactReason } from '../lib/contactCard';
import { localIsoDate, reviewDue } from '../lib/planView';
import { dismissContact, exportReminderDue, getContactDismissed, getLastExport, lastSession, type MpflDb, type SessionRecord } from '../lib/storage';
import { ASK_SURGEON_ITEMS, ASK_SURGEON_TEXT } from './askSurgeon';
import { guideFor } from '../lib/guides';
import { GuideFigure } from './GuideFigure';
import { CompanionEntry } from './CompanionEntry';
import { HomeExerciseList, PlanLines } from './HomeExercises';
import { Icon, type IconName } from './Icon';
import { EXERCISE_NAMES } from './labels';
import { Notice } from './Notice';
import { notReadyText } from './notReady';
import type { ExerciseKind } from './appState';

const SURGEON_LABELS: Record<SurgeonField, string> = {
  brace: 'Brace',
  weightBearing: 'Weight bearing',
  depthLimit: 'Depth limit',
  phaseClearance: 'Permission to start a new phase',
  concurrentProcedures: 'Other procedures at the same surgery',
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const EXERCISE_ICONS: Record<Exercise['kind'], IconName> = {
  'heel-slide': 'footprints',
  'straight-leg-raise': 'bed-single',
  'mini-squat': 'dumbbell',
  'seated-extension-hold': 'armchair',
};

/**
 * What the protocol sets for one exercise, as short plain lines. Each line shows as a chip with an icon.
 * `madeByApp` is true for a plan that the generator made. Its targetFlexion is the count value of the app and no target,
 * so no chip shows it. A clinician sets the target in a written protocol, so that chip stays (L2-01).
 */
export function prescription(e: Exercise, madeByApp = false): { text: string; icon: IconName }[] {
  const lines: { text: string; icon: IconName }[] = [];
  if (e.sets !== undefined && e.reps !== undefined) lines.push({ text: `${plural(e.sets, 'set')} of ${plural(e.reps, 'rep')}`, icon: 'list-checks' });
  else if (e.sets !== undefined) lines.push({ text: plural(e.sets, 'set'), icon: 'list-checks' });
  if (e.holdSeconds !== undefined) lines.push({ text: `Hold ${plural(e.holdSeconds, 'second')}`, icon: 'clock' });
  if (e.targetFlexion !== undefined && !madeByApp) lines.push({ text: `Knee bend set by your care team: ${e.targetFlexion} degrees`, icon: 'circle-dot' });
  if (e.maxFlexion !== undefined) lines.push({ text: `Limit ${e.maxFlexion} degrees`, icon: 'ruler' });
  if (e.minFlexion !== undefined) lines.push({ text: `Straightest knee angle: ${e.minFlexion} degrees`, icon: 'ruler' });
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
  /** Goes to the Load screen. It erases nothing. Old sessions stay (ux-flow U6). */
  onLoadProtocol: () => void;
  /** The two buttons show only when the handler is given, as in the data screen. */
  onOpenData?: () => void;
  /** T12b: opens the phone screen. It shows only when the handler is given. */
  onOpenCompanion?: () => void;
  /** Opens "Update my plan". It shows only for a plan that the app made, and only when the handler is given. */
  onUpdatePlan?: () => void;
}

export const REVIEW_TITLE = 'Review your plan with your care team';

export function Home({ protocol, phase, activePhase, db, now, onStart, onLoadProtocol, onOpenData, onOpenCompanion, onUpdatePlan }: Props) {
  const lastExport = getLastExport();
  const [hasSessions, setHasSessions] = useState(false);
  const [last, setLast] = useState<SessionRecord | undefined>(undefined);
  const [dismissed, setDismissed] = useState(getContactDismissed);
  useEffect(() => {
    let alive = true;
    // A failed read shows no reminder and no contact card. It must not become an unhandled rejection.
    void db.sessions.count().then((n) => alive && setHasSessions(n > 0), () => undefined);
    void lastSession(db).then((s) => alive && setLast(s), () => undefined);
    return () => {
      alive = false;
    };
  }, [db]);
  // B1: the card reads the last saved session. Dismiss hides it until the next session has its own id.
  const contact = last && last.id !== dismissed ? contactReason(last, protocol.painPauseThreshold) : null;
  function dismiss() {
    if (!last) return;
    dismissContact(last.id);
    setDismissed(last.id);
  }
  const reminder = exportReminderDue(lastExport, now(), hasSessions);

  // B3: on the review date of the active phase and after it, a neutral card. The app decides nothing. The person or the care team does.
  const reviewDate = phase?.reviewDate;
  const review = reviewDue(reviewDate, localIsoDate(now()));
  const madeByApp = protocol.generated !== undefined;

  const exercises = phase?.exercises ?? [];
  const surgeonCount = SURGEON_FIELDS.length + ASK_SURGEON_ITEMS.length;

  return (
    <section aria-labelledby="home-title">
      <header className="page-head">
        <h1 id="home-title" tabIndex={-1}>
          Home
        </h1>
      </header>

      {contact && (
        <div className="contact-card">
          <Notice tone="strong" icon="heart-pulse" title={CONTACT_TITLE}>
            <p>{contact.text}</p>
            <div className="actions">
              <button type="button" className="btn" onClick={dismiss}>
                Dismiss
              </button>
            </div>
          </Notice>
        </div>
      )}

      {review && (
        <div className="contact-card">
          <Notice icon="calendar-check" title={REVIEW_TITLE}>
            <p>
              The review date in your plan is <span className="num">{reviewDate}</span>.
            </p>
            <p className="detail">
              {madeByApp
                ? 'The app can check your plan again from today\'s date. You confirm the change or keep your plan.'
                : 'Your care team decides about the next stage. Export your sessions for the review.'}
            </p>
            <div className="actions">
              {madeByApp && onUpdatePlan && (
                <button type="button" className="btn btn-primary" onClick={onUpdatePlan}>
                  <Icon name="refresh-cw" size={18} />
                  Update my plan
                </button>
              )}
              {!madeByApp && onOpenData && (
                <button type="button" className="btn btn-primary" onClick={onOpenData}>
                  <Icon name="download" size={18} />
                  Export for my care team
                </button>
              )}
            </div>
          </Notice>
        </div>
      )}

      <div className="home-grid">
        <section aria-labelledby="exercises-title" className="stack-s">
          <h2 id="exercises-title">Your exercises</h2>
          <ul className="exercise-list">
            {exercises.map((e, i) => {
              const setup = counterSetup(e);
              const ready = setup.ok;
              const name = EXERCISE_NAMES[e.kind];
              const featured = i === 0 && ready;
              return (
                <li key={e.kind} className={featured ? 'exercise exercise-featured' : 'exercise'}>
                  <span className="exercise-icon">
                    <Icon name={EXERCISE_ICONS[e.kind]} size={featured ? 36 : 28} />
                  </span>
                  <div className="exercise-body">
                    <h3 className="exercise-name">{name}</h3>
                    <ul className="chips">
                      {prescription(e, madeByApp).map((line) => (
                        <li key={line.text} className="chip">
                          <Icon name={line.icon} size={16} />
                          {line.text}
                        </li>
                      ))}
                    </ul>
                    {!setup.ok && <p className="detail">{notReadyText(e.kind, setup.missing)}</p>}
                  </div>
                  {featured && (
                    <figure className="exercise-figure">
                      <GuideFigure kind={e.kind} frame="end" side={protocol.side} kneeDeg={madeByApp ? undefined : e.targetFlexion} description={`End position. ${guideFor(e.kind).range}`} />
                    </figure>
                  )}
                  <div className="exercise-go">
                    <button
                      type="button"
                      className={featured ? 'btn btn-primary btn-lg' : 'btn btn-primary'}
                      disabled={!ready}
                      aria-label={`Start ${name}`}
                      onClick={() => onStart(e.kind)}
                    >
                      <Icon name="play" size={featured ? 22 : 18} />
                      Start
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <HomeExerciseList items={phase?.homeExercises ?? []} />
          <PlanLines protocol={protocol} />
        </section>

        <div className="stack">
          <section className="card" aria-labelledby="protocol-title">
            <h2 id="protocol-title">Your protocol</h2>
            <dl className="facts facts-split">
              <div className="fact-row">
                <dt>Operated side</dt>
                <dd>{protocol.side === 'left' ? 'Left' : 'Right'}</dd>
              </div>
              <div className="fact-row">
                <dt>Written by</dt>
                <dd>{protocol.authoredBy ?? 'Not recorded'}</dd>
              </div>
              <div className="fact-row">
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
              </div>
              <div className="fact-row">
                <dt>Active phase</dt>
                <dd>{phase ? `${phase.id}, ${phase.name}` : activePhase}</dd>
              </div>
            </dl>
            <div className="actions">
              {madeByApp && onUpdatePlan && !review && (
                <button type="button" className="btn btn-primary" onClick={onUpdatePlan}>
                  <Icon name="refresh-cw" size={18} />
                  Update my plan
                </button>
              )}
              <button type="button" className="btn" onClick={onLoadProtocol}>
                <Icon name="file-up" size={18} />
                Load a new protocol file
              </button>
            </div>
          </section>

          {/* One disclosure instead of a wall of text. The words stay the same. */}
          <details className="card disclosure">
            <summary>
              <h2>Decisions for your surgeon</h2>
              <span className="chip chip-accent">{surgeonCount} items</span>
              <span className="chev">
                <Icon name="chevron-down" />
              </span>
            </summary>
            <div className="disclosure-body">
              <dl className="facts">
                {SURGEON_FIELDS.map((key) => {
                  const v = surgeonField(protocol, key);
                  return (
                    <div key={key} className="fact-row">
                      <dt>{SURGEON_LABELS[key]}</dt>
                      <dd className={v.set ? undefined : 'ask'}>{v.set ? v.value : v.text}</dd>
                    </div>
                  );
                })}
                {ASK_SURGEON_ITEMS.map((item) => (
                  <div key={item} className="fact-row">
                    <dt>{item}</dt>
                    <dd className="ask">{ASK_SURGEON_TEXT}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>

          <section className="card" aria-labelledby="data-title-home">
            <h2 id="data-title-home">Your data</h2>
            <p>
              Last export: {lastExport ? <span className="num">{lastExport.slice(0, 10)}</span> : 'No export yet'}
            </p>
            {reminder && (
              <div className="stack-s">
                <Notice role="status" icon="calendar-check">
                  <p>
                    It is 7 days or more since your last export, or you have not exported yet. Export your sessions. Send the
                    file to your care team.
                  </p>
                </Notice>
              </div>
            )}
          </section>

          {onOpenCompanion && <CompanionEntry onOpen={onOpenCompanion} />}
        </div>
      </div>
    </section>
  );
}
