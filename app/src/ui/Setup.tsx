// Setup (S4). Two steps on one screen.
// 1. The position guide for the chosen exercise (FR28): text from guideFor and two drawings from figureFor.
// 2. The camera. Text first, then the "Start camera" button. The browser prompt follows a press only (NFR9).
//    After the camera starts, the setup check (FR27, src/lib/setupRules.ts) reads each frame.
//    One large line shows the instruction. A list shows each rule with a word. The countdown starts the exercise.
// Source of the copy: research/ux-flow.md sections 6.2, 7 and 8.3.
// T12b: the optional step "Add a second camera (optional)" shows PairHost between the position guide and the camera.
// The shell passes `pair` only when it can pair. Without it, Setup is the single camera flow and shows nothing of a second camera.
// Skip, Back and Cancel stop the pairing. A connected phone stays connected for the camera step and the Session.
// T17: the person first says which leg will exercise and which side of them the camera is on. The protocol side is
// preselected. The answers last for this session only. They never change the protocol or the active phase.
// The camera guide drawing shows the side view. After a phone is connected it also shows the front view.
// V2: the frame holds a step card before the camera runs, a status chip while it runs (A4), the joint labels (A3) and a camera error (A6).
import { Fragment, useEffect, useRef, useState } from 'react';
import type { Side } from '../lib/angle';
import { focusHeading } from './focusHeading';
import { useCameraTop } from '../lib/useCameraTop';
import { countsReps, doneLying } from '../lib/exercises';
import { isNumericKind } from '../lib/monitor/monitored';
import { specFor } from '../lib/monitor/registry';
import { distanceText, type CameraView } from '../lib/figure';
import type { AnyGuideKind } from '../lib/guides';
import { legLegend } from '../lib/figure';
import { createSetupStabilizer, setupProfileFor, type SetupRuleId } from '../lib/setupRules';
import type { Pairing, PairingView } from '../pairing/pairing';
import type { FrameHandler, LandmarkSource, StartProgress } from '../pose/source';
import { BodyMap, BodyMapSwitch, PREVIEW_MIRRORED, mirrorClass, type BodyMapHandle } from './BodyMap';
import { CameraFigure, type Mark } from './GuideFigure';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { PairHost } from './PairHost';
import { SetupGuide } from './SetupGuide';
import { CAMERA_PEOPLE_NOTE, CAPTURE_TEXT, IDLE_TEXT, LEG_TEXT, MODEL_BYTES, TIMER_NOTE, beforeYouStart, cameraStatusText, chipFor, countdownSeconds, jointsSeen, firstSentence, orderedRuleRows, startText } from './setupView';
import { SetupStateCard } from './SetupStateCard';
import { StatusLine } from './StatusLine';
import './sessionV2.css';
import type { Sound } from './sound';

type Camera = { kind: 'idle' } | { kind: 'starting'; progress: StartProgress; slow: boolean } | { kind: 'running' } | { kind: 'error'; message: string };

interface Live {
  rule: SetupRuleId;
  text: string;
  ready: boolean;
  seconds: number | null;
  /** The last text for the live region. It changes only when the setup check announces. */
  announced: string;
  /** The resting angle in whole degrees once the leg held still, or null. */
  resting: number | null;
  /** The hold still progress in whole percent while the check waits for a still leg, or null. */
  progress: number | null;
}

/** What Setup hands to the next screen. */
export interface SetupDone {
  exerciseLeg: Side;
  cameraSide: Side;
  baselineDeg: number | null;
}

/** The camera views that the guide drawing shows. The front view joins the side view when a phone is connected. */
const SIDE_ONLY: CameraView[] = ['side'];
const SIDE_AND_FRONT: CameraView[] = ['side', 'front'];
const FRONT_ONLY: CameraView[] = ['front'];
// The leg raise to the side needs the camera at hip height. The drawing of that exercise shows it (figure.ts).
const cameraCaption = (view: CameraView, kind: AnyGuideKind): string =>
  view === 'side'
    ? `Camera at the side of your chosen leg, at knee height, ${distanceText()} away.`
    : `Camera in front of you, at ${kind === 'leg-raise-side' ? 'hip' : 'knee'} height, ${distanceText()} away.`;
