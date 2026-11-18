// Summary (S7, S8). Pain 0 to 10 and swelling, then the safety floor of FR12, then the save (FR11).
// Copy source: research/ux-flow.md section 8.3. No value is pre-selected.
// "Knee gave way or hurts" shows the care-team message first.
// Persistence: App writes the record when the run ends (src/ui/sessionRecord.ts). Save adds pain and swelling to that record. Skip leaves them out.
// Sets: when Session passes the set data, the record holds it and the screen lists the reps of each set. No total, no verdict.
// The pause message (FR12) shows under the result cards, above the questions. It comes from the live answers. It does not wait for the save. A failed save or no save hides nothing (finding S-01).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Side } from '../lib/angle';
import type { PlanExercise, Protocol } from '../lib/protocol';
import { MESSAGES } from '../lib/redflags';
import { evaluateSession, type SwellingAnswer } from '../lib/safety';
import { saveSession, updateSessionAnswers, type MpflDb } from '../lib/storage';
import type { RunResult } from './appState';
import { Icon } from './Icon';
import { EXERCISE_NAMES } from './labels';
import { Notice } from './Notice';
import { PainScale } from './PainScale';
import { RunStats } from './RunStats';
import { Segmented } from './Segmented';
import { AppShell } from './v3/AppShell';
import { PlanList, type PlanItem } from './v3/PlanList';
import { SessionProgress } from './v3/SessionProgress';
import { runToSessionInput } from './sessionRecord';
import type { SessionRunSummary } from './Session';
import './flowV2.css';
import './v3home.css';

const SWELLING: { value: SwellingAnswer; text: string }[] = [
  { value: 'none', text: 'No swelling' },
  { value: 'some', text: 'Some swelling' },
  { value: 'more', text: 'More than before' },
];

interface Props {
  run: RunResult;
  exercise: PlanExercise;
  protocol: Protocol;
  activePhase: number;
  redFlagBlocks: number;
  /** T17: the leg that the pipeline tracked and the side of the person that the camera was on. Both go into the record. */
  legTracked?: Side;
  cameraSide?: Side;
  db: MpflDb;
  now: () => Date;
  /** Today's session: this screen is the short "Done" step. `keepCamera`: the camera stays on for the next exercise. `items`: the whole plan, in order. */
  plan?: { index: number; total: number; keepCamera?: boolean; items?: readonly PlanItem[] };
  onDone: () => void;
  /** Today's session only: the pause rule ended it, so the only way on is to end the session. */
  onStop?: () => void;
}

// B2-05: the text must match the record. A kept answer is named. Without a kept answer the record holds none.
const savedSkipText = (kept: string[]): string =>
  kept.length === 0 ? 'Session saved without answers.' : `Session saved. Your ${kept.join(' and ')} ${kept.length === 1 ? 'answer is' : 'answers are'} kept.`;

