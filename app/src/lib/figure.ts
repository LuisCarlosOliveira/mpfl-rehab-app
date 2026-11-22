// Figure geometry for the position guide (FR28) and the camera guide. Pure data. The UI renders it as SVG.
// Design: research/ux-flow.md section 7.5. No photo and no video of a person.
// The picture is a side view of a person: head, torso, thigh, shank and foot with real thickness.
// The view box is cropped to the content. The label size follows the width of the view box,
// so a label is about 15 pixels high at a rendered width of 300 pixels (see MIN_LABEL_PX).
// All numbers here only shape the drawing. They are PROPOSAL values and not clinical values.
// The knee angle that a patient sees comes from the exercise data of the protocol, never from this file.
import type { Side } from './angle';
import type { AnyGuideKind } from './guides';
import { SETUP_CONFIG } from './setupRules';

export type FigureFrame = 'start' | 'end';

/** Who the drawn leg is: the operated leg of the protocol, or the other leg that the person chose in Setup (L1-06). */
export type LegLegend = 'operated' | 'chosen';
export const LEG_LEGEND_TEXT: Record<LegLegend, string> = { operated: 'Operated leg', chosen: 'Your chosen leg' };
/** The legend for the leg that the person chose, against the operated side of the protocol. */
export const legLegend = (chosen: Side, operated: Side): LegLegend => (chosen === operated ? 'operated' : 'chosen');
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
  key: 'frame' | 'operatedLeg' | 'surface' | 'angle';
  text: string;
  /** The space that the text takes. The estimate is on the safe side. */
  box: Box;
  /** The left end of the text baseline. */
  at: Point;
}

/** A shape that a label must not touch. The test of label collisions reads these. */
export type Shape = { k: 'circle'; c: Point; r: number } | { k: 'seg'; a: Point; b: Point; r: number } | { k: 'rect'; box: Box };

export interface Body {
  points: Record<Joint, Point>;
  head: { center: Point; r: number };
  /** In drawing order: far leg first, then the torso, then the near leg, then the arm. */
  limbs: Limb[];
}

export interface Figure extends Body {
  /** The operated leg is the near leg. The UI draws it thick and dark, on top. */
  nearLeg: Side;
  /** 1 if the figure faces right in the picture, -1 if it faces left. The camera sees the operated side. */
  facing: 1 | -1;
  /** A faint copy of the start position. Only on the end frame. */
  ghost: Body | null;
  /** The movement arrow. `head` is the triangle of the arrow head. Its first point is `to`. */
  arrow: { from: Point; to: Point; head: [Point, Point, Point] };
  surface: { key: 'mat' | 'chair' | 'counter'; rects: (Box & { r: number })[] };
  /** The floor line is drawn when this is set. A mat is its own floor. */
  floor: { y: number } | null;
  /** The view box. It holds the body, the surface, the arrow and every label. */
  view: Box;
  /** Label size in picture units. */
  labelSize: number;
  /** The ring on the operated knee. The legend shows the same ring. */
  kneeRing: { center: Point; r: number };
  labels: FigureLabel[];
  /** The ring in the legend of the operated leg. */
  legendRing: { center: Point; r: number };
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
    label: FigureLabel | null;
  };
}

export const VIEW = { maxFlexionDeg: 120 } as const;
/** A label must be this many pixels high at the smallest rendered width, MIN_RENDER_W. The CSS keeps the picture wider than that. */
export const MIN_LABEL_PX = 14;
export const MIN_RENDER_W = 288;
/** The label size is this many pixels at a rendered width of 300 pixels. */
const LABEL_AT_300 = 15.2;
const CHAR_W = 0.62; // PROPOSAL, width of one bold character as a share of the label size. The browser check confirms it.
const GAP = 1.5; // the free space between a label and a shape, in picture units
const PAD = 5;

const POSTURE_OF: Record<AnyGuideKind, 'lying' | 'upright'> = {
  'heel-slide': 'lying',
  'straight-leg-raise': 'lying',
  'mini-squat': 'upright',
  'seated-extension-hold': 'upright',
  'quad-set': 'lying',
  'gluteal-set': 'lying',
  'ankle-pump': 'lying',
  'leg-raise-side': 'lying',
  'leg-raise-back': 'upright',
};

// Illustrative end-frame knee flexion in degrees. It shows the movement. It is not a target or a limit.
// The protocol sets the real limit (clinical.md section 9). A number in the exercise data replaces it.
export const ILLUSTRATIVE_FLEXION: Record<AnyGuideKind, number> = {
  'heel-slide': 60, // PROPOSAL, same as the example target of example-protocol.json (PROPOSAL there)
  'straight-leg-raise': 0, // clinical.md section 4: knee at 0 degrees, SLR without lag (S1)
  'mini-squat': 30, // PROPOSAL, inside the borrowed range 0 to 50 degrees (clinical.md section 4, S16). Not a limit.
  // T3: the seated hold has no illustrative end angle. Without an angle from the protocol, the end frame shows the start pose
  // (the knee bent at SEATED_REST) and no arc. P1 and P2 rec 29 avoid open-chain extension to full extension early.
  'seated-extension-hold': 90,
  // The five new exercises keep the knee straight in the drawing. They draw no knee number.
  'quad-set': 0,
  'gluteal-set': 0,
  'ankle-pump': 0,
  'leg-raise-side': 0,
  'leg-raise-back': 0,
};

