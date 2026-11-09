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
// F1: when Setup gave no resting angle, Session finds the starting angle in place. It holds the leg still rule on the live
// samples (src/lib/baseline.ts). After 15 s with no still window, the person can choose the lowest steady angle. The app
// never takes it alone. Reps count from the moment a starting angle exists. No text asks the person to stop and start again.
// T12b: an optional second camera (the phone, a front view). The screen shows one small status chip and nothing else of it.
// The front-view knee change goes into the end summary for the clinician only (FR24). No live cue, no number, no word for it.
// W1 (UI study): live numbers keep their width and the unit agrees with the number (U4). The camera comes first on a phone (U3).
// Between sets a calm rest panel replaces the live card. It has no timer and no sound (U8). The seated hold shows the seconds
// of the current hold as a plain timer (U6). A status line names the camera start step (U10). Notices that need
// attention sit above the camera, so the fixed bar never covers them (L3-06). A hidden tab ends the camera: the screen says so
// and the person restarts it with a press (L3-07).
import { useEffect, useRef, useState } from 'react';
import type { Side } from '../lib/angle';
import { createCueGate, cueFor, stillOverLimit, topAngleText, type CueEvent } from '../lib/cues';
import { counterSetup, createPipeline, legRoleOf, type Pipeline, type Summary } from '../lib/exercises';
import { countBlock } from '../lib/counters';
import { createBaselineCapture, type BaselineSource, type CaptureState } from '../lib/baseline';
import { createIdentityWatcher, otherLegConfirmed, type MovingLeg } from '../lib/legIdentity';
import { SETUP_CONFIG } from '../lib/setupRules';
import { createFrontRecorder, type FrontRecorder } from '../lib/views';
import { PAUSE_MESSAGE } from '../lib/safety';
import { SET_TEXT, countRep, finish, nextSet, repsLabel, setLabel, startSets, type SetsState } from '../lib/sets';
import type { Exercise } from '../lib/protocol';
import type { PairingStatus } from '../pairing/pairing';
import type { LandmarkSource } from '../pose/source';
import type { EndReason, RunSummary } from './appState';
import type { Sound } from './sound';
import { ASK_HOLD_ANGLE_TEXT, ASK_SURGEON_TEXT } from './askSurgeon';
import { Icon } from './Icon';
import { ANGLE_LABEL, EXERCISE_NAMES } from './labels';
import { Notice } from './Notice';
import { PainScale } from './PainScale';
import { CAPTURE_TEXT, LEG_TEXT, otherLeg } from './setupView';

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

/** What Session adds to the run summary: the pain answer at the end of each completed set that asked. null: no answer. */
export interface SessionRunSummary extends RunSummary {
  setPain?: (number | null)[];
}

interface LiveCue {
  text: string;
  alert: boolean;
  paused: boolean;
  until: number;
}

const COUNTED_EVENTS = new Set(['rep', 'too-fast', 'hold-complete']);
const total = (sets: SetsState) => sets.repsPerSet.reduce((a, b) => a + b, 0);

interface Live {
  otherLegMoves: boolean; // the last moving-leg windows named the other leg, in a row (F1)
  flexion: number | null;
  frameAt: number | null; // performance.now() of the last frame. null means no frame yet.
  cue: LiveCue | null;
  capture: CaptureState | null; // the in-place capture of the starting angle. null when none runs.
  holdSince: number | null; // the frame time when the knee entered the hold band. null when it is out of the band.
  holdMs: number; // the time of the current hold at the last frame
}

interface View {
  angle: number | null;
  top: string | null;
  cue: string;
  alert: string;
  waiting: boolean;
  stale: boolean;
  identity: boolean;
  /** Whole seconds of the current hold, never more than the hold time. 0 outside a hold. */
  holdSec: number;
  /** The capture while it looks for a starting angle: progress in whole percent and whether the choice can be used. */
  capture: {
    phase: CaptureState['phase'];
    progress: number;
    canUseLowest: boolean;
    tooBent: boolean;
  } | null;
}

