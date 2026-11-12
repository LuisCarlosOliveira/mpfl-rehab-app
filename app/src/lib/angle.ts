export interface Landmark {
  x: number; // 0 to 1, fraction of image width
  y: number; // 0 to 1, fraction of image height
  visibility?: number;
}

export type Side = 'left' | 'right';

// MediaPipe `visibility` is the likelihood that a landmark is visible in the image.
// The value 0.5 is a start value. It is UNVERIFIED (research/tech.md, section 2.3).
export const MIN_VISIBILITY = 0.5;

// MediaPipe landmark IDs: hip, knee, ankle.
const LEG_IDS: Record<Side, [number, number, number]> = {
  left: [23, 25, 27],
  right: [24, 26, 28],
};

export function selectLeg(landmarks: Landmark[], side: Side): [Landmark, Landmark, Landmark] {
  const [h, k, a] = LEG_IDS[side];
  const hip = landmarks[h];
  const knee = landmarks[k];
  const ankle = landmarks[a];
  if (!hip || !knee || !ankle) throw new Error('Landmark list is too short');
  return [hip, knee, ankle];
}

/** The names of the landmarks of one leg that the engine reads. The heel and the foot index are the ids 29 to 32. */
export type LegPoint = 'hip' | 'knee' | 'ankle' | 'heel' | 'footIndex';

const POINT_IDS: Record<Side, Record<LegPoint, number>> = {
  left: { hip: 23, knee: 25, ankle: 27, heel: 29, footIndex: 31 },
  right: { hip: 24, knee: 26, ankle: 28, heel: 30, footIndex: 32 },
};

/** One landmark of one leg by name. Throws when the list is too short, like selectLeg. */
export function pick(landmarks: Landmark[], side: Side, point: LegPoint): Landmark {
  const p = landmarks[POINT_IDS[side][point]];
  if (!p) throw new Error('Landmark list is too short');
  return p;
}

/** Knee, ankle and foot index of one leg: the three points of the ankle angle. */
export function selectFoot(landmarks: Landmark[], side: Side): [Landmark, Landmark, Landmark] {
  return [pick(landmarks, side, 'knee'), pick(landmarks, side, 'ankle'), pick(landmarks, side, 'footIndex')];
}

export const visible = (p: Landmark) => (p.visibility ?? 1) >= MIN_VISIBILITY;

/**
 * Interior angle at the knee in degrees. 180 means a straight leg.
 * `aspect` is video width divided by video height. Landmarks are normalized
 * to width and height, so x must be scaled before the math.
 * Returns null if a landmark is hidden or a segment has zero length.
 */
export function kneeAngle(hip: Landmark, knee: Landmark, ankle: Landmark, aspect: number): number | null {
  if (!visible(hip) || !visible(knee) || !visible(ankle)) return null;
  const ux = (hip.x - knee.x) * aspect;
  const uy = hip.y - knee.y;
  const vx = (ankle.x - knee.x) * aspect;
  const vy = ankle.y - knee.y;
  const norm = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  if (norm === 0) return null;
  const cos = Math.min(1, Math.max(-1, (ux * vx + uy * vy) / norm));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Knee flexion in degrees. 0 means full extension. */
export function flexion(angle: number | null): number | null {
  return angle === null ? null : 180 - angle;
}