// Drawing only, PROPOSAL. The shank of a seated person hangs at a right angle. The start pose of the hold is at least
// SEATED_LIFT degrees more bent than the end pose, so the foot lifts toward the hold angle and never past it.
const SEATED_REST = 90;
const SEATED_LIFT = 10;

// The knee angle in the exercise data replaces the illustrative value for these exercises only.
const USES_DATA_ANGLE: Record<AnyGuideKind, boolean> = {
  'heel-slide': true,
  'straight-leg-raise': false, // the knee stays straight
  'mini-squat': true,
  'seated-extension-hold': true,
  'quad-set': false,
  'gluteal-set': false,
  'ankle-pump': false,
  'leg-raise-side': false,
  'leg-raise-back': false,
};

// Segment lengths and thickness in picture units. PROPOSAL, only for the drawing.
const SEG = 27;
const TRUNK = 30;
const FOOT = 11;
const ARM = 20;
const HEAD_R = 10;
const HEAD_GAP = 14.5;
const W = {
  torso: 18,
  arm: 7,
  near: { thigh: 14, shank: 11, foot: 8 },
  far: { thigh: 11, shank: 9, foot: 7 },
} as const;
const MAT_TOP = 65;
const MAT_H = 16;
const STAND_FLOOR = 122;
const MIRROR_AXIS = 75;
const ARC_RADIUS = 26;
const RING_R = 9;
const FLOOR_EDGE = -500; // the floor line is an obstacle that runs far to both sides, so it never sets the view box

const rad = (deg: number) => (deg * Math.PI) / 180;
const vec = (deg: number, len: number): Point => ({ x: len * Math.cos(rad(deg)), y: len * Math.sin(rad(deg)) });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** The space of a text. The top left corner is `x`, `y`. The baseline lies at y plus the size. */
export function labelBox(text: string, size: number, x: number, y: number): Box {
  return { x, y, w: round1(text.length * CHAR_W * size), h: round1(size * 1.3) };
}
const labelOf = (key: FigureLabel['key'], text: string, size: number, x: number, y: number): FigureLabel => ({
  key,
  text,
  box: labelBox(text, size, x, y),
  at: { x, y: y + size },
});

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
  /** The hand rests here. The elbow follows from the arm lengths and lies below. No hand means no arm. */
  hand?: Point;
}

// Isosceles pose with the heel on a surface: the thigh rises by half of the flexion.
const slideThigh = (flexion: number) => -flexion / 2;

function poseFor(kind: AnyGuideKind, frame: FigureFrame, flex: number, hasAngle: boolean): Pose {
  const end = frame === 'end';
  switch (kind) {
    case 'heel-slide': {
      const f = end ? flex : 0;
      return {
        hip: { x: 60, y: 56 }, trunkDir: 180, thighDir: slideThigh(f), flexion: f, footDir: -90,
        farThighDir: 0, farFlexion: 0, farOffset: { x: 0, y: 1.5 }, farFootDir: -90,
      };
    }
    case 'straight-leg-raise':
      // PROPOSAL: a hip flexion of 30 degrees is the lower end of the PROPOSAL range 30 to 45 degrees (clinical.md section 4).
      return {
        hip: { x: 60, y: 56 }, trunkDir: 180, thighDir: end ? -30 : 0, flexion: 0,
        farThighDir: slideThigh(90), farFlexion: 90, farOffset: { x: 0, y: 0 }, farFootDir: 0,
      };
    case 'mini-squat': {
      const f = end ? flex : 0;
      // Both feet stay in place. The hip lowers, the knee moves forward and the trunk leans a little.
      const hip = { x: 26, y: 118 - 2 * SEG * Math.cos(rad(f / 2)) };
      return {
        hip, trunkDir: -90 + 0.4 * f, thighDir: 90 - f / 2, flexion: f, footDir: 0,
        farThighDir: 90 - f / 2, farFlexion: f, farOffset: { x: -5, y: 0 }, farFootDir: 0,
        hand: { x: 58, y: 63 },
      };
    }
    // The five new poses are a PROPOSAL for the drawing only. No source gives an angle for them.
    case 'quad-set':
    case 'gluteal-set':
      // Supine, both legs straight. The towel roll of the quad set is a surface rectangle under the knee.
      return {
        hip: { x: 60, y: 56 }, trunkDir: 180, thighDir: 0, flexion: 0, footDir: -90,
        farThighDir: 0, farFlexion: 0, farOffset: { x: 0, y: 1.5 }, farFootDir: -90,
      };
    case 'ankle-pump':
      // The leg stays straight. The foot points up toward the person at the start and away from the person at the end.
      return {
        hip: { x: 60, y: 56 }, trunkDir: 180, thighDir: 0, flexion: 0, footDir: end ? 20 : -110,
        farThighDir: 0, farFlexion: 0, farOffset: { x: 0, y: 1.5 }, farFootDir: -90,
      };
    case 'leg-raise-side':
      // Side-lying, seen from the front (N-05). The body lies across the picture. The lower leg (far) rests on the mat.
      // The top leg (near) starts on top of it, so the hip of the top leg is above the hip of the lower leg. It opens away from the lower leg.
      // The top hand rests on the mat in front of the body, as the guide says.
      return {
        hip: { x: 60, y: 54 }, trunkDir: 180, thighDir: end ? -35 : 0, flexion: 0, footDir: end ? -125 : -90,
        farThighDir: 0, farFlexion: 0, farOffset: { x: 0, y: 6.5 }, farFootDir: -90,
        hand: { x: 64, y: 60 },
      };
    case 'leg-raise-back':
      // Standing side-on. The near leg goes back behind the body. The other leg and the hand stay in place.
      return {
        hip: { x: 26, y: 64 }, trunkDir: -90, thighDir: end ? 115 : 90, flexion: 0, footDir: end ? 90 : 0,
        farThighDir: 90, farFlexion: 0, farOffset: { x: 4, y: 0 }, farFootDir: 0,
        hand: { x: 58, y: 63 },
      };
    case 'seated-extension-hold':
      return {
        // The foot stays at a right angle to the shank (the default foot direction).
        hip: { x: 72, y: 89.5 }, trunkDir: -90, thighDir: 0,
        flexion: end ? flex : hasAngle ? clamp(Math.max(SEATED_REST, flex + SEATED_LIFT), 0, VIEW.maxFlexionDeg) : SEATED_REST,
        farThighDir: 0, farFlexion: 90, farOffset: { x: -4, y: 3 }, farFootDir: 0,
        hand: { x: 66, y: 93 },
      };
  }
}