const INITIAL_VIEW: View = {
  angle: null,
  top: null,
  cue: '',
  alert: '',
  waiting: true,
  stale: false,
  identity: false,
  holdSec: 0,
  capture: null,
};

/** The second camera and the state of its link. The shell passes it when a phone was paired in Setup. */
export interface SecondView {
  source: LandmarkSource;
  status: PairingStatus;
  /** The fixed text after a failure. */
  message: string | null;
}

const SECOND_STOPPED = 'The second camera stopped. The session continues with one camera.';
const START_TEXT = {
  starting: 'Asking for the camera and loading the pose model.',
  ready: 'Ready. Step into the view.',
} as const;
const BACKGROUND_TEXT = 'The camera stopped when this page went to the background. Press the button to start it again.';
const plural = (n: number | null, one: string, many: string) => (n === 1 ? one : many);

interface Props {
  exercise: Exercise;
  /** The leg that the person chose. */
  side: Side;
  /** The side of the person that the camera is on. Missing means that it is not known. */
  cameraSide?: Side;
  /** The resting angle from Setup, in degrees. null or missing: no rep counts. */
  baselineDeg?: number | null;
  source: LandmarkSource;
  /** Optional. Missing means one camera. */
  second?: SecondView;
  sound: Sound;
  /** The pain value from the protocol (`painPauseThreshold`). Missing means that no answer stops the session. The app sets no default. */
  painPauseThreshold?: number;
  onEnd: (reason: EndReason, summary: RunSummary) => void;
}

