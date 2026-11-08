// The position guide drawing (FR28). A plain svg made from figureFor() (src/lib/figure.ts).
// No photo and no video of a person. The svg is an image (role="img") with a text alternative from the guide.
// Style comes from CSS classes (.fig-*) and svg attributes. No inline style attribute.
// Meaning does not rely on colour: the operated leg is thick, the other leg is thin and dashed, and each part has a label.
import type { Side } from '../lib/angle';
import { figureFor, type FigureFrame, type Figure, type Joint, type Point } from '../lib/figure';
import type { GuideKind } from '../lib/guides';

const LABEL_TEXT: Record<Figure['labels'][number]['key'], string> = {
  operatedLeg: 'Operated leg',
  camera: 'Camera',
  support: 'Support',
  start: 'Start',
  end: 'End',
};

const num = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** The path of the arc at the knee. Null when the knee is straight, because the arc would be a half circle. */
function arcPath(arc: Figure['kneeArc']): string | null {
  if (arc.flexionDeg <= 0) return null;
  const at = (deg: number): Point => ({
    x: arc.center.x + arc.radius * Math.cos(rad(deg)),
    y: arc.center.y + arc.radius * Math.sin(rad(deg)),
  });
  const from = at(arc.fromDeg);
  const to = at(arc.toDeg);
  const delta = ((arc.toDeg - arc.fromDeg + 540) % 360) - 180; // the short way round, with a sign
  const sweep = delta > 0 ? 1 : 0;
  return `M ${num(from.x)} ${num(from.y)} A ${arc.radius} ${arc.radius} 0 0 ${sweep} ${num(to.x)} ${num(to.y)}`;
}

interface Props {
  kind: GuideKind;
  frame: FigureFrame;
  side: Side;
  /** The text alternative. It comes from the guide text. */
  description: string;
}

export function GuideFigure({ kind, frame, side, description }: Props) {
  const fig = figureFor(kind, frame, side);
  const p = (joint: Joint) => fig.points[joint];
  const arc = arcPath(fig.kneeArc);
  const cam = fig.camera;
  return (
    <svg className="fig" viewBox="0 0 100 100" role="img" aria-label={description} focusable="false">
      <line className="fig-floor" x1="2" x2="98" y1={fig.floorY} y2={fig.floorY} />
      {fig.support && (
        <rect className="fig-support" x={fig.support.x} y={fig.support.y} width={fig.support.w} height={fig.support.h} />
      )}
      {fig.lines.map((l) => (
        <line
          key={`${l.from}-${l.to}`}
          className={`fig-${l.limb}`}
          x1={p(l.from).x}
          y1={p(l.from).y}
          x2={p(l.to).x}
          y2={p(l.to).y}
        />
      ))}
      <circle className="fig-head" cx={p('head').x} cy={p('head').y} r="4.5" />
      {(['hip', 'knee', 'ankle'] as const).map((j) => (
        <circle key={j} className="fig-joint" cx={p(j).x} cy={p(j).y} r="2" />
      ))}
      {arc && <path className="fig-arc" d={arc} />}
      <g className="fig-camera">
        <rect x={cam.x - 5} y={cam.y - 3} width="10" height="6" />
        <path d={`M ${cam.x - 2} ${cam.y - 3} L ${cam.x} ${cam.y - 6} L ${cam.x + 2} ${cam.y - 3} Z`} />
      </g>
      {fig.labels.map((l) => (
        <text key={l.key} className="fig-label" x={l.at.x} y={l.key === 'camera' ? l.at.y + 6 : l.at.y} textAnchor="middle">
          {LABEL_TEXT[l.key]}
        </text>
      ))}
    </svg>
  );
}
