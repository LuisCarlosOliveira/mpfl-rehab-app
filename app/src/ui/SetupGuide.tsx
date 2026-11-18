// Setup step 1: the position guide (FR28) and the two questions of T17 (which leg, which camera side).
// Setup.tsx owns the state. This component only shows it and calls back.
import type { ReactNode } from 'react';
import type { Side } from '../lib/angle';
import type { LegLegend } from '../lib/figure';
import { guideFor, type AnyGuideKind } from '../lib/guides';
import { PROPOSAL_NOTE, SOURCE_NAMES, TECHNIQUE_NOTE, techniqueFor } from '../lib/technique';
import { isNumericKind } from '../lib/monitor/monitored';
import { ASK_SURGEON_TEXT } from './askSurgeon';
import { GuideFigure, type Mark } from './GuideFigure';
import { Icon, type IconName } from './Icon';
import { Notice } from './Notice';
import { Segmented } from './Segmented';
import { StepGuide } from './StepGuide';
import { LEG_TEXT, TIMER_NOTE } from './setupView';
import { LiveShell } from './v3/LiveShell';
import './flowV2.css';

const SECOND_CAMERA_BUTTON = 'Add a second camera (optional)';
const SECOND_CAMERA_TEXT = 'A phone can be a second camera in front of you. It sends body points only, no video.';
// The numbers in the drawings match the six notes of the guide: 1 start position, 2 leg and camera, 3 hands, 4 range, 5 speed, 6 what the camera must see.
const START_MARKS: Mark[] = [{ n: 1, at: 'hip', dx: 1, dy: -2.6 }, { n: 2, at: 'knee', dx: -0.5, dy: -2.8 }, { n: 3, at: 'hand', dx: 0, dy: -2.6 }];
const END_MARKS: Mark[] = [{ n: 4, at: 'knee', dx: 3, dy: -3 }, { n: 5, at: 'arrow', dx: 0, dy: -2.6 }];
// A timer exercise has four notes (no camera notes), so its marks have other numbers.
const TIMER_START_MARKS: Mark[] = [{ n: 1, at: 'hip', dx: 1, dy: -2.6 }, { n: 2, at: 'hand', dx: 0, dy: -2.6 }];
const TIMER_END_MARKS: Mark[] = [{ n: 3, at: 'knee', dx: 3, dy: -3 }, { n: 4, at: 'arrow', dx: 0, dy: -2.6 }];
const SIDES: Side[] = ['left', 'right'];
const SIDE_WORD: Record<Side, string> = { left: 'Left', right: 'Right' };

interface Props {
  kind: AnyGuideKind;
  /** False for an exercise that the app only times (lib/monitor usesCamera). The guide then has no camera note and the button starts the exercise. */
  usesCamera: boolean;
  /** False when the definition follows no chosen leg (the gluteal set). */
  askLeg: boolean;
  /** False when the camera side does not change the check (the front view and the exercises with no camera view). */
  askCameraSide: boolean;
  /** The leg of the protocol. */
  side: Side;
  /** The leg that the person chose. */
  leg: Side;
  cameraSide: Side;
  legend: LegLegend;
  targetFlexion?: number;
  limit?: number;
  confirmedOther: boolean;
  /** The drawings of the camera, built by Setup. The camera step shows the same ones. */
  cameraGuide: ReactNode;
  returnNotice: ReactNode;
  onLegChange: (value: Side) => void;
  onCameraSideChange: (value: Side) => void;
  onConfirmOther: () => void;
  /** Absent means that this app run offers one camera only. */
  onOpenPair?: () => void;
  onNext: () => void;
  /** Timer exercises only: the button starts the exercise. */
  onStart: () => void;
  /** The six steps with their drawings and nothing else. The compact Get ready card opens them with "Show the steps". */
  stepsOnly?: boolean;
}

