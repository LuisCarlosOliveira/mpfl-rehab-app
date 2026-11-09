// The position guide drawing (FR28) and the camera guide drawing. Plain svg made from src/lib/figure.ts.
// No photo and no video of a person. The svg is an image (role="img") with a text alternative from the guide.
// Style comes from classes (.fg-*) in figures.css and from svg attributes. No inline style attribute.
// Meaning does not rely on colour: the operated leg is the thicker limb, it has a ring on the knee and a legend.
import type { Side } from '../lib/angle';
import {
  cameraPlan,
  figureFor,
  type Box,
  type CameraView,
  type Figure,
  type FigureFrame,
  type FigureLabel,
  type Joint,
  type LegLegend,
  type Limb,
  type Point,
} from '../lib/figure';
import type { GuideKind } from '../lib/guides';
import './figures.css';

const num = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;
const points = (pts: Point[]) => pts.map((p) => `${num(p.x)},${num(p.y)}`).join(' ');
const viewBox = (b: Box) => `${b.x} ${b.y} ${b.w} ${b.h}`;

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

function Limbs({ limbs, pts, halo = true }: { limbs: Limb[]; pts: Record<Joint, Point>; halo?: boolean }) {
  return (
    <>
      {limbs.map((l) => {
        const line = { x1: num(pts[l.from].x), y1: num(pts[l.from].y), x2: num(pts[l.to].x), y2: num(pts[l.to].y) };
        return (
          <g key={`${l.from}-${l.to}`}>
            {/* A thin halo in the card colour keeps a limb apart from the limb behind it. */}
            {halo && l.leg !== 'far' && <line className="fg-limb fg-halo" {...line} strokeWidth={l.width + 3} />}
            <line className={`fg-limb fg-${l.leg}`} {...line} strokeWidth={l.width} />
          </g>
        );
      })}
    </>
  );
}

function Label({ label, size, className = 'fg-text' }: { label: Pick<FigureLabel, 'text' | 'at'>; size: number; className?: string }) {
  return (
    <text className={className} x={label.at.x} y={label.at.y} fontSize={size}>
      {label.text}
    </text>
  );
}

/** A numbered label of a guide step. It sits on a thin leader line next to the part of the drawing that the step names. */
export interface Mark {
  n: number;
  at: Joint | 'arrow' | 'lens';
  /** Where the circle sits from the point, in label sizes. The default is straight up. */
  dx?: number;
  dy?: number;
}

