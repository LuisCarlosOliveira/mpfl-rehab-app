import { MIN_VISIBILITY, selectLeg } from './angle';
import type { Landmark, Side } from './angle';
import { classifyAgainstLimit, MARGIN_DEG } from './margin';
import type { LimitState } from './margin';

export type View = 'side' | 'front';

export interface RepStamp {
  tMs: number;
  repMs: number;
}

// PROPOSAL, 500 ms. Each view is analysed alone and the reps last at least 2 s.
// So independent 2D views need only loose sync. Offsets of a few hundred ms
// are enough to pair reps (research/dual-camera-opus.md section 3, level L0 and section 5).
// No published sync tolerance exists for slow rehab movements.
export const PAIR_TOLERANCE_MS = 500;

export interface PairedReps {
  pairs: { side: RepStamp; front: RepStamp }[];
  sideOnly: RepStamp[];
  frontOnly: RepStamp[];
}

export function pairReps(side: RepStamp[], front: RepStamp[], toleranceMs: number = PAIR_TOLERANCE_MS): PairedReps {
  const candidates: { s: number; f: number; gap: number }[] = [];
  side.forEach((a, s) =>
    front.forEach((b, f) => {
      const gap = Math.abs(a.tMs - b.tMs);
      if (gap <= toleranceMs) candidates.push({ s, f, gap });
    }),
  );
  candidates.sort((p, q) => p.gap - q.gap || p.s - q.s || p.f - q.f);

  const sideTaken = new Set<number>();
  const frontTaken = new Set<number>();
  const matched: { s: number; f: number; side: RepStamp; front: RepStamp }[] = [];
  for (const c of candidates) {
    if (sideTaken.has(c.s) || frontTaken.has(c.f)) continue;
    sideTaken.add(c.s);
    frontTaken.add(c.f);
    matched.push({ ...c, side: side[c.s]!, front: front[c.f]! });
  }
  matched.sort((p, q) => p.s - q.s);

  return {
    pairs: matched.map((m) => ({ side: m.side, front: m.front })),
    sideOnly: side.filter((_, i) => !sideTaken.has(i)),
    frontOnly: front.filter((_, i) => !frontTaken.has(i)),
  };
}

export type FrontFrame = Landmark[];

// PROPOSAL: the start frame plus at least 4 more usable frames.
// A change value from fewer frames is too thin. No source sets this number.
export const MIN_FRONT_FRAMES = 5;

export type FrontState = LimitState | 'no-limit';

export interface FrontKneeResult {
  changeDeg: number;
  /**
   * Start value 9 degrees. The front-view margin can differ and is UNVERIFIED.
   * research/form-opus.md section 3, row C8, lists 7.4 to 8.8 degrees for a manual 2D method (Janisch 2026).
   * The test-retest value of the change is poor (Asaeda 2024, section 4.3). T13 must measure both.
   */
  marginDeg: number;
  state: FrontState;
}

/**
 * Signed frontal knee alignment of one frame, in degrees. Zero is a straight leg.
 * The angle is between the thigh (hip to knee) and the shank (knee to ankle) in the image plane.
 * Inward is positive: the knee is on the body-midline side of the hip-ankle line.
 * This is only a step of the change value. It is not exported on purpose (form-opus.md C9: never show an absolute angle).
 *
 * Assumes the front camera does not mirror the image and the thigh points down in the image.
 * The person right leg then appears on the image left, so the midline is at +x for the right leg and -x for the left leg.
 * PROPOSAL, the research does not state a sign convention.
 */
function alignment(frame: FrontFrame, side: Side, aspect: number): number | null {
  const [hip, knee, ankle] = selectLeg(frame, side);
  if ([hip, knee, ankle].some((p) => (p.visibility ?? 1) < MIN_VISIBILITY)) return null;
  const tx = (knee.x - hip.x) * aspect;
  const ty = knee.y - hip.y;
  const sx = (ankle.x - knee.x) * aspect;
  const sy = ankle.y - knee.y;
  if ((tx === 0 && ty === 0) || (sx === 0 && sy === 0)) return null;
  const turn = Math.atan2(tx * sy - ty * sx, tx * sx + ty * sy);
  const midline = side === 'right' ? 1 : -1;
  return (midline * turn * 180) / Math.PI;
}

