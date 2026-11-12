// Session (S5, S6). Live estimated angle, rep count, a cue line, Stop, and "knee gave way or hurts".
// Plan 3.1: the frame loop writes to a ref. React state updates at most 4 times each second.
// Cue text comes only from src/lib/cues.ts. An in-range rep shows no message (FR23).
// Layout rules: research/ux-flow.md section 8.2. Large numbers, large Stop button, units next to numbers.
// The rep count is a polite live region. It changes only when a rep counts.
// Every exit stops the camera: the Stop buttons and the unmount cleanup both call source.stop() (NFR9).
// Sound (FR10): a near-limit rep and an over-limit rep make a beep. Nothing else does. The over-limit beep repeats every 5 s while the knee stays past the limit (M5). The mute button is here.
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
// V2 (docs/ui-redesign-v2-spec.md): the camera and a status slot under it come first (A1). The slot holds the alert, the capture
// line, the start step and the cue, so nothing sits on the picture and nothing hides under the fixed bar. The slot keeps its height.
// A camera problem shows in the frame (A6). The unit sits on the baseline of the number (A2). The styles are in sessionV2.css.
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Side } from '../lib/angle';
import { createCueGate, cueFor, stillOverLimit, topAngleText, type CueEvent } from '../lib/cues';
import { counterSetup, createPipeline, legRoleOf, type Pipeline, type SetupResult, type Summary } from '../lib/exercises';
import { engineSpecFor } from '../lib/monitor/engine';
import { specFor } from '../lib/monitor/registry';
import { countBlock } from '../lib/counters';
import { createBaselineCapture, type BaselineSource, type CaptureState } from '../lib/baseline';
import { createIdentityWatcher, otherLegConfirmed, type MovingLeg } from '../lib/legIdentity';
import { SETUP_CONFIG } from '../lib/setupRules';
import { createFrontRecorder, type FrontRecorder } from '../lib/views';
import { PAUSE_MESSAGE, evaluateSession } from '../lib/safety';
import { SET_TEXT, countRep, finish, nextSet, plural, repsLabel, setLabel, startSets, type SetsState } from '../lib/sets';
import type { Exercise, PlanExercise } from '../lib/protocol';
import type { PairingStatus } from '../pairing/pairing';
import type { LandmarkSource } from '../pose/source';
import type { EndReason, RunSummary } from './appState';
import type { Sound } from './sound';
import { ASK_HOLD_ANGLE_TEXT, ASK_SURGEON_TEXT } from './askSurgeon';
import { BodyMap, BodyMapSwitch, PREVIEW_MIRRORED, mirrorClass, type BodyMapHandle } from './BodyMap';
import { Icon } from './Icon';
import { ANGLE_LABEL, EXERCISE_NAMES, HOLD_DROP_TEXT, MEASURE_LABEL, NO_CAMERA_EFFORT, secondsText, type HoldDrop } from './labels';
import { Notice } from './Notice';
import { focusHeading } from './focusHeading';
import { useCameraTop } from '../lib/useCameraTop';
import { PainScale } from './PainScale';
import { CAPTURE_TEXT, LEG_TEXT, firstSentence, otherLeg } from './setupView';
import { StatusLine } from './StatusLine';
import './sessionV2.css';

// Whole seconds of a hold. The same rule as the engine (round, and the record keeps at least 1). Local until the engine exports its helper.
const holdSecondsOf = (ms: number): number => Math.max(0, Math.round(ms / 1000));
const HOLD_TICK_MS = 500; // the readout rounds, so it changes at the half second and shows the stored whole second
const HOLD_MIN_MS = 1000; // the shortest hold that the timer keeps (modes.ts). Used only to name the reason of a dropped press.
const HOLD_MAX_MS = 3600 * 1000;
const HOLD_LIST_MAX = 50;

