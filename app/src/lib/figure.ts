// Stick-figure geometry for the position guide (FR28). Pure data. The UI renders it as SVG.
// Design: research/ux-flow.md section 7.5. No image and no video of a person. The viewBox is 0 to 100.
import type { Side } from './angle';
import type { GuideKind } from './guides';

export type FigureFrame = 'start' | 'end';
export interface Point {
  x: number;
  y: number;
}
export type Joint = 'head' | 'shoulder' | 'hip' | 'knee' | 'ankle' | 'toe' | 'farKnee' | 'farAnkle' | 'farToe';

export interface Figure {
  /** The operated leg is the near leg. The UI draws it thick and on top. */
  nearLeg: Side;
  /** 1 if the figure faces right in the picture, -1 if it faces left. The camera sees the operated side. */
  facing: 1 | -1;
  points: Record<Joint, Point>;
  /** Pairs of joints to join. `limb` tells the UI the line style. */
  lines: { from: Joint; to: Joint; limb: 'body' | 'near' | 'far' }[];
  floorY: number;
  /** A chair or a counter. Absent for a mat or a bed, which the floor line stands for. */
  support?: { key: 'chair' | 'counter'; x: number; y: number; w: number; h: number };
  camera: Point;
  /** Label keys, not text. The UI maps a key to its text. */
  labels: { key: 'operatedLeg' | 'camera' | 'support' | 'start' | 'end'; at: Point }[];
  /** The arc at the near knee. `flexionDeg` is the drawn knee flexion. Angles are screen degrees, y down. */
  kneeArc: { center: Point; fromDeg: number; toDeg: number; radius: number; flexionDeg: number; labelKey: 'kneeLimit' };
}

// Illustrative end-frame knee flexion in degrees. It shows the movement. It is not a target or a limit.
// The protocol sets the real limit (clinical.md section 9).
export const ILLUSTRATIVE_FLEXION: Record<GuideKind, number> = {
  'heel-slide': 60, // PROPOSAL, same as the example target of example-protocol.json (PROPOSAL there)
  'straight-leg-raise': 0, // clinical.md section 4: knee at 0 degrees, SLR without lag (S1)
  'mini-squat': 30, // PROPOSAL, inside the borrowed range 0 to 50 degrees (clinical.md section 4, S16). Not a limit.
  'seated-extension-hold': 0, // PROPOSAL, ux-flow 7.4: straighten the knee
};

// Segment lengths in viewBox units. PROPOSAL, only for the drawing.
const TRUNK = 28;
const SEGMENT = 22;
const FOOT = 8;
const HEAD = 9;
const CAMERA: Point = { x: 50, y: 94 }; // PROPOSAL: the camera is in front of the picture. It is the same for both sides.

const rad = (deg: number) => (deg * Math.PI) / 180;
const vec = (deg: number, len: number): Point => ({ x: len * Math.cos(rad(deg)), y: len * Math.sin(rad(deg)) });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

// Directions are screen degrees with the figure facing right: 0 is right, 90 is down, -90 is up.
interface Pose {
  hip: Point;
  trunkDir: number;
  thighDir: number;
  flexion: number;
  farThighDir: number;
  farFlexion: number;
  farOffset: Point;
}

// Isosceles pose with the heel on a surface: the thigh rises by half of the flexion.
const slideThigh = (flexion: number) => -flexion / 2;

function poseFor(kind: GuideKind, frame: FigureFrame): Pose {
  const end = frame === 'end';
  const flex = ILLUSTRATIVE_FLEXION[kind];
  switch (kind) {
    case 'heel-slide': {
      const f = end ? flex : 0;
      return { hip: { x: 44, y: 76 }, trunkDir: 180, thighDir: slideThigh(f), flexion: f, farThighDir: 0, farFlexion: 0, farOffset: { x: 0, y: 2 } };
    }
    case 'straight-leg-raise':
      // PROPOSAL: a hip flexion of 40 degrees is in the PROPOSAL range of 30 to 45 degrees (clinical.md section 4).
      return {
        hip: { x: 44, y: 76 },
        trunkDir: 180,
        thighDir: end ? -40 : 0,
        flexion: flex,
        farThighDir: slideThigh(90),
        farFlexion: 90,
        farOffset: { x: 0, y: 0 },
      };
    case 'mini-squat': {
      const f = end ? flex : 0;
      // Both feet stay at x = 50. The hip lowers and the knee moves forward.
      const hip = { x: 50, y: 88 - 2 * SEGMENT * Math.cos(rad(f / 2)) };
      return { hip, trunkDir: -90, thighDir: 90 - f / 2, flexion: f, farThighDir: 90 - f / 2, farFlexion: f, farOffset: { x: -4, y: 0 } };
    }
    case 'seated-extension-hold':
      return { hip: { x: 40, y: 56 }, trunkDir: -90, thighDir: 0, flexion: end ? flex : 90, farThighDir: 0, farFlexion: 90, farOffset: { x: 0, y: 3 } };
  }
}

