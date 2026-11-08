// Summary (S7, S8). Pain 0 to 10 and swelling, then the safety floor of FR12, then the save (FR11).
// Copy source: research/ux-flow.md section 8.3. No value is pre-selected.
// "Knee gave way or hurts" shows the care-team message first.
// The pause message (FR12) comes from the live answers. It does not wait for the save. A failed save or no save hides nothing (finding S-01).
import { useEffect, useRef, useState } from 'react';
import { topAngleText } from '../lib/cues';
import type { Exercise, Protocol } from '../lib/protocol';
import { MARGIN_DEG, MARGIN_SOURCE } from '../lib/margin';
import { MESSAGES } from '../lib/redflags';
import { evaluateSession, type SwellingAnswer } from '../lib/safety';
import { saveSession, type MpflDb, type SessionInput } from '../lib/storage';
import type { RunResult } from './appState';
import { ANGLE_LABEL, EXERCISE_NAMES } from './labels';

const SWELLING: { value: SwellingAnswer; text: string }[] = [
  { value: 'none', text: 'No swelling' },
  { value: 'some', text: 'Some swelling' },
  { value: 'more', text: 'More than before' },
];

const PAIN_VALUES = Array.from({ length: 11 }, (_, i) => i);

const clampAngle = (v: number | null) => (v === null ? null : Math.min(180, Math.max(0, Math.round(v * 10) / 10)));

interface Props {
  run: RunResult;
  exercise: Exercise;
  protocol: Protocol;
  activePhase: number;
  redFlagBlocks: number;
  db: MpflDb;
  now: () => Date;
  onDone: () => void;
}

export function Summary({ run, exercise, protocol, activePhase, redFlagBlocks, db, now, onDone }: Props) {
  const { summary, reason } = run;
  const [pain, setPain] = useState<number | null>(null);
  const [swelling, setSwelling] = useState<SwellingAnswer | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saving = useRef(false);
  const savedNote = useRef<HTMLParagraphElement>(null);

  // The pause rule runs on the current answers, in each render. A changed answer changes the message at once.
  const verdict =
    pain === null || swelling === null ? null : evaluateSession({ pain, swelling, painPauseThreshold: protocol.painPauseThreshold });

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
      protocolId: protocol.id,
      phase: activePhase,
    };
    try {
      await saveSession(db, input);
      setSaveError(false);
      setSaved(true);
    } catch {
      setSaveError(true);
      saving.current = false;
    }
  }

  const top = topAngleText(summary.topFlexion);

  return (
    <section aria-labelledby="summary-title">
      <h1 id="summary-title" tabIndex={-1}>
        Summary
      </h1>
      <p className="detail">Exercise: {EXERCISE_NAMES[exercise.kind]}</p>

      {reason === 'gave-way' && (
        <div className="attention" role="alert">
          <p>You pressed "Knee gave way or hurts".</p>
          <p className="attention-title">{MESSAGES['care-team']}</p>
        </div>
      )}

      <dl className="facts">
        {summary.reps !== null && (
          <>
            <dt>Reps counted</dt>
            <dd>
              <span className="num">{summary.reps}</span> reps
            </dd>
          </>
        )}
        {summary.holds !== null && (
          <>
            <dt>Holds counted</dt>
            <dd>
              <span className="num">{summary.holds}</span> holds
            </dd>
          </>
        )}
        {summary.peakFlexion !== null && (
          <>
            <dt>Highest knee bend</dt>
            <dd>
              <span className="num">{Math.round(summary.peakFlexion)}</span> degrees ({ANGLE_LABEL})
            </dd>
          </>
        )}
      </dl>
      {top && <p>{top}</p>}

      {!saved ? (
        <>
          <fieldset className="choices">
            <legend>How much pain do you have now? 0 is no pain. 10 is the worst pain.</legend>
            <div className="scale">
              {PAIN_VALUES.map((v) => (
                <label key={v} className="scale-item">
                  <input type="radio" name="pain" checked={pain === v} onChange={() => setPain(v)} />
                  <span className="num">{v}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="choices">
            <legend>Is your knee swollen?</legend>
            {SWELLING.map((s) => (
              <label key={s.value} className="choice">
                <input type="radio" name="swelling" checked={swelling === s.value} onChange={() => setSwelling(s.value)} />
                <span>{s.text}</span>
              </label>
            ))}
          </fieldset>

          <PauseNotice verdict={verdict} pain={pain} />

          {saveError && (
            <p className="attention" role="alert">
              The session could not be saved. Try again.
            </p>
          )}
          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={pain === null || swelling === null}
              onClick={() => void save()}
            >
              Save
            </button>
          </div>
          {(pain === null || swelling === null) && <p className="detail">Answer both questions to save.</p>}
        </>
      ) : (
        <>
          <PauseNotice verdict={verdict} pain={pain} />
          <p role="status" tabIndex={-1} ref={savedNote}>
            Session saved.
          </p>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={onDone}>
              Done
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function PauseNotice({ verdict, pain }: { verdict: ReturnType<typeof evaluateSession> | null; pain: number | null }) {
  if (!verdict?.pause) return null;
  return (
    <div className="attention" role="alert">
      <p className="attention-title">{verdict.message}</p>
      {verdict.reasons.includes('pain') && (
        <p>
          You reported pain <span className="num">{pain}</span> out of 10.
        </p>
      )}
      {verdict.reasons.includes('swelling') && <p>You reported swelling: more than before.</p>}
      <p>This is a rule of the app. It is not a diagnosis.</p>
    </div>
  );
}