const TICK_MS = 250; // 4 updates each second at most (plan 3.1)
const PROBE_MS = 2000; // ENGINEERING: how long the source returns two poses when the lockout starts (B5-02)
const LOCK_HOLD_MS = 500; // ENGINEERING: the lock box stays this long after the lock ends. The same time as PAUSED_CUE_MS.
const CUE_SHOW_MS = 4000; // PROPOSAL, no source: how long a cue text stays on screen. The over-limit alert waits until the knee is back below the limit.
const STALE_MS = 2000; // PROPOSAL, no source: no frame for this long shows the camera notice
// ENGINEERING, not clinical: the over-limit beep repeats this often while the knee stays past the limit (M5).
// Reason: a person who looks away must still hear that the limit is passed. 5 s is slower than a storm of beeps.
const OVER_LIMIT_REPEAT_MS = 5000;

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
  /** M3: 'hand' when any counted rep came from the "Count this rep" button, 'camera' when all came from the pipeline. */
  repsBy?: 'camera' | 'hand';
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
  lockedOut: boolean; // the pipeline reads a far hip for more than 4 s with the whole leg visible (B3-01)
  otherPerson: boolean; // a press found the hip far from the start hip. No numbers show until the person starts again (B4-01)
  looking: boolean; // a press waits for the probe answer (B6-01)
  lockKind: 'locked' | 'looking' | 'other'; // the text of the lock box the last time it showed
  lockUntil: number; // performance.now() until which the lock box stays after the lock ended (B4-05)
  otherLegMoves: boolean; // the last moving-leg windows named the other leg, in a row (F1)
  flexion: number | null;
  shown: number | null; // the whole-degree angle of the last tick. The map draws this number, so map and readout agree (B2-01).
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
  lock: 'locked' | 'looking' | 'other' | null; // the lock box under the camera: the prompt with the button, or the other-person text
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
  lock: null,
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
const NO_IMAGE_TEXT = 'No camera image for 2 seconds. Check that the camera is on.';
const BACKGROUND_TEXT = 'The camera stopped when this page went to the background. Press the button to start it again.';

interface Props {
  exercise: PlanExercise;
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
  /** The pain value from the protocol (`painPauseThreshold`). A lower value than the floor stops earlier. Missing means the floor of FR12. */
  painPauseThreshold?: number;
  /** The shell calls this when the Back button of the browser is pressed. It does what the Stop button does. */
  stopRef?: MutableRefObject<(() => void) | null>;
  onEnd: (reason: EndReason, summary: RunSummary) => void;
}