/** The number in a circle, with a leader line to the point. The circle stays inside the box. */
function Marks({ marks, where, box, size }: { marks: Mark[]; where: (at: Mark['at']) => Point; box: Box; size: number }) {
  const r = size * 0.75;
  return (
    <>
      {marks.map(({ n, at, dx = 0, dy = -2.4 }) => {
        const p = where(at);
        const c = {
          x: Math.min(box.x + box.w - r - 1, Math.max(box.x + r + 1, p.x + size * dx)),
          y: Math.min(box.y + box.h - r - 1, Math.max(box.y + r + 1, p.y + size * dy)),
        };
        return (
          <g key={n}>
            <line className="fg-mark-line" x1={num(p.x)} y1={num(p.y)} x2={num(c.x)} y2={num(c.y)} />
            <circle className="fg-mark-dot" cx={num(c.x)} cy={num(c.y)} r={num(r)} />
            <text className="fg-mark-text" x={num(c.x)} y={num(c.y)} fontSize={num(size * 1.1)} textAnchor="middle" dominantBaseline="central">
              {n}
            </text>
          </g>
        );
      })}
    </>
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
  /** "chosen" when the drawn leg is not the operated leg. The legend then says "Your chosen leg". */
  legend?: LegLegend;
  /** Numbered labels of the guide steps. Without marks the drawing has no number. */
  marks?: Mark[];
}

export function GuideFigure({ kind, frame, side, description, kneeDeg, legend, marks }: Props) {
  const fig = figureFor(kind, frame, side, kneeDeg, legend);
  const arc = frame === 'end' ? arcPath(fig.kneeArc) : null;
  const byKey = (key: FigureLabel['key']) => fig.labels.find((l) => l.key === key)!;
  const frameName = frame === 'start' ? 'Start position' : 'End position';
  const { view, labelSize: size } = fig;
  return (
    <svg className="fig" viewBox={viewBox(view)} role="img" aria-label={description} focusable="false">
      <title>{frameName}</title>
      <desc>{description}</desc>
      {fig.surface.rects.map((r, i) => (
        <rect key={i} className="fg-object" x={r.x} y={r.y} width={r.w} height={r.h} rx={r.r} />
      ))}
      {fig.floor && <line className="fg-floor" x1={view.x + 2} x2={view.x + view.w - 2} y1={fig.floor.y} y2={fig.floor.y} />}
      <Label label={byKey('surface')} size={size} className="fg-text-object" />
      {fig.ghost && (
        <g className="fg-ghost">
          <Limbs limbs={fig.ghost.limbs} pts={fig.ghost.points} halo={false} />
          <circle className="fg-head" cx={num(fig.ghost.head.center.x)} cy={num(fig.ghost.head.center.y)} r={fig.ghost.head.r} />
        </g>
      )}
      <Limbs limbs={fig.limbs} pts={fig.points} />
      <circle className="fg-head" cx={num(fig.head.center.x)} cy={num(fig.head.center.y)} r={fig.head.r} />
      {arc && <line className="fg-ref" x1={num(fig.kneeArc.reference.from.x)} y1={num(fig.kneeArc.reference.from.y)} x2={num(fig.kneeArc.reference.to.x)} y2={num(fig.kneeArc.reference.to.y)} />}
      {arc && <path className="fg-wedge" d={wedgePath(fig.kneeArc)} />}
      {arc && <path className="fg-arc" d={arc} />}
      <circle className="fg-knee-mark" cx={num(fig.kneeRing.center.x)} cy={num(fig.kneeRing.center.y)} r={fig.kneeRing.r} />
      <line className="fg-arrow" x1={num(fig.arrow.from.x)} y1={num(fig.arrow.from.y)} x2={num(fig.arrow.to.x)} y2={num(fig.arrow.to.y)} />
      <polygon className="fg-arrow-head" points={points(fig.arrow.head)} />
      <Label label={byKey('frame')} size={size} />
      <circle className="fg-knee-mark" cx={fig.legendRing.center.x} cy={fig.legendRing.center.y} r={fig.legendRing.r} />
      <Label label={byKey('operatedLeg')} size={size} />
      {fig.kneeArc.label && <Label label={fig.kneeArc.label} size={size} className="fg-text-accent" />}
      {marks && <Marks marks={marks} box={view} size={size} where={(at) => (at === 'arrow' ? fig.arrow.to : at === 'lens' ? fig.points.hip : fig.points[at])} />}
    </svg>
  );
}

interface CameraProps {
  view: CameraView;
  kind: GuideKind;
  /** The text alternative. */
  description: string;
  /** "chosen" when the drawn leg is not the operated leg. */
  legend?: LegLegend;
  /** Numbered labels of the guide steps. */
  marks?: Mark[];
}

/** The camera placement drawing: the person in profile, the phone on a stand at knee height, the view cone and the distance. */
export function CameraFigure({ view, kind, description, legend, marks }: CameraProps) {
  const plan = cameraPlan(view, kind, legend);
  const { figure: f, phone, distance } = plan;
  const size = plan.labelSize;
  const label = (key: (typeof plan.labels)[number]['key']) => plan.labels.find((l) => l.key === key)!;
  return (
    <svg className="fig" viewBox={viewBox(plan.box)} role="img" aria-label={description} focusable="false">
      <title>{view === 'side' ? 'Side view camera position' : 'Front view camera position'}</title>
      <desc>{description}</desc>
      <polygon className="fg-cone" points={points(plan.cone)} />
      {f.surface.rects.map((r, i) => (
        <rect key={i} className="fg-object" x={r.x} y={r.y} width={r.w} height={r.h} rx={r.r} />
      ))}
      {f.floor && <line className="fg-floor" x1={plan.box.x + 2} x2={plan.box.x + plan.box.w - 2} y1={f.floor.y} y2={f.floor.y} />}
      <Limbs limbs={f.limbs} pts={f.points} />
      <circle className="fg-head" cx={num(f.head.center.x)} cy={num(f.head.center.y)} r={f.head.r} />
      <circle className="fg-knee-mark" cx={num(f.kneeRing.center.x)} cy={num(f.kneeRing.center.y)} r={f.kneeRing.r} />
      <line className="fg-level" x1={num(plan.level.from.x + f.kneeRing.r)} y1={plan.level.from.y} x2={num(plan.level.to.x)} y2={plan.level.to.y} />
      <line className="fg-stand" x1={phone.stem.from.x} y1={phone.stem.from.y} x2={phone.stem.to.x} y2={phone.stem.to.y} />
      <line className="fg-stand" x1={phone.foot.from.x} y1={phone.foot.from.y} x2={phone.foot.to.x} y2={phone.foot.to.y} />
      <rect className="fg-camera-body" x={phone.body.x} y={phone.body.y} width={phone.body.w} height={phone.body.h} rx={phone.body.r} />
      <circle className="fg-camera-lens" cx={phone.lens.x} cy={phone.lens.y} r={phone.lensR} />
      <line className="fg-arrow" x1={distance.from.x} y1={distance.from.y} x2={distance.to.x} y2={distance.to.y} />
      <polygon className="fg-arrow-head" points={points(distance.head)} />
      <polygon className="fg-arrow-head" points={points(distance.tail)} />
      {distance.ticks.map((t, i) => (
        <line key={i} className="fg-leader" x1={t.from.x} y1={t.from.y} x2={t.to.x} y2={t.to.y} />
      ))}
      <Label label={label('view')} size={size} />
      <Label label={label('camera')} size={size} />
      <Label label={label('distance')} size={size} className="fg-text-accent" />
      <circle className="fg-knee-mark" cx={plan.legendRing.center.x} cy={plan.legendRing.center.y} r={plan.legendRing.r} />
      <Label label={label('operatedLeg')} size={size} />
      <line className="fg-level" x1={plan.legendLevel.from.x} y1={plan.legendLevel.from.y} x2={plan.legendLevel.to.x} y2={plan.legendLevel.to.y} />
      <Label label={label('height')} size={size} />
      {marks && <Marks marks={marks} box={plan.box} size={size} where={(at) => (at === 'lens' ? phone.lens : at === 'arrow' ? distance.to : f.points[at])} />}
    </svg>
  );
}
