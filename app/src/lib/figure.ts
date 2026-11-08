// Figure geometry for the position guide (FR28) and the camera guide. Pure data. The UI renders it as SVG.
// Design: research/ux-flow.md section 7.5. No photo and no video of a person.
// The picture is a side view of a person: head, torso, thigh, shank and foot with real thickness.
// All numbers here only shape the drawing. They are PROPOSAL values and not clinical values.
// The knee angle that a patient sees comes from the exercise data of the protocol, never from this file.
import type { Side } from './angle';
import type { GuideKind } from './guides';
import { SETUP_CONFIG } from './setupRules';

export type FigureFrame = 'start' | 'end';
export interface Point {
  x: number;
  y: number;
}
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Joint = 'head' | 'shoulder' | 'elbow' | 'hand' | 'hip' | 'knee' | 'ankle' | 'toe' | 'farHip' | 'farKnee' | 'farAnkle' | 'farToe';
export type Part = 'torso' | 'thigh' | 'shank' | 'foot' | 'arm' | 'forearm';

export interface Limb {
  from: Joint;
  to: Joint;
  part: Part;
  /** The operated leg is `near`. The other leg is `far`. */
  leg: 'body' | 'near' | 'far';
  /** Stroke width in picture units. A round line cap gives the limb its rounded ends. */
  width: number;
}

export interface FigureLabel {
  key: 'frame' | 'operatedLeg' | 'camera' | 'surface';
  text: string;
  /** Top left corner and size of the text. The text is anchored at the left of the box. */
  box: Box;
}

export interface Figure {
  /** The operated leg is the near leg. The UI draws it thick and dark, on top. */
  nearLeg: Side;
  /** 1 if the figure faces right in the picture, -1 if it faces left. The camera sees the operated side. */
  facing: 1 | -1;
  points: Record<Joint, Point>;
  head: { center: Point; r: number };
  /** In drawing order: far leg first, then the torso, then the near leg, then the arm. */
  limbs: Limb[];
  /** A faint copy of the start position. Only on the end frame. */
  ghost: { points: Record<Joint, Point>; head: { center: Point; r: number }; limbs: Limb[] } | null;
  /** The movement arrow. `head` is the triangle of the arrow head. Its first point is `to`. */
  arrow: { from: Point; to: Point; head: [Point, Point, Point] };
  surface: { key: 'mat' | 'chair' | 'counter'; rects: (Box & { r: number })[] };
  floorY: number;
  /** The height of the picture. The width is VIEW.w. */
  height: number;
  camera: { at: Point; w: number; h: number };
  labels: FigureLabel[];
  /** The knee bend. The arc runs from the straight line beyond the thigh to the shank. Its angle is `flexionDeg`. */
  kneeArc: {
    center: Point;
    fromDeg: number;
    toDeg: number;
    radius: number;
    flexionDeg: number;
    /** The dashed line along the thigh beyond the knee. It shows what "straight" means. */
    reference: { from: Point; to: Point };
    /** The number from the exercise data. Null when no number was given or on the start frame. */
    label: { text: string; box: Box } | null;
  };
}

export const VIEW = { w: 150, maxFlexionDeg: 120 } as const;
const POSTURE_OF: Record<GuideKind, 'lying' | 'upright'> = {
  'heel-slide': 'lying',
  'straight-leg-raise': 'lying',
  'mini-squat': 'upright',
  'seated-extension-hold': 'upright',
};
/** The height of the picture. A lying person needs less room than a standing person. */
export const viewHeight = (kind: GuideKind) => (POSTURE_OF[kind] === 'lying' ? 128 : 160);
/** Label size in picture units. The picture is drawn at about one pixel for each unit on a 360 pixel screen. */
export const LABEL_PX = 14;
const CHAR_W = 9.2; // PROPOSAL, width of one bold character at LABEL_PX. Used to size the label boxes.
const LABEL_H = 16;