type Rect = Box & { r: number };
const MAT: Rect = { x: 1, y: MAT_TOP, w: 124, h: MAT_H, r: 5 };
const SURFACE: Record<AnyGuideKind, { key: Figure['surface']['key']; rects: Rect[] }> = {
  'heel-slide': { key: 'mat', rects: [{ x: 1, y: MAT_TOP, w: 124, h: MAT_H, r: 5 }] },
  'straight-leg-raise': { key: 'mat', rects: [{ x: 1, y: MAT_TOP, w: 124, h: MAT_H, r: 5 }] },
  'mini-squat': { key: 'counter', rects: [{ x: 52, y: 67, w: 50, h: 55, r: 3 }] },
  'seated-extension-hold': {
    key: 'chair',
    rects: [
      { x: 54, y: 96, w: 44, h: 6, r: 2 }, // seat
      { x: 54, y: 52, w: 6, h: 44, r: 2 }, // back
      { x: 54, y: 102, w: 6, h: 20, r: 1 }, // back leg
      { x: 90, y: 102, w: 6, h: 20, r: 1 }, // front leg
    ],
  },
  'quad-set': { key: 'mat', rects: [MAT, { x: 80, y: 60, w: 14, h: 5, r: 2.5 }] }, // the second rectangle is the towel roll under the knee
  'gluteal-set': { key: 'mat', rects: [MAT] },
  'ankle-pump': { key: 'mat', rects: [MAT] },
  'leg-raise-side': { key: 'mat', rects: [MAT] },
  'leg-raise-back': { key: 'counter', rects: [{ x: 52, y: 67, w: 50, h: 55, r: 3 }] },
};
const SURFACE_TEXT = { mat: 'Bed or mat', counter: 'Counter', chair: 'Chair' } as const;
/** Where the surface name sits, as the centre of its text in the picture that faces right. It sits inside the surface. */
const SURFACE_LABEL_AT: Record<AnyGuideKind, Point> = {
  'heel-slide': { x: 32, y: MAT_TOP + MAT_H / 2 },
  'straight-leg-raise': { x: 32, y: MAT_TOP + MAT_H / 2 },
  'mini-squat': { x: 77, y: 96 },
  'seated-extension-hold': { x: 75, y: 112 },
  'quad-set': { x: 32, y: MAT_TOP + MAT_H / 2 },
  'gluteal-set': { x: 32, y: MAT_TOP + MAT_H / 2 },
  'ankle-pump': { x: 32, y: MAT_TOP + MAT_H / 2 },
  'leg-raise-side': { x: 90, y: MAT_TOP + MAT_H / 2 + 2 },
  'leg-raise-back': { x: 77, y: 96 },
};

// Where the arrow runs, in the picture that faces right. The start and the end frame use the same arrow.
const ARROW: Record<AnyGuideKind, { from: Point; to: Point }> = {
  'heel-slide': { from: { x: 116, y: MAT_TOP + MAT_H / 2 }, to: { x: 86, y: MAT_TOP + MAT_H / 2 } }, // the heel slides along the surface toward the buttock
  'straight-leg-raise': { from: { x: 122, y: 52 }, to: { x: 122, y: 22 } }, // the leg goes up
  'mini-squat': { from: { x: 4, y: 30 }, to: { x: 4, y: 58 } }, // the hips go down
  'seated-extension-hold': { from: { x: 138, y: 106 }, to: { x: 138, y: 78 } }, // the foot goes up
  'quad-set': { from: { x: 87, y: 28 }, to: { x: 87, y: 46 } }, // the knee presses down toward the towel
  'gluteal-set': { from: { x: 62, y: 28 }, to: { x: 62, y: 46 } }, // the squeeze is at the buttocks
  'ankle-pump': { from: { x: 128, y: 36 }, to: { x: 128, y: 58 } }, // the toes go down and up
  'leg-raise-side': { from: { x: 122, y: 52 }, to: { x: 122, y: 22 } }, // the top leg goes up
  'leg-raise-back': { from: { x: 4, y: 88 }, to: { x: -18, y: 88 } }, // the leg goes back
};

