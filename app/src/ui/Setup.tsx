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
import { countsReps, doneLying } from '../lib/exercises';
import { isNumericKind } from '../lib/monitor/monitored';
import { usesCamera as kindUsesCamera } from '../lib/monitor/engine';
import { specFor } from '../lib/monitor/registry';
import { distanceText, type CameraView } from '../lib/figure';
import type { AnyGuideKind } from '../lib/guides';
import { legLegend } from '../lib/figure';
import { DEFAULT_PROFILE, createSetupStabilizer, setupProfileFor, type SetupRuleId } from '../lib/setupRules';
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
import { ExerciseHeader } from './v3/ExerciseHeader';
import { LiveShell } from './v3/LiveShell';
import { SessionProgress } from './v3/SessionProgress';
import { liveBanners } from './liveBanners';
import './sessionV2.css';
import './liveV3.css';
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
const SIDE_WORD: Record<Side, string> = { left: 'Left', right: 'Right' };
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
  /** The guide was seen before: one compact "Get ready" card replaces the guide. "Show the steps" opens it. */
  compact?: boolean;
  /** The leg and the camera side that the person chose before. They are the first answers, not a new choice. */
  initialLeg?: Side;
  initialCameraSide?: Side;
  /** Today's session: the place of this exercise. The progress mark shows above the steps. */
  plan?: { index: number; total: number; detail?: string | null };
  /** Today's session: the camera of the exercise before is still on. Setup starts the same source again with no new press. */
  cameraKept?: boolean;
  /** The notices of the app. The shell passes them. Missing means the notices of the build mode. */
  banners?: readonly string[];
  onReady: (done: SetupDone) => void;
  onCancel: () => void;
}

