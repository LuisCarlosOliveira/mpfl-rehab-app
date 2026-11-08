// Setup (S4). Two steps on one screen.
// 1. The position guide for the chosen exercise (FR28): text from guideFor and two drawings from figureFor.
// 2. The camera. Text first, then the "Start camera" button. The browser prompt follows a press only (NFR9).
//    After the camera starts, the setup check (FR27, src/lib/setupRules.ts) reads each frame.
//    One large line shows the instruction. A list shows each rule with a word. The countdown starts the exercise.
// Source of the copy: research/ux-flow.md sections 6.2, 7 and 8.3.
// T12b: the optional "Add a second device" step is a hidden slot (`second-device-slot`) after the live check. It is not built yet.
// T17: the person first says which leg will exercise and which side of them the camera is on. The protocol side is
// preselected. The answers last for this session only. They never change the protocol or the active phase.
// The camera guide drawing shows the side view only. Nothing in the protocol or in src/lib/views.ts decides yet
// that a second (front) view applies. When it does, add 'front' to CAMERA_VIEWS.
import { useEffect, useRef, useState } from 'react';
import type { Side } from '../lib/angle';
import { countsReps } from '../lib/exercises';
import { distanceText, type CameraView } from '../lib/figure';
import { guideFor, type GuideKind } from '../lib/guides';
import { createSetupStabilizer, type SetupRuleId } from '../lib/setupRules';
import type { FrameHandler, LandmarkSource } from '../pose/source';
import { ASK_SURGEON_TEXT } from './askSurgeon';
import { CameraFigure, GuideFigure } from './GuideFigure';
import { Icon, type IconName } from './Icon';
import { Notice } from './Notice';
import { LEG_TEXT, countdownSeconds, ruleRows } from './setupView';
import type { Sound } from './sound';

type Camera = { kind: 'idle' } | { kind: 'starting' } | { kind: 'running' } | { kind: 'error'; message: string };

interface Live {
  rule: SetupRuleId;
  text: string;
  ready: boolean;
  seconds: number | null;
  /** The last text for the live region. It changes only when the setup check announces. */
  announced: string;
  /** The resting angle in whole degrees once the leg held still, or null. */
  resting: number | null;
}

/** What Setup hands to the next screen. */
export interface SetupDone {
  exerciseLeg: Side;
  cameraSide: Side;
  baselineDeg: number | null;
}

/** The camera views that the guide drawing shows. Only the side view applies until a second view is decided. */
const CAMERA_VIEWS: CameraView[] = ['side'];
const CAMERA_CAPTION: Record<CameraView, string> = {
  side: `Camera at the side of your chosen leg, at knee height, ${distanceText()} away.`,
  front: `Camera in front of you, at knee height, ${distanceText()} away.`,
};
const SIDES: Side[] = ['left', 'right'];
const SIDE_WORD: Record<Side, string> = { left: 'Left', right: 'Right' };

interface Props {
  kind: GuideKind;
  side: Side;
  exerciseName: string;
  /** The knee angle that the protocol sets as the target for this exercise, in degrees. It sets the end drawing. */
  targetFlexion?: number;
  /** The depth limit that the protocol sets for this exercise, in degrees. Absent means ask the surgeon. */
  limit?: number;
  /** The protocol value for the return of the knee, in degrees from the resting angle. Absent means ask the surgeon. */
  returnWithinDeg?: number;
  source: LandmarkSource;
  sound: Sound;
  onReady: (done: SetupDone) => void;
  onCancel: () => void;
}