const FLOOR_Y: Record<AnyGuideKind, number | null> = {
  'heel-slide': null,
  'straight-leg-raise': null,
  'mini-squat': STAND_FLOOR,
  'seated-extension-hold': STAND_FLOOR,
  'quad-set': null,
  'gluteal-set': null,
  'ankle-pump': null,
  'leg-raise-side': null,
  'leg-raise-back': STAND_FLOOR,
};

function arrowHead(from: Point, to: Point): [Point, Point, Point] {
  const dir = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return [to, add(to, vec(dir + 150, 8)), add(to, vec(dir - 150, 8))];
}

const mirrorPoint = (p: Point): Point => ({ x: 2 * MIRROR_AXIS - p.x, y: p.y });
const mirrorBox = (b: Box): Box => ({ ...b, x: 2 * MIRROR_AXIS - b.x - b.w });

/** The elbow of a two-bone arm. It bulges to the back of the body, which is the natural bend for a hand that rests low. */
function elbowFor(shoulder: Point, hand: Point): Point {
  const len = Math.hypot(hand.x - shoulder.x, hand.y - shoulder.y);
  const d = clamp(len, 4, 2 * ARM - 0.5);
  const h = Math.sqrt(Math.max(0, ARM * ARM - (d / 2) * (d / 2)));
  const ux = (hand.x - shoulder.x) / len;
  const uy = (hand.y - shoulder.y) / len;
  const mid = { x: shoulder.x + (ux * d) / 2, y: shoulder.y + (uy * d) / 2 };
  const a = { x: mid.x - uy * h, y: mid.y + ux * h };
  const b = { x: mid.x + uy * h, y: mid.y - ux * h };
  return a.x <= b.x ? a : b;
}

interface Built extends Body {
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
  const hand = pose.hand ?? shoulder;
  const points: Record<Joint, Point> = {
    head: add(shoulder, vec(pose.trunkDir, HEAD_GAP)),
    shoulder,
    elbow: pose.hand ? elbowFor(shoulder, hand) : shoulder,
    hand,
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
  const arm: Limb[] = pose.hand
    ? [
        { from: 'shoulder', to: 'elbow', part: 'arm', leg: 'body', width: W.arm },
        { from: 'elbow', to: 'hand', part: 'forearm', leg: 'body', width: W.arm },
      ]
    : [];
  return {
    points,
    head: { center: points.head, r: HEAD_R },
    limbs: [...leg('far'), { from: 'shoulder', to: 'hip', part: 'torso', leg: 'body', width: W.torso }, ...leg('near'), ...arm],
    shankDir,
    thighDir: pose.thighDir,
  };
}

// ---------------------------------------------------------------------------------------------
// Shapes and the distance from a label box to a shape.
// ---------------------------------------------------------------------------------------------

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function pointBoxDist(p: Point, b: Box): number {
  const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.w));
  const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.h));
  return Math.hypot(dx, dy);
}

function pointSegDist(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  const t = l2 === 0 ? 0 : clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2, 0, 1);
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

function segCrossesBox(a: Point, b: Point, box: Box): boolean {
  let t0 = 0;
  let t1 = 1;
  const d = { x: b.x - a.x, y: b.y - a.y };
  const edges: [number, number][] = [
    [-d.x, a.x - box.x],
    [d.x, box.x + box.w - a.x],
    [-d.y, a.y - box.y],
    [d.y, box.y + box.h - a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
      if (t0 > t1) return false;
    }
  }
  return true;
}

/** The free space between a box and a shape. Zero or less means that they touch. */
export function boxShapeGap(box: Box, s: Shape): number {
  if (s.k === 'circle') return pointBoxDist(s.c, box) - s.r;
  if (s.k === 'seg') {
    if (segCrossesBox(s.a, s.b, box)) return -s.r;
    const corners: Point[] = [
      { x: box.x, y: box.y },
      { x: box.x + box.w, y: box.y },
      { x: box.x, y: box.y + box.h },
      { x: box.x + box.w, y: box.y + box.h },
    ];
    const near = Math.min(pointBoxDist(s.a, box), pointBoxDist(s.b, box), ...corners.map((c) => pointSegDist(c, s.a, s.b)));
    return near - s.r;
  }
  const dx = Math.max(s.box.x - (box.x + box.w), box.x - (s.box.x + s.box.w), 0);
  const dy = Math.max(s.box.y - (box.y + box.h), box.y - (s.box.y + s.box.h), 0);
  return Math.hypot(dx, dy);
}

const hits = (box: Box, shapes: Shape[], gap = GAP) => shapes.some((s) => boxShapeGap(box, s) < gap);

function bodyShapes(b: Body): Shape[] {
  return [
    ...b.limbs.map((l): Shape => ({ k: 'seg', a: b.points[l.from], b: b.points[l.to], r: l.width / 2 })),
    { k: 'circle', c: b.head.center, r: b.head.r },
  ];
}

function shapeBounds(s: Shape): Box {
  if (s.k === 'circle') return { x: s.c.x - s.r, y: s.c.y - s.r, w: 2 * s.r, h: 2 * s.r };
  if (s.k === 'rect') return s.box;
  const x = Math.min(s.a.x, s.b.x) - s.r;
  const y = Math.min(s.a.y, s.b.y) - s.r;
  return { x, y, w: Math.max(s.a.x, s.b.x) + s.r - x, h: Math.max(s.a.y, s.b.y) + s.r - y };
}

