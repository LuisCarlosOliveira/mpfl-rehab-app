// Session (S5, S6). Live estimated angle, rep count, a cue line, Stop, and "knee gave way or hurts".
// Plan 3.1: the frame loop writes to a ref. React state updates at most 4 times each second.
// Cue text comes only from src/lib/cues.ts. An in-range rep shows no message (FR23).
// Layout rules: research/ux-flow.md section 8.2. Large numbers, large Stop button, units next to numbers.
// The rep count is a polite live region. It changes only when a rep counts.
// Every exit stops the camera: the Stop buttons and the unmount cleanup both call source.stop() (NFR9).
// Sound (FR10): a near-limit rep and an over-limit rep make a beep. Nothing else does. The mute button is here.
// Sets: src/lib/sets.ts holds the logic. Each counted rep goes to countRep. While a set is complete, counting is paused.
// The screen shows a neutral notice for it. It makes no sound and uses no verdict colour (FR10, FR23).
// T17: `side` is the leg that the person chose in Setup. The pipeline tracks exactly this leg.
// Neutral notes: no return value, no resting angle, far leg, and the moving-leg note. A note never blocks.
// The moving-leg note never changes the leg and never counts a rep for the other leg.
import { useEffect, useRef, useState } from 'react';
import type { Side } from '../lib/angle';
import { cueFor, topAngleText, type CueEvent } from '../lib/cues';
import { counterSetup, createPipeline, legRoleOf, type Pipeline, type Summary } from '../lib/exercises';
import { countBlock } from '../lib/counters';
import { createIdentityWatcher } from '../lib/legIdentity';
import { MARGIN_DEG } from '../lib/margin';
import { SET_TEXT, countRep, finish, nextSet, repsLabel, setLabel, startSets, type SetsState } from '../lib/sets';
import type { Exercise } from '../lib/protocol';
import type { LandmarkSource } from '../pose/source';
import type { EndReason, RunSummary } from './appState';
import type { Sound } from './sound';
import { ASK_SURGEON_TEXT } from './askSurgeon';
import { Icon } from './Icon';
import { ANGLE_LABEL, EXERCISE_NAMES } from './labels';
import { Notice } from './Notice';
import { LEG_TEXT, otherLeg } from './setupView';

const TICK_MS = 250; // 4 updates each second at most (plan 3.1)
const CUE_SHOW_MS = 4000; // PROPOSAL, no source: how long a cue text stays on screen. The over-limit alert waits until the knee is back below the limit.
const STALE_MS = 2000; // PROPOSAL, no source: no frame for this long shows the camera notice

/** The summary when no frame came in and no pipeline can be made. Used only if the exercise has no counter setup. */
const EMPTY_SUMMARY: Summary = {
  reps: null,
  holds: null,
  peakFlexion: null,
  topFlexion: null,
  topState: null,
  eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 },
};

interface LiveCue {
  text: string;
  alert: boolean;
  paused: boolean;
  until: number;
}

const COUNTED_EVENTS = new Set(['rep', 'too-fast', 'hold-complete']);
const total = (sets: SetsState) => sets.repsPerSet.reduce((a, b) => a + b, 0);

interface Live {
  otherLegMoves: boolean; // the last moving-leg window named the other leg
  flexion: number | null;
  frameAt: number | null; // performance.now() of the last frame. null means no frame yet.
  cue: LiveCue | null;
}

interface View {
  angle: number | null;
  top: string | null;
  cue: string;
  alert: string;
  waiting: boolean;
  stale: boolean;
  identity: boolean;
}

const INITIAL_VIEW: View = {
  angle: null,
  top: null,
  cue: '',
  alert: '',
  waiting: true,
  stale: false,
  identity: false,
};

