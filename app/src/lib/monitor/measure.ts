import { kneeAngle, pick, selectLeg, visible, type Landmark, type Side } from '../angle';
import type { Measure } from './spec';

export const jointAngle = kneeAngle;

export function segmentAngle(from: Landmark, to: Landmark, against: 'vertical' | 'horizontal', aspect: number): number | null {
  if (!visible(from) || !visible(to)) return null;
  const dx = (to.x - from.x) * aspect;
  const dy = to.y - from.y;
  if (Math.hypot(dx, dy) === 0) return null;
  const deg = against === 'vertical' ? Math.atan2(Math.abs(dx), dy) : Math.atan2(-dy, Math.abs(dx));
  const out = (deg * 180) / Math.PI;
  return out === 0 ? 0 : out; // no -0
}

export function normalisedDistance(from: Landmark, to: Landmark, axis: 'x' | 'y', bodyLength: number, aspect: number): number | null {
  if (!visible(from) || !visible(to) || !(bodyLength > 0)) return null;
  return axis === 'x' ? (Math.abs(to.x - from.x) * aspect) / bodyLength : Math.abs(to.y - from.y) / bodyLength;
}

export function legLength(pose: Landmark[], side: Side, aspect: number): number | null {
  const [hip, knee, ankle] = selectLeg(pose, side);
  if (!visible(hip) || !visible(knee) || !visible(ankle)) return null;
  return Math.hypot((hip.x - knee.x) * aspect, hip.y - knee.y) + Math.hypot((knee.x - ankle.x) * aspect, knee.y - ankle.y);
}

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

export interface DirectionAux {
  footDx: number | null;
  kneeDx: number;
  width: number | null;
}

function hipWidth(pose: Landmark[], aspect: number): number | null {
  const [ls, rs, lh, rh] = [pose[11], pose[12], pose[23], pose[24]];
  if (!ls || !rs || !lh || !rh || ![ls, rs, lh, rh].every(visible)) return null;
  const torso = Math.hypot(((ls.x + rs.x - lh.x - rh.x) / 2) * aspect, (ls.y + rs.y - lh.y - rh.y) / 2);
  return torso > 0 ? (Math.abs(lh.x - rh.x) * aspect) / torso : null;
}

export function directionAux(pose: Landmark[], side: Side, aspect: number): DirectionAux | null {
  const hip = pick(pose, side, 'hip');
  const knee = pick(pose, side, 'knee');
  if (!visible(hip) || !visible(knee)) return null;
  const ankle = pick(pose, side, 'ankle');
  const foot = pick(pose, side, 'footIndex');
  return { footDx: visible(ankle) && visible(foot) ? (foot.x - ankle.x) * aspect : null, kneeDx: (knee.x - hip.x) * aspect, width: hipWidth(pose, aspect) };
}
