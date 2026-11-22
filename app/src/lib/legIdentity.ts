// The moving-leg check. It is a soft hint. It never blocks, never changes the leg and never counts a rep.
// In each window it takes two ranges for each leg: the knee flexion and the direction of the hip to ankle line.
// The larger range is the score of the leg. The range is the 5th to the 95th percentile of the window.
// The direction range covers a straight leg raise, where the knee does not bend.
// A replay of saved landmarks of 6 real clips gave a clear answer for some clips and ambiguous for others
// where both legs move (docs/leg-and-baseline-design.md section 4). No trusted ground truth for the leg exists.
// Every value in IDENTITY_CONFIG is a PROPOSAL. T13 must tune it on real video.

import { flexion, kneeAngle, selectLeg, type Landmark, type Side } from './angle';

export type MovingLeg = Side | 'ambiguous' | 'none';

interface IdentityConfig {
  windowMs: number; // length of one window
  minFrames: number; // frames with the whole leg visible that a leg needs in a window
  minRangeDeg: number; // below this range for both legs the answer is none
  ambiguousRatio: number; // the smaller range over the larger range at or above this gives ambiguous
  confirmWindows: number; // the note needs the other leg to win this many windows in a row
}

export const IDENTITY_CONFIG: IdentityConfig = {
  windowMs: 6000,
  minFrames: 30,
  minRangeDeg: 8,
  ambiguousRatio: 0.6,
  confirmWindows: 2,
};

const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] as number;

function range(values: number[], minFrames: number): number {
  if (values.length < minFrames) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return percentile(sorted, 0.95) - percentile(sorted, 0.05);
}

function directionRange(degrees: number[], minFrames: number): number {
  if (degrees.length < minFrames) return 0;
  const rad = (d: number) => (d * Math.PI) / 180;
  const mean = (Math.atan2(degrees.reduce((q, d) => q + Math.sin(rad(d)), 0), degrees.reduce((q, d) => q + Math.cos(rad(d)), 0)) * 180) / Math.PI;
  return range(
    degrees.map((d) => {
      let y = d - mean;
      while (y > 180) y -= 360;
      while (y < -180) y += 360;
      return y;
    }),
    minFrames,
  );
}

function legScore(frames: Landmark[][], side: Side, aspect: number, minFrames: number): number {
  const knee: number[] = [];
  const line: number[] = [];
  for (const landmarks of frames) {
    const [hip, kneePoint, ankle] = selectLeg(landmarks, side);
    const f = flexion(kneeAngle(hip, kneePoint, ankle, aspect));
    if (f === null) continue; // a hidden landmark: this frame does not count for this leg
    knee.push(f);
    line.push((Math.atan2(ankle.y - hip.y, (ankle.x - hip.x) * aspect) * 180) / Math.PI);
  }
  return Math.max(range(knee, minFrames), directionRange(line, minFrames));
}

export function movingLeg(frames: Landmark[][], aspect: number, config: IdentityConfig = IDENTITY_CONFIG): MovingLeg {
  const left = legScore(frames, 'left', aspect, config.minFrames);
  const right = legScore(frames, 'right', aspect, config.minFrames);
  const high = Math.max(left, right);
  const low = Math.min(left, right);
  if (high < config.minRangeDeg) return 'none';
  if (low / high >= config.ambiguousRatio) return 'ambiguous';
  return left > right ? 'left' : 'right';
}

export function otherLegConfirmed(answers: MovingLeg[], other: Side, config: IdentityConfig = IDENTITY_CONFIG): boolean {
  const n = config.confirmWindows;
  return answers.length >= n && answers.slice(-n).every((a) => a === other);
}

export function createIdentityWatcher(aspect: number, config: IdentityConfig = IDENTITY_CONFIG) {
  let frames: Landmark[][] = [];
  let windowStart: number | null = null;
  return {
    push(landmarks: Landmark[] | null, tMs: number): MovingLeg | null {
      if (windowStart === null) windowStart = tMs;
      if (landmarks && landmarks.length >= 33) frames.push(landmarks);
      if (tMs - windowStart < config.windowMs) return null;
      const answer = movingLeg(frames, aspect, config);
      frames = [];
      windowStart = tMs;
      return answer;
    },
  };
}