const SLOW_START_MS = 8000;
// The number 6 in the camera drawing matches the sixth note of the guide (see SetupGuide.tsx).
const CAMERA_MARKS: Mark[] = [{ n: 6, at: 'lens', dx: -2.4, dy: 2.4 }];

interface Props {
  kind: AnyGuideKind;
  side: Side;
  exerciseName: string;
  /** The knee angle that the protocol sets as the target for this exercise, in degrees. It sets the end drawing. */
  targetFlexion?: number;
  /** The depth limit that the protocol sets for this exercise, in degrees. Absent means ask the surgeon. */
  limit?: number;
  /** The protocol value for the return of the knee, in degrees from the resting angle. Absent means ask the surgeon. */
  returnWithinDeg?: number;
  source: LandmarkSource;
  /** The pairing of the second camera. Missing means that this app run offers one camera only. */
  pair?: { pairing: Pairing; view: PairingView };
  sound: Sound;
  onReady: (done: SetupDone) => void;
  onCancel: () => void;
}

export function Setup({ kind, side, exerciseName, targetFlexion, limit, returnWithinDeg, source, pair, sound, onReady, onCancel }: Props) {
  const [step, setStep] = useState<'guide' | 'pair' | 'camera'>('guide');
  // The definition of the exercise sets the rules of the check, the views and the questions (lib/monitor/registry.ts).
  const spec = specFor(kind);
  const profile = setupProfileFor(kind); // null: no leg check (the two timers)
  const askLeg = spec === undefined || spec.view.legs === 'chosen';
  const askCameraSide = spec === undefined || spec.view.cameraSide === 'operated-leg-near';
  const primaryView: CameraView = spec?.view.angle === 'front' ? 'front' : 'side';
  const noCameraView = spec?.view.angle === 'none';
  const lying = isNumericKind(kind) ? doneLying(kind) : spec?.posture[0] === 'supine';
  const countsRepsKind = isNumericKind(kind) && countsReps(kind);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const runningStatusRef = useRef<HTMLParagraphElement>(null);
  const pressedStart = useRef(false);
  const [pairUsed, setPairUsed] = useState(false); // the optional step was opened. The step list keeps it.
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
  const frameRef = useRef<HTMLDivElement>(null);
  useCameraTop(frameRef);
  const map = useRef<BodyMapHandle>(null);
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
    if (profile === null) return; // a timer exercise: the camera picture shows and no landmark is checked
    const out = stabilizer({ landmarks, side: leg, cameraSide, aspect: source.aspect(), posture: lying ? 'lying' : 'upright', profile }, timeMs);
    // svg attributes only, no React state. U1: the angle text shows only when the check shows the needed joints as seen. Otherwise it is empty.
    map.current?.update(landmarks, timeMs, source.aspect(), jointsSeen(out.rule, profile) ? undefined : null);
    if (out.announce !== null) announced.current = out.announce;
    baseline.current = out.baselineDeg;
    const next: Live = {
      rule: out.rule,
      text: out.text,
      ready: out.ready,
      seconds: countdownSeconds(out.countdownLeftMs),
      announced: announced.current,
      resting: out.baselineDeg === null ? null : Math.round(out.baselineDeg),
      progress: out.stillProgress === null ? null : Math.round(out.stillProgress * 20) * 5,
    };
    const key = JSON.stringify(next);
    if (key === lastKey.current) return;
    lastKey.current = key;
    setLive(next);
  };

  async function startCamera() {
    sound.unlock(); // inside the press, so the browser allows audio later
    pressedStart.current = true;
    setCamera({ kind: 'starting', progress: { step: 'camera' }, slow: false });
    const result = await source.start(onFrame, videoRef.current, (progress) =>
      setCamera((c) => (c.kind === 'starting' ? { ...c, progress } : c)),
    );
    setCamera(result.ok ? { kind: 'running' } : { kind: 'error', message: result.error.message });
  }

  // U5: the Start camera button goes when the camera starts. The focus moves to the status of the camera, and then to the line that says what the camera sees.
  useEffect(() => {
    if (!pressedStart.current) return;
    if (camera.kind === 'starting') statusRef.current?.focus({ preventScroll: true });
    else if (camera.kind === 'running') {
      runningStatusRef.current?.focus({ preventScroll: true });
      pressedStart.current = false;
    }
  }, [camera.kind]);

  // AC6-01: a new step opens at the top of the page, with the focus on the heading. The pair step has its own heading (PairHost).
  useEffect(() => {
    if (step !== 'pair') focusHeading(titleRef.current);
  }, [step]);

  // After 8 seconds on one start step, one plain sentence tells the person to wait.
  const startStep = camera.kind === 'starting' ? camera.progress.step : null;
  useEffect(() => {
    if (!startStep) return;
    const timer = setTimeout(() => setCamera((c) => (c.kind === 'starting' ? { ...c, slow: true } : c)), SLOW_START_MS);
    return () => clearTimeout(timer);
  }, [startStep]);

  // The pairing is stopped on every way out of this step. A connected phone stays on for the camera step and the Session.
  const stopPairing = () => {
    if (pair && pair.view.status !== 'idle') pair.pairing.close();
  };
  function openPair() {
    if (!pair) return;
    if (pair.view.status !== 'idle') pair.pairing.reset(); // an old closed or skipped link starts again
    setPairUsed(true);
    setStep('pair');
  }
  function cancel() {
    stopPairing();
    onCancel();
  }
  const connected = pair?.view.status === 'connected';
  const cameraViews: CameraView[] = noCameraView ? [] : connected ? SIDE_AND_FRONT : primaryView === 'front' ? FRONT_ONLY : SIDE_ONLY;

  const running = camera.kind === 'running';
  const chip = chipFor(live?.rule ?? 'no-pose', profile ?? undefined);
  const fixLine = firstSentence(camera.kind === 'error' ? camera.message : '');
  const needsReturnValue = countsRepsKind && returnWithinDeg === undefined;
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
  const legend = legLegend(leg, side);
  const cameraGuide = cameraViews.map((view) => (
    <figure key={view} className="figure-card camera-guide">
      <CameraFigure view={view} kind={kind} legend={legend} marks={step === 'guide' ? CAMERA_MARKS : undefined} description={cameraCaption(view, kind)} />
      <figcaption>{cameraCaption(view, kind)}</figcaption>
    </figure>
  ));

  const order: readonly (typeof step)[] = pairUsed ? ['guide', 'pair', 'camera'] : ['guide', 'camera'];
  const labels = { guide: 'Position guide', pair: 'Second camera', camera: 'Camera' } as const;
  const stepList = (
    <ol className="steps" aria-label="Steps">
      {order.map((id, i) => {
        const here = order.indexOf(step);
        return (
          <Fragment key={id}>
            {i > 0 && <li className="step-line" aria-hidden="true" />}
            <li className={i < here ? 'step step-done' : 'step'} aria-current={id === step ? 'step' : undefined}>
              <span className="step-dot">{i < here ? <Icon name="check" size={14} /> : i + 1}</span>
              {labels[id]}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );

  if (step === 'pair' && pair) {
    return (
      <div className="stack">
        {stepList}
        <PairHost hideTrack pairing={pair.pairing} view={pair.view} onDone={() => setStep('camera')} onSkip={() => setStep('camera')} />
        <div className="actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              stopPairing();
              setStep('guide');
            }}
          >
            <Icon name="arrow-left" size={18} />
            Back
          </button>
          <button type="button" className="btn" onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="setup-title" className="v2-setup">
      <header className="page-head">
        <div className="stack-s">
          <h1 id="setup-title" tabIndex={-1} ref={titleRef}>
            Set up the camera
          </h1>
          <p className="detail">Exercise: {exerciseName}</p>
        </div>
        <button type="button" className="btn" onClick={cancel}>
          Cancel
        </button>
      </header>

      {stepList}

      {step === 'guide' ? (
        <SetupGuide
          kind={kind}
          askLeg={askLeg}
          askCameraSide={askCameraSide}
          side={side}
          leg={leg}
          cameraSide={cameraSide}
          legend={legend}
          targetFlexion={targetFlexion}
          limit={limit}
          confirmedOther={confirmedOther}
          cameraGuide={cameraViews.length === 0 ? null : cameraGuide}
          returnNotice={returnNotice}
          onLegChange={chooseLeg}
          onCameraSideChange={(value) => {
            cameraChosen.current = true;
            setCameraSide(value);
          }}
          onConfirmOther={() => setConfirmedOther(true)}
          onOpenPair={pair ? openPair : undefined}
          onNext={() => setStep('camera')}
        />
      ) : (
        <div className="setup-grid">
          <div className="stack">
            {/* The live region carries only the text that the setup check announces. It changes at most every 3 seconds. */}
            <p role="status" aria-live="polite" className="visually-hidden">
              {live?.announced}
            </p>

            <div className="frame" ref={frameRef}>
              <video ref={videoRef} className={`preview ${mirrorClass(PREVIEW_MIRRORED)}`.trim()} hidden={!running} muted playsInline aria-label="Camera view" />
              {running && profile !== null && <BodyMap ref={map} leg={leg} mirrored={PREVIEW_MIRRORED} labels />}
              {running && profile !== null && <StatusLine icon={chip.seen ? 'check' : 'minus'} text={chip.text} />}
              {camera.kind === 'idle' && <SetupStateCard icon="camera" line={IDLE_TEXT.line} help={IDLE_TEXT.help} />}
              {camera.kind === 'starting' && (
                <SetupStateCard
                  className="start-status"
                  role="status"
                  focusRef={statusRef}
                  icon="camera"
                  line={camera.progress.step === 'camera' ? startText.camera : startText.model(camera.progress.loadedBytes)}
                  help={camera.progress.step === 'model' ? startText.cameraOn : undefined}
                >
                  {camera.progress.step === 'model' && camera.progress.loadedBytes > 0 && (
                    <progress className="load-progress" max={MODEL_BYTES} value={camera.progress.loadedBytes} aria-label={startText.progress} />
                  )}
                  {camera.slow && <p className="detail">{startText.slow}</p>}
                </SetupStateCard>
              )}
              {camera.kind === 'error' && (
                <Notice role="alert" icon="video-off" title={fixLine.title}>
                  {fixLine.rest !== '' && <p> {fixLine.rest}</p>}
                </Notice>
              )}
            </div>
            {running && profile !== null && <BodyMapSwitch />}

            {running && profile === null && (
              <div className="stack-s setup-live">
                <p data-testid="instruction" className="instruction-large">
                  {TIMER_NOTE}
                </p>
              </div>
            )}
            {running && profile !== null && (
              <div className="stack-s setup-live">
                <p data-testid="instruction" className="instruction-large">
                  {live ? live.text : 'Waiting for the camera.'}
                </p>
                {live?.seconds != null && (
                  <p data-testid="countdown" className="countdown">
                    Starting in <span className="num">{live.seconds}</span> {live.seconds === 1 ? 'second' : 'seconds'}.
                  </p>
                )}
                {live?.progress != null && (
                  <progress className="capture-progress" max={100} value={live.progress} aria-label={CAPTURE_TEXT.progress} />
                )}
                {live?.resting != null && countsRepsKind && (
                  <p data-testid="resting" className="detail">
                    {LEG_TEXT.resting(live.resting)}
                  </p>
                )}
                {live?.resting == null && !needsReturnValue && countsRepsKind && (
                  <Notice icon="ruler">
                    <p>{CAPTURE_TEXT.setupNoRest}</p>
                    <p className="detail">{CAPTURE_TEXT.setupNoRestDetail}</p>
                  </Notice>
                )}
                <ul className="rule-list" aria-label="Camera check">
                  {orderedRuleRows(live?.rule ?? 'no-pose', profile ?? undefined).map((row) => {
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

            {running && (
              <p className="start-status visually-hidden" role="status" tabIndex={-1} ref={runningStatusRef}>
                {profile === null ? TIMER_NOTE : cameraStatusText(live?.rule ?? 'no-pose', profile)}
              </p>
            )}
          </div>

          <aside className="stack">
            <div className="card card-flat stack-s">
              <h2>Before you start</h2>
              <p>
                {profile === null ? 'The camera picture shows while you exercise.' : 'The app uses the camera to find your leg.'} It does not record or send video.
              </p>
              <p>{CAMERA_PEOPLE_NOTE}</p>
              <p>{beforeYouStart(profile)}</p>
              {connected && <p>The second camera follows your chosen {leg} leg. Keep the phone in front of you.</p>}
            </div>
            {returnNotice}
            {cameraGuide}
          </aside>

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
              <button type="button" className="btn btn-primary btn-lg btn-swap" disabled={camera.kind === 'starting'} onClick={() => void startCamera()}>
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
