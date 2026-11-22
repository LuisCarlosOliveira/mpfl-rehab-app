export interface Landmark {
  x: number; // 0 to 1, fraction of image width
  y: number; // 0 to 1, fraction of image height
  visibility?: number;
}

export type Side = 'left' | 'right';

// MediaPipe `visibility` is the likelihood that a landmark is visible in the image.
// The value 0.5 is a start value. It is UNVERIFIED (research/tech.md, section 2.3).
export const MIN_VISIBILITY = 0.5;

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

type LegPoint = 'hip' | 'knee' | 'ankle' | 'heel' | 'footIndex';

const POINT_IDS: Record<Side, Record<LegPoint, number>> = {
  left: { hip: 23, knee: 25, ankle: 27, heel: 29, footIndex: 31 },
  right: { hip: 24, knee: 26, ankle: 28, heel: 30, footIndex: 32 },
};

export function pick(landmarks: Landmark[], side: Side, point: LegPoint): Landmark {
  const p = landmarks[POINT_IDS[side][point]];
  if (!p) throw new Error('Landmark list is too short');
  return p;
}

export function selectFoot(landmarks: Landmark[], side: Side): [Landmark, Landmark, Landmark] {
  return [pick(landmarks, side, 'knee'), pick(landmarks, side, 'ankle'), pick(landmarks, side, 'footIndex')];
}

export const visible = (p: Landmark) => (p.visibility ?? 1) >= MIN_VISIBILITY;

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

export function flexion(angle: number | null): number | null {
  return angle === null ? null : 180 - angle;
}
