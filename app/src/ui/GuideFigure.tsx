// The position guide drawing (FR28) and the camera guide drawing. Plain svg made from src/lib/figure.ts.
// No photo and no video of a person. The svg is an image (role="img") with a text alternative from the guide.
// Style comes from classes (.fg-*) in figures.css and from svg attributes. No inline style attribute.
// Meaning does not rely on colour: the operated leg is the thicker limb, it has a label and its knee has a ring.
import type { Side } from '../lib/angle';
import {
  cameraPlan,
  figureFor,
  type CameraView,
  type Figure,
  type FigureFrame,
  type FigureLabel,
  type Joint,
  type Limb,
  type Point,
  VIEW,
} from '../lib/figure';
import type { GuideKind } from '../lib/guides';
import './figures.css';

const num = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;
const points = (pts: Point[]) => pts.map((p) => `${num(p.x)},${num(p.y)}`).join(' ');

/** The path of the arc at the knee, from the line beyond the thigh to the shank. Null when the knee is straight. */
function arcPath(arc: Figure['kneeArc']): string | null {
  if (arc.flexionDeg <= 0) return null;
  const at = (deg: number): Point => ({
    x: arc.center.x + arc.radius * Math.cos(rad(deg)),
    y: arc.center.y + arc.radius * Math.sin(rad(deg)),
  });
  const from = at(arc.fromDeg);
  const to = at(arc.toDeg);
  const delta = ((arc.toDeg - arc.fromDeg + 540) % 360) - 180; // the short way round, with a sign
  return `M ${num(from.x)} ${num(from.y)} A ${arc.radius} ${arc.radius} 0 0 ${delta > 0 ? 1 : 0} ${num(to.x)} ${num(to.y)}`;
}

/** The filled wedge between the line beyond the thigh and the shank. It makes a small angle easy to see. */
function wedgePath(arc: Figure['kneeArc']): string {
  const c = arc.center;
  return `M ${num(c.x)} ${num(c.y)} L ${arcPath(arc)!.slice(2)} Z`;
}

function Limbs({ limbs, pts }: { limbs: Limb[]; pts: Record<Joint, Point> }) {
  return (
    <>
      {limbs.map((l) => (
        <line
          key={`${l.from}-${l.to}`}
          className={`fg-limb fg-${l.leg}`}
          x1={num(pts[l.from].x)}
          y1={num(pts[l.from].y)}
          x2={num(pts[l.to].x)}
          y2={num(pts[l.to].y)}
          strokeWidth={l.width}
        />
      ))}
    </>
  );
}

function Label({ label, className = 'fg-text' }: { label: { text: string; box: FigureLabel['box'] }; className?: string }) {
  // The box holds the top left corner. The baseline sits near the bottom of the box.
  return (
    <text className={className} x={label.box.x} y={label.box.y + 12.5}>
      {label.text}
    </text>
  );
}

/** A small camera icon: a body, a lens and a top bump. */
function CameraIcon({ at, w, h }: { at: Point; w: number; h: number }) {
  return (
    <g>
      <rect className="fg-camera-body" x={at.x - w / 2} y={at.y - h / 2} width={w} height={h} rx="2" />
      <rect className="fg-camera-body" x={at.x - w / 4} y={at.y - h / 2 - 3} width={w / 2} height="4" rx="1" />
      <circle className="fg-camera-lens" cx={at.x} cy={at.y + 0.5} r={h / 3.2} />
    </g>
  );
}

interface Props {
  kind: GuideKind;
  frame: FigureFrame;
  side: Side;
  /** The text alternative. It comes from the guide text. */
  description: string;
  /** The knee angle of the exercise data in degrees. It sets the drawn end position and the number on the arc. */
  kneeDeg?: number;
}

