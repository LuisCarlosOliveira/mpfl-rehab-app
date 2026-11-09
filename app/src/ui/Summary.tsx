// Summary (S7, S8). Pain 0 to 10 and swelling, then the safety floor of FR12, then the save (FR11).
// Copy source: research/ux-flow.md section 8.3. No value is pre-selected.
// "Knee gave way or hurts" shows the care-team message first.
// Sets: when Session passes the set data, Save adds it to the record and the screen lists the reps of each set. No total, no verdict.
// The pause message (FR12) shows under the result cards, above the questions. It comes from the live answers. It does not wait for the save. A failed save or no save hides nothing (finding S-01).
import { useEffect, useRef, useState } from 'react';
import type { Side } from '../lib/angle';
import { PEAK_UNREADABLE_TEXT, peakUnreadable, topAngleText } from '../lib/cues';
import type { Exercise, Protocol } from '../lib/protocol';
import { MARGIN_DEG, MARGIN_SOURCE } from '../lib/margin';
import { MESSAGES } from '../lib/redflags';
import { evaluateSession, type SwellingAnswer } from '../lib/safety';
import { plural, summarySets } from '../lib/sets';
import { saveSession, type MpflDb, type SessionInput } from '../lib/storage';
import type { RunResult } from './appState';
import { Icon } from './Icon';
import { ANGLE_LABEL, EXERCISE_NAMES } from './labels';
import { Notice } from './Notice';
import { PainScale } from './PainScale';
import type { SessionRunSummary } from './Session';

const SWELLING: { value: SwellingAnswer; text: string }[] = [
  { value: 'none', text: 'No swelling' },
  { value: 'some', text: 'Some swelling' },
  { value: 'more', text: 'More than before' },
];

const clampAngle = (v: number | null) => (v === null ? null : Math.min(180, Math.max(0, Math.round(v * 10) / 10)));

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
  const [discarded, setDiscarded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const sets = summary.sets ?? null;
  const painBetweenSets = (summary as SessionRunSummary).setPain; // the pain answers between sets (Session adds them)
  const repsBy = (summary as SessionRunSummary).repsBy; // who counted the reps (Session adds it)
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

  // After Save, focus moves to the saved message. The screen reader reads it, and the button that was pressed is gone.
  useEffect(() => {
    if (saved) savedNote.current?.focus();
  }, [saved]);

  async function save() {
    if (pain === null || swelling === null || saving.current) return;
    saving.current = true;
    const holdSeconds = summary.holds === null ? null : summary.holds * (exercise.holdSeconds ?? 0);
    const input: SessionInput = {
      date: now().toISOString(),
      exercise: exercise.kind,
      side: protocol.side,
      reps: summary.reps,
      peakFlexion: clampAngle(summary.peakFlexion),
      holdSeconds,
      topFlexion: clampAngle(summary.topFlexion),
      marginDeg: MARGIN_DEG,
      marginSource: MARGIN_SOURCE,
      view: 'side',
      nearLimit: summary.eventCounts.nearLimit,
      overLimit: summary.eventCounts.overLimit,
      tooFast: summary.eventCounts.tooFast,
      gaveWayPresses: reason === 'gave-way' ? 1 : 0,
      redFlagBlocks,
      pain,
      swelling,
      ...(painBetweenSets === undefined ? {} : { setPain: painBetweenSets }),
      ...(repsBy === undefined ? {} : { repsBy }),
      protocolId: protocol.id,
      phase: activePhase,
      ...(legTracked === undefined ? {} : { legTracked }),
      ...(cameraSide === undefined ? {} : { cameraSide }),
      ...(summary.baselineSource === undefined ? {} : { baselineSource: summary.baselineSource }),
      // T12b: the front-view record is for the clinician. This screen never shows it.
      ...(summary.front === undefined
        ? {}
        : {
            secondView: 'front' as const,
            frontReps: summary.front.reps,
            ...(summary.front.changeDeg === undefined ? {} : { frontChangeDeg: Math.round(summary.front.changeDeg * 10) / 10 }),
          }),
    };
    try {
      await saveSession(db, sets === null ? input : { ...input, ...summarySets(sets) });
      setSaveError(false);
      setSaved(true);
    } catch {
      setSaveError(true);
      saving.current = false;
    }
  }

  // No write. The pause message stays when the answers trigger it (FR12), so Done shows after it.
  function doNotSave() {
    if (verdict?.pause) setDiscarded(true);
    else onDone();
  }

  const top = topAngleText(summary.topFlexion);
  const unit = summary.holds === null ? 'rep' : 'hold';

  return (
    <section aria-labelledby="summary-title" className="narrow">
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
                <span className="num">{summary.reps}</span> {plural(summary.reps, 'rep')}
              </dd>
            </div>
          )}
          {summary.holds !== null && (
            <div className="stat">
              <dt>Holds counted</dt>
              <dd>
                <span className="num">{summary.holds}</span> {plural(summary.holds, 'hold')}
              </dd>
            </div>
          )}
          {summary.peakFlexion !== null && (
            <div className="stat">
              <dt>Highest knee bend</dt>
              {/* M8: a leg raise peak above the plausibility value is a camera misread. The record keeps the number. */}
              {peakUnreadable(exercise.kind, summary.peakFlexion) ? (
                <dd>{PEAK_UNREADABLE_TEXT}</dd>
              ) : (
                <dd>
                  <span className="num">{Math.round(summary.peakFlexion)}</span> {plural(Math.round(summary.peakFlexion), 'degree')}
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
                Set {i + 1}: <span className="num">{n}</span> {plural(n, unit)}
              </li>
            ))}
          </ul>
        )}
        {top && <p>{top}</p>}
        {summary.reps === 0 && <p>No repetitions were counted.</p>}

        {!saved && !discarded ? (
          <>
            <PainScale name="pain" value={pain} onChange={setPain} />

            <fieldset className="choices">
              <legend>
                <Icon name="stethoscope" size={22} />
                Is your knee swollen?
              </legend>
              <div className="options">
                {SWELLING.map((s) => (
                  <label key={s.value} className="option">
                    <input type="radio" name="swelling" checked={swelling === s.value} onChange={() => setSwelling(s.value)} />
                    <span>{s.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>

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
              {discarded ? 'Session not saved.' : 'Session saved.'}
            </p>
          </>
        )}
      </div>

      <div className="action-bar">
        {!saved && !discarded ? (
          <>
            <button type="button" className="btn btn-primary btn-lg" disabled={pain === null || swelling === null} onClick={() => void save()}>
              Save
            </button>
            <button type="button" className="btn btn-lg" onClick={doNotSave}>
              Do not save
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" onClick={onDone}>
            Done
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