export function Session({ exercise, side, cameraSide, baselineDeg, source, second, sound, painPauseThreshold, stopRef, onEnd }: Props) {
  // The five new kinds run through the definitions of the registry. The engine has no protocol value that they wait for.
  const engine = engineSpecFor(exercise.kind);
  const timerMode = engine?.mode === 'person-timer';
  const usesCamera = engine === undefined || engine.view.legs !== 'none'; // the gluteal set needs no camera
  const setup: SetupResult | { ok: true; kind: 'engine' } = engine === undefined ? counterSetup(exercise as Exercise) : { ok: true, kind: 'engine' };
  const ready = setup.ok;
  // Setup gave no resting angle and the protocol has a return value: Session finds the angle in place.
  const needsCapture = setup.ok && setup.kind === 'reps' && setup.config.returnWithin !== undefined && baselineDeg == null;
  const needsHandCount = setup.ok && setup.kind === 'lag';
  const [viewState, setView] = useState<View>(INITIAL_VIEW);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0); // a press of "Try the camera again" starts the effect again
  const [muted, setMuted] = useState(sound.isMuted());
  const [sets, setSetsState] = useState(() => startSets({ sets: exercise.sets, reps: exercise.reps }));
  const setsRef = useRef(sets);
  const repSources = useRef({ camera: 0, hand: 0 }); // how many reps each way added to the sets (M3)
  const [painAnswers, setPainAnswers] = useState<number[]>([]); // the answer of each set that asked. A skipped set has no entry.
  const painRef = useRef(painAnswers);
  const [startStep, setStartStep] = useState<'starting' | 'ready'>('starting');
  // The hold timer (person-timer kinds). The button and the seconds are state. The time of the start is a ref.
  const [holding, setHolding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [setHolds, setSetHolds] = useState<number[]>([]); // the holds of the present set, in whole seconds
  const [dropped, setDropped] = useState<HoldDrop | null>(null); // why the last press pair saved no hold. Clears at the next start.
  const holdingRef = useRef(false);
  const holdStart = useRef(0);
  const [backgrounded, setBackgrounded] = useState(false); // the page went to the background, so the camera ended (L3-07)
  const restRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  useCameraTop(frameRef);
  const map = useRef<BodyMapHandle>(null);
  const live = useRef<Live>({
    lockedOut: false,
    otherPerson: false,
    looking: false,
    lockKind: 'locked',
    lockUntil: 0,
    otherLegMoves: false,
    flexion: null,
    shown: null,
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
  const lockRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef<HTMLParagraphElement>(null);
  const focusAfterLock = useRef(false);
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

  // A rep that the set logic ignores (a pause, the end) counts for nobody.
  const addRep = (by: 'camera' | 'hand') => {
    const next = countRep(setsRef.current);
    if (total(next) > total(setsRef.current)) repSources.current[by] += 1;
    applySets(next);
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
    let overBeepAt: number | null = null; // the time of the last over-limit beep of the present alert
    const minRepMs = exercise.minRepSeconds === undefined ? null : exercise.minRepSeconds * 1000;
    live.current.shown = null;
    live.current.lockedOut = false;
    live.current.otherPerson = false;
    live.current.looking = false;
    live.current.lockUntil = 0;
    live.current.frameAt = null; // a new start waits for a new frame
    live.current.holdSince = null;
    live.current.holdMs = 0;
    setStartStep('starting');
    watcher.current = null;
    answers.current = [];

    // Runs at frame rate. It writes to refs only. It does not set state.
    const onFrame = (landmarks: Parameters<Pipeline['step']>[0], timeMs: number, extra?: Parameters<Pipeline['step']>[2]) => {
      const p = getPipeline();
      const out = p?.step(landmarks, timeMs, extra);
      if (out?.probe) source.probe?.(PROBE_MS);
      // svg attributes only, no React state, no frame read. The angle text shows the number of the last tick, the same as the readout (B-05, B2-01).
      map.current?.update(landmarks, timeMs, source.aspect(), live.current.shown);
      if (!p || !out) return;
      const now = performance.now();
      const state = live.current;
      if (needsCapture && foundRef.current === null) {
        capture.current ??= createBaselineCapture(side, source.aspect(), SETUP_CONFIG, setup.ok && setup.kind === 'reps' ? setup.config.enter : undefined);
        state.capture = capture.current.push(landmarks, timeMs, out.flexion);
        if (state.capture.baselineDeg !== null) adopt(state.capture);
      }
      // The moving-leg check only informs. It does not touch the pipeline. It starts when reps can count.
      if (!timerMode && (!needsCapture || foundRef.current !== null)) {
        watcher.current ??= createIdentityWatcher(source.aspect());
        const moving = watcher.current.push(landmarks, timeMs);
        if (moving !== null) {
          answers.current.push(moving);
          state.otherLegMoves = otherLegConfirmed(answers.current, otherLeg(side));
        }
      }
      state.flexion = out.flexion;
      state.lockedOut = out.lockedOut === true;
      state.otherPerson = out.otherPerson === true;
      state.looking = out.looking === true;
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
      if (!engine) sound.playFor(out.event as CueEvent); // no sound for the new modes: they have no limit of a source or a clinician
      // M5: the over-limit beep repeats while the knee stays past the limit. It stops when the knee returns. The mute button still holds.
      if (engine) overBeepAt = null;
      else if (out.event === 'over-limit') overBeepAt = now;
      else if (!stillOverLimit(exercise as Exercise, out.flexion)) overBeepAt = null;
      else if (overBeepAt !== null && now - overBeepAt >= OVER_LIMIT_REPEAT_MS) {
        sound.play('over-limit');
        overBeepAt = now;
      }
      if (out.event !== null && COUNTED_EVENTS.has(out.event)) addRep('camera');
      const text = cueFor(out.event as CueEvent, {
        repMs: out.repMs,
        minRepMs,
      });
      // A limit alert on screen blocks every other cue. A limit cue itself is never delayed (cue order, design 4.2).
      const alertOn = state.cue !== null && state.cue.alert && now < state.cue.until;
      gate.note(out.event as CueEvent, now);
      if (text !== null && gate.allow(out.event as CueEvent, text, now, alertOn)) {
        state.cue = {
          text,
          alert: out.event === 'over-limit',
          paused: out.event === 'paused',
          until: now + CUE_SHOW_MS,
        };
      } else if (state.cue?.paused && out.event !== 'paused') {
        // The leg is back in view. The cue hides only after the gate hold of PAUSED_CUE_MS (B2-04).
        if (gate.pausedVisible(now)) state.cue.until = now + CUE_SHOW_MS;
        else state.cue = null;
      }
      // The alert stays while the knee stays past the limit plus the margin. The ceiling for a heel slide and a mini squat,
      // the arc end (minFlexion) for the seated hold. The timeout starts when the knee returns.
      if (state.cue?.alert && !engine && stillOverLimit(exercise as Exercise, out.flexion)) {
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
      // B4-05: the lock box has the same 500 ms hold on hide as the leg cue, so a short blip near a cut never flashes it.
      const lockNow = !stale && (state.lockedOut || state.otherPerson || state.looking);
      if (lockNow) {
        state.lockKind = state.otherPerson ? 'other' : state.looking ? 'looking' : 'locked';
        state.lockUntil = now + LOCK_HOLD_MS;
      }
      const lock = lockNow || now < state.lockUntil ? state.lockKind : null;
      map.current?.setChosenHidden(lock !== null); // B5-03: no label and no arc on a person who is not the patient
      const angle = stale || timerMode || state.flexion === null ? null : Math.round(state.flexion);
      // The number on the knee arc of the map is the knee bend. For the ankle and the leg raises it is another angle, so only the readout shows it.
      state.shown = engine ? null : angle;
      map.current?.setShownAngle(engine ? null : angle);
      const next: View = {
        angle,
        top: sum ? topAngleText(sum.setTopFlexion ?? null) : null, // the present set only (U3)
        cue: cue && !cue.alert && !(lock !== null && cue.paused) ? cue.text : '', // B4-04: the lock box replaces "Show your whole leg."
        alert: cue?.alert ? cue.text : '',
        waiting,
        stale,
        identity: state.otherLegMoves,
        lock,
        holdSec: stale || !(setup.ok && setup.kind === 'hold') ? 0 : Math.floor(Math.min(state.holdMs, setup.config.minHoldMs) / 1000),
        capture:
          state.capture === null || foundRef.current !== null
            ? null
            : {
                phase: state.capture.phase,
                progress: Math.round(state.capture.progress * 100),
                canUseLowest: state.capture.canUseLowest && !state.lockedOut && !state.otherPerson, // d: no start angle from a person who is locked out
                tooBent: state.capture.tooBent,
              },
      };
      const key = JSON.stringify(next);
      if (key !== lastKey) {
        lastKey = key;
        setView(next);
      }
    };

    if (usesCamera) {
      void source.start(onFrame, videoRef.current).then((result) => {
        if (!alive) return;
        if (result.ok) setStartStep('ready');
        else setCameraError(result.error.message);
      });
    }
    const timer = setInterval(tick, TICK_MS);
    return () => {
      alive = false;
      clearInterval(timer);
      source.stop();
    };
  }, [exercise, side, cameraSide, baselineDeg, source, ready, attempt, needsCapture]);

  // The seconds of the present hold. One update each second. The screen reader does not read it (aria-live off).
  useEffect(() => {
    if (!holding) return;
    const id = setInterval(() => setElapsed(holdSecondsOf(performance.now() - holdStart.current)), HOLD_TICK_MS);
    return () => clearInterval(id);
  }, [holding]);

  // Ends the open hold, if any. The timer saves it when it lasted at least 1 s. A press that saves nothing sets the reason (R-04).
  function closeHold() {
    const p = pipeline.current;
    if (!p || !holdingRef.current) return;
    holdingRef.current = false;
    const t = performance.now();
    const before = p.engineData?.().holdList ?? [];
    const result: unknown = p.endHold?.(t); // the engine returns { saved, reason }. The older shape returns nothing.
    const list = p.engineData?.().holdList ?? [];
    setHolding(false);
    setElapsed(0);
    if (list.length > before.length) {
      addRep('camera');
      setSetHolds((h) => [...h, list[list.length - 1] as number]);
      return;
    }
    const ms = t - holdStart.current;
    const given = typeof result === 'object' && result !== null && 'reason' in result ? (result as { reason: string }).reason : null;
    const reason: HoldDrop | null =
      given === 'too-short' || given === 'too-long' || given === 'list-full'
        ? given
        : before.length >= HOLD_LIST_MAX
          ? 'list-full'
          : ms > HOLD_MAX_MS
            ? 'too-long'
            : ms < HOLD_MIN_MS
              ? 'too-short'
              : null;
    setDropped(reason);
  }

  // The person presses Start hold or End hold. The camera never decides the effort.
  function toggleHold() {
    const p = getPipeline();
    if (!p || paused) return;
    if (holdingRef.current) return closeHold();
    holdingRef.current = true;
    holdStart.current = performance.now();
    p.startHold?.(holdStart.current);
    setDropped(null);
    setElapsed(0);
    setHolding(true);
  }

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

  // B4-06: when the lock box goes after a press, the focus moves to the angle, so a keyboard user keeps the place.
  useEffect(() => {
    if (viewState.lock === null && focusAfterLock.current) {
      focusAfterLock.current = false;
      angleRef.current?.focus({ preventScroll: true });
    }
  }, [viewState.lock]);

  // U5: the Start next set button goes with the rest panel. The focus moves to the angle readout and the page goes to the top.
  const focusAfterSet = useRef(false);
  function startNextSet() {
    focusAfterSet.current = true;
    setSetHolds([]);
    applySets(nextSet(setsRef.current));
  }
  useEffect(() => {
    if (focusAfterSet.current && sets.phase !== 'set-complete') {
      focusAfterSet.current = false;
      focusHeading(angleRef.current);
    }
  }, [sets.phase]);

  // U3: a new set starts with no top angle on the screen. The session keeps its highest top angle for the Summary.
  useEffect(() => {
    pipeline.current?.newSet();
  }, [sets.setIndex]);

  // U8: the focus moves to the rest panel title when a set ends.
  useEffect(() => {
    if (sets.phase === 'set-complete') restRef.current?.focus();
  }, [sets.phase, sets.setIndex]);

  function end(reason: EndReason) {
    if (ended.current) return;
    ended.current = true;
    closeHold(); // a hold that is open when the session ends is saved when it lasted 1 s or more
    source.stop();
    secondSource?.stop();
    // A session with no frame still gets an empty summary from a fresh pipeline.
    // The counts come from the set logic, so a rep during a set pause is not in the result.
    const done = finish(setsRef.current);
    const base = getPipeline()?.summary() ?? EMPTY_SUMMARY;
    const engineData = getPipeline()?.engineData?.();
    const counted = total(done);
    const front = recorder.current?.finish() ?? null;
    const isHold = setup.ok && setup.kind === 'hold';
    const isTimer = timerMode;
    const repsCounted = setup.ok && setup.kind === 'reps' && setup.config.returnWithin !== undefined;
    const isHand = needsHandCount; // the hand count of a straight leg raise keeps the old null when nothing was counted
    // The last set has no question, because the summary asks for the pain at the end.
    const asked = done.completedSets - (done.phase === 'all-sets-complete' ? 1 : 0);
    const setPain = Array.from({ length: asked }, (_, i) => painRef.current[i] ?? null);
    const repsBy = repSources.current.hand > 0 ? 'hand' : repSources.current.camera > 0 ? 'camera' : undefined;
    const baselineSource = foundRef.current?.source ?? (baselineDeg != null && repsCounted ? 'still' : undefined);
    const result: SessionRunSummary = {
      ...base,
      ...(baselineSource === undefined ? {} : { baselineSource }),
      reps: isTimer ? null : isHold || isHand ? (isHold || counted === 0 ? null : counted) : counted,
      holds: isHold || isTimer ? counted : null,
      sets: done,
      ...(front === null ? {} : { front }),
      ...(asked > 0 ? { setPain } : {}),
      ...(repsBy === undefined || isHold || isTimer ? {} : { repsBy }),
      ...(engineData === undefined ? {} : { engine: engineData }),
    };
    onEnd(reason, result);
  }

  // PROPOSAL, no source: the camera counts a lifted leg as an estimate (exercises.ts). This button is the fallback for a missed lift.
  // A clinician or the user must confirm this button. It shows only for a counter of kind 'lag'.
  function countByHand() {
    addRep('hand');
  }

  // The Back button of the browser stops the session like the Stop button (F3). The ref clears when the screen goes.
  useEffect(() => {
    if (!stopRef) return;
    stopRef.current = () => end('stop');
    return () => {
      stopRef.current = null;
    };
  });

  // The person pressed the button. Only now does the app take the lowest steady angle.
  function useLowestAngle() {
    if (live.current.lockedOut || live.current.otherPerson) return;
    const chosen = capture.current?.useLowest();
    if (chosen) {
      adopt(chosen);
      angleRef.current?.focus({ preventScroll: true }); // B5-07: the button goes away, so the focus moves to the angle
    }
  }

  // B3-01: the person presses. Only now does the anchor move to the hip of the present frame.
  function followAgain() {
    pipeline.current?.followAgain();
    live.current.lockedOut = false;
    live.current.looking = true; // the pipeline answers on the next frame. Until then the box shows the wait text.
    live.current.lockUntil = performance.now() + LOCK_HOLD_MS;
    // B4-06: the button goes away, so the focus moves to the status box. If the box goes too, it moves to the angle.
    focusAfterLock.current = true;
    lockRef.current?.focus({ preventScroll: true }); // B5-04: the page must not scroll under the bar
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
  // H1: the same rule as the Summary. The floor of FR12 (an app rule, 7, a clinician must review it) stops the session here.
  // A lower protocol threshold stops earlier. A higher one does not lift the floor.
  const painAtStop = painAnswers.find((v) => typeof v === 'number' && evaluateSession({ pain: v, swelling: 'none', painPauseThreshold }).reasons.includes('pain'));
  const painStop = painAtStop !== undefined;
  const isHold = setup.ok && setup.kind === 'hold';
  const countUnit = isHold || timerMode ? 'holds' : 'reps';
  const label = setLabel(sets);
  const repsText = repsLabel(sets, countUnit);
  const holdTotal = isHold ? (exercise.holdSeconds ?? null) : null;
  const holdTarget = timerMode ? (exercise.holdSeconds ?? null) : null; // the clinician target of a timed hold. It only shows. It never judges. // the clinician hold time. The app has no number of its own.
  const resting = sets.phase === 'set-complete';
  const captureOn = needsCapture && found === null; // the app looks for the starting angle
  const cameraTrouble = usesCamera && (viewState.stale || cameraError !== null || backgrounded);
  // U6: when the camera stops, the old cue, the old angle and the old top angle go. The readout shows --.
  const view: View = cameraTrouble ? { ...viewState, angle: null, cue: '', alert: '', top: null } : viewState;
  const startText = usesCamera && view.waiting && !cameraError && !backgrounded ? START_TEXT[startStep] : '';
  const trouble = firstSentence(cameraError ?? (backgrounded ? BACKGROUND_TEXT : NO_IMAGE_TEXT));

  // The gauge shows the live angle on a track from 0 to the scale end. The limit is a quiet marker, not a target to reach.
  const limit = engine === undefined ? exercise.maxFlexion : undefined; // the new modes have no limit of a care team
  const pumpMin = specFor('ankle-pump')?.thresholds.find((t) => t.name === 'min-amplitude')?.value ?? null; // engineering value of the definition
  const measureLabel = MEASURE_LABEL[exercise.kind] ?? 'Knee bend';
  const scaleEnd = Math.max(120, limit === undefined ? 0 : Math.ceil((limit + 30) / 10) * 10);
  const at = (deg: number) => 3 + (Math.min(Math.max(deg, 0), scaleEnd) / scaleEnd) * 94;
  // The ruler: a tick every 5 degrees, a longer tick every 10 degrees. It only shows the scale.
  const ticks = Number.isFinite(scaleEnd) ? Array.from({ length: Math.min(Math.floor(scaleEnd / 5), 60) + 1 }, (_, i) => i * 5) : [];

  // The bar of Stop, Count this rep and Knee gave way or hurts. On a phone it is fixed at the bottom. On a wide screen it sits in the right column,
  // always in view, and it never covers the camera.
  const bar = (
    <div className="session-bar">
      <div className="session-bar-inner">
        <div className="bar-actions">
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
            <Icon name="triangle-alert" size={22} />
            Knee gave way or hurts
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <section aria-labelledby="session-title" className="session v2-session">
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
          {/* Notices of the second camera come before the camera, so the fixed bar never covers them (L3-06). A camera problem shows in the frame (A6). */}
          {(second?.status === 'failed' || second?.status === 'closed') && (
            <div className="stack-s session-notices">
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
          <div className={`session-grid${paused ? ' session-paused' : ''}${usesCamera ? '' : ' session-solo'}`}>
            {usesCamera && (
            <div className="viewfinder">
              <div className="frame" ref={frameRef}>
                <video ref={videoRef} className={`preview ${mirrorClass(PREVIEW_MIRRORED)}`.trim()} muted playsInline aria-label="Camera view" />
                <BodyMap ref={map} leg={side} mirrored={PREVIEW_MIRRORED} />
                <BodyMapSwitch />
                {cameraTrouble && (
                  <Notice role="alert" icon="video-off" title={trouble.title}>
                    {trouble.rest !== '' && <p> {trouble.rest}</p>}
                    <div className="actions">
                      <button type="button" className="btn" onClick={retryCamera}>
                        <Icon name="refresh-cw" size={18} />
                        Try the camera again
                      </button>
                    </div>
                  </Notice>
                )}
              </div>
              {/* The status slot: right under the camera, never on it. Its height is reserved, so nothing moves when it fills (spec section 5).
                  Priority: the alert, then the capture line, then the start step, then the cue. The CSS shows the first one. */}
              <div className="status-slot">
                <p role="alert" className="cue cue-alert">
                  {view.alert}
                </p>
                {captureOn && view.capture && (
                  <div className="capture-status">
                    <StatusLine
                      icon="activity"
                      text={
                        view.capture.tooBent
                          ? CAPTURE_TEXT.bentShort
                          : view.capture.phase === 'choose'
                            ? view.capture.canUseLowest
                              ? CAPTURE_TEXT.chooseShort
                              : CAPTURE_TEXT.lowestNeedsLeg
                            : CAPTURE_TEXT.hold
                      }
                    />
                    {/* The progress shows while the app waits for a still leg. When the person must choose, the button is the next step. */}
                    {view.capture.phase !== 'choose' && !view.capture.tooBent && (
                      <progress className="capture-progress" max={100} value={view.capture.progress} aria-label={CAPTURE_TEXT.progress} />
                    )}
                  </div>
                )}
                <StatusLine icon="camera" text={startText} className="session-start" />
                <p role="status" aria-live="polite" className="cue">
                  {view.cue}
                </p>
                {/* R3-02: the button sits in the slot, right under the camera and before the numbers, so it stays in the first view. */}
                {captureOn && view.capture?.phase === 'choose' && (
                  <button type="button" className="btn" disabled={!view.capture.canUseLowest} onClick={useLowestAngle}>
                    {CAPTURE_TEXT.lowestButton}
                  </button>
                )}
              </div>
            </div>
            )}
            <div className="stack">
              {/* B5-04: the lock box is out of the flow on a phone (fixed above the bar). On a wide screen it is the first thing of the right column. */}
              {view.lock !== null && (
                <div className="stack-s lock-box" role="status" tabIndex={-1} ref={lockRef}>
                  {view.lock !== 'other' && (
                    <button type="button" className="btn" onClick={followAgain} disabled={view.lock === 'looking'} aria-busy={view.lock === 'looking'}>
                      {CAPTURE_TEXT.followAgain}
                    </button>
                  )}
                  <p>{view.lock === 'locked' ? CAPTURE_TEXT.lockedOut : view.lock === 'looking' ? CAPTURE_TEXT.looking : CAPTURE_TEXT.otherPerson}</p>
                </div>
              )}
              {paused && (
                <div className={resting ? 'stack-s rest-panel' : 'stack-s'}>
                  <Notice role="status" icon="clock">
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
                    <button type="button" className="btn btn-primary btn-lg" onClick={startNextSet}>
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

              {!resting && timerMode && (
                <div className="card counters hold-timer">
                  {(label !== null || repsText !== null) && (
                    <div className="counters-head">
                      {label !== null && <p className="set-label">{label}</p>}
                      {repsText !== null && <p className="detail">{repsText}</p>}
                    </div>
                  )}
                  <div className="readout hold-readout">
                    <p className="readout-label">Hold time</p>
                    <p className="readout-line hold-elapsed" data-testid="hold-elapsed" aria-live="off">
                      <span className="num readout-number">{elapsed}</span> <span className="unit">{plural(elapsed, 'second')}</span>
                    </p>
                  </div>
                  <button type="button" className="btn btn-primary btn-lg hold-button" onClick={toggleHold}>
                    <Icon name={holding ? 'square' : 'play'} size={22} fill="currentColor" />
                    {holding ? 'End hold' : 'Start hold'}
                  </button>
                  <div className="readout-notes hold-notes">
                    <p className="detail" role="status">{setHolds.length === 0 ? 'No holds yet.' : `Holds: ${secondsText(setHolds)}`}</p>
                    {dropped !== null && <p className="detail" role="status">{HOLD_DROP_TEXT[dropped]}</p>}
                    <p className="detail">{NO_CAMERA_EFFORT}</p>
                    {holdTarget !== null && <p className="detail">{`Target: ${holdTarget} ${plural(holdTarget, 'second')}, set by your care team`}</p>}
                  </div>
                </div>
              )}
              {!resting && !timerMode && (
                <div className="card counters">
                  {(label !== null || repsText !== null) && (
                    <div className="counters-head">
                      {label !== null && <p className="set-label">{label}</p>}
                      {repsText !== null && <p className="detail">{repsText}</p>}
                    </div>
                  )}
                  <div className="readout">
                    <p className="readout-label">{measureLabel}</p>
                    <p className="readout-line" tabIndex={-1} ref={angleRef}>
                      <span className="num readout-number">{view.angle === null ? '--' : view.angle}</span> <span className="unit">{plural(view.angle, 'degree')}</span>
                    </p>
                  </div>
                  <div className="readout readout-reps">
                    <p className="readout-label">{isHold ? 'Holds' : 'Reps'}</p>
                    <p className="readout-line" aria-live="polite">
                      <span className="num readout-number">{sets.repsInSet}</span>{' '}
                      <span className="unit">{plural(sets.repsInSet, isHold ? 'hold' : 'rep')}</span>
                    </p>
                  </div>
                  {/* The caption of the angle spans the row under both numbers, so it wraps in two lines on a phone (A2, A8). */}
                  <p className="detail readout-caption">{measureLabel}: {ANGLE_LABEL}</p>
                  {/* Notes of the count (the hold timer, the leg raise texts) take the full row, so the two numbers keep their width. */}
                  {(holdTotal !== null || exercise.kind === 'straight-leg-raise' || exercise.kind === 'leg-raise-side' || exercise.kind === 'ankle-pump') && (
                    <div className="readout-notes">
                      {holdTotal !== null && (
                        <div className="hold-meter">
                          <p className="hold-text">
                            <span className="num">{view.holdSec}</span> of <span className="num">{holdTotal}</span> {plural(holdTotal, 'second')}
                          </p>
                          <progress className="hold-bar" max={holdTotal} value={view.holdSec} aria-hidden="true" />
                      </div>
                    )}
                    {exercise.kind === 'ankle-pump' && pumpMin !== null && <p className="detail">{`The camera counts pumps of ${pumpMin} degrees or more.`}</p>}
                    {exercise.kind === 'leg-raise-side' && <p className="detail">The camera cannot measure this angle well.</p>}
                    {exercise.kind === 'straight-leg-raise' && <p className="detail">{view.top ?? 'The angle at the top shows after a lift.'}</p>}
                    {exercise.kind === 'straight-leg-raise' && <p className="detail">The camera counts leg raises as an estimate. If a lift is missed, press Count this rep.</p>}
                    </div>
                  )}
                  {limit !== undefined && (
                    <div className="readout-gauge">
                      <svg className="gauge" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                        <line className="gauge-base" x1="3" x2="97" y1="13" y2="13" />
                        {ticks.map((deg) => (
                          <line key={deg} className={deg % 10 === 0 ? 'gauge-tick gauge-tick-long' : 'gauge-tick'} x1={at(deg)} x2={at(deg)} y1="13" y2={deg % 10 === 0 ? 7 : 9.5} />
                        ))}
                        <line className="gauge-limit" x1={at(limit)} x2={at(limit)} y1="2" y2="13" />
                        {view.angle !== null && <line className="gauge-index" x1={at(view.angle)} x2={at(view.angle)} y1="0" y2="13" />}
                      </svg>
                      <p className="gauge-caption">
                        Your limit <span className="num">{limit}</span> degrees
                      </p>
                    </div>
                  )}
                </div>
              )}

              {captureOn && (view.capture?.phase === 'choose' || view.capture?.tooBent) && (
                <section className="card capture stack-s" aria-labelledby="capture-title">
                  <h2 id="capture-title">{CAPTURE_TEXT.title}</h2>
                  <p>{view.capture.tooBent ? CAPTURE_TEXT.bent : CAPTURE_TEXT.stuck}</p>
                </section>
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
              {bar}
            </div>

          </div>
        </>
      )}
      {!setup.ok && bar}
    </section>
  );
}