// Illustrative end-frame knee flexion in degrees. It shows the movement. It is not a target or a limit.
// The protocol sets the real limit (clinical.md section 9). A number in the exercise data replaces it.
export const ILLUSTRATIVE_FLEXION: Record<GuideKind, number> = {
  'heel-slide': 60, // PROPOSAL, same as the example target of example-protocol.json (PROPOSAL there)
  'straight-leg-raise': 0, // clinical.md section 4: knee at 0 degrees, SLR without lag (S1)
  'mini-squat': 30, // PROPOSAL, inside the borrowed range 0 to 50 degrees (clinical.md section 4, S16). Not a limit.
  'seated-extension-hold': 0, // PROPOSAL, ux-flow 7.4: straighten the knee
};

// The knee angle in the exercise data replaces the illustrative value for these exercises only.
const USES_DATA_ANGLE: Record<GuideKind, boolean> = {
  'heel-slide': true,
  'straight-leg-raise': false, // the knee stays straight
  'mini-squat': true,
  'seated-extension-hold': true,
};

// Segment lengths and thickness in picture units. PROPOSAL, only for the drawing.
const SEG = 27;
const TRUNK = 30;
const FOOT = 11;
const HEAD_R = 7.5;
const HEAD_GAP = 13;
const W = {
  torso: 16,
  arm: 6,
  near: { thigh: 13, shank: 10, foot: 7 },
  far: { thigh: 10, shank: 8, foot: 6 },
} as const;
const MAT_TOP = 64;
const STAND_FLOOR = 122;

const rad = (deg: number) => (deg * Math.PI) / 180;
const vec = (deg: number, len: number): Point => ({ x: len * Math.cos(rad(deg)), y: len * Math.sin(rad(deg)) });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const textBox = (text: string, x: number, y: number): Box => ({ x, y, w: Math.round(text.length * CHAR_W + 2), h: LABEL_H });

// Directions are screen degrees with the figure facing right: 0 is right, 90 is down, -90 is up.
interface Pose {
  hip: Point;
  trunkDir: number;
  thighDir: number;
  flexion: number;
  /** Direction of the near foot. Default: a right angle to the shank. */
  footDir?: number;
  farThighDir: number;
  farFlexion: number;
  farOffset: Point;
  farFootDir?: number;
  /** The hand rests here. The elbow lies below the line from shoulder to hand. */
  hand: Point;
  elbowDrop: Point;
}

// Isosceles pose with the heel on a surface: the thigh rises by half of the flexion.
const slideThigh = (flexion: number) => -flexion / 2;

function poseFor(kind: GuideKind, frame: FigureFrame, flex: number): Pose {
  const end = frame === 'end';
  switch (kind) {
    case 'heel-slide': {
      const f = end ? flex : 0;
      return {
        hip: { x: 60, y: 56 }, trunkDir: 180, thighDir: slideThigh(f), flexion: f, footDir: -90,
        farThighDir: 0, farFlexion: 0, farOffset: { x: 0, y: 1.5 }, farFootDir: -90,
        hand: { x: 40, y: 59.5 }, elbowDrop: { x: 0, y: 0 },
      };
    }
    case 'straight-leg-raise':
      // PROPOSAL: a hip flexion of 30 degrees is the lower end of the PROPOSAL range 30 to 45 degrees (clinical.md section 4).
      return {
        hip: { x: 60, y: 56 }, trunkDir: 180, thighDir: end ? -30 : 0, flexion: 0,
        farThighDir: slideThigh(90), farFlexion: 90, farOffset: { x: 0, y: 0 }, farFootDir: 0,
        hand: { x: 40, y: 59.5 }, elbowDrop: { x: 0, y: 0 },
      };
    case 'mini-squat': {
      const f = end ? flex : 0;
      // Both feet stay in place. The hip lowers, the knee moves forward and the trunk leans a little.
      const hip = { x: 26, y: 118 - 2 * SEG * Math.cos(rad(f / 2)) };
      return {
        hip, trunkDir: -90 + 0.4 * f, thighDir: 90 - f / 2, flexion: f, footDir: 0,
        farThighDir: 90 - f / 2, farFlexion: f, farOffset: { x: -5, y: 0 }, farFootDir: 0,
        hand: { x: 86, y: 63 }, elbowDrop: { x: 8, y: 22 },
      };
    }
    case 'seated-extension-hold':
      return {
        hip: { x: 72, y: 89.5 }, trunkDir: -90, thighDir: 0, flexion: end ? flex : 90, footDir: end ? -90 : 0,
        farThighDir: 0, farFlexion: 90, farOffset: { x: -4, y: 3 }, farFootDir: 0,
        hand: { x: 80, y: 93 }, elbowDrop: { x: -4, y: 20 },
      };
  }
}