export function unionBox(boxes: Box[]): Box {
  const x0 = Math.min(...boxes.map((b) => b.x));
  const y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w));
  const y1 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const inside = (b: Box, outer: Box) => b.x >= outer.x - 0.01 && b.y >= outer.y - 0.01 && b.x + b.w <= outer.x + outer.w + 0.01 && b.y + b.h <= outer.y + outer.h + 0.01;

/** The first box in the list that touches no shape and lies inside `within`. Null if none fits. */
function firstFree(boxes: Box[], shapes: Shape[], within: Box | null): Box | null {
  return boxes.find((b) => (within === null || inside(b, within)) && !hits(b, shapes)) ?? null;
}

/** True when the whole box lies in the wedge between the thigh line and the shank, clear of the knee ring. */
function insideWedge(b: Box, arc: Pick<Figure['kneeArc'], 'center' | 'fromDeg' | 'toDeg' | 'radius'>): boolean {
  const delta = ((arc.toDeg - arc.fromDeg + 540) % 360) - 180;
  const corners: Point[] = [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x, y: b.y + b.h },
    { x: b.x + b.w, y: b.y + b.h },
  ];
  return corners.every((c) => {
    const r = dist(c, arc.center);
    const deg = (Math.atan2(c.y - arc.center.y, c.x - arc.center.x) * 180) / Math.PI;
    const t = (((deg - arc.fromDeg + 540) % 360) - 180) / delta;
    return r > RING_R + GAP && r < arc.radius - 2 && t > 0.03 && t < 0.97;
  });
}

const seg = (a: Point, b: Point, r: number): Shape => ({ k: 'seg', a, b, r });

/** The arc of the knee as short segments. A label can sit inside the arc, but it must not touch the stroke. */
function arcSegments(arc: Pick<Figure['kneeArc'], 'center' | 'fromDeg' | 'toDeg' | 'radius'>): Shape[] {
  const delta = ((arc.toDeg - arc.fromDeg + 540) % 360) - 180;
  const at = (i: number) => add(arc.center, vec(arc.fromDeg + (delta * i) / 12, arc.radius));
  return Array.from({ length: 12 }, (_, i): Shape => ({ k: 'seg', a: at(i), b: at(i + 1), r: 1.5 }));
}

/** Every shape of a figure that an outside label must not touch. The surface rectangles are included. */
export function obstaclesOf(f: Pick<Figure, 'limbs' | 'points' | 'head' | 'ghost' | 'arrow' | 'surface' | 'kneeArc' | 'kneeRing' | 'floor'>): Shape[] {
  return [
    ...bodyShapes(f),
    ...(f.ghost ? bodyShapes(f.ghost) : []),
    { k: 'seg', a: f.arrow.from, b: f.arrow.to, r: 1.5 },
    { k: 'circle', c: f.arrow.to, r: 5 },
    { k: 'circle', c: f.kneeRing.center, r: f.kneeRing.r },
    ...(f.kneeArc.flexionDeg > 0 ? [...arcSegments(f.kneeArc), seg(f.kneeArc.reference.from, f.kneeArc.reference.to, 1)] : []),
    ...f.surface.rects.map((r): Shape => ({ k: 'rect', box: r })),
    ...(f.floor ? [seg({ x: FLOOR_EDGE, y: f.floor.y }, { x: -FLOOR_EDGE, y: f.floor.y }, 0.75)] : []),
  ];
}

/** Boxes of one text around a centre. The first box is the best one. */
function aroundBoxes(text: string, size: number, centre: Point, bearingDeg: number, dists: number[]): Box[] {
  const base = labelBox(text, size, 0, 0);
  const turns = [0, -30, 30, -60, 60, -90, 90, -130, 130, 180];
  return dists.flatMap((d) =>
    turns.map((t) => {
      const c = add(centre, vec(bearingDeg + t, d));
      return { ...base, x: c.x - base.w / 2, y: c.y - base.h / 2 };
    }),
  );
}

/**
 * Joint points, limbs, ghost, arrow, surface, labels and knee arc for one key frame. The operated leg is the near leg.
 * `kneeDeg` is the knee angle of the exercise data. It sets the drawn end position and the number on the arc.
 * Without it the drawing uses an illustrative angle and shows no number.
 */
