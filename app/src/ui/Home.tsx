// Home. Source: the project knowledge base. Requirements FR2, FR4, FR17, FR29.
// Text from the protocol file shows as plain text. The app never sets the phase (FR4):
// the active phase comes in as a prop from the read-only store.
import { useEffect, useState } from 'react';
import { counterSetup } from '../lib/exercises';
import { surgeonField, PHASE_FIRST, SURGEON_FIELDS, type Exercise, type PlanExercise, type Protocol, type SurgeonField } from '../lib/protocol';
import { isMonitored, isNumericKind } from '../lib/monitor/monitored';
import { sessionKinds } from '../lib/sessionPlan';
import { CONTACT_TITLE, contactReason } from '../lib/contactCard';
import { DOSE_SHOWN } from '../lib/protocolGen';
import { CHECK_TITLE, LAST_PLAN_WEEK, lastSessionLine, progressCard } from '../lib/progressHome';
import { ASK_HOW_MANY, ASK_LIMIT, doseScope, HOLD_TIME_LINE, monitorLine, NO_LIMIT_GIVEN, PLAN_NAMES, localIsoDate, reviewDue, surgeryDateWords, weeksSince } from '../lib/planView';
import { dismissContact, exportReminderDue, getContactDismissed, getLastExport, lastSession, loadGeneratorInputs, type MpflDb, type SessionRecord } from '../lib/storage';
import { ASK_SURGEON_ITEMS, ASK_SURGEON_TEXT } from './askSurgeon';
import { guideFor } from '../lib/guides';
import { GuideFigure } from './GuideFigure';
import { COMPANION_BUTTON } from './CompanionEntry';
import { PlanLines } from './HomeExercises';
import { SourceNote, SourceNotes } from './SourceNote';
import { Icon, type IconName } from './Icon';
import { Notice } from './Notice';
import { notReadyText } from './notReady';
import type { ExerciseKind } from './appState';
import { AppShell } from './v3/AppShell';
import { PlanList, type PlanItem } from './v3/PlanList';
import './flowV2.css';
import './v3home.css';

const COMPANION_TEXT = 'This phone can be the second camera of the app on your laptop. It sends body points only. It records nothing and counts nothing.';