export function GuideFigure({ kind, frame, side, description, kneeDeg }: Props) {
  const fig = figureFor(kind, frame, side, kneeDeg);
  const arc = frame === 'end' ? arcPath(fig.kneeArc) : null;
  const byKey = (key: FigureLabel['key']) => fig.labels.find((l) => l.key === key)!;
  const frameName = frame === 'start' ? 'Start position' : 'End position';
  return (
    <svg className="fig" viewBox={`0 0 ${VIEW.w} ${fig.height}`} role="img" aria-label={description} focusable="false">
      <title>{frameName}</title>
      <desc>{description}</desc>
      {fig.surface.rects.map((r, i) => (
        <rect key={i} className="fg-object" x={r.x} y={r.y} width={r.w} height={r.h} rx={r.r} />
      ))}
      {fig.surface.key !== 'mat' && <line className="fg-floor" x1="3" x2="147" y1={fig.floorY} y2={fig.floorY} />}
      {fig.ghost && (
        <g className="fg-ghost">
          <Limbs limbs={fig.ghost.limbs} pts={fig.ghost.points} />
          <circle className="fg-head" cx={num(fig.ghost.head.center.x)} cy={num(fig.ghost.head.center.y)} r={fig.ghost.head.r} />
        </g>
      )}
      <Limbs limbs={fig.limbs} pts={fig.points} />
      <circle className="fg-head" cx={num(fig.head.center.x)} cy={num(fig.head.center.y)} r={fig.head.r} />
      {arc && <line className="fg-ref" x1={num(fig.kneeArc.reference.from.x)} y1={num(fig.kneeArc.reference.from.y)} x2={num(fig.kneeArc.reference.to.x)} y2={num(fig.kneeArc.reference.to.y)} />}
      {arc && <path className="fg-wedge" d={wedgePath(fig.kneeArc)} />}
      {arc && <path className="fg-arc" d={arc} />}
      <circle className="fg-knee-mark" cx={num(fig.points.knee.x)} cy={num(fig.points.knee.y)} r="10" />
      <line className="fg-arrow" x1={num(fig.arrow.from.x)} y1={num(fig.arrow.from.y)} x2={num(fig.arrow.to.x)} y2={num(fig.arrow.to.y)} />
      <polygon className="fg-arrow-head" points={points(fig.arrow.head)} />
      <Label label={byKey('frame')} />
      <Label label={byKey('surface')} />
      <circle className="fg-knee-mark" cx="14" cy={byKey('operatedLeg').box.y + 8} r="6" />
      <Label label={byKey('operatedLeg')} />
      <CameraIcon {...fig.camera} />
      <Label label={byKey('camera')} />
      {fig.kneeArc.label && <Label label={fig.kneeArc.label} className="fg-text-accent" />}
    </svg>
  );
}

interface CameraProps {
  view: CameraView;
  kind: GuideKind;
  side: Side;
  /** The text alternative. */
  description: string;
}

/** The camera placement drawing, seen from above. Not used by the Setup screen yet. See the report. */
export function CameraFigure({ view, kind, side, description }: CameraProps) {
  const plan = cameraPlan(view, kind, side);
  return (
    <svg className="fig" viewBox={`0 0 ${plan.size.w} ${plan.size.h}`} role="img" aria-label={description} focusable="false">
      <title>{view === 'side' ? 'Side view camera position' : 'Front view camera position'}</title>
      <desc>{description}</desc>
      <polygon className="fg-cone" points={points(plan.cone)} />
      {plan.legs.map((l) => (
        <line key={l.leg} className={`fg-limb fg-${l.leg}`} x1={num(l.from.x)} y1={num(l.from.y)} x2={num(l.to.x)} y2={num(l.to.y)} strokeWidth={l.width} />
      ))}
      <rect className="fg-limb-fill fg-head" x={plan.body.x} y={plan.body.y} width={plan.body.w} height={plan.body.h} rx={plan.body.r} />
      <circle className="fg-head" cx={num(plan.head.center.x)} cy={num(plan.head.center.y)} r={plan.head.r} />
      <line className="fg-arrow" x1={plan.distance.from.x} y1={plan.distance.from.y} x2={plan.distance.to.x} y2={plan.distance.to.y} />
      <polygon className="fg-arrow-head" points={points(plan.distance.head)} />
      <polygon className="fg-arrow-head" points={points(plan.distance.tail)} />
      <circle className="fg-knee-mark" cx={num(plan.kneeMark.x)} cy={num(plan.kneeMark.y)} r="8" />
      <line className="fg-leader" x1={num(plan.leader.from.x)} y1={num(plan.leader.from.y)} x2={num(plan.leader.to.x)} y2={num(plan.leader.to.y)} />
      <CameraIcon {...plan.camera} />
      {plan.labels.map((l) => (
        <Label key={l.key} label={l} />
      ))}
    </svg>
  );
}