const SUPPORT: Partial<Record<GuideKind, NonNullable<Figure['support']>>> = {
  'mini-squat': { key: 'counter', x: 72, y: 56, w: 20, h: 34 },
  'seated-extension-hold': { key: 'chair', x: 30, y: 60, w: 26, h: 22 },
};

const FLOOR_Y: Record<GuideKind, number> = { 'heel-slide': 80, 'straight-leg-raise': 80, 'mini-squat': 90, 'seated-extension-hold': 82 };

/** Joint points, lines, camera, labels and knee arc for one key frame. The operated leg is the near leg. */
export function figureFor(kind: GuideKind, frame: FigureFrame, side: Side): Figure {
  const pose = poseFor(kind, frame);
  const shankDir = pose.thighDir + pose.flexion;
  const farShankDir = pose.farThighDir + pose.farFlexion;

  const shoulder = add(pose.hip, vec(pose.trunkDir, TRUNK));
  const knee = add(pose.hip, vec(pose.thighDir, SEGMENT));
  const ankle = add(knee, vec(shankDir, SEGMENT));
  const farHip = add(pose.hip, pose.farOffset);
  const farKnee = add(farHip, vec(pose.farThighDir, SEGMENT));
  const farAnkle = add(farKnee, vec(farShankDir, SEGMENT));
  const raw: Record<Joint, Point> = {
    head: add(shoulder, vec(pose.trunkDir, HEAD)),
    shoulder,
    hip: pose.hip,
    knee,
    ankle,
    toe: add(ankle, vec(shankDir - 90, FOOT)),
    farKnee,
    farAnkle,
    farToe: add(farAnkle, vec(farShankDir - 90, FOOT)),
  };

  // A person who faces right shows the right side to the camera, so the left leg needs a mirrored picture.
  const facing: 1 | -1 = side === 'right' ? 1 : -1;
  const mx = (x: number) => (facing === 1 ? x : 100 - x);
  const place = (p: Point): Point => ({ x: mx(p.x), y: p.y });
  const dir = (deg: number) => (facing === 1 ? deg : 180 - deg);

  const points = Object.fromEntries(Object.entries(raw).map(([name, p]) => [name, place(p)])) as Record<Joint, Point>;
  const rawSupport = SUPPORT[kind];
  const support = rawSupport && { ...rawSupport, x: facing === 1 ? rawSupport.x : 100 - rawSupport.x - rawSupport.w };
  const supportMid = support && { x: support.x + support.w / 2, y: support.y + support.h / 2 };

  const labels: Figure['labels'] = [
    { key: 'operatedLeg', at: points.knee },
    { key: 'camera', at: CAMERA },
    { key: frame, at: { x: 50, y: 6 } },
  ];
  if (supportMid) labels.push({ key: 'support', at: supportMid });

  return {
    nearLeg: side,
    facing,
    points,
    lines: [
      { from: 'head', to: 'shoulder', limb: 'body' },
      { from: 'shoulder', to: 'hip', limb: 'body' },
      { from: 'hip', to: 'farKnee', limb: 'far' },
      { from: 'farKnee', to: 'farAnkle', limb: 'far' },
      { from: 'farAnkle', to: 'farToe', limb: 'far' },
      { from: 'hip', to: 'knee', limb: 'near' },
      { from: 'knee', to: 'ankle', limb: 'near' },
      { from: 'ankle', to: 'toe', limb: 'near' },
    ],
    floorY: FLOOR_Y[kind],
    support,
    camera: CAMERA,
    labels,
    kneeArc: {
      center: points.knee,
      fromDeg: dir(pose.thighDir + 180),
      toDeg: dir(shankDir),
      radius: 8,
      flexionDeg: pose.flexion,
      labelKey: 'kneeLimit',
    },
  };
}