export function Setup({ kind, side, exerciseName, targetFlexion, limit, returnWithinDeg, source, sound, onReady, onCancel }: Props) {
  const [step, setStep] = useState<'guide' | 'camera'>('guide');
  const [camera, setCamera] = useState<Camera>({ kind: 'idle' });
  const [live, setLive] = useState<Live | null>(null);
  const [stabilizer] = useState(() => createSetupStabilizer());
  // `side` is the leg of the protocol. `leg` is the leg that the person chose. Only `leg` reaches the next screen.
  const [leg, setLeg] = useState<Side>(side);
  const [cameraSide, setCameraSide] = useState<Side>(side);
  const cameraChosen = useRef(false);
  const [confirmedOther, setConfirmedOther] = useState(false);
  const baseline = useRef<number | null>(null);
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
    onReady({ exerciseLeg: leg, cameraSide, baselineDeg: baseline.current });
  }

  // The countdown ended: start the exercise.
  useEffect(() => {
    if (live?.ready) begin();
  }, [live?.ready]);

  // Runs at frame rate. State changes only when the text, the list or the whole seconds change.
  const onFrame: FrameHandler = (landmarks, timeMs) => {
    const out = stabilizer({ landmarks, side: leg, cameraSide, aspect: source.aspect() }, timeMs);
    if (out.announce !== null) announced.current = out.announce;
    baseline.current = out.baselineDeg;
    const next: Live = {
      rule: out.rule,
      text: out.text,
      ready: out.ready,
      seconds: countdownSeconds(out.countdownLeftMs),
      announced: announced.current,
      resting: out.baselineDeg === null ? null : Math.round(out.baselineDeg),
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
  const otherLegChosen = leg !== side;
  const needsReturnValue = countsReps(kind) && returnWithinDeg === undefined;
  const chooseLeg = (value: Side) => {
    setLeg(value);
    setConfirmedOther(false);
    if (!cameraChosen.current) setCameraSide(value);
  };
  const returnNotice = needsReturnValue && (
    <Notice icon="ruler">
      <p>{LEG_TEXT.noReturnValue}</p>
      <p className="detail">{LEG_TEXT.noReturnValueDetail}</p>
    </Notice>
  );
  const guide = guideFor(kind);
  const notes: { icon: IconName; label: string; text: string }[] = [
    { icon: 'bed-single', label: 'Start position', text: guide.startPosition },
    { icon: 'camera', label: 'Leg and camera', text: guide.legFacingCamera },
    { icon: 'hand', label: 'Hands and support', text: guide.handsAndSupport },
    { icon: 'move-horizontal', label: 'Range', text: guide.range },
    { icon: 'clock', label: 'Speed', text: guide.speed },
    { icon: 'video-off', label: 'What the camera must see', text: guide.cameraMustSee },
  ];
  const cameraGuide = CAMERA_VIEWS.map((view) => (
    <figure key={view} className="figure-card camera-guide">
      <CameraFigure view={view} kind={kind} description={CAMERA_CAPTION[view]} />
      <figcaption>{CAMERA_CAPTION[view]}</figcaption>
    </figure>
  ));

  return (
    <section aria-labelledby="setup-title">
      <header className="page-head">
        <div className="stack-s">
          <h1 id="setup-title" tabIndex={-1}>
            Set up the camera
          </h1>
          <p className="detail">Exercise: {exerciseName}</p>
        </div>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </header>

      <ol className="steps" aria-label="Steps">
        <li className={step === 'guide' ? 'step' : 'step step-done'} aria-current={step === 'guide' ? 'step' : undefined}>
          <span className="step-dot">{step === 'guide' ? '1' : <Icon name="check" size={14} />}</span>
          Position guide
        </li>
        <li className="step-line" aria-hidden="true" />
        <li className="step" aria-current={step === 'camera' ? 'step' : undefined}>
          <span className="step-dot">2</span>
          Camera
        </li>
      </ol>

      {step === 'guide' ? (
        <div className="stack">
          <fieldset className="choices">
            <legend>{LEG_TEXT.legQuestion}</legend>
            <div className="options">
              {SIDES.map((value) => (
                <label key={value} className="option">
                  <input type="radio" name="exercise-leg" value={value} checked={leg === value} onChange={() => chooseLeg(value)} />
                  <span>
                    {SIDE_WORD[value]}
                    {value === side && <span className="option-hint">{LEG_TEXT.planLeg}</span>}
                  </span>
                </label>
              ))}
            </div>
            {otherLegChosen && (
              <div className="stack-s leg-note" id="other-leg-note">
                <Notice icon="info">
                  <p>{confirmedOther ? 'The app follows the leg that you chose. It does not change your plan.' : LEG_TEXT.otherLegConfirm}</p>
                </Notice>
                {!confirmedOther && (
                  <button type="button" className="btn" onClick={() => setConfirmedOther(true)}>
                    {LEG_TEXT.continueButton}
                  </button>
                )}
              </div>
            )}
          </fieldset>
          <fieldset className="choices">
            <legend>{LEG_TEXT.cameraQuestion}</legend>
            <div className="options">
              {SIDES.map((value) => (
                <label key={value} className="option">
                  <input
                    type="radio"
                    name="camera-side"
                    value={value}
                    checked={cameraSide === value}
                    onChange={() => {
                      cameraChosen.current = true;
                      setCameraSide(value);
                    }}
                  />
                  <span>{SIDE_WORD[value]}</span>
                </label>
              ))}
            </div>
            <p className="detail">{LEG_TEXT.cameraHint}</p>
            {cameraSide !== leg && (
              <Notice icon="info">
                <p>{LEG_TEXT.farLeg}</p>
              </Notice>
            )}
          </fieldset>
          <h2>Position guide</h2>
          <div className="guide-figures">
            <GuideFigure kind={kind} frame="start" side={leg} kneeDeg={targetFlexion} description={`Start position. ${guide.startPosition} ${guide.legFacingCamera}`} />
            <GuideFigure kind={kind} frame="end" side={leg} kneeDeg={targetFlexion} description={`End position. ${guide.range}`} />
            {cameraGuide}
          </div>
          <div className="stack-s">
            <p className="detail">The drawing shows the movement. It is not your limit.</p>
            <Notice icon="ruler">
              <p>{limit === undefined ? `Your limit: ${ASK_SURGEON_TEXT}.` : `Your limit is ${limit} degrees. Your care team sets it.`}</p>
            </Notice>
          </div>
          {returnNotice}
          <dl className="guide-notes">
            {notes.map((n) => (
              <div key={n.label} className="guide-note">
                <dt>
                  <Icon name={n.icon} size={22} />
                  {n.label}
                </dt>
                <dd>{n.text}</dd>
              </div>
            ))}
          </dl>
          <div className="action-bar">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={otherLegChosen && !confirmedOther}
              aria-describedby={otherLegChosen && !confirmedOther ? 'other-leg-note' : undefined}
              onClick={() => setStep('camera')}
            >
              Next: set up the camera
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="setup-grid">
          <div className="stack">
            <div className="frame">
              <video ref={videoRef} className="preview" hidden={!running} muted playsInline aria-label="Camera view" />
              {!running && (
                <div className="frame-empty">
                  <Icon name="camera" size={44} />
                  <p>Your camera view shows here.</p>
                </div>
              )}
            </div>

            {running && (
              <div className="stack-s">
                <p data-testid="instruction" className="instruction-large">
                  {live ? live.text : 'Waiting for the camera.'}
                </p>
                {live?.seconds != null && (
                  <p data-testid="countdown" className="countdown">
                    Starting in <span className="num">{live.seconds}</span> {live.seconds === 1 ? 'second' : 'seconds'}.
                  </p>
                )}
                {live?.resting != null && countsReps(kind) && (
                  <p data-testid="resting" className="detail">
                    {LEG_TEXT.resting(live.resting)}
                  </p>
                )}
                <ul className="rule-list" aria-label="Camera check">
                  {ruleRows(live?.rule ?? 'no-pose').map((row) => {
                    const seen = row.word === 'seen';
                    return (
                      <li key={row.label} className={seen ? 'rule rule-seen' : 'rule rule-missing'}>
                        <Icon name={seen ? 'check' : 'minus'} size={16} />
                        <span>
                          {row.label}
                          <span className="visually-hidden">: </span>
                        </span>
                        <span className="rule-word">{row.word}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* The live region carries only the text that the setup check announces. It changes at most every 3 seconds. */}
            <p role="status" aria-live="polite" className="visually-hidden">
              {live?.announced}
            </p>

            {camera.kind === 'error' && (
              <Notice role="alert" icon="triangle-alert">
                <p>{camera.message}</p>
              </Notice>
            )}
          </div>

          <aside className="stack">
            <div className="card card-flat stack-s">
              <h2>Before you start</h2>
              <p>
                The app uses the camera to find your leg. It does not record or send video. Other people in the view are also
                seen by the camera.
              </p>
              <p>
                Put the camera at the side that you chose. Step back until your whole chosen leg shows. Hold still for 2 seconds.
              </p>
            </div>
            {returnNotice}
            {cameraGuide}
          </aside>

          {/* T12b: the optional "Add a second device" step goes into this container. It stays hidden until the decision. */}
          <section className="second-device-slot" data-slot="second-device" hidden />

          <div className="action-bar setup-bar">
            {running ? (
              <>
                <button type="button" className="btn btn-primary btn-lg" onClick={begin}>
                  <Icon name="play" size={20} />
                  Start exercise
                </button>
                <button type="button" className="btn btn-lg" onClick={() => stabilizer.moreTime()}>
                  More time
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-lg" disabled={camera.kind === 'starting'} onClick={() => void startCamera()}>
                <Icon name={camera.kind === 'error' ? 'refresh-cw' : 'camera'} size={20} />
                {camera.kind === 'error' ? 'Try again' : camera.kind === 'starting' ? 'Starting the camera' : 'Start camera'}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