interface Props {
  exercise: Exercise;
  /** The leg that the person chose. */
  side: Side;
  /** The side of the person that the camera is on. Missing means that it is not known. */
  cameraSide?: Side;
  /** The resting angle from Setup, in degrees. null or missing: no rep counts. */
  baselineDeg?: number | null;
  source: LandmarkSource;
  sound: Sound;
  onEnd: (reason: EndReason, summary: RunSummary) => void;
}

export function Session({ exercise, side, cameraSide, baselineDeg, source, sound, onEnd }: Props) {
  const setup = counterSetup(exercise);
  const ready = setup.ok;
  const needsHandCount = setup.ok && setup.kind === 'lag';
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0); // a press of "Try the camera again" starts the effect again
  const [muted, setMuted] = useState(sound.isMuted());
  const [sets, setSetsState] = useState(() => startSets({ sets: exercise.sets, reps: exercise.reps }));
  const setsRef = useRef(sets);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const live = useRef<Live>({ otherLegMoves: false, flexion: null, frameAt: null, cue: null });
  const watcher = useRef<ReturnType<typeof createIdentityWatcher> | null>(null);
  const pipeline = useRef<Pipeline | null>(null);
  const ended = useRef(false);

  // The ref is for the frame loop. The state is for the screen.
  const applySets = (next: SetsState) => {
    setsRef.current = next;
    setSetsState(next);
  };

  // The pipeline needs the video aspect. It is made when the first frame arrives, or when the session ends with no frame.
  const getPipeline = () => {
    if (!pipeline.current) {
      const made = createPipeline(exercise, side, source.aspect(), { baselineDeg, cameraSide });
      if (made.ok) pipeline.current = made.pipeline;
    }
    return pipeline.current;
  };

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const minRepMs = exercise.minRepSeconds === undefined ? null : exercise.minRepSeconds * 1000;
    live.current.frameAt = null; // a new start waits for a new frame
    watcher.current = null;

    // Runs at frame rate. It writes to refs only. It does not set state.
    const onFrame = (landmarks: Parameters<Pipeline['step']>[0], timeMs: number) => {
      const p = getPipeline();
      if (!p) return;
      const out = p.step(landmarks, timeMs);
      const now = performance.now();
      const state = live.current;
      // The moving-leg check only informs. It does not touch the pipeline.
      watcher.current ??= createIdentityWatcher(source.aspect());
      const moving = watcher.current.push(landmarks, timeMs);
      if (moving !== null) state.otherLegMoves = moving === otherLeg(side);
      state.flexion = out.flexion;
      state.frameAt = now;
      sound.playFor(out.event as CueEvent);
      if (out.event !== null && COUNTED_EVENTS.has(out.event)) applySets(countRep(setsRef.current));
      const text = cueFor(out.event as CueEvent, { repMs: out.repMs, minRepMs });
      if (text !== null) {
        state.cue = { text, alert: out.event === 'over-limit', paused: out.event === 'paused', until: now + CUE_SHOW_MS };
      } else if (state.cue?.paused && out.event !== 'paused') {
        state.cue = null; // the leg is back in view
      }
      // The alert stays while the knee stays above the limit plus the margin. The timeout starts when it returns.
      if (state.cue?.alert && exercise.maxFlexion !== undefined && out.flexion !== null && out.flexion > exercise.maxFlexion + MARGIN_DEG) {
        state.cue.until = now + CUE_SHOW_MS;
      }
    };

    // Copies the refs to state. Only a changed view causes a render.
    let lastKey = '';
    const tick = () => {
      const now = performance.now();
      const state = live.current;
      const waiting = state.frameAt === null;
      const stale = state.frameAt !== null && now - state.frameAt > STALE_MS;
      const cue = state.cue && now < state.cue.until ? state.cue : null;
      const sum = pipeline.current?.summary();
      const next: View = {
        angle: stale || state.flexion === null ? null : Math.round(state.flexion),
        top: sum ? topAngleText(sum.topFlexion) : null,
        cue: cue && !cue.alert ? cue.text : '',
        alert: cue?.alert ? cue.text : '',
        waiting,
        stale,
        identity: state.otherLegMoves,
      };
      const key = JSON.stringify(next);
      if (key !== lastKey) {
        lastKey = key;
        setView(next);
      }
    };

    void source.start(onFrame, videoRef.current).then((result) => {
      if (alive && !result.ok) setCameraError(result.error.message);
    });
    const timer = setInterval(tick, TICK_MS);
    return () => {
      alive = false;
      clearInterval(timer);
      source.stop();
    };
  }, [exercise, side, cameraSide, baselineDeg, source, ready, attempt]);

  function end(reason: EndReason) {
    if (ended.current) return;
    ended.current = true;
    source.stop();
    // A session with no frame still gets an empty summary from a fresh pipeline.
    // The counts come from the set logic, so a rep during a set pause is not in the result.
    const done = finish(setsRef.current);
    const base = getPipeline()?.summary() ?? EMPTY_SUMMARY;
    const counted = total(done);
    const isHold = setup.ok && setup.kind === 'hold';
    const isHand = needsHandCount; // the hand count of a straight leg raise keeps the old null when nothing was counted
    onEnd(reason, {
      ...base,
      reps: isHold || isHand ? (isHold || counted === 0 ? null : counted) : counted,
      holds: isHold ? counted : null,
      sets: done,
    });
  }

  // PROPOSAL, no source: the straight leg raise has no automatic rep event, so the person counts each rep.
  // A clinician or the user must confirm this button. It shows only for a counter of kind 'lag'.
  function countByHand() {
    applySets(countRep(setsRef.current));
  }

  function retryCamera() {
    setCameraError(null);
    setAttempt((n) => n + 1);
    titleRef.current?.focus(); // the retry button goes away, so focus moves to the heading
  }

  function toggleMute() {
    sound.setMuted(!muted);
    setMuted(!muted);
  }

  const block = setup.ok && setup.kind === 'reps' ? countBlock({ ...setup.config, baseline: baselineDeg ?? undefined }) : null;
  const farLeg = cameraSide !== undefined && legRoleOf(side, cameraSide) === 'far';
  const paused = sets.phase === 'set-complete' || sets.phase === 'all-sets-complete';
  const countUnit = setup.ok && setup.kind === 'hold' ? 'holds' : 'reps';
  const label = setLabel(sets);
  const repsText = repsLabel(sets, countUnit);

  // The gauge shows the live angle on a track from 0 to the scale end. The limit is a quiet marker, not a target to reach.
  const limit = exercise.maxFlexion;
  const scaleEnd = Math.max(120, limit === undefined ? 0 : Math.ceil((limit + 30) / 10) * 10);
  const at = (deg: number) => 3 + (Math.min(Math.max(deg, 0), scaleEnd) / scaleEnd) * 94;

  return (
    <section aria-labelledby="session-title" className="session">
      <header className="page-head session-head">
        <h1 id="session-title" tabIndex={-1} ref={titleRef}>
          {EXERCISE_NAMES[exercise.kind]}
        </h1>
        <div className="session-meta">
          <button type="button" className="btn btn-ghost" onClick={toggleMute}>
            <Icon name={muted ? 'volume-x' : 'volume-2'} size={20} />
            {muted ? 'Unmute sound' : 'Mute sound'}
          </button>
        </div>
      </header>

      {!setup.ok ? (
        <Notice icon="triangle-alert">
          <p>The target for this exercise is missing. {ASK_SURGEON_TEXT}.</p>
        </Notice>
      ) : (
        <div className="session-grid">
          <div className="stack">
            {paused && (
              <div className="stack-s">
                <Notice role="status" icon="check">
                  <p>{sets.phase === 'set-complete' ? SET_TEXT.setComplete : SET_TEXT.allComplete}</p>
                </Notice>
                {sets.phase === 'set-complete' ? (
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => applySets(nextSet(setsRef.current))}>
                    <Icon name="play" size={22} fill="currentColor" />
                    Start next set
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => end('stop')}>
                    Finish
                  </button>
                )}
              </div>
            )}

            <div className="card counters">
              {(label !== null || repsText !== null) && (
                <div className="counters-head">
                  {label !== null && <p className="set-label">{label}</p>}
                  {repsText !== null && <p className="detail">{repsText}</p>}
                </div>
              )}
              <div className="readout">
                <p className="readout-line">
                  <span className="num readout-number">{view.angle === null ? '--' : view.angle}</span>{' '}
                  <span className="unit">degrees</span>
                </p>
                <p className="detail">Knee bend: {ANGLE_LABEL}</p>
                {limit !== undefined && (
                  <>
                    <svg className="gauge" viewBox="0 0 100 12" aria-hidden="true" focusable="false">
                      <rect className="gauge-track" x="1" y="3" width="98" height="6" rx="3" />
                      {view.angle !== null && <rect className="gauge-fill" x="3" y="4" width={Math.max(at(view.angle) - 3, 0)} height="4" rx="2" />}
                      <line className="gauge-limit" x1={at(limit)} x2={at(limit)} y1="0" y2="12" />
                      {view.angle !== null && <circle className="gauge-thumb" cx={at(view.angle)} cy="6" r="3.2" />}
                    </svg>
                    <p className="gauge-caption">
                      Your limit <span className="num">{limit}</span> degrees
                    </p>
                  </>
                )}
              </div>
              <div className="readout readout-reps">
                <p className="readout-line" aria-live="polite">
                  <span className="num readout-number">{sets.repsInSet}</span> <span className="unit">{countUnit}</span>
                </p>
                {exercise.kind === 'straight-leg-raise' && <p className="detail">{view.top ?? 'The angle at the top shows after a lift.'}</p>}
              </div>
            </div>

            {block !== null && (
              <Notice icon="ruler">
                <p>{block === 'no-return-value' ? LEG_TEXT.noReturnValue : LEG_TEXT.noBaseline}</p>
                <p className="detail">{block === 'no-return-value' ? LEG_TEXT.noReturnValueDetail : LEG_TEXT.noBaselineDetail}</p>
              </Notice>
            )}
            {farLeg && (
              <Notice icon="info">
                <p>{LEG_TEXT.farLeg}</p>
              </Notice>
            )}
            {view.identity && (
              <Notice role="status" icon="info">
                <p>{LEG_TEXT.identity}</p>
              </Notice>
            )}

            <div className="cue-area">
              <p role="status" aria-live="polite" className="cue">
                {view.cue}
              </p>
              <p role="alert" className="cue cue-alert">
                {view.alert}
              </p>
            </div>

            {view.waiting && !cameraError && (
              <Notice role="status" icon="camera">
                <p>Waiting for the camera.</p>
              </Notice>
            )}
            {(view.stale || cameraError) && (
              <Notice role="alert" icon="triangle-alert">
                <p>{cameraError ?? 'No camera image for 2 seconds. Check that the camera is on.'}</p>
                <div className="actions">
                  <button type="button" className="btn" onClick={retryCamera}>
                    <Icon name="refresh-cw" size={18} />
                    Try the camera again
                  </button>
                </div>
              </Notice>
            )}
          </div>

          <div className="frame">
            <video ref={videoRef} className="preview" muted playsInline aria-label="Camera view" />
          </div>
        </div>
      )}

      <div className="session-bar">
        <div className="session-bar-inner">
          <button type="button" className="btn btn-stop" onClick={() => end('stop')}>
            <Icon name="square" size={22} fill="currentColor" />
            Stop
          </button>
          {needsHandCount && (
            <button type="button" className="btn btn-count" disabled={paused} onClick={countByHand}>
              Count this rep
            </button>
          )}
          <button type="button" className="btn btn-gave-way" onClick={() => end('gave-way')}>
            Knee gave way or hurts
          </button>
        </div>
      </div>
    </section>
  );
}