type Rect = Box & { r: number };
const SURFACE: Record<GuideKind, { key: Figure['surface']['key']; rects: Rect[]; label: Box }> = {
  'heel-slide': { key: 'mat', rects: [{ x: 3, y: MAT_TOP, w: 144, h: 18, r: 5 }], label: textBox('Bed or mat', 8, 65) },
  'straight-leg-raise': { key: 'mat', rects: [{ x: 3, y: MAT_TOP, w: 144, h: 18, r: 5 }], label: textBox('Bed or mat', 8, 65) },
  'mini-squat': { key: 'counter', rects: [{ x: 82, y: 66, w: 66, h: 56, r: 3 }], label: textBox('Counter', 84, 72) },
  'seated-extension-hold': {
    key: 'chair',
    rects: [
      { x: 54, y: 96, w: 44, h: 6, r: 2 }, // seat
      { x: 54, y: 52, w: 6, h: 44, r: 2 }, // back
      { x: 54, y: 102, w: 6, h: 20, r: 1 }, // back leg
      { x: 90, y: 102, w: 6, h: 20, r: 1 }, // front leg
    ],
    label: textBox('Chair', 2, 80),
  },
};

const FLOOR_Y: Record<GuideKind, number> = { 'heel-slide': MAT_TOP, 'straight-leg-raise': MAT_TOP, 'mini-squat': STAND_FLOOR, 'seated-extension-hold': STAND_FLOOR };

// Where the arrow runs, in the picture that faces right. The start and the end frame use the same arrow.
const ARROW: Record<GuideKind, { from: Point; to: Point }> = {
  'heel-slide': { from: { x: 138, y: 73 }, to: { x: 110, y: 73 } }, // the heel slides along the surface toward the buttock
  'straight-leg-raise': { from: { x: 134, y: 52 }, to: { x: 134, y: 24 } }, // the leg goes up
  'mini-squat': { from: { x: 8, y: 30 }, to: { x: 8, y: 58 } }, // the hips go down
  'seated-extension-hold': { from: { x: 142, y: 106 }, to: { x: 142, y: 78 } }, // the foot goes up
};

// Where the number of the knee arc stands, as a direction and a distance from the knee. Picture that faces right.
const ARC_LABEL: Record<GuideKind, { dir: number; dist: number }> = {
  'heel-slide': { dir: -20, dist: 40 },
  'straight-leg-raise': { dir: -90, dist: 30 },
  'mini-squat': { dir: 10, dist: 30 },
  'seated-extension-hold': { dir: -60, dist: 34 },
};

const FRAME_BOX = { Start: textBox('Start', 4, 3), End: textBox('End', 4, 3) };

/** A text box centred on a point, moved inside the picture when it would cross an edge. */
function centredBox(text: string, c: Point, h: number): Box {
  const b = textBox(text, 0, 0);
  return { ...b, x: clamp(c.x - b.w / 2, 2, VIEW.w - 2 - b.w), y: clamp(c.y - b.h / 2, 2, h - 2 - b.h) };
}

function arrowHead(from: Point, to: Point): [Point, Point, Point] {
  const dir = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return [to, add(to, vec(dir + 150, 8)), add(to, vec(dir - 150, 8))];
}

function mirrorPoint(p: Point): Point {
  return { x: VIEW.w - p.x, y: p.y };
}
const mirrorBox = (b: Box): Box => ({ ...b, x: VIEW.w - b.x - b.w });

interface Built {
  points: Record<Joint, Point>;
  head: { center: Point; r: number };
  limbs: Limb[];
  shankDir: number;
  thighDir: number;
}

