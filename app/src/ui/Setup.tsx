// Setup (S4). Two steps on one screen.
// 1. The position guide for the chosen exercise (FR28): text from guideFor and two drawings from figureFor.
// 2. The camera. Text first, then the "Start camera" button. The browser prompt follows a press only (NFR9).
//    After the camera starts, the setup check (FR27, src/lib/setupRules.ts) reads each frame.
//    One large line shows the instruction. A list shows each rule with a word. The countdown starts the exercise.
// Source of the copy: research/ux-flow.md sections 6.2, 7 and 8.3.
// T12b: the optional "Add a second device" step is a hidden slot after the live check. It is not built yet.
import { useEffect, useRef, useState } from 'react';
import type { Side } from '../lib/angle';
import { guideFor, type GuideKind } from '../lib/guides';
import { createSetupStabilizer, type SetupRuleId } from '../lib/setupRules';
import type { FrameHandler, LandmarkSource } from '../pose/source';
import { ASK_SURGEON_TEXT } from './askSurgeon';
import { GuideFigure } from './GuideFigure';
import { countdownSeconds, ruleRows } from './setupView';
import type { Sound } from './sound';

type Camera = { kind: 'idle' } | { kind: 'starting' } | { kind: 'running' } | { kind: 'error'; message: string };

interface Live {
  rule: SetupRuleId;
  text: string;
  ready: boolean;
  seconds: number | null;
  /** The last text for the live region. It changes only when the setup check announces. */
  announced: string;
}

interface Props {
  kind: GuideKind;
  side: Side;
  exerciseName: string;
  /** The depth limit that the protocol sets for this exercise, in degrees. Absent means ask the surgeon. */
  limit?: number;
  source: LandmarkSource;
  sound: Sound;
  onReady: () => void;
  onCancel: () => void;
}

export function Setup({ kind, side, exerciseName, limit, source, sound, onReady, onCancel }: Props) {
  const [step, setStep] = useState<'guide' | 'camera'>('guide');
  const [camera, setCamera] = useState<Camera>({ kind: 'idle' });
  const [live, setLive] = useState<Live | null>(null);
  const [stabilizer] = useState(() => createSetupStabilizer());
  const videoRef = useRef<HTMLVideoElement>(null);
  const handedOff = useRef(false);
  const lastKey = useRef('');
  const announced = useRef('');

  // Every exit stops the camera, except the step to Session. Session keeps the stream.
  useEffect(
    () => () => {
      if (!handedOff.current) source.stop();
    },
    [source],
  );

  function begin() {
    if (handedOff.current) return;
    handedOff.current = true;
    sound.unlock();
    onReady();
  }

  // The countdown ended: start the exercise.
  useEffect(() => {
    if (live?.ready) begin();
  }, [live?.ready]);

  // Runs at frame rate. State changes only when the text, the list or the whole seconds change.
  const onFrame: FrameHandler = (landmarks, timeMs) => {
    const out = stabilizer({ landmarks, side, aspect: source.aspect() }, timeMs);
    if (out.announce !== null) announced.current = out.announce;
    const next: Live = {
      rule: out.rule,
      text: out.text,
      ready: out.ready,
      seconds: countdownSeconds(out.countdownLeftMs),
      announced: announced.current,
    };
    const key = JSON.stringify(next);
    if (key === lastKey.current) return;
    lastKey.current = key;
    setLive(next);
  };

  async function startCamera() {
    sound.unlock(); // inside the press, so the browser allows audio later
    setCamera({ kind: 'starting' });
    const result = await source.start(onFrame, videoRef.current);
    setCamera(result.ok ? { kind: 'running' } : { kind: 'error', message: result.error.message });
  }

  const running = camera.kind === 'running';
  const guide = guideFor(kind);

  return (
    <section aria-labelledby="setup-title">
      <h1 id="setup-title" tabIndex={-1}>
        Set up the camera
      </h1>
      <p className="detail">Exercise: {exerciseName}</p>

      {step === 'guide' ? (
        <>
          <h2>Position guide</h2>
          <div className="guide-figures">
            <GuideFigure kind={kind} frame="start" side={side} description={`Start position. ${guide.startPosition} ${guide.legFacingCamera}`} />
            <GuideFigure kind={kind} frame="end" side={side} description={`End position. ${guide.range}`} />
          </div>
          <p className="detail">The drawing shows the movement. It is not your limit.</p>
          <p>{limit === undefined ? `Your limit: ${ASK_SURGEON_TEXT}.` : `Your limit is ${limit} degrees. Your care team sets it.`}</p>
          <dl className="facts">
            <dt>Start position</dt>
            <dd>{guide.startPosition}</dd>
            <dt>Leg and camera</dt>
            <dd>{guide.legFacingCamera}</dd>
            <dt>Hands and support</dt>
            <dd>{guide.handsAndSupport}</dd>
            <dt>Range</dt>
            <dd>{guide.range}</dd>
            <dt>Speed</dt>
            <dd>{guide.speed}</dd>
            <dt>What the camera must see</dt>
            <dd>{guide.cameraMustSee}</dd>
          </dl>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={() => setStep('camera')}>
              Next: set up the camera
            </button>
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            The app uses the camera to find your leg. It does not record or send video. Other people in the view are also
            seen by the camera.
          </p>
          <p>
            Put the camera at the side of your operated leg. Step back until your whole leg shows. Hold still for 2 seconds.
          </p>

          <video ref={videoRef} className="preview" hidden={!running} muted playsInline aria-label="Camera view" />

          {running && (
            <>
              <p data-testid="instruction" className="instruction-large">
                {live ? live.text : 'Waiting for the camera.'}
              </p>
              {live?.seconds != null && (
                <p data-testid="countdown" className="countdown">
                  Starting in <span className="num">{live.seconds}</span> {live.seconds === 1 ? 'second' : 'seconds'}.
                </p>
              )}
              <ul className="rule-list" aria-label="Camera check">
                {ruleRows(live?.rule ?? 'no-pose').map((row) => (
                  <li key={row.label} className={row.word === 'seen' ? 'rule rule-seen' : 'rule rule-missing'}>
                    {row.label}: {row.word}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* The live region carries only the text that the setup check announces. It changes at most every 3 seconds. */}
          <p role="status" aria-live="polite" className="visually-hidden">
            {live?.announced}
          </p>

          {camera.kind === 'error' && (
            <div className="attention" role="alert">
              <p>{camera.message}</p>
            </div>
          )}

          {/* T12b: the optional "Add a second device" step goes here. It stays hidden until the decision. */}

          <div className="actions">
            {running ? (
              <>
                <button type="button" className="btn btn-primary" onClick={begin}>
                  Start exercise
                </button>
                <button type="button" className="btn" onClick={() => stabilizer.moreTime()}>
                  More time
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" disabled={camera.kind === 'starting'} onClick={() => void startCamera()}>
                {camera.kind === 'error' ? 'Try again' : camera.kind === 'starting' ? 'Starting the camera' : 'Start camera'}
              </button>
            )}
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      )}
    </section>
  );
}
