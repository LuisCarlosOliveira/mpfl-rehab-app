// The measures of an exercise definition (ExerciseSpec.measure). Step B of docs/exercise-monitoring-design.md.
// Each function gives null when a needed landmark is below the visibility rule of angle.ts (MIN_VISIBILITY),
// or when a segment has no length. A value is never NaN and never -0.
// Landmarks are normalised to the picture width and height. `aspect` is the video width divided by the video height.
// x is multiplied by `aspect` before the math, so the angle is the angle in square pixels.
// The error of a measure follows from the error of the points. With an error sigma on each coordinate and a segment of length L,
// the error of a segment angle is about sqrt(2) * sigma / L (radians). For sigma 0.0128 (the 9 degree model of seriesNoise.ts):
// L 0.4 gives 2.6 degrees, L 0.2 gives 5.2 degrees.

import { kneeAngle, pick, selectLeg, visible, type Landmark, type Side } from '../angle';
import type { Measure } from './spec';

/** The interior angle at `b` in degrees. 180 is straight. The same math as the knee angle of angle.ts (DRY). */
export const jointAngle = kneeAngle;

/**
 * The angle between the segment `from` to `to` and a reference direction, in degrees.
 * `vertical`: the reference is straight down in the picture. 0 hangs down, 90 is level, 180 points up.
 * `horizontal`: the SIGNED height of the segment above the horizontal line, -90 to 90. `to` above `from` in the picture is plus,
 * `to` below `from` is minus. A mirror image gives the same value, because only the size of the x distance counts.
 */
export function segmentAngle(from: Landmark, to: Landmark, against: 'vertical' | 'horizontal', aspect: number): number | null {
  if (!visible(from) || !visible(to)) return null;
  const dx = (to.x - from.x) * aspect;
  const dy = to.y - from.y;
  if (Math.hypot(dx, dy) === 0) return null;
  const deg = against === 'vertical' ? Math.atan2(Math.abs(dx), dy) : Math.atan2(-dy, Math.abs(dx));
  const out = (deg * 180) / Math.PI;
  return out === 0 ? 0 : out; // no -0
}

/** The distance of two points along one axis over a body length (a positive number in the same unit, picture width). */
export function normalisedDistance(from: Landmark, to: Landmark, axis: 'x' | 'y', bodyLength: number, aspect: number): number | null {
  if (!visible(from) || !visible(to) || !(bodyLength > 0)) return null;
  return axis === 'x' ? (Math.abs(to.x - from.x) * aspect) / bodyLength : Math.abs(to.y - from.y) / bodyLength;
}

/** The length of the leg (thigh plus shank) in picture width units. null when a point is hidden. The body length of a distance measure. */
export function legLength(pose: Landmark[], side: Side, aspect: number): number | null {
  const [hip, knee, ankle] = selectLeg(pose, side);
  if (!visible(hip) || !visible(knee) || !visible(ankle)) return null;
  return Math.hypot((hip.x - knee.x) * aspect, hip.y - knee.y) + Math.hypot((knee.x - ankle.x) * aspect, knee.y - ankle.y);
}

/**
 * The value of the measure of a definition for one frame of 33 landmarks, or null.
 * `joint-angle` gives the INTERIOR angle at the middle point (180 is straight). The caller turns the knee angle into flexion.
 * `height-gate` and `none` give null here: the gate has its own code in exercises.ts and `none` has no value.
 */
export function readMeasure(measure: Measure, pose: Landmark[], side: Side, aspect: number): number | null {
  switch (measure.kind) {
    case 'joint-angle':
      return measure.joint === 'hip-knee-ankle'
        ? jointAngle(pick(pose, side, 'hip'), pick(pose, side, 'knee'), pick(pose, side, 'ankle'), aspect)
        : jointAngle(pick(pose, side, 'knee'), pick(pose, side, 'ankle'), pick(pose, side, 'footIndex'), aspect);
    case 'segment-angle':
      return segmentAngle(pick(pose, side, measure.from), pick(pose, side, measure.to), measure.against, aspect);
    case 'distance': {
      const len = legLength(pose, side, aspect);
      return len === null ? null : normalisedDistance(pick(pose, side, measure.from), pick(pose, side, measure.to), measure.axis, len, aspect);
    }
    default:
      return null;
  }
}

/** What the lift to the back needs to tell backward from forward. See createLiftDriver. */
export interface DirectionAux {
  /** The foot index minus the ankle along x, in square pixels. The foot points forward at rest. null when the foot is not seen. */
  footDx: number | null;
  /** The knee minus the hip along x, in square pixels. */
  kneeDx: number;
  /**
   * The hip to hip distance along x over the torso length (hip middle to shoulder middle), both in square pixels.
   * A person who is side-on gives about 0 to 0.15, a person who faces the camera 0.3 to 0.4. null when a hip or a shoulder is hidden.
   */
  width: number | null;
}

/** The width of the hips over the torso length. See DirectionAux.width. */
export function hipWidth(pose: Landmark[], aspect: number): number | null {
  const [ls, rs, lh, rh] = [pose[11], pose[12], pose[23], pose[24]];
  if (!ls || !rs || !lh || !rh || ![ls, rs, lh, rh].every(visible)) return null;
  const torso = Math.hypot(((ls.x + rs.x - lh.x - rh.x) / 2) * aspect, (ls.y + rs.y - lh.y - rh.y) / 2);
  return torso > 0 ? (Math.abs(lh.x - rh.x) * aspect) / torso : null;
}

/** The direction data of one frame, or null when the hip or the knee is hidden. */
export function directionAux(pose: Landmark[], side: Side, aspect: number): DirectionAux | null {
  const hip = pick(pose, side, 'hip');
  const knee = pick(pose, side, 'knee');
  if (!visible(hip) || !visible(knee)) return null;
  const ankle = pick(pose, side, 'ankle');
  const foot = pick(pose, side, 'footIndex');
  return { footDx: visible(ankle) && visible(foot) ? (foot.x - ankle.x) * aspect : null, kneeDx: (knee.x - hip.x) * aspect, width: hipWidth(pose, aspect) };
}
