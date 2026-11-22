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
import { engineSpecFor, usesCamera as kindUsesCamera } from '../lib/monitor/engine';
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
import { PainScale } from './PainScale';
import { CAPTURE_TEXT, LEG_TEXT, firstSentence, otherLeg } from './setupView';
import { StatusLine } from './StatusLine';
import { BigNumber } from './v3/BigNumber';
import { ExerciseHeader } from './v3/ExerciseHeader';
import { LiveShell } from './v3/LiveShell';
import { SessionProgress } from './v3/SessionProgress';
import { liveBanners } from './liveBanners';
import './sessionV2.css';
import './liveV3.css';

const holdSecondsOf = (ms: number): number => Math.max(0, Math.round(ms / 1000));
const HOLD_TICK_MS = 500;
const HOLD_MIN_MS = 1000;
const HOLD_MAX_MS = 3600 * 1000;
const HOLD_LIST_MAX = 50;

const TICK_MS = 250;
const PROBE_MS = 2000; // ENGINEERING: how long the source returns two poses when the lockout starts (B5-02)
const LOCK_HOLD_MS = 500; // ENGINEERING: the lock box stays this long after the lock ends. The same time as PAUSED_CUE_MS.
const CUE_SHOW_MS = 4000; // PROPOSAL, no source: how long a cue text stays on screen. The over-limit alert waits until the knee is back below the limit.
const STALE_MS = 2000; // PROPOSAL, no source: no frame for this long shows the camera notice
// ENGINEERING, not clinical: the over-limit beep repeats this often while the knee stays past the limit (M5).
// Reason: a person who looks away must still hear that the limit is passed. 5 s is slower than a storm of beeps.
const OVER_LIMIT_REPEAT_MS = 5000;

const EMPTY_SUMMARY: Summary = {
  reps: null,
  holds: null,
  peakFlexion: null,
  topFlexion: null,
  topState: null,
  eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 },
};

export interface SessionRunSummary extends RunSummary {
  setPain?: (number | null)[];
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
  lockedOut: boolean;
  otherPerson: boolean;
  looking: boolean;
  lockKind: 'locked' | 'looking' | 'other';
  lockUntil: number;
  otherLegMoves: boolean;
  flexion: number | null;
  shown: number | null;
  frameAt: number | null;
  cue: LiveCue | null;
  capture: CaptureState | null;
  holdSince: number | null;
  holdMs: number;
}

