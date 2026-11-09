// Setup step 1: the position guide (FR28) and the two questions of T17 (which leg, which camera side).
// Setup.tsx owns the state. This component only shows it and calls back.
import type { ReactNode } from 'react';
import type { Side } from '../lib/angle';
import type { LegLegend } from '../lib/figure';
import { guideFor, type GuideKind } from '../lib/guides';
import { SOURCE_NAMES, TECHNIQUE_NOTE, techniqueFor } from '../lib/technique';
import { ASK_SURGEON_TEXT } from './askSurgeon';
import { GuideFigure, type Mark } from './GuideFigure';
import { Icon, type IconName } from './Icon';
import { Notice } from './Notice';
import { Segmented } from './Segmented';
import { StepGuide } from './StepGuide';
import { LEG_TEXT } from './setupView';
import './flowV2.css';

const SECOND_CAMERA_BUTTON = 'Add a second camera (optional)';
const SECOND_CAMERA_TEXT = 'A phone can be a second camera in front of you. It sends body points only, no video.';
// The numbers in the drawings match the six notes of the guide: 1 start position, 2 leg and camera, 3 hands, 4 range, 5 speed, 6 what the camera must see.
const START_MARKS: Mark[] = [{ n: 1, at: 'hip', dx: 1, dy: -2.6 }, { n: 2, at: 'knee', dx: -0.5, dy: -2.8 }, { n: 3, at: 'hand', dx: 0, dy: -2.6 }];
const END_MARKS: Mark[] = [{ n: 4, at: 'knee', dx: 3, dy: -3 }, { n: 5, at: 'arrow', dx: 0, dy: -2.6 }];
const SIDES: Side[] = ['left', 'right'];
const SIDE_WORD: Record<Side, string> = { left: 'Left', right: 'Right' };

interface Props {
  kind: GuideKind;
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
}

export function SetupGuide({
  kind,
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
}: Props) {
  const otherLegChosen = leg !== side;
  const guide = guideFor(kind, legend);
  const notes: { icon: IconName; label: string; text: string }[] = [
    { icon: 'bed-single', label: 'Start position', text: guide.startPosition },
    { icon: 'camera', label: 'Leg and camera', text: guide.legFacingCamera },
    { icon: 'hand', label: 'Hands and support', text: guide.handsAndSupport },
    { icon: 'move-horizontal', label: 'Range', text: guide.range },
    { icon: 'clock', label: 'Speed', text: guide.speed },
    { icon: 'video-off', label: 'What the camera must see', text: guide.cameraMustSee },
  ];
  const startFigure = (
    <GuideFigure kind={kind} frame="start" side={leg} legend={legend} kneeDeg={targetFlexion} marks={START_MARKS} description={`Start position. ${guide.startPosition} ${guide.legFacingCamera}`} />
  );
  const endFigure = <GuideFigure kind={kind} frame="end" side={leg} legend={legend} kneeDeg={targetFlexion} marks={END_MARKS} description={`End position. ${guide.range}`} />;
  // Steps 1 to 3 name the start drawing, steps 4 and 5 the end drawing, step 6 the camera drawing.
  const figureFor = (step: number) => (
    <>
      {step <= 3 ? startFigure : step <= 5 ? endFigure : <div className="guide-camera">{cameraGuide}</div>}
      <p className="detail">The drawing shows the movement. It is not your limit.</p>
    </>
  );
  return (
    <div className="stack v2-flow v2-setup">
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
      <Segmented name="camera-side" legend={LEG_TEXT.cameraQuestion} value={cameraSide} options={SIDES.map((value) => ({ value, label: SIDE_WORD[value] }))} onChange={onCameraSideChange}>
        <p className="detail">{LEG_TEXT.cameraHint}</p>
        {cameraSide !== leg && (
          <Notice icon="info">
            <p>{LEG_TEXT.farLeg}</p>
          </Notice>
        )}
      </Segmented>
      <StepGuide steps={notes} figure={figureFor} />
      <Notice icon="ruler">
        <p>{limit === undefined ? `Your limit: ${ASK_SURGEON_TEXT}.` : `Your limit is ${limit} degrees. Your care team sets it.`}</p>
      </Notice>
      {returnNotice}
      <details className="card disclosure technique">
        <summary>
          <h2>How the sources describe this exercise</h2>
          <span className="chev">
            <Icon name="chevron-down" />
          </span>
        </summary>
        <div className="disclosure-body stack-s">
          <p className="detail">{TECHNIQUE_NOTE}</p>
          <ul className="stack-s">
            {techniqueFor(kind).map((l) => (
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
      <div className="action-bar">
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
      </div>
    </div>
  );
}