export function Session({ exercise, side, cameraSide, baselineDeg, source, second, sound, painPauseThreshold, onEnd }: Props) {
  const setup = counterSetup(exercise);
  const ready = setup.ok;
  // Setup gave no resting angle and the protocol has a return value: Session finds the angle in place.
  const needsCapture = setup.ok && setup.kind === 'reps' && setup.config.returnWithin !== undefined && baselineDeg == null;
  const needsHandCount = setup.ok && setup.kind === 'lag';
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0); // a press of "Try the camera again" starts the effect again
  const [muted, setMuted] = useState(sound.isMuted());
  const [sets, setSetsState] = useState(() => startSets({ sets: exercise.sets, reps: exercise.reps }));
  const setsRef = useRef(sets);
  const [painAnswers, setPainAnswers] = useState<number[]>([]); // the answer of each set that asked. A skipped set has no entry.
  const painRef = useRef(painAnswers);
  const [startStep, setStartStep] = useState<'starting' | 'ready'>('starting');
  const [backgrounded, setBackgrounded] = useState(false); // the page went to the background, so the camera ended (L3-07)
  const restRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const live = useRef<Live>({
    otherLegMoves: false,
    flexion: null,
    frameAt: null,
    cue: null,
    capture: null,
    holdSince: null,
    holdMs: 0,
  });
  const capture = useRef<ReturnType<typeof createBaselineCapture> | null>(null);
  const answers = useRef<MovingLeg[]>([]);
  // The starting angle that the capture found, with its source. null: none yet. Set once, so a state update is fine.
  const [found, setFound] = useState<{
    deg: number;
    source: BaselineSource;
  } | null>(null);
  const foundRef = useRef(found);
  const watcher = useRef<ReturnType<typeof createIdentityWatcher> | null>(null);
  const pipeline = useRef<Pipeline | null>(null);
  const ended = useRef(false);
  const recorder = useRef<FrontRecorder | null>(null);
  const wasConnected = useRef(false);
  const secondSource = second?.source;
  const secondConnected = second?.status === 'connected';
  if (secondConnected) wasConnected.current = true;

  // The ref is for the frame loop. The state is for the screen.
  const applySets = (next: SetsState) => {
    setsRef.current = next;
    setSetsState(next);
  };

  // The pipeline needs the video aspect. It is made when the first frame arrives, or when the session ends with no frame.
  const answerPain = (value: number) => {
    const next = [...painRef.current];
    next[setsRef.current.setIndex] = value;
    painRef.current = next;
    setPainAnswers(next);
  };

  // The capture found a starting angle: the counter gets it and the screen shows it.
  const adopt = (c: CaptureState) => {
    if (c.baselineDeg === null || c.source === null || foundRef.current !== null) return;
    pipeline.current?.setBaseline(c.baselineDeg);
    foundRef.current = { deg: c.baselineDeg, source: c.source };
    setFound(foundRef.current);
  };

  const getPipeline = () => {
    if (!pipeline.current) {
      const made = createPipeline(exercise, side, source.aspect(), {
        baselineDeg,
        cameraSide,
      });
      if (made.ok) pipeline.current = made.pipeline;
    }
    return pipeline.current;
  };

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const gate = createCueGate(); // ENGINEERING rate limit and order of the cues. One gate for each run of the effect.
    const minRepMs = exercise.minRepSeconds === undefined ? null : exercise.minRepSeconds * 1000;
    live.current.frameAt = null; // a new start waits for a new frame
    live.current.holdSince = null;
    live.current.holdMs = 0;
    setStartStep('starting');
    watcher.current = null;
    answers.current = [];

    // Runs at frame rate. It writes to refs only. It does not set state.
    const onFrame = (landmarks: Parameters<Pipeline['step']>[0], timeMs: number) => {
      const p = getPipeline();
      if (!p) return;
      const out = p.step(landmarks, timeMs);
      const now = performance.now();
      const state = live.current;
      if (needsCapture && foundRef.current === null) {
        capture.current ??= createBaselineCapture(side, source.aspect(), SETUP_CONFIG, setup.ok && setup.kind === 'reps' ? setup.config.enter : undefined);
        state.capture = capture.current.push(landmarks, timeMs, out.flexion);
        if (state.capture.baselineDeg !== null) adopt(state.capture);
      }
      // The moving-leg check only informs. It does not touch the pipeline. It starts when reps can count.
      if (!needsCapture || foundRef.current !== null) {
        watcher.current ??= createIdentityWatcher(source.aspect());
        const moving = watcher.current.push(landmarks, timeMs);
        if (moving !== null) {
          answers.current.push(moving);
          state.otherLegMoves = otherLegConfirmed(answers.current, otherLeg(side));
        }
      }
      state.flexion = out.flexion;
      state.frameAt = now;
      // The hold timer for the screen. It follows the band rule of holdStep and never decides a hold (the counter does).
      if (setup.ok && setup.kind === 'hold') {
        const cfg = setup.config;
        const f = out.flexion;
        const over = f !== null && cfg.arcEnd !== undefined && f < cfg.arcEnd.limit - cfg.arcEnd.margin;
        const inBand = f !== null && !over && (cfg.direction === 'at-least' ? f >= cfg.threshold : f <= cfg.threshold);
        state.holdSince = inBand ? (state.holdSince ?? timeMs) : null;
        state.holdMs = state.holdSince === null ? 0 : timeMs - state.holdSince;
      }
      if (out.repMs !== null) recorder.current?.rep(timeMs, out.repMs); // a counted rep gives the window for the front view
      sound.playFor(out.event as CueEvent);
      if (out.event !== null && COUNTED_EVENTS.has(out.event)) applySets(countRep(setsRef.current));
      const text = cueFor(out.event as CueEvent, {
        repMs: out.repMs,
        minRepMs,
      });
      // A limit alert on screen blocks every other cue. A limit cue itself is never delayed (cue order, design 4.2).
      const alertOn = state.cue !== null && state.cue.alert && now < state.cue.until;
      if (text !== null && gate.allow(out.event as CueEvent, text, now, alertOn)) {
        state.cue = {
          text,
          alert: out.event === 'over-limit',
          paused: out.event === 'paused',
          until: now + CUE_SHOW_MS,
        };
      } else if (state.cue?.paused && out.event !== 'paused') {
        state.cue = null; // the leg is back in view
      }
      // The alert stays while the knee stays past the limit plus the margin. The ceiling for a heel slide and a mini squat,
      // the arc end (minFlexion) for the seated hold. The timeout starts when the knee returns.
      if (state.cue?.alert && stillOverLimit(exercise, out.flexion)) {
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
        holdSec: stale || !(setup.ok && setup.kind === 'hold') ? 0 : Math.floor(Math.min(state.holdMs, setup.config.minHoldMs) / 1000),
        capture:
          state.capture === null || foundRef.current !== null
            ? null
            : {
                phase: state.capture.phase,
                progress: Math.round(state.capture.progress * 100),
                canUseLowest: state.capture.canUseLowest,
                tooBent: state.capture.tooBent,
              },
      };
      const key = JSON.stringify(next);
      if (key !== lastKey) {
        lastKey = key;
        setView(next);
      }
    };

    void source.start(onFrame, videoRef.current).then((result) => {
      if (!alive) return;
      if (result.ok) setStartStep('ready');
      else setCameraError(result.error.message);
    });
    const timer = setInterval(tick, TICK_MS);
    return () => {
      alive = false;
      clearInterval(timer);
      source.stop();
    };
  }, [exercise, side, cameraSide, baselineDeg, source, ready, attempt, needsCapture]);

  // The second camera starts after the first one. It has its own effect, so a change of its link never restarts the main camera.
  useEffect(() => {
    if (!ready || !secondSource || !secondConnected) return;
    recorder.current ??= createFrontRecorder(side, () => secondSource.aspect());
    const rec = recorder.current;
    void secondSource.start((landmarks, timeMs) => rec.frame(landmarks, timeMs));
    return () => secondSource.stop();
  }, [ready, secondSource, secondConnected, side]);

  // L3-07: camera.ts stops the tracks when the page is hidden. The screen says so. The person restarts the camera with a press.
  useEffect(() => {
    const onChange = () => {
      if (document.visibilityState === 'hidden') setBackgrounded(true);
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  // U8: the focus moves to the rest panel title when a set ends.
  useEffect(() => {
    if (sets.phase === 'set-complete') restRef.current?.focus();
  }, [sets.phase, sets.setIndex]);

  function end(reason: EndReason) {
    if (ended.current) return;
    ended.current = true;
    source.stop();
    secondSource?.stop();
    // A session with no frame still gets an empty summary from a fresh pipeline.
    // The counts come from the set logic, so a rep during a set pause is not in the result.
    const done = finish(setsRef.current);
    const base = getPipeline()?.summary() ?? EMPTY_SUMMARY;
    const counted = total(done);
    const front = recorder.current?.finish() ?? null;
    const isHold = setup.ok && setup.kind === 'hold';
    const repsCounted = setup.ok && setup.kind === 'reps' && setup.config.returnWithin !== undefined;
    const isHand = needsHandCount; // the hand count of a straight leg raise keeps the old null when nothing was counted
    // The last set has no question, because the summary asks for the pain at the end.
    const asked = done.completedSets - (done.phase === 'all-sets-complete' ? 1 : 0);
    const setPain = Array.from({ length: asked }, (_, i) => painRef.current[i] ?? null);
    const baselineSource = foundRef.current?.source ?? (baselineDeg != null && repsCounted ? 'still' : undefined);
    const result: SessionRunSummary = {
      ...base,
      ...(baselineSource === undefined ? {} : { baselineSource }),
      reps: isHold || isHand ? (isHold || counted === 0 ? null : counted) : counted,
      holds: isHold ? counted : null,
      sets: done,
      ...(front === null ? {} : { front }),
      ...(asked > 0 ? { setPain } : {}),
    };
    onEnd(reason, result);
  }

  // PROPOSAL, no source: the straight leg raise has no automatic rep event, so the person counts each rep.
  // A clinician or the user must confirm this button. It shows only for a counter of kind 'lag'.
  function countByHand() {
    applySets(countRep(setsRef.current));
  }

  // The person pressed the button. Only now does the app take the lowest steady angle.
  function useLowestAngle() {
    const chosen = capture.current?.useLowest();
    if (chosen) adopt(chosen);
  }

  function retryCamera() {
    setCameraError(null);
    setBackgrounded(false);
    setAttempt((n) => n + 1);
    titleRef.current?.focus(); // the retry button goes away, so focus moves to the heading
  }

  function toggleMute() {
    sound.setMuted(!muted);
    setMuted(!muted);
  }

  // The notice is for the missing protocol value only. A missing resting angle is found in place (the capture state).
  const block = setup.ok && setup.kind === 'reps' && setup.config.returnWithin === undefined ? countBlock({ ...setup.config, baseline: baselineDeg ?? undefined }) : null;
  const farLeg = cameraSide !== undefined && legRoleOf(side, cameraSide) === 'far';
  const paused = sets.phase === 'set-complete' || sets.phase === 'all-sets-complete';
  // L2: only the clinician threshold stops the session here. Without it the answer is logged and nothing stops.
  const painAtStop = painPauseThreshold === undefined ? undefined : painAnswers.find((v) => v >= painPauseThreshold);
  const painStop = painAtStop !== undefined;
  const isHold = setup.ok && setup.kind === 'hold';
  const countUnit = isHold ? 'holds' : 'reps';
  const label = setLabel(sets);
  const repsText = repsLabel(sets, countUnit);
  const holdTotal = isHold ? (exercise.holdSeconds ?? null) : null; // the clinician hold time. The app has no number of its own.
  const resting = sets.phase === 'set-complete';
  const startText = view.waiting && !cameraError && !backgrounded ? START_TEXT[startStep] : '';
  const cameraTrouble = view.stale || cameraError !== null || backgrounded;

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
          {secondConnected && (
            <p className="chip chip-soft">
              <Icon name="phone" size={16} />
              Second camera connected
            </p>
          )}
          <button type="button" className="btn btn-ghost session-swap" onClick={toggleMute}>
            <Icon name={muted ? 'volume-x' : 'volume-2'} size={20} />
            {muted ? 'Unmute sound' : 'Mute sound'}
          </button>
        </div>
      </header>

      {!setup.ok ? (
        <Notice icon="triangle-alert">
          {/* T4: a hold with no angle asks for the angle. Any other missing value keeps the generic notice. */}
          <p>
            {exercise.kind === 'seated-extension-hold' && (setup.missing === 'minFlexion' || setup.missing === 'targetFlexion')
              ? ASK_HOLD_ANGLE_TEXT
              : `The target for this exercise is missing. ${ASK_SURGEON_TEXT}.`}
          </p>
        </Notice>
      ) : (
        <>
          {/* Notices that need attention come before the camera, so the fixed bar never covers them (L3-06). */}
          {(cameraTrouble || second?.status === 'failed' || second?.status === 'closed') && (
            <div className="stack-s session-notices">
              {cameraTrouble && (
                <Notice role="alert" icon="triangle-alert">
                  <p>{cameraError ?? (backgrounded ? BACKGROUND_TEXT : 'No camera image for 2 seconds. Check that the camera is on.')}</p>
                  <div className="actions">
                    <button type="button" className="btn" onClick={retryCamera}>
                      <Icon name="refresh-cw" size={18} />
                      Try the camera again
                    </button>
                  </div>
                </Notice>
              )}
              {second?.status === 'failed' && second.message && (
                <Notice role="status" icon="info">
                  <p>{second.message}</p>
                </Notice>
              )}
              {second?.status === 'closed' && wasConnected.current && (
                <Notice role="status" icon="info">
                  <p>{SECOND_STOPPED}</p>
                </Notice>
              )}
            </div>
          )}
          <div className="session-grid">
            <div className="stack">
              {paused && (
                <div className={resting ? 'stack-s rest-panel' : 'stack-s'}>
                  <Notice role="status" icon="check">
                    {resting ? (
                      <h2 className="notice-title rest-title" tabIndex={-1} ref={restRef}>
                        Set {sets.setIndex + 1} done. Rest when you are ready.
                      </h2>
                    ) : (
                      <p>{SET_TEXT.allComplete}</p>
                    )}
                  </Notice>
                  {sets.phase === 'set-complete' && painStop && (
                    <Notice tone="strong" role="alert" icon="heart-pulse" title={PAUSE_MESSAGE}>
                      <p>
                        You reported pain <span className="num">{painAtStop}</span> out of 10.
                      </p>
                      <p>This is a rule of the app. It is not a diagnosis.</p>
                    </Notice>
                  )}
                  {sets.phase === 'set-complete' && !painStop && <PainScale key={sets.setIndex} name="set-pain" value={painAnswers[sets.setIndex] ?? null} onChange={answerPain} />}
                  {sets.phase === 'set-complete' && !painStop ? (
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

              {needsCapture && found === null && (
                <section className="card capture stack-s" aria-labelledby="capture-title">
                  <h2 id="capture-title">{CAPTURE_TEXT.title}</h2>
                  <p>{view.capture?.tooBent ? CAPTURE_TEXT.bent : view.capture?.phase === 'choose' ? CAPTURE_TEXT.stuck : CAPTURE_TEXT.hold}</p>
                  <progress className="capture-progress" max={100} value={view.capture?.progress ?? 0} aria-label={CAPTURE_TEXT.progress} />
                  {view.capture?.phase === 'choose' && (
                    <div className="stack-s">
                      <button type="button" className="btn" disabled={!view.capture.canUseLowest} onClick={useLowestAngle}>
                        {CAPTURE_TEXT.lowestButton}
                      </button>
                      {!view.capture.canUseLowest && <p className="detail">{CAPTURE_TEXT.lowestNeedsLeg}</p>}
                    </div>
                  )}
                </section>
              )}
              {!resting && (
                <div className="card counters">
                  {(label !== null || repsText !== null) && (
                    <div className="counters-head">
                      {label !== null && <p className="set-label">{label}</p>}
                      {repsText !== null && <p className="detail">{repsText}</p>}
                    </div>
                  )}
                  <div className="readout">
                    <p className="readout-label">Angle</p>
                    <p className="readout-line">
                      <span className="num readout-number">{view.angle === null ? '--' : view.angle}</span> <span className="unit">{plural(view.angle, 'degree', 'degrees')}</span>
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
                    <p className="readout-label">{isHold ? 'Holds' : 'Reps'}</p>
                    <p className="readout-line" aria-live="polite">
                      <span className="num readout-number">{sets.repsInSet}</span>{' '}
                      <span className="unit">{isHold ? plural(sets.repsInSet, 'hold', 'holds') : plural(sets.repsInSet, 'rep', 'reps')}</span>
                    </p>
                    {holdTotal !== null && (
                      <div className="hold-meter">
                        <p className="hold-text">
                          <span className="num">{view.holdSec}</span> of <span className="num">{holdTotal}</span> {plural(holdTotal, 'second', 'seconds')}
                        </p>
                        <progress className="hold-bar" max={holdTotal} value={view.holdSec} aria-hidden="true" />
                      </div>
                    )}
                    {exercise.kind === 'straight-leg-raise' && <p className="detail">{view.top ?? 'The angle at the top shows after a lift.'}</p>}
                  </div>
                </div>
              )}

              {block !== null && (
                <Notice icon="ruler">
                  <p>{LEG_TEXT.noReturnValue}</p>
                  <p className="detail">{LEG_TEXT.noReturnValueDetail}</p>
                </Notice>
              )}
              {found !== null && (
                <div className="stack-s" data-testid="starting-angle">
                  <p>{found.source === 'still' ? LEG_TEXT.resting(Math.round(found.deg)) : CAPTURE_TEXT.startingAngle(Math.round(found.deg))}</p>
                  {found.source === 'lowest' && <p className="detail">Estimated angle, not a medical measurement.</p>}
                </div>
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
            </div>

            <div className="frame">
              <video ref={videoRef} className="preview" muted playsInline aria-label="Camera view" />
              <p role="status" className="session-start">
                {startText}
              </p>
            </div>
          </div>
        </>
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