const SURGEON_LABELS: Record<SurgeonField, string> = {
  brace: 'Brace',
  weightBearing: 'Weight bearing',
  depthLimit: 'Depth limit',
  phaseClearance: 'Permission to start a new phase',
  concurrentProcedures: 'Other procedures at the same surgery',
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * What the protocol sets for one exercise, as short plain lines. Each line shows as a chip with an icon.
 * `madeByApp` is true for a plan that the generator made. Its targetFlexion is the count value of the app and no target,
 * so no chip shows it. A clinician sets the target in a written protocol, so that chip stays (L2-01).
 */
export function prescription(e: PlanExercise, madeByApp = false): { text: string; icon: IconName }[] {
  const lines: { text: string; icon: IconName }[] = [];
  if (madeByApp && e.sets === undefined && e.holdSeconds === undefined && e.kind !== 'seated-extension-hold') lines.push({ text: ASK_HOW_MANY, icon: 'list-checks' });
  // The generator holds the start of the range of P2 in the field. The plan shows the whole range (DOSE_SHOWN).
  if (madeByApp && e.sets !== undefined && e.reps !== undefined) lines.push({ text: DOSE_SHOWN, icon: 'list-checks' });
  else if (e.sets !== undefined && e.reps !== undefined) lines.push({ text: `${plural(e.sets, 'set')} of ${plural(e.reps, 'rep')}`, icon: 'list-checks' });
  else if (e.sets !== undefined) lines.push({ text: plural(e.sets, 'set'), icon: 'list-checks' });
  if (e.holdSeconds !== undefined) lines.push({ text: `Hold ${plural(e.holdSeconds, 'second')}`, icon: 'clock' });
  if (e.targetFlexion !== undefined && !madeByApp) lines.push({ text: `Knee bend set by your care team: ${e.targetFlexion} degrees`, icon: 'circle-dot' });
  if (e.maxFlexion !== undefined) lines.push({ text: `Limit ${e.maxFlexion} degrees`, icon: 'ruler' });
  if (e.minFlexion !== undefined) lines.push({ text: `Straightest knee angle: ${e.minFlexion} degrees`, icon: 'ruler' });
  if (madeByApp && e.maxFlexion === undefined && (e.kind === 'heel-slide' || e.kind === 'mini-squat')) {
    // The generator writes "No limit entered" in the source of a heel slide after the answer "No limit". "I do not know" keeps the question for the surgeon.
    lines.push({ text: e.kind === 'heel-slide' && e.source.includes('No limit entered') ? NO_LIMIT_GIVEN : ASK_LIMIT, icon: 'ruler' });
  }
  return lines;
}

export function planItems(exercises: readonly PlanExercise[], kinds: readonly ExerciseKind[], madeByApp: boolean): PlanItem[] {
  return kinds.map((kind) => {
    const e = exercises.find((x) => x.kind === kind);
    return { id: kind, name: PLAN_NAMES[kind], dose: e ? prescription(e, madeByApp).map((l) => l.text).join(', ') : '' };
  });
}

interface Props {
  protocol: Protocol;
  phase: Protocol['phases'][number] | undefined;
  activePhase: number;
  db: MpflDb;
  now: () => Date;
  onStart: (kind: ExerciseKind) => void;
  onStartSession?: (kinds: ExerciseKind[]) => void;
  onLoadProtocol: () => void;
  onOpenData?: () => void;
  onOpenCompanion?: () => void;
  onOpenPrivacy?: () => void;
  onUpdatePlan?: () => void;
  onCheckProgress?: () => void;
}

export const REVIEW_TITLE = 'Review your plan with your care team';
export const NO_PLAN_AFTER_WEEK = `The app has no plan after week ${LAST_PLAN_WEEK}. Contact your care team for your next plan.`;

export function Home({ protocol, phase, activePhase, db, now, onStart, onStartSession, onLoadProtocol, onOpenData, onOpenCompanion, onOpenPrivacy, onUpdatePlan, onCheckProgress }: Props) {
  const lastExport = getLastExport();
  const [hasSessions, setHasSessions] = useState(false);
  const [last, setLast] = useState<SessionRecord | undefined>(undefined);
  const [dismissed, setDismissed] = useState(getContactDismissed);
  const [surgery, setSurgery] = useState<string | null>(null);
  const [doneToday, setDoneToday] = useState<readonly string[]>([]);
  useEffect(() => {
    let alive = true;
    void db.sessions.count().then((n) => alive && setHasSessions(n > 0), () => undefined);
    void lastSession(db).then((s) => alive && setLast(s), () => undefined);
    void loadGeneratorInputs(db).then((i) => alive && setSurgery(i?.surgeryDate ?? null), () => undefined);
    void db.sessions.toArray().then((all) => alive && setDoneToday(all.filter((x) => localIsoDate(new Date(x.date)) === localIsoDate(now())).map((x) => x.exercise)), () => undefined);
    return () => {
      alive = false;
    };
  }, [db]);
  const contact = last && last.id !== dismissed ? contactReason(last, protocol.painPauseThreshold) : null;
  function dismiss() {
    if (!last) return;
    dismissContact(last.id);
    setDismissed(last.id);
  }
  const weeks = surgery ? weeksSince(surgery, localIsoDate(now())) : null;
  const reminder = exportReminderDue(lastExport, now(), hasSessions);

  const reviewDate = phase?.reviewDate;
  const review = reviewDue(reviewDate, localIsoDate(now()));
  const madeByApp = protocol.generated !== undefined;
  const pastPlanWeeks = weeks !== null && weeks > LAST_PLAN_WEEK;
  const canUpdate = madeByApp && !pastPlanWeeks && onUpdatePlan !== undefined;
  const checkOpen = madeByApp && weeks !== null && weeks <= LAST_PLAN_WEEK && onCheckProgress !== undefined;
  const checkCard = checkOpen && ((weeks >= 7 && activePhase === PHASE_FIRST) || review);
  const planEnd = madeByApp && pastPlanWeeks && !review;

  const exercises = phase?.exercises ?? [];
  const toRun = sessionKinds(exercises);
  const surgeonCount = SURGEON_FIELDS.length + ASK_SURGEON_ITEMS.length;
  const done = toRun.filter((k) => doneToday.includes(k));
  const left = toRun.filter((k) => !doneToday.includes(k));
  const next = left[0] ?? null;
  const nextExercise = exercises.find((e) => e.kind === next);
  const startKinds = next === null ? toRun : left;
  const singleStarts = Object.fromEntries(
    toRun.map((kind) => [
      kind,
      <button key={kind} type="button" className={onStartSession || kind !== next ? 'btn' : 'btn btn-primary btn-lg'} aria-label={`Start ${PLAN_NAMES[kind]}`} onClick={() => onStart(kind)}>
        <Icon name="play" size={18} />
        Start
      </button>,
    ]),
  );
  const surgeryWords = surgery ? surgeryDateWords(surgery, localIsoDate(now())) : null;
  const others = exercises.filter((e) => !toRun.includes(e.kind));

  const notices = (
    <>
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

      {checkCard && (
        <div className="contact-card">
          <Notice icon="chart-line" title={CHECK_TITLE}>
            <p>{progressCard(weeks)}</p>
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={onCheckProgress}>
                <Icon name="chart-line" size={18} />
                {CHECK_TITLE}
              </button>
            </div>
          </Notice>
        </div>
      )}

      {planEnd && (
        <div className="contact-card">
          <Notice icon="info">
            <p>{NO_PLAN_AFTER_WEEK}</p>
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
              {madeByApp && pastPlanWeeks
                ? NO_PLAN_AFTER_WEEK
                : madeByApp
                ? 'The app can check your plan again from today\'s date. You confirm the change or keep your plan.'
                : 'Your care team decides about the next stage. Export your sessions for the review.'}
            </p>
            <div className="actions">
              {canUpdate && (
                <button type="button" className="btn btn-primary" onClick={onUpdatePlan}>
                  <Icon name="refresh-cw" size={18} />
                  Update my plan
                </button>
              )}
              {!madeByApp && onOpenData && hasSessions && (
                <button type="button" className="btn btn-primary" onClick={onOpenData}>
                  <Icon name="download" size={18} />
                  Export for my care team
                </button>
              )}
            </div>
          </Notice>
        </div>
      )}
    </>
  );

  return (
    <section aria-labelledby="home-title" className="v2-flow v2-home v3h-home">
      <AppShell.Columns>
        <div className="v3h-col">
          <header className="page-head">
            <h1 id="home-title" tabIndex={-1}>
              Today
            </h1>
          </header>
          {notices}

          <section aria-labelledby="exercises-title" className="v3h-card">
            <h2 id="exercises-title">Today's session</h2>
            {toRun.length > 0 ? (
              <>
                <PlanList items={planItems(exercises, [...done, ...left], madeByApp).map((i) => ({ ...i, note: monitorLine(i.id) ?? undefined }))} currentId={next} actions={singleStarts} />
                <p className="detail">
                  {next === null
                    ? 'Every exercise of today is saved. You can run the plan again.'
                    : `${plural(left.length, 'exercise')} to do, in the order of your plan. One check before you start.`}
                </p>
              </>
            ) : (
              <p className="detail">No exercise of your plan can start yet. The reasons are below.</p>
            )}
            {last && <p className="detail last-session">{lastSessionLine(last)}</p>}
            {surgeryWords && <p className="detail surgery-line">{`Surgery date used for your plan: ${surgeryWords}.`}</p>}
            {nextExercise && isMonitored(nextExercise.kind) && (
              <figure className="exercise-figure v3h-figure">
                <GuideFigure kind={nextExercise.kind} frame="end" side={protocol.side} kneeDeg={madeByApp ? undefined : nextExercise.targetFlexion} description={`End position. ${guideFor(nextExercise.kind).range}`} />
              </figure>
            )}
          </section>

          {others.length > 0 && (
            <section aria-labelledby="others-title" className="v3h-card">
              <h2 id="others-title">Not in today's session</h2>
              <ul className="exercise-list">
                {others.map((e) => {
                  const setup = isNumericKind(e.kind) ? counterSetup(e as Exercise) : null;
                  return (
                    <li key={e.kind} className="exercise">
                      <div className="exercise-body">
                        <h3 className="exercise-name">{PLAN_NAMES[e.kind]}</h3>
                        <ul className="chips">
                          {prescription(e, madeByApp).map((line) => (
                            <li key={line.text} className="chip">
                              <Icon name={line.icon} size={16} />
                              {line.text}
                            </li>
                          ))}
                        </ul>
                        {setup && !setup.ok && isNumericKind(e.kind) ? (
                          <p className="detail">{madeByApp && e.kind === 'seated-extension-hold' && setup.missing === 'holdSeconds' ? HOLD_TIME_LINE : notReadyText(e.kind, setup.missing)}</p>
                        ) : (
                          <p className="detail">{monitorLine(e.kind)}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <SourceNotes made={protocol.generated?.rules ?? []} scope={doseScope(protocol)} />
          <PlanLines protocol={protocol} />
          {madeByApp && (
            <div className="range-reference">
              <SourceNote rule="RANGE_NONE" />
            </div>
          )}
        </div>

        <div className="v3h-col">
          {checkOpen && !checkCard && (
            <div className="progress-row">
              <button type="button" className="btn" onClick={onCheckProgress}>
                <Icon name="chart-line" size={18} />
                {CHECK_TITLE}
              </button>
            </div>
          )}
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
              {onOpenCompanion && (
                <div className="fact-row fact-action">
                  <dt>Second camera</dt>
                  <dd>
                    <button type="button" className="btn" onClick={onOpenCompanion}>
                      <Icon name="phone" size={18} />
                      {COMPANION_BUTTON}
                    </button>
                    <span className="detail">{COMPANION_TEXT}</span>
                  </dd>
                </div>
              )}
            </dl>
            <div className="actions">
              {canUpdate && !review && (
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
            {onOpenPrivacy && (
              <div className="actions">
                <button type="button" className="btn btn-ghost" onClick={onOpenPrivacy}>
                  <Icon name="lock" size={18} />
                  Privacy
                </button>
              </div>
            )}
          </section>

        </div>
      </AppShell.Columns>
      {onStartSession && startKinds.length > 0 && (
        <AppShell.Actions label="Start">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => onStartSession!(startKinds)}
          >
            <Icon name="play" size={22} />
            {next !== null && left.length < toRun.length ? "Continue today's session" : "Start today's session"}
          </button>
        </AppShell.Actions>
      )}
    </section>
  );
}