export function figureFor(kind: AnyGuideKind, frame: FigureFrame, side: Side, kneeDeg?: number, legend: LegLegend = 'operated'): Figure {
  const given = kneeDeg === undefined ? undefined : clamp(Math.round(kneeDeg), 0, VIEW.maxFlexionDeg);
  const hasAngle = USES_DATA_ANGLE[kind] && given !== undefined;
  const flex = hasAngle ? given! : ILLUSTRATIVE_FLEXION[kind];
  // The arc shows the angle of the protocol. The seated hold has no other angle to show.
  const noArc = kind === 'seated-extension-hold' && !hasAngle;
  const facing: 1 | -1 = side === 'right' ? 1 : -1;
  const mp = (p: Point) => (facing === 1 ? p : mirrorPoint(p));
  const mb = (b: Box) => (facing === 1 ? b : mirrorBox(b));
  const mapBody = (b: Body): Body => ({
    ...b,
    points: Object.fromEntries(Object.entries(b.points).map(([k, p]) => [k, mp(p)])) as Record<Joint, Point>,
    head: { center: mp(b.head.center), r: b.head.r },
  });
  const dir = (deg: number) => (facing === 1 ? deg : 180 - deg);
  const surfaceDef = SURFACE[kind];
  const surface = { key: surfaceDef.key, rects: surfaceDef.rects.map((r) => ({ ...mb(r), r: r.r })) };
  const floor = FLOOR_Y[kind] === null ? null : { y: FLOOR_Y[kind]! };
  const arrowFrom = mp(ARROW[kind].from);
  const arrowTo = mp(ARROW[kind].to);
  const arrow = { from: arrowFrom, to: arrowTo, head: arrowHead(arrowFrom, arrowTo) };

  /** Everything that one frame draws, in final picture coordinates. */
  const parts = (fr: FigureFrame) => {
    const now = build(poseFor(kind, fr, flex, hasAngle));
    const body = mapBody(now);
    const ghost = fr === 'end' ? mapBody(build(poseFor(kind, 'start', flex, hasAngle))) : null;
    const arc = {
      center: body.points.knee,
      fromDeg: dir(now.thighDir),
      toDeg: dir(now.shankDir),
      radius: ARC_RADIUS,
      flexionDeg: noArc ? 0 : fr === 'end' ? flex : poseFor(kind, fr, flex, hasAngle).flexion,
      reference: { from: body.points.knee, to: mp(add(now.points.knee, vec(now.thighDir, 30))) },
    };
    const kneeRing = { center: body.points.knee, r: RING_R };
    const shapes = obstaclesOf({ ...body, ghost, arrow, surface, floor, kneeArc: { ...arc, label: null }, kneeRing });
    return { now, body, ghost, arc, kneeRing, shapes };
  };
  const here = parts(frame);
  const { body, ghost, kneeRing, shapes } = here;
  const kneeArcBase = here.arc;

  // The body box holds both frames, so the start and the end picture have one size and one scale.
  const box = (pt: ReturnType<typeof parts>) =>
    unionBox([
      ...pt.shapes.filter((s) => !(s.k === 'seg' && s.a.x === FLOOR_EDGE)).map(shapeBounds),
    ]);
  const bodyBox = unionBox([box(parts('start')), box(parts('end'))]);
  const box0: Box = { x: bodyBox.x - PAD, y: bodyBox.y - PAD, w: bodyBox.w + 2 * PAD, h: bodyBox.h + 2 * PAD };
  // The label size follows the width of the view box, and the labels can widen the box. So the layout runs until the size is stable.
  const layout = (size: number) => {
    // The surface name sits inside the surface.
    const surfaceText = SURFACE_TEXT[surface.key];
    const sc = mp(SURFACE_LABEL_AT[kind]);
    const sb = labelBox(surfaceText, size, 0, 0);
    const surfaceLabel = labelOf('surface', surfaceText, size, round1(sc.x - sb.w / 2), round1(sc.y - sb.h / 2));
    const placed: Shape[] = [{ k: 'rect', box: surfaceLabel.box }];

    // The knee number sits outside the arc, on the side of the bend. Only the end frame shows it.
    let arcLabel: FigureLabel | null = null;
    if (frame === 'end' && given !== undefined && USES_DATA_ANGLE[kind]) {
      const text = `${given}°`;
      const bearing = dir(here.now.thighDir + (here.now.shankDir - here.now.thighDir) / 2);
      const free = shapes.filter((s) => s.k !== 'rect');
      const outside = [ARC_RADIUS + 8, ARC_RADIUS + 14, ARC_RADIUS + 20, ARC_RADIUS + 28];
      const inWedge = [17, 19, 21, 15].map((d) => aroundBoxes(text, size, kneeArcBase.center, bearing, [d])[0]!).filter((b) => insideWedge(b, kneeArcBase));
      const picked =
        firstFree(inWedge, [...shapes, ...placed], null) ??
        firstFree(aroundBoxes(text, size, kneeArcBase.center, bearing, outside), [...shapes, ...placed], null) ??
        firstFree(aroundBoxes(text, size, kneeArcBase.center, bearing, outside), [...free, ...placed], null)!;
      arcLabel = labelOf('angle', text, size, round1(picked.x), round1(picked.y));
      placed.push({ k: 'rect', box: arcLabel.box });
    }

    // The frame word sits in a free corner of the body box. If no corner is free, a band above holds it.
    const frameText = frame === 'start' ? 'Start' : 'End';
    const fb = labelBox(frameText, size, 0, 0);
    const corners: Box[] = [
      { ...fb, x: box0.x + 1, y: box0.y + 1 },
      { ...fb, x: box0.x + box0.w - 1 - fb.w, y: box0.y + 1 },
    ];
    const cornerFree = firstFree(corners, [...shapes, ...placed], box0);
    const frameBox = cornerFree ?? { ...fb, x: box0.x + 1, y: box0.y - fb.h - 1 };
    const frameLabel = labelOf('frame', frameText, size, round1(frameBox.x), round1(frameBox.y));

    // The legend of the operated leg sits in a band below the picture. The ring is the ring of the operated knee.
    const top = Math.min(box0.y, frameLabel.box.y - 1);
    const ringR = RING_R * 0.55;
    const legendY = Math.max(box0.y + box0.h, arcLabel ? arcLabel.box.y + arcLabel.box.h : 0) + 1;
    const legendText = labelOf('operatedLeg', LEG_LEGEND_TEXT[legend], size, round1(box0.x + 2 + 2 * ringR + 3), round1(legendY));
    const legendRing = { center: { x: round1(box0.x + 2 + ringR), y: round1(legendY + legendText.box.h / 2) }, r: round1(ringR) };

    const labels = [frameLabel, legendText, surfaceLabel];
    const view = unionBox([
      { ...box0, y: top, h: box0.y + box0.h - top },
      ...labels.map((l) => l.box),
      { x: legendRing.center.x - ringR, y: legendRing.center.y - ringR, w: 2 * ringR, h: 2 * ringR },
      ...(arcLabel ? [arcLabel.box] : []),
    ]);
    view.y = round1(view.y);
    view.h = round1(view.h + 1);
    view.x = round1(view.x);
    view.w = round1(view.w);

    return { size, labels, view, legendRing, arcLabel };
  };
  let size = round1((box0.w * LABEL_AT_300) / 300);
  let done = layout(size);
  for (let i = 0; i < 6; i++) {
    const next = round1((done.view.w * LABEL_AT_300) / 300);
    if (next === size) break;
    size = next;
    done = layout(size);
  }
  const { labels, view, legendRing, arcLabel } = done;

  return {
    nearLeg: side,
    facing,
    ...body,
    ghost,
    arrow,
    surface,
    floor,
    view,
    labelSize: done.size,
    kneeRing,
    labels,
    legendRing,
    kneeArc: { ...kneeArcBase, label: arcLabel },
  };
}