function build(pose: Pose): Built {
  const shankDir = pose.thighDir + pose.flexion;
  const farShankDir = pose.farThighDir + pose.farFlexion;
  const shoulder = add(pose.hip, vec(pose.trunkDir, TRUNK));
  const knee = add(pose.hip, vec(pose.thighDir, SEG));
  const ankle = add(knee, vec(shankDir, SEG));
  const farHip = add(pose.hip, pose.farOffset);
  const farKnee = add(farHip, vec(pose.farThighDir, SEG));
  const farAnkle = add(farKnee, vec(farShankDir, SEG));
  const points: Record<Joint, Point> = {
    head: add(shoulder, vec(pose.trunkDir, HEAD_GAP)),
    shoulder,
    elbow: add(shoulder, pose.elbowDrop),
    hand: pose.hand,
    hip: pose.hip,
    knee,
    ankle,
    toe: add(ankle, vec(pose.footDir ?? shankDir - 90, FOOT)),
    farHip,
    farKnee,
    farAnkle,
    farToe: add(farAnkle, vec(pose.farFootDir ?? farShankDir - 90, FOOT)),
  };
  const leg = (kind: 'near' | 'far'): Limb[] => {
    const p = kind === 'near' ? (['hip', 'knee', 'ankle', 'toe'] as const) : (['farHip', 'farKnee', 'farAnkle', 'farToe'] as const);
    const w = W[kind];
    return [
      { from: p[0], to: p[1], part: 'thigh', leg: kind, width: w.thigh },
      { from: p[1], to: p[2], part: 'shank', leg: kind, width: w.shank },
      { from: p[2], to: p[3], part: 'foot', leg: kind, width: w.foot },
    ];
  };
  const arm: Limb[] =
    pose.elbowDrop.x === 0 && pose.elbowDrop.y === 0
      ? []
      : [
          { from: 'shoulder', to: 'elbow', part: 'arm', leg: 'body', width: W.arm },
          { from: 'elbow', to: 'hand', part: 'forearm', leg: 'body', width: W.arm },
        ];
  return {
    points,
    head: { center: points.head, r: HEAD_R },
    limbs: [...leg('far'), { from: 'shoulder', to: 'hip', part: 'torso', leg: 'body', width: W.torso }, ...leg('near'), ...arm],
    shankDir,
    thighDir: pose.thighDir,
  };
}

/**
 * Joint points, limbs, ghost, arrow, surface, labels and knee arc for one key frame. The operated leg is the near leg.
 * `kneeDeg` is the knee angle of the exercise data. It sets the drawn end position and the number on the arc.
 * Without it the drawing uses an illustrative angle and shows no number.
 */