export function Setup({ kind, side, exerciseName, targetFlexion, limit, returnWithinDeg, source, pair, sound, compact = false, initialLeg, initialCameraSide, plan, cameraKept = false, banners = liveBanners(), onReady, onCancel }: Props) {
  // The definition of the exercise sets the rules of the check, the views and the questions (lib/monitor/registry.ts).
  const spec = specFor(kind);
  const usesCamera = kindUsesCamera(kind); // false: the two timers. The app times the hold and never starts the camera.
  const [changing, setChanging] = useState(false); // "Change leg or camera side" opens the full guide again
  const compactNow = compact && !changing;
  const [step, setStep] = useState<'guide' | 'pair' | 'camera'>(compactNow && usesCamera ? 'camera' : 'guide');
  const [showSteps, setShowSteps] = useState(false);
  const profile = setupProfileFor(kind) ?? DEFAULT_PROFILE; // a timer never reaches the camera step, so its profile is not read
  const askLeg = usesCamera && (spec === undefined || spec.view.legs === 'chosen');
  const askCameraSide = usesCamera && (spec === undefined || spec.view.cameraSide === 'operated-leg-near');
  const primaryView: CameraView = spec?.view.angle === 'front' ? 'front' : 'side';
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
  const [leg, setLeg] = useState<Side>(initialLeg ?? side);
  const [cameraSide, setCameraSide] = useState<Side>(initialCameraSide ?? initialLeg ?? side);
  const cameraChosen = useRef(initialCameraSide !== undefined);
  // A leg that differs from the plan and was stored was confirmed when the person chose it.
  const [confirmedOther, setConfirmedOther] = useState(initialLeg !== undefined && initialLeg !== side);
  const baseline = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
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

  // Today's session. A camera that the exercise before left on stops when this exercise needs none.
  // It starts again with no new press when this one needs it too. The source keeps the stream and the model.
  useEffect(() => {
    if (!usesCamera) source.stop();
    else if (compactNow && cameraKept) void startCamera();
  }, []);

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
  const cameraViews: CameraView[] = !usesCamera ? [] : connected ? SIDE_AND_FRONT : primaryView === 'front' ? FRONT_ONLY : SIDE_ONLY;

  const running = camera.kind === 'running';
  const chip = chipFor(live?.rule ?? 'no-pose', profile);
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

  // A timer exercise has one step: the guide and the start button. No camera runs.
  const order: readonly (typeof step)[] = !usesCamera ? ['guide'] : pairUsed ? ['guide', 'pair', 'camera'] : ['guide', 'camera'];
  const labels = { guide: 'Position guide', pair: 'Second camera', camera: 'Camera' } as const;
  const guideProps = {
    kind,
    usesCamera,
    askLeg,
    askCameraSide,
    side,
    leg,
    cameraSide,
    legend,
    targetFlexion,
    limit,
    confirmedOther,
    cameraGuide: cameraViews.length === 0 ? null : cameraGuide,
    returnNotice,
    onLegChange: chooseLeg,
    onCameraSideChange: (value: Side) => {
      cameraChosen.current = true;
      setCameraSide(value);
    },
    onConfirmOther: () => setConfirmedOther(true),
    onOpenPair: pair && usesCamera ? openPair : undefined,
    onNext: () => setStep('camera'),
    onStart: begin,
  };
  // The leg and the camera side were stored. "Change" stops the camera and opens the full guide with the two questions.
  function changeAnswers() {
    source.stop();
    setCamera({ kind: 'idle' });
    setLive(null);
    setChanging(true);
    setStep('guide');
  }
  const answersLine = [askLeg ? `${SIDE_WORD[leg]} leg.` : null, askCameraSide ? `Camera on your ${cameraSide} side.` : null].filter(Boolean).join(' ');
  const getReady = compactNow && (
    <div className="card card-flat stack-s get-ready">
      <h2>Get ready</h2>
      <p>{usesCamera ? answersLine : TIMER_NOTE}</p>
      <div className="actions">
        <button type="button" className="btn" aria-expanded={showSteps} onClick={() => setShowSteps((v) => !v)}>
          {showSteps ? 'Hide the steps' : 'Show the steps'}
        </button>
        {usesCamera && (askLeg || askCameraSide) && (
          <button type="button" className="btn" onClick={changeAnswers}>
            Change leg or camera side
          </button>
        )}
      </div>
      {showSteps && <SetupGuide {...guideProps} stepsOnly />}
    </div>
  );
  const stepList = usesCamera && (
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

  const progress = plan && (
    <>
      <SessionProgress unit="Exercise" total={plan.total} current={plan.index + 1} />
      {plan.detail && <p className="detail">{plan.detail}</p>}
    </>
  );
  const header = (
    <LiveShell.Header>
      <ExerciseHeader eyebrow={`Exercise: ${exerciseName}`} name={usesCamera ? 'Set up the camera' : 'Get ready'} titleId="setup-title" titleRef={titleRef}>
        {progress}
      </ExerciseHeader>
      <button type="button" className="btn" onClick={cancel}>
        Cancel
      </button>
    </LiveShell.Header>
  );

  if (step === 'pair' && pair) {
    return (
      <div className="v2-setup">
        <LiveShell banner={banners}>
          <LiveShell.Panel>
            {stepList}
            <PairHost hideTrack pairing={pair.pairing} view={pair.view} onDone={() => setStep('camera')} onSkip={() => setStep('camera')} />
          </LiveShell.Panel>
          <LiveShell.Actions label="Setup actions">
            <div className="setup-bar">
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
          </LiveShell.Actions>
        </LiveShell>
      </div>
    );
  }

  if (step === 'guide') {
    return (
      <div className="v2-setup">
        <LiveShell banner={banners}>
          {header}
          <LiveShell.Panel>
            {stepList}
            {compactNow ? getReady : <SetupGuide {...guideProps} />}
          </LiveShell.Panel>
          {compactNow && (
            <LiveShell.Actions label="Setup actions">
              <div className="setup-bar">
                <button type="button" className="btn btn-primary btn-lg" onClick={begin}>
                  <Icon name="play" size={20} />
                  Start exercise
                </button>
              </div>
            </LiveShell.Actions>
          )}
        </LiveShell>
      </div>
    );
  }

  return (
    <div className="v2-setup">
      <LiveShell banner={banners}>
        {header}
        {/* The live region carries only the text that the setup check announces. It changes at most every 3 seconds. It comes first in the page. */}
        <p role="status" aria-live="polite" className="visually-hidden">
          {live?.announced}
        </p>
        <LiveShell.Camera label="Camera preview">
          <div className="frame" ref={frameRef}>
            <video ref={videoRef} className={`preview ${mirrorClass(PREVIEW_MIRRORED)}`.trim()} hidden={!running} muted playsInline aria-label="Camera view" />
            {running && <BodyMap ref={map} leg={leg} mirrored={PREVIEW_MIRRORED} labels />}
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
        </LiveShell.Camera>
        <LiveShell.Panel>
          {stepList}
          {running && <StatusLine icon={chip.seen ? 'check' : 'minus'} text={chip.text} />}
          {running && <BodyMapSwitch />}

          {running && (
            <div className="stack-s setup-live">
              <p data-testid="instruction" className="instruction-large">
                {live ? live.text : 'Waiting for the camera.'}
              </p>
              {live?.seconds != null && (
                <p data-testid="countdown" className="countdown">
                  Starting in <span className="num">{live.seconds}</span> {live.seconds === 1 ? 'second' : 'seconds'}.
                </p>
              )}
              {live?.progress != null && <progress className="capture-progress" max={100} value={live.progress} aria-label={CAPTURE_TEXT.progress} />}
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
                {orderedRuleRows(live?.rule ?? 'no-pose', profile).map((row) => {
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
              {cameraStatusText(live?.rule ?? 'no-pose', profile)}
            </p>
          )}

          {getReady}
          <div className="card card-flat stack-s">
            <h2>Before you start</h2>
            <p>The app uses the camera to find your leg. It does not record or send video.</p>
            <p>{CAMERA_PEOPLE_NOTE}</p>
            <p>{beforeYouStart(profile)}</p>
            {connected && <p>The second camera follows your chosen {leg} leg. Keep the phone in front of you.</p>}
          </div>
          {returnNotice}
          {cameraGuide}
        </LiveShell.Panel>
        <LiveShell.Actions label="Setup actions">
          <div className="setup-bar">
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
        </LiveShell.Actions>
      </LiveShell>
    </div>
  );
}
