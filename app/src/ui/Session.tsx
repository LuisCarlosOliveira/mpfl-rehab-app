// Session (S5, S6). Live estimated angle, rep count, a cue line, Stop, and "knee gave way or hurts".
// Plan 3.1: the frame loop writes to a ref. React state updates at most 4 times each second.
// Cue text comes only from src/lib/cues.ts. An in-range rep shows no message (FR23).
// Layout rules: research/ux-flow.md section 8.2. Large numbers, large Stop button, units next to numbers.
// The rep count is a polite live region. It changes only when a rep counts.
// Every exit stops the camera: the Stop buttons and the unmount cleanup both call source.stop() (NFR9).
// Sound (FR10): a near-limit rep and an over-limit rep make a beep. Nothing else does. The mute button is here.
import { useEffect, useRef, useState } from 'react';
import type { Side } from '../lib/angle';
import { cueFor, topAngleText, type CueEvent } from '../lib/cues';
import { counterSetup, createPipeline, type Pipeline, type Summary } from '../lib/exercises';
import { MARGIN_DEG } from '../lib/margin';
import type { Exercise } from '../lib/protocol';
import type { LandmarkSource } from '../pose/source';
import type { EndReason } from './appState';
import type { Sound } from './sound';
import { ASK_SURGEON_TEXT } from './askSurgeon';
import { ANGLE_LABEL, EXERCISE_NAMES } from './labels';

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

interface Live {
  flexion: number | null;
  frameAt: number | null; // performance.now() of the last frame. null means no frame yet.
  cue: LiveCue | null;
}

interface View {
  angle: number | null;
  count: number | null;
  countUnit: string;
  top: string | null;
  cue: string;
  alert: string;
  waiting: boolean;
  stale: boolean;
}

const INITIAL_VIEW: View = {
  angle: null,
  count: null,
  countUnit: 'reps',
  top: null,
  cue: '',
  alert: '',
  waiting: true,
  stale: false,
};

interface Props {
  exercise: Exercise;
  side: Side;
  source: LandmarkSource;
  sound: Sound;
  onEnd: (reason: EndReason, summary: Summary) => void;
}

export function Session({ exercise, side, source, sound, onEnd }: Props) {
  const setup = counterSetup(exercise);
  const ready = setup.ok;
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0); // a press of "Try the camera again" starts the effect again
  const [muted, setMuted] = useState(sound.isMuted());
  const titleRef = useRef<HTMLHeadingElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const live = useRef<Live>({ flexion: null, frameAt: null, cue: null });
  const pipeline = useRef<Pipeline | null>(null);
  const ended = useRef(false);

  // The pipeline needs the video aspect. It is made when the first frame arrives, or when the session ends with no frame.
  const getPipeline = () => {
    if (!pipeline.current) {
      const made = createPipeline(exercise, side, source.aspect());
      if (made.ok) pipeline.current = made.pipeline;
    }
    return pipeline.current;
  };

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const minRepMs = exercise.minRepSeconds === undefined ? null : exercise.minRepSeconds * 1000;
    live.current.frameAt = null; // a new start waits for a new frame

    // Runs at frame rate. It writes to refs only. It does not set state.
    const onFrame = (landmarks: Parameters<Pipeline['step']>[0], timeMs: number) => {
      const p = getPipeline();
      if (!p) return;
      const out = p.step(landmarks, timeMs);
      const now = performance.now();
      const state = live.current;
      state.flexion = out.flexion;
      state.frameAt = now;
      sound.playFor(out.event as CueEvent);
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
      const count = sum ? (sum.reps ?? sum.holds) : null;
      const next: View = {
        angle: stale || state.flexion === null ? null : Math.round(state.flexion),
        count,
        countUnit: sum && sum.holds !== null ? 'holds' : 'reps',
        top: sum ? topAngleText(sum.topFlexion) : null,
        cue: cue && !cue.alert ? cue.text : '',
        alert: cue?.alert ? cue.text : '',
        waiting,
        stale,
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
  }, [exercise, side, source, ready, attempt]);

  function end(reason: EndReason) {
    if (ended.current) return;
    ended.current = true;
    source.stop();
    // A session with no frame still gets an empty summary from a fresh pipeline.
    onEnd(reason, getPipeline()?.summary() ?? EMPTY_SUMMARY);
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

  return (
    <section aria-labelledby="session-title" className="session">
      <h1 id="session-title" tabIndex={-1} ref={titleRef}>
        {EXERCISE_NAMES[exercise.kind]}
      </h1>

      {!setup.ok ? (
        <p className="attention">The target for this exercise is missing. {ASK_SURGEON_TEXT}.</p>
      ) : (
        <>
          <div className="readout">
            <p className="readout-line">
              <span className="num readout-number">{view.angle === null ? '--' : view.angle}</span>{' '}
              <span className="unit">degrees</span>
            </p>
            <p className="detail">Knee bend: {ANGLE_LABEL}</p>
            {exercise.kind === 'straight-leg-raise' ? (
              <p className="detail">{view.top ?? 'The angle at the top shows after a lift.'}</p>
            ) : (
              <p className="readout-line" aria-live="polite">
                <span className="num readout-number">{view.count === null ? 0 : view.count}</span>{' '}
                <span className="unit">{view.countUnit}</span>
              </p>
            )}
          </div>

          <div className="cue-area">
            <p role="status" aria-live="polite" className="cue">
              {view.cue}
            </p>
            <p role="alert" className="cue cue-alert">
              {view.alert}
            </p>
          </div>

          {view.waiting && !cameraError && (
            <p className="attention" role="status">
              Waiting for the camera.
            </p>
          )}
          {(view.stale || cameraError) && (
            <div className="attention" role="alert">
              <p>{cameraError ?? 'No camera image for 2 seconds. Check that the camera is on.'}</p>
              <button type="button" className="btn" onClick={retryCamera}>
                Try the camera again
              </button>
            </div>
          )}

          <video ref={videoRef} className="preview preview-small" muted playsInline aria-label="Camera view" />

          <button type="button" className="btn" onClick={toggleMute}>
            {muted ? 'Unmute sound' : 'Mute sound'}
          </button>
        </>
      )}

      <div className="session-bar">
        <button type="button" className="btn btn-stop" onClick={() => end('stop')}>
          Stop
        </button>
        <button type="button" className="btn btn-gave-way" onClick={() => end('gave-way')}>
          Knee gave way or hurts
        </button>
      </div>
    </section>
  );
}