interface View {
  angle: number | null;
  top: string | null;
  cue: string;
  alert: string;
  waiting: boolean;
  stale: boolean;
  identity: boolean;
  lock: 'locked' | 'looking' | 'other' | null;
  /** Whole seconds of the current hold, never more than the hold time. 0 outside a hold. */
  holdSec: number;
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

export interface SecondView {
  source: LandmarkSource;
  status: PairingStatus;
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
  side: Side;
  cameraSide?: Side;
  baselineDeg?: number | null;
  source: LandmarkSource;
  second?: SecondView;
  sound: Sound;
  /** The pain value from the protocol (`painPauseThreshold`). A lower value than the floor stops earlier. Missing means the floor of FR12. */
  painPauseThreshold?: number;
  stopRef?: MutableRefObject<(() => void) | null>;
  plan?: { index: number; total: number };
  keepCamera?: boolean;
  banners?: readonly string[];
  onEnd: (reason: EndReason, summary: RunSummary) => void;
}

export function Session({ exercise, side, cameraSide, baselineDeg, source, second, sound, painPauseThreshold, stopRef, plan, keepCamera = false, banners = liveBanners(), onEnd }: Props) {
  const engine = engineSpecFor(exercise.kind);
  const timerMode = engine?.mode === 'person-timer';
  const usesCamera = kindUsesCamera(exercise.kind);
  const setup: SetupResult | { ok: true; kind: 'engine' } = engine === undefined ? counterSetup(exercise as Exercise) : { ok: true, kind: 'engine' };
  const ready = setup.ok;
  const needsCapture = setup.ok && setup.kind === 'reps' && setup.config.returnWithin !== undefined && baselineDeg == null;
  const needsHandCount = setup.ok && setup.kind === 'lag';
  const [viewState, setView] = useState<View>(INITIAL_VIEW);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [muted, setMuted] = useState(sound.isMuted());
  const [sets, setSetsState] = useState(() => startSets({ sets: exercise.sets, reps: exercise.reps }));
  const setsRef = useRef(sets);
  const repSources = useRef({ camera: 0, hand: 0 });
  const [painAnswers, setPainAnswers] = useState<number[]>([]);
  const painRef = useRef(painAnswers);
  const [startStep, setStartStep] = useState<'starting' | 'ready'>('starting');
  const [holding, setHolding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [setHolds, setSetHolds] = useState<number[]>([]);
  const [dropped, setDropped] = useState<HoldDrop | null>(null);
  const holdingRef = useRef(false);
  const holdStart = useRef(0);
  const [backgrounded, setBackgrounded] = useState(false);
  const restRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
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
  const cameraKept = useRef(false);
  const recorder = useRef<FrontRecorder | null>(null);
  const wasConnected = useRef(false);
  const secondSource = second?.source;
  const secondConnected = second?.status === 'connected';
  if (secondConnected) wasConnected.current = true;

  const applySets = (next: SetsState) => {
    setsRef.current = next;
    setSetsState(next);
  };

  const addRep = (by: 'camera' | 'hand') => {
    const next = countRep(setsRef.current);
    if (total(next) > total(setsRef.current)) repSources.current[by] += 1;
    applySets(next);
  };

  const answerPain = (value: number) => {
    const next = [...painRef.current];
    next[setsRef.current.setIndex] = value;
    painRef.current = next;
    setPainAnswers(next);
  };

  const adopt = (c: CaptureState) => {
    if (c.baselineDeg === null || c.source === null || foundRef.current !== null) return;
    pipeline.current?.setBaseline(c.baselineDeg);
    foundRef.current = { deg: c.baselineDeg, source: c.source };
    setFound(foundRef.current);
  };

  const getPipeline = () => {
    if (!pipeline.current) {
      const made = createPipeline(exercise, side, usesCamera ? source.aspect() : 1, {
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
    let overBeepAt: number | null = null;
    const minRepMs = exercise.minRepSeconds === undefined ? null : exercise.minRepSeconds * 1000;
    live.current.shown = null;
    live.current.lockedOut = false;
    live.current.otherPerson = false;
    live.current.looking = false;
    live.current.lockUntil = 0;
    live.current.frameAt = null;
    live.current.holdSince = null;
    live.current.holdMs = 0;
    setStartStep('starting');
    watcher.current = null;
    answers.current = [];

    const onFrame = (landmarks: Parameters<Pipeline['step']>[0], timeMs: number, extra?: Parameters<Pipeline['step']>[2]) => {
      if (ended.current) return;
      const p = getPipeline();
      const out = p?.step(landmarks, timeMs, extra);
      if (out?.probe) source.probe?.(PROBE_MS);
      map.current?.update(landmarks, timeMs, source.aspect(), live.current.shown);
      if (!p || !out) return;
      const now = performance.now();
      const state = live.current;
      if (needsCapture && foundRef.current === null) {
        capture.current ??= createBaselineCapture(side, source.aspect(), SETUP_CONFIG, setup.ok && setup.kind === 'reps' ? setup.config.enter : undefined);
        state.capture = capture.current.push(landmarks, timeMs, out.flexion);
        if (state.capture.baselineDeg !== null) adopt(state.capture);
      }
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
      if (setup.ok && setup.kind === 'hold') {
        const cfg = setup.config;
        const f = out.flexion;
        const over = f !== null && cfg.arcEnd !== undefined && f < cfg.arcEnd.limit - cfg.arcEnd.margin;
        const inBand = f !== null && !over && (cfg.direction === 'at-least' ? f >= cfg.threshold : f <= cfg.threshold);
        state.holdSince = inBand ? (state.holdSince ?? timeMs) : null;
        state.holdMs = state.holdSince === null ? 0 : timeMs - state.holdSince;
      }
      if (out.repMs !== null) recorder.current?.rep(timeMs, out.repMs);
      if (!engine) sound.playFor(out.event as CueEvent); // no sound for the new modes: they have no limit of a source or a clinician
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
        if (gate.pausedVisible(now)) state.cue.until = now + CUE_SHOW_MS;
        else state.cue = null;
      }
      if (state.cue?.alert && !engine && stillOverLimit(exercise as Exercise, out.flexion)) {
        state.cue.until = now + CUE_SHOW_MS;
      }
    };

    let lastKey = '';
    const tick = () => {
      const now = performance.now();
      const state = live.current;
      const waiting = state.frameAt === null;
      const stale = state.frameAt !== null && now - state.frameAt > STALE_MS;
      const cue = state.cue && now < state.cue.until ? state.cue : null;
      const sum = pipeline.current?.summary();
      const lockNow = !stale && (state.lockedOut || state.otherPerson || state.looking);
      if (lockNow) {
        state.lockKind = state.otherPerson ? 'other' : state.looking ? 'looking' : 'locked';
        state.lockUntil = now + LOCK_HOLD_MS;
      }
      const lock = lockNow || now < state.lockUntil ? state.lockKind : null;
      map.current?.setChosenHidden(lock !== null);
      const angle = stale || timerMode || state.flexion === null ? null : Math.round(state.flexion);
      state.shown = engine ? null : angle;
      map.current?.setShownAngle(engine ? null : angle);
      const next: View = {
        angle,
        top: sum ? topAngleText(sum.setTopFlexion ?? null) : null,
        cue: cue && !cue.alert && !(lock !== null && cue.paused) ? cue.text : '',
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
                canUseLowest: state.capture.canUseLowest && !state.lockedOut && !state.otherPerson,
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
      if (!cameraKept.current) source.stop();
    };
  }, [exercise, side, cameraSide, baselineDeg, source, ready, attempt, needsCapture]);

  useEffect(() => {
    if (!holding) return;
    const id = setInterval(() => setElapsed(holdSecondsOf(performance.now() - holdStart.current)), HOLD_TICK_MS);
    return () => clearInterval(id);
  }, [holding]);

  function closeHold() {
    const p = pipeline.current;
    if (!p || !holdingRef.current) return;
    holdingRef.current = false;
    const t = performance.now();
    const before = p.engineData?.().holdList ?? [];
    const result: unknown = p.endHold?.(t);
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

  useEffect(() => {
    if (!ready || !secondSource || !secondConnected) return;
    recorder.current ??= createFrontRecorder(side, () => secondSource.aspect());
    const rec = recorder.current;
    void secondSource.start((landmarks, timeMs) => rec.frame(landmarks, timeMs));
    return () => secondSource.stop();
  }, [ready, secondSource, secondConnected, side]);

  useEffect(() => {
    const onChange = () => {
      if (document.visibilityState === 'hidden') setBackgrounded(true);
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  useEffect(() => {
    if (viewState.lock === null && focusAfterLock.current) {
      focusAfterLock.current = false;
      angleRef.current?.focus({ preventScroll: true });
    }
  }, [viewState.lock]);

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

  useEffect(() => {
    pipeline.current?.newSet();
  }, [sets.setIndex]);

  useEffect(() => {
    if (sets.phase === 'set-complete') restRef.current?.focus();
  }, [sets.phase, sets.setIndex]);

  function end(reason: EndReason) {
    if (ended.current) return;
    ended.current = true;
    closeHold();
    cameraKept.current = keepCamera && reason === 'stop';
    if (!cameraKept.current) source.stop();
    secondSource?.stop();
    let done = setsRef.current;
    let base = EMPTY_SUMMARY;
    let engineData: ReturnType<NonNullable<Pipeline['engineData']>> | undefined;
    try {
      done = finish(setsRef.current);
      base = getPipeline()?.summary() ?? EMPTY_SUMMARY;
      engineData = getPipeline()?.engineData?.();
    } catch {
      base = EMPTY_SUMMARY;
      engineData = undefined;
    }
    const counted = total(done);
    const front = recorder.current?.finish() ?? null;
    const isHold = setup.ok && setup.kind === 'hold';
    const isTimer = timerMode;
    const repsCounted = setup.ok && setup.kind === 'reps' && setup.config.returnWithin !== undefined;
    const isHand = needsHandCount;
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

  useEffect(() => {
    if (!stopRef) return;
    stopRef.current = () => end('stop');
    return () => {
      stopRef.current = null;
    };
  });

  function useLowestAngle() {
    if (live.current.lockedOut || live.current.otherPerson) return;
    const chosen = capture.current?.useLowest();
    if (chosen) {
      adopt(chosen);
      angleRef.current?.focus({ preventScroll: true });
    }
  }

  function followAgain() {
    pipeline.current?.followAgain();
    live.current.lockedOut = false;
    live.current.looking = true;
    live.current.lockUntil = performance.now() + LOCK_HOLD_MS;
    focusAfterLock.current = true;
    lockRef.current?.focus({ preventScroll: true });
  }

  function retryCamera() {
    setCameraError(null);
    setBackgrounded(false);
    setAttempt((n) => n + 1);
    titleRef.current?.focus();
  }

  function toggleMute() {
    sound.setMuted(!muted);
    setMuted(!muted);
  }

  const block = setup.ok && setup.kind === 'reps' && setup.config.returnWithin === undefined ? countBlock({ ...setup.config, baseline: baselineDeg ?? undefined }) : null;
  const farLeg = usesCamera && cameraSide !== undefined && legRoleOf(side, cameraSide) === 'far';
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
  const captureOn = needsCapture && found === null;
  const cameraTrouble = usesCamera && (viewState.stale || cameraError !== null || backgrounded);
  const view: View = cameraTrouble ? { ...viewState, angle: null, cue: '', alert: '', top: null } : viewState;
  const startText = usesCamera && view.waiting && !cameraError && !backgrounded ? START_TEXT[startStep] : '';
  const trouble = firstSentence(cameraError ?? (backgrounded ? BACKGROUND_TEXT : NO_IMAGE_TEXT));

  const limit = engine === undefined ? exercise.maxFlexion : undefined;
  const pumpMin = specFor('ankle-pump')?.thresholds.find((t) => t.name === 'min-amplitude')?.value ?? null; // engineering value of the definition
  const measureLabel = MEASURE_LABEL[exercise.kind] ?? 'Knee bend';
  const scaleEnd = Math.max(120, limit === undefined ? 0 : Math.ceil((limit + 30) / 10) * 10);
  const at = (deg: number) => 3 + (Math.min(Math.max(deg, 0), scaleEnd) / scaleEnd) * 94;
  const ticks = Number.isFinite(scaleEnd) ? Array.from({ length: Math.min(Math.floor(scaleEnd / 5), 60) + 1 }, (_, i) => i * 5) : [];

  const bar = (
    <LiveShell.Actions label="Session actions">
      <div className="session-bar">
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
    </LiveShell.Actions>
  );
  const setMark = label !== null ? { current: sets.setIndex + 1, total: sets.prescription.sets ?? 1 } : undefined;
  const head = (
    <LiveShell.Header>
      <ExerciseHeader name={EXERCISE_NAMES[exercise.kind]} titleId="session-title" titleRef={titleRef}>
        {plan && <SessionProgress unit="Exercise" total={plan.total} current={plan.index + 1} set={setMark} />}
      </ExerciseHeader>
      <div className="session-meta">
        {secondConnected && (
          <p className="chip chip-soft">
            <Icon name="phone" size={16} />
            Second camera connected
          </p>
        )}
        {usesCamera && (
          <button type="button" className="btn btn-ghost session-swap" onClick={toggleMute}>
            <Icon name={muted ? 'volume-x' : 'volume-2'} size={20} />
            {muted ? 'Unmute sound' : 'Mute sound'}
          </button>
        )}
      </div>
    </LiveShell.Header>
  );
  const counterHead = (label !== null || repsText !== null) && (
    <div className="counters-head">
      {label !== null && !plan && <p className="set-label">{label}</p>}
      {repsText !== null && <p className="detail">{repsText}</p>}
    </div>
  );

  if (!setup.ok) {
    return (
      <LiveShell banner={banners}>
        {head}
        <LiveShell.Panel>
          <Notice icon="triangle-alert">
            <p>
              {exercise.kind === 'seated-extension-hold' && (setup.missing === 'minFlexion' || setup.missing === 'targetFlexion')
                ? ASK_HOLD_ANGLE_TEXT
                : `The target for this exercise is missing. ${ASK_SURGEON_TEXT}.`}
            </p>
          </Notice>
        </LiveShell.Panel>
        {bar}
      </LiveShell>
    );
  }

  return (
    <LiveShell banner={banners}>
      {head}
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
      {usesCamera && (
        <LiveShell.Camera label="Live camera">
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
        </LiveShell.Camera>
      )}
      <LiveShell.Panel>
        {usesCamera && (
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
                {view.capture.phase !== 'choose' && !view.capture.tooBent && (
                  <progress className="capture-progress" max={100} value={view.capture.progress} aria-label={CAPTURE_TEXT.progress} />
                )}
              </div>
            )}
            <StatusLine icon="camera" text={startText} className="session-start" />
            <p role="status" aria-live="polite" className="cue">
              {view.cue}
            </p>
            {captureOn && view.capture?.phase === 'choose' && (
              <button type="button" className="btn" disabled={!view.capture.canUseLowest} onClick={useLowestAngle}>
                {CAPTURE_TEXT.lowestButton}
              </button>
            )}
          </div>
        )}
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
          <div className="counters hold-timer">
            <button type="button" className="btn btn-primary btn-lg hold-button" onClick={toggleHold}>
              <Icon name={holding ? 'square' : 'play'} size={22} fill="currentColor" />
              {holding ? 'End hold' : 'Start hold'}
            </button>
            <div className="live-metric live-hold">
              <BigNumber
                label="Hold time"
                value={elapsed}
                unit={plural(elapsed, 'second')}
                tone="primary"
                valueProps={{ 'aria-live': 'off', 'data-testid': 'hold-elapsed' }}
              />
            </div>
            {counterHead}
            <div className="readout-notes hold-notes">
              <p className="detail" role="status">{setHolds.length === 0 ? 'No holds yet.' : `Holds: ${secondsText(setHolds)}`}</p>
              {dropped !== null && <p className="detail" role="status">{HOLD_DROP_TEXT[dropped]}</p>}
              <p className="detail">{NO_CAMERA_EFFORT}</p>
              {holdTarget !== null && <p className="detail">{`Target: ${holdTarget} ${plural(holdTarget, 'second')}, set by your care team`}</p>}
            </div>
          </div>
        )}
        {!resting && !timerMode && (
          <div className="counters">
            {counterHead}
            <div className="live-metrics">
              <div className="live-metric live-angle">
                <BigNumber label={measureLabel} value={view.angle} unit={plural(view.angle, 'degree')} valueProps={{ tabIndex: -1, ref: angleRef }} />
              </div>
              <div className="live-metric live-reps">
                <BigNumber
                  label={isHold ? 'Holds' : 'Reps'}
                  value={sets.repsInSet}
                  unit={plural(sets.repsInSet, isHold ? 'hold' : 'rep')}
                  tone="primary"
                  valueProps={{ 'aria-live': 'polite' }}
                />
              </div>
            </div>
            <p className="detail readout-caption">{measureLabel}: {ANGLE_LABEL}</p>
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
      </LiveShell.Panel>
      {bar}
    </LiveShell>
  );
}