// ---------------------------------------------------------------------------------------------
// Camera guide: the person in profile on one side, the phone on a small stand on the other side,
// a dashed view cone between them and the distance as a dimension line.
// Source of the rules: setupRules.ts (distance) and research/ux-flow.md section 6.1 (side, height).
// ---------------------------------------------------------------------------------------------

export type CameraView = 'side' | 'front';
export type Posture = 'lying' | 'upright';

export interface CameraPlan {
  view: CameraView;
  posture: Posture;
  /** -1 when the person faces left (side view), 1 when the person faces the phone (front view). */
  facing: 1 | -1;
  /** The operated leg is the near leg. Side view: the person faces left. Front view: the person faces the phone. */
  figure: Pick<Figure, 'points' | 'head' | 'limbs' | 'surface' | 'floor' | 'kneeRing'>;
  box: Box;
  labelSize: number;
  phone: { body: Box & { r: number }; lens: Point; lensR: number; stem: { from: Point; to: Point }; foot: { from: Point; to: Point } };
  /** The apex is the lens. The two other points close the dashed view cone. */
  cone: [Point, Point, Point];
  /** The dotted line at knee height, from the knee to the lens. */
  level: { from: Point; to: Point };
  distance: { text: string; from: Point; to: Point; head: [Point, Point, Point]; tail: [Point, Point, Point]; ticks: { from: Point; to: Point }[] };
  labels: { key: 'view' | 'operatedLeg' | 'camera' | 'height' | 'distance'; text: string; box: Box; at: Point }[];
  /** The ring of the operated leg, and the dotted line sample of the knee height, in the legend. */
  legendRing: { center: Point; r: number };
  legendLevel: { from: Point; to: Point };
}

const fmtMetres = (n: number) => String(n);

/** The distance text comes from the setup rules, for example "2 to 2.5 m". */
export const distanceText = () => `${fmtMetres(SETUP_CONFIG.distanceAdviceM.min)} to ${fmtMetres(SETUP_CONFIG.distanceAdviceM.max)} m`;

/**
 * The picture of the camera and the person. The operated leg is the leg that the camera sees.
 * The camera stands at knee height, so the lens has the height of the operated knee.
 * The distance in the picture is not to scale. The text carries the advice. Source: ux-flow 6.1, PROPOSAL.
 */
