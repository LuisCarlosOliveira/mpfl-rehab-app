// Summary (S7, S8). Pain 0 to 10 and swelling, then the safety floor of FR12, then the save (FR11).
// Copy source: research/ux-flow.md section 8.3. No value is pre-selected.
// "Knee gave way or hurts" shows the care-team message first.
// Persistence: App writes the record when the run ends (src/ui/sessionRecord.ts). Save adds pain and swelling to that record. Skip leaves them out.
// Sets: when Session passes the set data, the record holds it and the screen lists the reps of each set. No total, no verdict.
// The pause message (FR12) shows under the result cards, above the questions. It comes from the live answers. It does not wait for the save. A failed save or no save hides nothing (finding S-01).
import { useEffect, useRef, useState } from 'react';
import type { Side } from '../lib/angle';
import { PEAK_NO_VALUE_TEXT, peakUnreadable, topAngleText } from '../lib/cues';
import type { Exercise, Protocol } from '../lib/protocol';
import { MESSAGES } from '../lib/redflags';
import { evaluateSession, type SwellingAnswer } from '../lib/safety';
import { plural } from '../lib/sets';
import { saveSession, updateSessionAnswers, type MpflDb } from '../lib/storage';
import type { RunResult } from './appState';
import { Icon } from './Icon';
import { ANGLE_LABEL, EXERCISE_NAMES } from './labels';
import { Notice } from './Notice';
import { PainScale } from './PainScale';
import { Segmented } from './Segmented';
import { runToSessionInput } from './sessionRecord';
import type { SessionRunSummary } from './Session';
import './flowV2.css';

const SWELLING: { value: SwellingAnswer; text: string }[] = [
  { value: 'none', text: 'No swelling' },
  { value: 'some', text: 'Some swelling' },
  { value: 'more', text: 'More than before' },
];

interface Props {
  run: RunResult;
  exercise: Exercise;
  protocol: Protocol;
  activePhase: number;
  redFlagBlocks: number;
  /** T17: the leg that the pipeline tracked and the side of the person that the camera was on. Both go into the record. */
  legTracked?: Side;
  cameraSide?: Side;
  db: MpflDb;
  now: () => Date;
  onDone: () => void;
}

export function Summary({ run, exercise, protocol, activePhase, redFlagBlocks, legTracked, cameraSide, db, now, onDone }: Props) {
  const { summary, reason } = run;
  const [pain, setPain] = useState<number | null>(null);
  const [swelling, setSwelling] = useState<SwellingAnswer | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false); // the write is running: the button says Saving
  const [discarded, setDiscarded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [recordFailed, setRecordFailed] = useState(false); // the write at the end of the run did not work
  const sets = summary.sets ?? null;
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
      setDiscarded(true);
    } catch {
      setSaveError(true); // the pause message stays on screen, because it comes from the live answers
    }
    saving.current = false;
  }

  const top = topAngleText(summary.topFlexion);
  const unit = summary.holds === null ? 'rep' : 'hold';

  return (
    <section aria-labelledby="summary-title" className="narrow v2-flow v2-summary">
      <header className="page-head">
        <div className="stack-s">
          <h1 id="summary-title" tabIndex={-1}>
            Summary
          </h1>
          <p className="detail">Exercise: {EXERCISE_NAMES[exercise.kind]}</p>
        </div>
      </header>

      <div className="stack">
        {reason === 'gave-way' && (
          <Notice tone="strong" role="alert" icon="heart-pulse" title={MESSAGES['care-team']}>
            <p>You pressed "Knee gave way or hurts".</p>
          </Notice>
        )}

        <dl className="stats">
          {summary.reps !== null && (
            <div className="stat">
              <dt>Reps counted</dt>
              <dd>
                <span className="num">{summary.reps}</span> <span className="unit">{plural(summary.reps, 'rep')}</span>
              </dd>
            </div>
          )}
          {summary.holds !== null && (
            <div className="stat">
              <dt>Holds counted</dt>
              <dd>
                <span className="num">{summary.holds}</span> <span className="unit">{plural(summary.holds, 'hold')}</span>
              </dd>
            </div>
          )}
          {summary.peakFlexion !== null && (
            <div className="stat">
              <dt>Highest knee bend</dt>
              {/* M8: a leg raise peak above the plausibility value is a camera misread. The record keeps the number. */}
              {peakUnreadable(exercise.kind, summary.peakFlexion) ? (
                <dd>{PEAK_NO_VALUE_TEXT}</dd>
              ) : (
                <dd>
                  <span className="num">{Math.round(summary.peakFlexion)}</span> <span className="unit">{plural(Math.round(summary.peakFlexion), 'degree')}</span>
                  <span className="detail">({ANGLE_LABEL})</span>
                </dd>
              )}
            </div>
          )}
        </dl>
        {/* The pause message sits here, above both questions, so a phone shows it at once (FR12). */}
        <PauseNotice verdict={verdict} pain={highestPain} />
        {sets !== null && sets.prescription.reps !== undefined && (
          <ul className="set-list" aria-label="Reps in each set">
            {sets.repsPerSet.map((n, i) => (
              <li key={i}>
                <span>Set {i + 1}:</span>{' '}
                <span className="set-count">
                  <span className="num">{n}</span> {plural(n, unit)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {top && <p>{top}</p>}
        {summary.reps === 0 && <p>No repetitions were counted.</p>}

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
            {(pain === null || swelling === null) && <p className="detail">Answer both questions to save.</p>}
          </>
        ) : (
          <>
            <p role="status" tabIndex={-1} ref={savedNote} className="chip chip-soft">
              <Icon name="check" size={16} />
              {discarded ? 'Session saved without answers.' : 'Session saved.'}
            </p>
          </>
        )}
      </div>

      <div className="action-bar">
        {/* One button swaps its label: Save, Saving, Saved. The status line above repeats it for a screen reader. */}
        {!discarded && (
          <button type="button" className={saved ? 'btn btn-lg save-btn' : 'btn btn-primary btn-lg save-btn'} disabled={saved || saveBusy || pain === null || swelling === null} onClick={() => void save()}>
            {saved && <Icon name="check" size={20} />}
            {saved ? 'Saved' : saveBusy ? 'Saving' : 'Save'}
          </button>
        )}
        {saved || discarded ? (
          <button type="button" className="btn btn-primary btn-lg" onClick={onDone}>
            Done
          </button>
        ) : (
          <button type="button" className="btn btn-lg" onClick={() => void skipQuestions()}>
            Skip the questions
          </button>
        )}
      </div>
    </section>
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