export function figureFor(kind: GuideKind, frame: FigureFrame, side: Side, kneeDeg?: number): Figure {
  const given = kneeDeg === undefined ? undefined : clamp(Math.round(kneeDeg), 0, VIEW.maxFlexionDeg);
  const flex = USES_DATA_ANGLE[kind] && given !== undefined ? given : ILLUSTRATIVE_FLEXION[kind];
  const h = viewHeight(kind);
  const now = build(poseFor(kind, frame, flex));
  const start = frame === 'end' ? build(poseFor(kind, 'start', flex)) : null;

  const facing: 1 | -1 = side === 'right' ? 1 : -1;
  const mp = (p: Point) => (facing === 1 ? p : mirrorPoint(p));
  const mb = (b: Box) => (facing === 1 ? b : mirrorBox(b));
  const mapPoints = (pts: Record<Joint, Point>) => Object.fromEntries(Object.entries(pts).map(([k, p]) => [k, mp(p)])) as Record<Joint, Point>;
  const dir = (deg: number) => (facing === 1 ? deg : 180 - deg);

  const points = mapPoints(now.points);
  const surface = SURFACE[kind];
  const arrowRaw = ARROW[kind];
  const arrowTo = mp(arrowRaw.to);
  const arrowFrom = mp(arrowRaw.from);

  // The knee bend is measured from the line beyond the thigh. The number is only for the end frame.
  const bend = frame === 'end' ? flex : poseFor(kind, frame, flex).flexion;
  const hasNumber = frame === 'end' && given !== undefined && USES_DATA_ANGLE[kind];
  const labelText = hasNumber ? `${given}°` : null;
  const spec = ARC_LABEL[kind];
  const knee = now.points.knee;
  const labelBox = labelText ? mb(centredBox(labelText, add(knee, vec(spec.dir, spec.dist)), viewHeight(kind))) : null;
  const refEnd = add(knee, vec(now.thighDir, 30));

  return {
    nearLeg: side,
    facing,
    points,
    head: { center: points.head, r: HEAD_R },
    limbs: now.limbs,
    ghost: start && { points: mapPoints(start.points), head: { center: mp(start.points.head), r: HEAD_R }, limbs: start.limbs },
    arrow: { from: arrowFrom, to: arrowTo, head: arrowHead(arrowFrom, arrowTo) },
    surface: { key: surface.key, rects: surface.rects.map((r) => ({ ...mb(r), r: r.r })) },
    floorY: FLOOR_Y[kind],
    height: h,
    camera: { at: { x: 14, y: h - 10 }, w: 16, h: 11 },
    labels: [
      { key: 'frame', text: frame === 'start' ? 'Start' : 'End', box: FRAME_BOX[frame === 'start' ? 'Start' : 'End'] },
      { key: 'operatedLeg', text: 'Operated leg', box: textBox('Operated leg', 26, h - 34) },
      { key: 'camera', text: 'Camera', box: textBox('Camera', 26, h - 18) },
      { key: 'surface', text: { mat: 'Bed or mat', counter: 'Counter', chair: 'Chair' }[surface.key], box: mb(surface.label) },
    ],
    kneeArc: {
      center: points.knee,
      fromDeg: dir(now.thighDir),
      toDeg: dir(now.shankDir),
      radius: 22,
      flexionDeg: bend,
      reference: { from: points.knee, to: mp(refEnd) },
      label: labelText && labelBox ? { text: labelText, box: labelBox } : null,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Camera plan: a drawing from above. It shows where the camera stands and which leg faces it.
// Source of the rules: setupRules.ts (distance) and research/ux-flow.md section 6.1 (side, height).
// ---------------------------------------------------------------------------------------------

export type CameraView = 'side' | 'front';
export type Posture = 'lying' | 'upright';

export interface CameraPlan {
  view: CameraView;
  posture: Posture;
  facing: 1 | -1;
  size: { w: number; h: number };
  head: { center: Point; r: number };
  /** The torso as a rounded rectangle seen from above. */
  body: Box & { r: number };
  /** The legs seen from above. `near` is the operated leg. */
  legs: { leg: 'near' | 'far'; from: Point; to: Point; width: number }[];
  camera: { at: Point; w: number; h: number };
  /** The apex is the camera. The two other points close the dashed view cone. */
  cone: [Point, Point, Point];
  distance: { text: string; from: Point; to: Point; head: [Point, Point, Point]; tail: [Point, Point, Point] };
  /** The ring around the knee of the operated leg, and the ring in the legend. */
  kneeMark: Point;
  /** A short line from the ring of the operated knee to the label. */
  leader: { from: Point; to: Point };
  labels: { key: 'view' | 'operatedLeg' | 'camera' | 'height' | 'distance'; text: string; box: Box }[];
}

const PLAN = { w: 150, h: 156 } as const;
const fmtMetres = (n: number) => String(n);

/** The distance text comes from the setup rules, for example "2 to 2.5 m". */
export const distanceText = () => `${fmtMetres(SETUP_CONFIG.distanceAdviceM.min)} to ${fmtMetres(SETUP_CONFIG.distanceAdviceM.max)} m`;

/**
 * The plan of the camera and the person, seen from above, for a side view or a front view.
 * The camera is always at the bottom. In the side view the operated leg is the leg on the camera side.
 * The height of the camera (knee height) cannot show in a plan, so a label says it. Source: ux-flow 6.1, PROPOSAL.
 */
export function cameraPlan(view: CameraView, kind: GuideKind, side: Side): CameraPlan {
  const posture = POSTURE_OF[kind];
  const facing: 1 | -1 = side === 'right' ? 1 : -1;
  const cx = PLAN.w / 2;
  const camera = { at: { x: cx, y: 130 }, w: 22, h: 14 };

  // Everything is built for the right leg and mirrored for the left leg.
  let head: CameraPlan['head'];
  let body: CameraPlan['body'];
  let legs: CameraPlan['legs'];
  if (view === 'side' && posture === 'lying') {
    head = { center: { x: 20, y: 44 }, r: 8 };
    body = { x: 28, y: 32, w: 36, h: 24, r: 10 };
    legs = [
      { leg: 'far', from: { x: 62, y: 38 }, to: { x: 124, y: 38 }, width: 11 },
      { leg: 'near', from: { x: 62, y: 50 }, to: { x: 124, y: 50 }, width: 11 },
    ];
  } else if (view === 'side') {
    head = { center: { x: cx - 8, y: 44 }, r: 8 };
    body = { x: cx - 16, y: 26, w: 16, h: 36, r: 8 };
    legs = [
      { leg: 'far', from: { x: cx - 4, y: 34 }, to: { x: cx + 14, y: 34 }, width: 9 },
      { leg: 'near', from: { x: cx - 4, y: 54 }, to: { x: cx + 14, y: 54 }, width: 9 },
    ];
  } else if (posture === 'lying') {
    head = { center: { x: cx, y: 30 }, r: 8 };
    body = { x: cx - 13, y: 38, w: 26, h: 24, r: 10 };
    legs = [
      { leg: 'near', from: { x: cx - 7, y: 58 }, to: { x: cx - 7, y: 76 }, width: 11 },
      { leg: 'far', from: { x: cx + 7, y: 58 }, to: { x: cx + 7, y: 76 }, width: 11 },
    ];
  } else {
    head = { center: { x: cx, y: 36 }, r: 8 };
    body = { x: cx - 18, y: 29, w: 36, h: 16, r: 8 };
    legs = [
      { leg: 'near', from: { x: cx - 9, y: 44 }, to: { x: cx - 9, y: 64 }, width: 9 },
      { leg: 'far', from: { x: cx + 9, y: 44 }, to: { x: cx + 9, y: 64 }, width: 9 },
    ];
  }

  const flip = facing === -1;
  const mp = (p: Point) => (flip ? mirrorPoint(p) : p);
  const mb = (b: Box) => (flip ? mirrorBox(b) : b);

  // The distance arrow stands at the left edge, from the person to the camera.
  const dFrom = { x: 10, y: view === 'side' ? 64 : 86 };
  const dTo = { x: 10, y: 130 };
  const text = distanceText();
  const near = legs.find((l) => l.leg === 'near')!;
  const label = (key: CameraPlan['labels'][number]['key'], t: string, x: number, y: number) => ({ key, text: t, box: textBox(t, x, y) });
  const mark = mp({ x: (near.from.x + near.to.x) / 2, y: (near.from.y + near.to.y) / 2 });
  const op = label('operatedLeg', 'Operated leg', 22, 86);

  return {
    view,
    posture,
    facing,
    size: { w: PLAN.w, h: PLAN.h },
    head: { center: mp(head.center), r: head.r },
    body: { ...mb(body), r: body.r },
    legs: legs.map((l) => ({ ...l, from: mp(l.from), to: mp(l.to) })),
    camera: { at: camera.at, w: camera.w, h: camera.h },
    cone: [camera.at, { x: 6, y: 22 }, { x: 144, y: 22 }],
    distance: { text, from: dFrom, to: dTo, head: arrowHead(dFrom, dTo), tail: arrowHead(dTo, dFrom) },
    kneeMark: mark,
    leader: { from: { x: mark.x, y: mark.y + 9 }, to: { x: clamp(mark.x, op.box.x + 6, op.box.x + op.box.w - 6), y: op.box.y - 1 } },
    labels: [
      label('view', view === 'side' ? 'Side view' : 'Front view', 4, 2),
      op,
      label('distance', text, 22, 106),
      label('camera', 'Camera', 88, 123),
      label('height', 'At knee height', 8, 140),
    ],
  };
}
