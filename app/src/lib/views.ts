// Second camera view: pure logic only. No camera, no network, no storage.
// Plan: FR24, FR25, task T9c, section 3.0.
// Nothing in this module is shown to the patient. The front-view value is a
// record for the clinician only (FR24, research/form-opus.md section 3, row C8).

import { MIN_VISIBILITY, selectLeg } from './angle';
import type { Landmark, Side } from './angle';
import { classifyAgainstLimit, MARGIN_DEG } from './margin';
import type { LimitState } from './margin';

export type View = 'side' | 'front';

/** One rep seen in one view. `tMs` is one time of the rep, for example its peak. Use the same rule in both views. */
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

/**
 * Join the reps of two views by time.
 * Each rep joins at most one rep of the other view: the nearest one within the tolerance (inclusive).
 * The closest pairs are taken first. A tie goes to the lower list index, so the result is stable.
 * The inputs are not changed. The result holds the same objects. Pairs follow the order of the side list.
 */
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

/** The 33 landmarks of one video frame of the front view. The image is not mirrored. */
export type FrontFrame = Landmark[];

// PROPOSAL: the start frame plus at least 4 more usable frames.
// A change value from fewer frames is too thin. No source sets this number.
export const MIN_FRONT_FRAMES = 5;

export type FrontState = LimitState | 'no-limit';

export interface FrontKneeResult {
  /** Change of the frontal knee alignment, degrees. Inward is positive. */
  changeDeg: number;
  /**
   * Start value 9 degrees. The front-view margin can differ and is UNVERIFIED.
   * research/form-opus.md section 3, row C8, lists 7.4 to 8.8 degrees for a manual 2D method (Janisch 2026).
   * The test-retest value of the change is poor (Asaeda 2024, section 4.3). T13 must measure both.
   */
  marginDeg: number;
  /** `no-limit` when the clinician set no limit. Then the app records the value and says nothing. */
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

// ---- The front view during a session (T12b, FR24) -------------------------------------------------
// The side view counts the reps. The front view has no counter. So each counted side rep gives a time window,
// and the front frames inside this window make one change value. The values are for the clinician only.
// Nothing here keeps a frame after the session ends. The buffer holds landmark numbers for a short time.

/** PROPOSAL: how long the buffer holds front frames. A rep that lasts longer than this gives no value. */
export const FRONT_BUFFER_MS = 60_000;

export interface FrontRecord {
  /** Reps that gave a change value. A rep with too few usable frames is not counted here. */
  reps: number;
  /** The largest change over those reps, inward positive. Absent when no rep gave a value. */
  changeDeg?: number;
}

export interface FrontRecorder {
  /** One frame of the front view. `null` means that the pose was lost. `tMs` is on the same clock as `rep`. */
  frame(landmarks: Landmark[] | null, tMs: number): void;
  /** One counted rep of the side view: the time that it ended and how long it lasted. */
  rep(endMs: number, repMs: number): void;
  /** The record, or null when no front frame with landmarks arrived. The recorder is finished after this call. */
  finish(): FrontRecord | null;
  /** The number of frames in the buffer. */
  buffered(): number;
}

/** `aspect` is read when a rep is settled, because the phone can change it. `limitDeg` is the clinician limit, if any. */
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
      const changeDeg = values.reduce<number | undefined>((best, v) => (best === undefined || Math.abs(v) > Math.abs(best) ? v : best), undefined);
      return changeDeg === undefined ? { reps: 0 } : { reps: values.length, changeDeg };
    },
    buffered: () => frames.length,
  };
}