export function SetupGuide({
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
  cameraGuide,
  returnNotice,
  onLegChange,
  onCameraSideChange,
  onConfirmOther,
  onOpenPair,
  onNext,
  onStart,
  stepsOnly = false,
}: Props) {
  const otherLegChosen = askLeg && leg !== side;
  const techniqueLines = techniqueFor(kind);
  const proposal = techniqueLines.some((l) => l.proposal);
  const guide = guideFor(kind, legend);
  const notes: { icon: IconName; label: string; text: string }[] = [
    { icon: 'bed-single', label: 'Start position', text: guide.startPosition },
    ...(usesCamera ? [{ icon: 'camera' as const, label: 'Leg and camera', text: guide.legFacingCamera }] : []),
    { icon: 'hand', label: 'Hands and support', text: guide.handsAndSupport },
    { icon: 'move-horizontal', label: 'Range', text: guide.range },
    { icon: 'clock', label: 'Speed', text: guide.speed },
    ...(usesCamera ? [{ icon: 'video-off' as const, label: 'What the camera must see', text: guide.cameraMustSee }] : []),
  ];
  const startFigure = (
    <GuideFigure
      kind={kind}
      frame="start"
      side={leg}
      legend={legend}
      kneeDeg={targetFlexion}
      marks={usesCamera ? START_MARKS : TIMER_START_MARKS}
      description={usesCamera ? `Start position. ${guide.startPosition} ${guide.legFacingCamera}` : `Start position. ${guide.startPosition}`}
    />
  );
  const endFigure = <GuideFigure kind={kind} frame="end" side={leg} legend={legend} kneeDeg={targetFlexion} marks={usesCamera ? END_MARKS : TIMER_END_MARKS} description={`End position. ${guide.range}`} />;
  // With a camera: steps 1 to 3 name the start drawing, steps 4 and 5 the end drawing, step 6 the camera drawing. A timer has steps 1 and 2, then 3 and 4.
  const startSteps = usesCamera ? 3 : 2;
  const endSteps = usesCamera ? 5 : 4;
  const figureFor = (step: number) => (
    <>
      {step <= startSteps ? startFigure : step <= endSteps || cameraGuide === null ? endFigure : <div className="guide-camera">{cameraGuide}</div>}
      <p className="detail">The drawing shows the movement. It is not your limit.</p>
    </>
  );
  if (stepsOnly) return <StepGuide steps={notes} figure={figureFor} />;
  return (
    <div className="stack v2-flow v2-setup">
      {askLeg && (
      <Segmented
        name="exercise-leg"
        legend={LEG_TEXT.legQuestion}
        value={leg}
        options={SIDES.map((value) => ({ value, label: SIDE_WORD[value], hint: value === side ? LEG_TEXT.planLeg : undefined }))}
        onChange={onLegChange}
      >
        {otherLegChosen && (
          <div className="stack-s leg-note" id="other-leg-note">
            <Notice icon="info">
              <p>{confirmedOther ? 'The app follows the leg that you chose. It does not change your plan.' : LEG_TEXT.otherLegConfirm}</p>
            </Notice>
            {!confirmedOther && (
              <button type="button" className="btn" onClick={onConfirmOther}>
                {LEG_TEXT.continueButton}
              </button>
            )}
          </div>
        )}
      </Segmented>
      )}
      {askCameraSide && (
      <Segmented name="camera-side" legend={LEG_TEXT.cameraQuestion} value={cameraSide} options={SIDES.map((value) => ({ value, label: SIDE_WORD[value] }))} onChange={onCameraSideChange}>
        <p className="detail">{LEG_TEXT.cameraHint}</p>
        {cameraSide !== leg && (
          <Notice icon="info">
            <p>{LEG_TEXT.farLeg}</p>
          </Notice>
        )}
      </Segmented>
      )}
      <StepGuide steps={notes} figure={figureFor} />
      {isNumericKind(kind) && (
        <Notice icon="ruler">
          <p>{limit === undefined ? `Your limit: ${ASK_SURGEON_TEXT}.` : `Your limit is ${limit} degrees. Your care team sets it.`}</p>
        </Notice>
      )}
      {!usesCamera && (
        <Notice icon="video-off">
          <p>{TIMER_NOTE}</p>
        </Notice>
      )}
      {returnNotice}
      <details className="card disclosure technique">
        <summary>
          <h2>How the sources describe this exercise</h2>
          <span className="chev">
            <Icon name="chevron-down" />
          </span>
        </summary>
        <div className="disclosure-body stack-s">
          <p className="detail">{proposal ? PROPOSAL_NOTE : TECHNIQUE_NOTE}</p>
          <ul className="stack-s">
            {techniqueLines.map((l) => (
              <li key={l.text}>
                <p>{l.text}</p>
                <p className="detail">
                  Source: {l.sources.map((id) => SOURCE_NAMES[id]).join(', ')}.
                  {l.borrowed && ' Borrowed: none of these sources is about MPFL surgery.'}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </details>
      {onOpenPair && (
        <div className="card card-flat stack-s">
          <h2>Second camera</h2>
          <p>{SECOND_CAMERA_TEXT}</p>
          <div className="actions">
            <button type="button" className="btn" disabled={otherLegChosen && !confirmedOther} onClick={onOpenPair}>
              <Icon name="phone" size={18} />
              {SECOND_CAMERA_BUTTON}
            </button>
          </div>
        </div>
      )}
      <LiveShell.Actions label="Setup actions">
        <div className="setup-bar">
        {usesCamera ? (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={otherLegChosen && !confirmedOther}
            aria-describedby={otherLegChosen && !confirmedOther ? 'other-leg-note' : undefined}
            onClick={onNext}
          >
            Next: set up the camera
            <Icon name="chevron-right" size={20} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" onClick={onStart}>
            <Icon name="play" size={20} />
            Start exercise
          </button>
        )}
        </div>
      </LiveShell.Actions>
    </div>
  );
}