/**
 * Change of the frontal knee alignment inside ONE rep seen from the front.
 * The value is the signed change from the first frame to the frame with the largest change (first one on a tie).
 * Inward is positive. It is a change from the start of the rep and never an absolute angle
 * (research/form-opus.md section 3, rows C8 and C9, and section 4.3).
 * A frame with a hidden landmark is skipped.
 * Returns null if the first frame is unusable or the rep has fewer than MIN_FRONT_FRAMES usable frames.
 * `limitDeg` is the limit that a clinician set. Without it the state is `no-limit` (section 4.1).
 * Record for the clinician only (FR24). Show no live cue.
 */
export function frontKneeInward(
  frames: FrontFrame[],
  side: Side,
  aspect: number,
  limitDeg?: number,
): FrontKneeResult | null {
  const values = frames.map((f) => alignment(f, side, aspect));
  const start = values[0];
  if (start === null || start === undefined) return null;
  const changes = values.filter((v): v is number => v !== null).map((v) => v - start);
  if (changes.length < MIN_FRONT_FRAMES) return null;

  const changeDeg = changes.reduce((best, c) => (Math.abs(c) > Math.abs(best) ? c : best), 0);
  const state = limitDeg === undefined ? 'no-limit' : classifyAgainstLimit(changeDeg, limitDeg, MARGIN_DEG);
  return { changeDeg, marginDeg: MARGIN_DEG, state };
}

/** PROPOSAL: how long the buffer holds front frames. A rep that lasts longer than this gives no value. */
export const FRONT_BUFFER_MS = 60_000;

// ENGINEERING minimum, not a clinical number: the median of fewer reps than this is too thin to log.
// Three is the smallest count where one odd rep cannot set the median. No source sets this number.
export const MIN_FRONT_REPS = 3;

export interface FrontRecord {
  reps: number;
  /**
   * The median of the signed change of those reps, inward positive. UNVERIFIED sign convention.
   * Absent when fewer than MIN_FRONT_REPS reps gave a value. A front-view 2D angle is a logged change for the care team
   * and not a measure of valgus (research/form-evidence.md: 2D and 3D frontal angle do not correlate, r = 0.127).
   */
  changeDeg?: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export interface FrontRecorder {
  frame(landmarks: Landmark[] | null, tMs: number): void;
  rep(endMs: number, repMs: number): void;
  finish(): FrontRecord | null;
  buffered(): number;
}

export function createFrontRecorder(side: Side, aspect: () => number, limitDeg?: number): FrontRecorder {
  let frames: { t: number; landmarks: Landmark[] }[] = [];
  let latest = Number.NEGATIVE_INFINITY;
  let seen = false;
  const pending: { from: number; to: number }[] = [];
  const values: number[] = [];

  const settle = (w: { from: number; to: number }) => {
    const slice = frames.filter((f) => f.t >= w.from && f.t <= w.to).map((f) => f.landmarks);
    const result = frontKneeInward(slice, side, aspect(), limitDeg);
    if (result !== null) values.push(result.changeDeg);
  };
  const settleDue = () => {
    for (let i = pending.length - 1; i >= 0; i--) {
      if (latest > pending[i]!.to) settle(pending.splice(i, 1)[0]!);
    }
  };

  return {
    frame(landmarks, tMs) {
      latest = Math.max(latest, tMs);
      if (landmarks !== null) {
        seen = true;
        frames.push({ t: tMs, landmarks });
      }
      settleDue();
      frames = frames.filter((f) => f.t >= latest - FRONT_BUFFER_MS);
    },
    rep(endMs, repMs) {
      const window = { from: endMs - repMs - PAIR_TOLERANCE_MS, to: endMs + PAIR_TOLERANCE_MS };
      if (latest > window.to) settle(window);
      else pending.push(window);
    },
    finish() {
      pending.splice(0).forEach(settle);
      if (!seen) return null;
      return values.length < MIN_FRONT_REPS ? { reps: values.length } : { reps: values.length, changeDeg: median(values) };
    },
    buffered: () => frames.length,
  };
}