export function cameraPlan(view: CameraView, kind: AnyGuideKind, legend: LegLegend = 'operated'): CameraPlan {
  // The leg raise to the side is done side-lying. The camera is in front of the person, at hip height, close to the floor.
  // The plan draws the same lying figure as the side plan. The lens has the height of the hip, and the cone holds the whole leg.
  const hipHeight = view === 'front' && kind === 'leg-raise-side';
  const poseKind: AnyGuideKind = kind;
  const posture = POSTURE_OF[poseKind];
  const fig = figureFor(poseKind, 'start', view === 'side' ? 'left' : 'right');
  const bodyBox = unionBox([...bodyShapes(fig), ...fig.surface.rects.map((r): Shape => ({ k: 'rect', box: r }))].map(shapeBounds));
  const floorY = fig.floor?.y ?? fig.surface.rects.reduce((m, r) => Math.max(m, r.y + r.h), 0);
  const knee = hipHeight ? fig.points.hip : fig.points.knee; // the height of the lens
  const legTop = Math.min(...fig.limbs.filter((l) => l.leg === 'near').map((l) => Math.min(fig.points[l.from].y, fig.points[l.to].y))) - 8;

  // The phone stands to the right of the person, at knee height.
  const GAPX = 46;
  const px = round1(bodyBox.x + bodyBox.w + GAPX);
  const lens = { x: px - 6, y: round1(knee.y) };
  const body = { x: px - 6, y: round1(knee.y - 7), w: 12, h: 22, r: 3 };
  const stand = { from: { x: px, y: body.y + body.h }, to: { x: px, y: floorY - 1.5 } };
  const foot = { from: { x: px - 10, y: floorY - 1.5 }, to: { x: px + 10, y: floorY - 1.5 } };
  const cone: CameraPlan['cone'] = [lens, { x: bodyBox.x - 2, y: legTop }, { x: bodyBox.x - 2, y: floorY }];

  // The distance runs below the floor, from the front of the person to the stand of the phone.
  const dy = floorY + 9;
  const dFrom = { x: bodyBox.x + bodyBox.w, y: dy };
  const dTo = { x: px, y: dy };
  const text = distanceText();

  const box0 = unionBox([bodyBox, { x: px - 10, y: body.y - 2, w: 20, h: floorY - body.y + 3 }, { x: dFrom.x, y: dy - 4, w: dTo.x - dFrom.x, h: 8 }]);
  const pad: Box = { x: box0.x - PAD, y: box0.y - PAD, w: box0.w + 2 * PAD, h: box0.h + 2 * PAD };
  const size = round1((pad.w * LABEL_AT_300) / 300);

  const L = (key: CameraPlan['labels'][number]['key'], t: string, x: number, y: number) => ({ key, text: t, box: labelBox(t, size, round1(x), round1(y)), at: { x: round1(x), y: round1(y + size) } });
  const dBox = labelBox(text, size, 0, 0);
  const distanceLabel = L('distance', text, (dFrom.x + dTo.x) / 2 - dBox.w / 2, dy + 6.5);
  const cameraBox = labelBox('Camera', size, 0, 0);
  const cameraLabel = L('camera', 'Camera', Math.min(px - cameraBox.w / 2, pad.x + pad.w - cameraBox.w), body.y - cameraBox.h - 3);
  const viewText = view === 'side' ? 'Side view' : 'Front view';
  const viewLabel = L('view', viewText, pad.x + 1, pad.y - size * 1.3 - 3);

  // The legend sits in the band below. It keeps clear of the distance text.
  const legendY = dy + 6.5;
  const ringR = RING_R * 0.55;
  const legend1 = L('operatedLeg', LEG_LEGEND_TEXT[legend], pad.x + 2 + 2 * ringR + 3, legendY);
  const legend2 = L('height', hipHeight ? 'At hip height' : 'At knee height', pad.x + 2 + 2 * ringR + 3, legendY + legend1.box.h + 1);
  const legendRing = { center: { x: round1(pad.x + 2 + ringR), y: round1(legendY + legend1.box.h / 2) }, r: round1(ringR) };
  const legendLevel = { from: { x: round1(pad.x + 2), y: round1(legend2.box.y + legend2.box.h / 2) }, to: { x: round1(pad.x + 2 + 2 * ringR), y: round1(legend2.box.y + legend2.box.h / 2) } };

  const labels = [viewLabel, cameraLabel, distanceLabel, legend1, legend2];
  const all = unionBox([pad, ...labels.map((l) => l.box)]);
  const boxOut = { x: round1(all.x), y: round1(all.y), w: round1(all.w), h: round1(all.h + 1) };

  return {
    view,
    posture,
    facing: fig.facing,
    figure: { points: fig.points, head: fig.head, limbs: fig.limbs, surface: fig.surface, floor: fig.floor, kneeRing: fig.kneeRing },
    box: boxOut,
    labelSize: size,
    phone: { body, lens, lensR: 2.6, stem: stand, foot },
    cone,
    level: { from: knee, to: lens },
    distance: {
      text,
      from: dFrom,
      to: dTo,
      head: arrowHead(dFrom, dTo),
      tail: arrowHead(dTo, dFrom),
      ticks: [dFrom, dTo].map((p) => ({ from: { x: p.x, y: p.y - 4 }, to: { x: p.x, y: p.y + 4 } })),
    },
    labels,
    legendRing,
    legendLevel,
  };
}

/** The shapes of a camera plan that a label must not touch. */
export function planObstacles(p: CameraPlan): Shape[] {
  const f = p.figure;
  const segs = f.limbs.map((l): Shape => ({ k: 'seg', a: f.points[l.from], b: f.points[l.to], r: l.width / 2 }));
  return [
    ...segs,
    { k: 'circle', c: f.head.center, r: f.head.r },
    { k: 'circle', c: f.kneeRing.center, r: f.kneeRing.r },
    ...f.surface.rects.map((r): Shape => ({ k: 'rect', box: r })),
    { k: 'rect', box: p.phone.body },
    { k: 'seg', a: p.phone.stem.from, b: p.phone.stem.to, r: 1.5 },
    { k: 'seg', a: p.phone.foot.from, b: p.phone.foot.to, r: 1.5 },
    { k: 'seg', a: p.cone[0], b: p.cone[1], r: 0.75 },
    { k: 'seg', a: p.cone[0], b: p.cone[2], r: 0.75 },
    { k: 'seg', a: p.distance.from, b: p.distance.to, r: 1.5 },
    ...p.distance.ticks.map((t): Shape => ({ k: 'seg', a: t.from, b: t.to, r: 0.75 })),
  ];
}