export function Summary({ run, exercise, protocol, activePhase, redFlagBlocks, legTracked, cameraSide, db, now, plan, onDone, onStop }: Props) {
  const { summary, reason } = run;
  const [pain, setPain] = useState<number | null>(null);
  const [swelling, setSwelling] = useState<SwellingAnswer | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false); // the write is running: the button says Saving
  const [discarded, setDiscarded] = useState(false);
  const [kept, setKept] = useState<string[]>([]); // the answers that Skip wrote to the record (B2-05)
  const [saveError, setSaveError] = useState(false);
  const [recordFailed, setRecordFailed] = useState(false); // the write at the end of the run did not work
  const painBetweenSets = (summary as SessionRunSummary).setPain; // the pain answers between sets (Session adds them)
  const saving = useRef(false);
  const savedNote = useRef<HTMLParagraphElement>(null);

  // The pause rule runs on the current answers, in each render. A changed answer changes the message at once.
  // FR12 says pain 7 or more OR swelling more than before. One answer is enough, so an unanswered question
  // counts as no reason to pause. It is never read as a high value. Live test L1-01 found the old wait for both.
  // H1: a high answer between sets counts too, so the message stays after Finish. The highest pain answer decides.
  const highestPain = Math.max(pain ?? 0, ...(painBetweenSets ?? []).filter((v): v is number => v !== null));
  const verdict =
    pain === null && swelling === null && highestPain === 0
      ? null
      : evaluateSession({ pain: highestPain, swelling: swelling ?? 'none', painPauseThreshold: protocol.painPauseThreshold });

  useEffect(() => {
    let alive = true;
    run.record?.catch(() => alive && setRecordFailed(true));
    return () => {
      alive = false;
    };
  }, [run.record]);

  // After Save, focus moves to the saved message. The screen reader reads it, and the button that was pressed is gone.
  useEffect(() => {
    if (saved) savedNote.current?.focus();
  }, [saved]);

  async function save() {
    if (pain === null || swelling === null || saving.current) return;
    saving.current = true;
    setSaveBusy(true);
    try {
      // The run was saved when it ended: add the answers to that record. With no record, write the whole run once.
      const id = await run.record?.catch(() => undefined);
      if (id === undefined) await saveSession(db, { ...runToSessionInput({ run, exercise, protocol, phase: activePhase, redFlagBlocks, legTracked, cameraSide, now }), pain, swelling });
      else await updateSessionAnswers(db, id, { pain, swelling });
      setSaveError(false);
      setSaved(true);
      // Today's session goes on to the next exercise at once. A pause message holds it: then only "End session" is left.
      if (plan && !verdict?.pause) onDone();
    } catch {
      setSaveError(true);
      saving.current = false;
    }
    setSaveBusy(false);
  }

  // No write. The run is already saved, without the answers. The pause message stays when the answers trigger it (FR12), so Done shows after it.
  // C-03: an answer that started the pause stays in the record, so the care team sees it. The questions left unanswered stay out.
  async function skipQuestions() {
    if (!verdict?.pause) return onDone();
    if (saving.current) return;
    saving.current = true;
    try {
      const answers = { pain: pain ?? undefined, swelling: swelling ?? undefined };
      const id = await run.record?.catch(() => undefined);
      if (id === undefined) await saveSession(db, { ...runToSessionInput({ run, exercise, protocol, phase: activePhase, redFlagBlocks, legTracked, cameraSide, now }), ...answers });
      else await updateSessionAnswers(db, id, answers);
      setSaveError(false);
      setKept([...(answers.pain === undefined ? [] : ['pain']), ...(answers.swelling === undefined ? [] : ['swelling'])]);
      setDiscarded(true);
    } catch {
      setSaveError(true); // the pause message stays on screen, because it comes from the live answers
    }
    saving.current = false;
  }

  return (
    <section aria-labelledby="summary-title" className="v2-flow v2-summary v3h-summary">
      <header className="page-head">
        <div className="stack-s">
          <h1 id="summary-title" tabIndex={-1}>
            {plan ? 'Done' : 'Summary'}
          </h1>
          <p className="detail">Exercise: {EXERCISE_NAMES[exercise.kind]}</p>
        </div>
      </header>

      <Layout side={plan && <PlanPanel plan={plan} />}>
        {reason === 'gave-way' && (
          <Notice tone="strong" role="alert" icon="heart-pulse" title={MESSAGES['care-team']}>
            <p>You pressed "Knee gave way or hurts".</p>
          </Notice>
        )}

        <RunStats kind={exercise.kind} summary={summary} between={<PauseNotice verdict={verdict} pain={highestPain} />} />

        {!saved && !discarded ? (
          <>
            <PainScale name="pain" value={pain} onChange={setPain} />

            <Segmented name="swelling" legend="Is your knee swollen?" icon="stethoscope" value={swelling} options={SWELLING.map((o) => ({ value: o.value, label: o.text }))} onChange={setSwelling} />

            {recordFailed && (
              <Notice role="alert" icon="triangle-alert">
                <p>This session could not be stored on this device. Storage can be blocked in a private window or when the device is full.</p>
              </Notice>
            )}
            {saveError && (
              <Notice role="alert" icon="triangle-alert">
                <p>The session could not be saved. Try again.</p>
              </Notice>
            )}
            {(pain === null || swelling === null) && <p className="detail">{plan ? 'The questions are optional.' : 'Answer both questions to save.'}</p>}
            {plan?.keepCamera && <p className="detail">The camera stays on for the next exercise. The app records no video.</p>}
          </>
        ) : (
          <>
            <p role="status" tabIndex={-1} ref={savedNote} className="chip chip-soft">
              <Icon name="check" size={16} />
              {discarded ? savedSkipText(kept) : 'Session saved.'}
            </p>
          </>
        )}
      </Layout>

      <AppShell.Actions label="Actions">
        {/* One button swaps its label: Save, Saving, Saved. The status line above repeats it for a screen reader. */}
        {!discarded && (
          <button type="button" className={saved ? 'btn btn-lg save-btn' : 'btn btn-primary btn-lg save-btn'} disabled={saved || saveBusy || pain === null || swelling === null} onClick={() => void save()}>
            {saved && <Icon name="check" size={20} />}
            {saved ? 'Saved' : saveBusy ? 'Saving' : plan ? 'Save and continue' : 'Save'}
          </button>
        )}
        {saved || discarded ? (
          <button type="button" className="btn btn-primary btn-lg" onClick={plan ? (onStop ?? onDone) : onDone}>
            {plan ? 'End session' : 'Done'}
          </button>
        ) : (
          <button type="button" className="btn btn-lg" onClick={() => void skipQuestions()}>
            Skip the questions
          </button>
        )}
      </AppShell.Actions>
    </section>
  );
}

/** The result and the questions, and beside them (from 900 px) the plan with the next exercise. A single exercise has no side. */
function Layout({ side, children }: { side?: ReactNode; children: ReactNode }) {
  if (!side) return <div className="stack v3h-single">{children}</div>;
  return (
    <AppShell.Columns>
      <div className="stack">{children}</div>
      {side}
    </AppShell.Columns>
  );
}

/** The place in today's session. The Done exercise is marked, the next one is named. */
function PlanPanel({ plan }: { plan: NonNullable<Props['plan']> }) {
  const items = plan.items ?? [];
  const next = items[plan.index + 1];
  return (
    <aside className="v3h-card stack-s" aria-label="Today's session">
      <SessionProgress total={plan.total} current={plan.index + 1} unit="Exercise" />
      <p className="v3h-next">{next ? `Next: ${next.name}` : 'This was the last exercise of today.'}</p>
      {items.length > 0 && <PlanList items={items} currentId={next?.id ?? null} />}
    </aside>
  );
}

function PauseNotice({ verdict, pain }: { verdict: ReturnType<typeof evaluateSession> | null; pain: number | null }) {
  if (!verdict?.pause) return null;
  return (
    <Notice tone="strong" role="alert" icon="heart-pulse" title={verdict.message ?? undefined}>
      {verdict.reasons.includes('pain') && (
        <p>
          You reported pain <span className="num">{pain}</span> out of 10.
        </p>
      )}
      {verdict.reasons.includes('swelling') && <p>You reported swelling: more than before.</p>}
      <p>This is a rule of the app. It is not a diagnosis.</p>
    </Notice>
  );
}
