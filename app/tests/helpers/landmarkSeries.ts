/**
 * README: synthetic landmark series with a known true value for every frame.
 *
 * How Step B uses it:
 *   const s = makeSeries({ pose: 'leg-raise-back', reps: 5, peakValue: 28 });
 *   for (const f of s.frames) pipeline.step(f.landmarks, f.tMs);   // f.landmarks is null for a frame with no person
 *   compareToTruth(measured, s.frames.map((f) => f.truth));         // see helpers/compareToTruth.ts
 * Then add `noise`, `dropouts`, `frameDrops` or `secondPerson` to the spec for the hard cases (helpers/seriesNoise.ts).
 *
 * The true value (`truth`) by pose:
 *   quad-set             knee flexion in degrees (0 for a leg that stays straight and still)
 *   ankle-pump           angle at the ankle between the knee and the foot index, in degrees (180 minus the angle is NOT used)
 *   leg-raise-side       elevation of the segment hip to ankle above the horizontal, in degrees (side-lying, front-on camera)
 *   leg-raise-back       angle of the segment hip to knee against the vertical, in degrees, going back (standing, side camera)
 *   heel-slide           knee flexion in degrees (0 is straight)
 *   straight-leg-raise   height of the ankle above the hip, as a fraction of the image height
 *   seated-extension-hold knee flexion in degrees (90 at rest, the hold angle at the peak)
 *   mini-squat           knee flexion in degrees
 * All geometry is in normalised image coordinates (0 to 1, y down). Lengths are square in pixels: the x offset from the hip is
 * divided by `aspect` (video width divided by height), so the app angle code with the same `aspect` reads the true angle.
 * Frames come at 30 fps by default (`fps: 10` as the saved clips). The time of a frame is rounded to whole milliseconds.
 * A lift has this timeline: `leadMs` at rest, `upMs` up, `holdMs` at the peak, `downMs` down, `gapMs` at rest. The ankle pump
 * is a pure cosine between the two angles with period `periodS`.
 * The seed of a noise model makes a series repeatable.
 */
import type { Landmark, Side } from '../../src/lib/angle';
import { legLandmarks } from './leg';
import { SEGMENT_LEN, applyNoise, type SeriesNoiseSpec } from './seriesNoise';

export type PoseId =
  | 'quad-set'
  | 'ankle-pump'
  | 'leg-raise-side'
  | 'leg-raise-back'
  | 'heel-slide'
  | 'straight-leg-raise'
  | 'seated-extension-hold'
  | 'mini-squat';

export type SeriesLandmark = Landmark & { z: number };

export interface SeriesFrame {
  tMs: number;
  /** 33 landmarks, or null for a frame with no person. */
  landmarks: SeriesLandmark[] | null;
  /** The true value of the measured quantity in this frame (see the table at the top of this file). */
  truth: number;
  /** The 33 landmarks of a second, smaller person who is far from the first. */
  secondPerson?: SeriesLandmark[];
}

export interface Lift {
  startMs: number;
  /** The time when the peak starts. */
  peakMs: number;
  endMs: number;
}

export interface Series {
  pose: PoseId;
  fps: number;
  frames: SeriesFrame[];
  tMs: number[];
  truth: number[];
  rest: number;
  peak: number;
  /** The lifts, reps or cycles that the generator made, before any frame drop. */
  lifts: Lift[];
}

export interface SeriesSpec extends SeriesNoiseSpec {
  pose: PoseId;
  fps?: 10 | 30;
  side?: Side;
  /** Number of lifts, reps or cycles. */
  reps?: number;
  /** Alias of `reps` for the ankle pump. */
  cycles?: number;
  /** Rest value of the truth. Defaults depend on the pose. */
  restValue?: number;
  /** Peak value of the truth. Defaults depend on the pose. */
  peakValue?: number;
  /** Ankle pump: the two ankle angles in degrees. */
  lowDeg?: number;
  highDeg?: number;
  /** Ankle pump: seconds of one cycle. */
  periodS?: number;
  /** Quad set: duration of the series in seconds. */
  durationS?: number;
  /** Quad set: a very small knee movement with this peak flexion in degrees. */
  smallMovementDeg?: number;
  leadMs?: number;
  upMs?: number;
  holdMs?: number;
  downMs?: number;
  gapMs?: number;
  /** Hip of the person at rest, in normalised coordinates. */
  hip?: { x: number; y: number };
  /** Video width divided by video height. */
  aspect?: number;
  /** Mirror the person left to right about the hip. */
  mirror?: boolean;
  /** Leg raise to the back: the straight leg swings FORWARD (toward +x, the way the person looks) with the same angle. Test material for R-02. */
  forward?: boolean;
  /** Leg raise to the side: the lower leg is out of view. */
  lowerLegHidden?: boolean;
}

const DEFAULT_VALUES: Record<PoseId, [number, number]> = {
  'quad-set': [0, 0],
  'ankle-pump': [75, 125],
  'leg-raise-side': [0, 35],
  'leg-raise-back': [0, 25],
  'heel-slide': [5, 90],
  'straight-leg-raise': [0, 0.25],
  'seated-extension-hold': [90, 60],
  'mini-squat': [0, 40],
};

const LEN = SEGMENT_LEN; // length of the thigh and of the shank
const FOOT = 0.08; // length from the ankle to the foot index
const IDS: Record<Side, { hip: number; knee: number; ankle: number; heel: number; foot: number }> = {
  left: { hip: 23, knee: 25, ankle: 27, heel: 29, foot: 31 },
  right: { hip: 24, knee: 26, ankle: 28, heel: 30, foot: 32 },
};
const other = (s: Side): Side => (s === 'left' ? 'right' : 'left');
const rad = (d: number) => (d * Math.PI) / 180;
const ease = (u: number) => (1 - Math.cos(Math.PI * u)) / 2;

type Pt = { x: number; y: number };
const blank = (): SeriesLandmark[] => Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
function put(out: SeriesLandmark[], id: number, p: Pt) {
  out[id] = { x: p.x, y: p.y, z: 0, visibility: 1 };
}

/** The foot of one leg: the heel and the foot index. `ankleDeg` is the angle at the ankle between the knee and the foot index. */
function addFoot(out: SeriesLandmark[], side: Side, knee: Pt, ankle: Pt, ankleDeg: number) {
  const back = Math.atan2(knee.y - ankle.y, knee.x - ankle.x); // direction from the ankle to the knee
  const dir = back + rad(ankleDeg);
  put(out, IDS[side].foot, { x: ankle.x + FOOT * Math.cos(dir), y: ankle.y + FOOT * Math.sin(dir) });
  const h = dir + rad(150);
  put(out, IDS[side].heel, { x: ankle.x + 0.04 * Math.cos(h), y: ankle.y + 0.04 * Math.sin(h) });
}

function leg(out: SeriesLandmark[], side: Side, hip: Pt, knee: Pt, ankle: Pt, ankleDeg = 100) {
  put(out, IDS[side].hip, hip);
  put(out, IDS[side].knee, knee);
  put(out, IDS[side].ankle, ankle);
  addFoot(out, side, knee, ankle, ankleDeg);
}

/** One person in square-pixel units. `len` scales the person. */
function person(spec: SeriesSpec, value: number, hip: Pt, len: number): SeriesLandmark[] {
  const side = spec.side ?? 'left';
  const out = blank();
  const k = len / LEN;
  const L = len;
  // Reuse legLandmarks of the repo for the hip, knee and ankle of the knee-angle poses (DRY).
  const kneeLeg = (flexDeg: number, thighAngle: number) => {
    const l = legLandmarks(side, flexDeg, { hip, thighAngle, length: L });
    const ids = IDS[side];
    leg(out, side, l[ids.hip] as Pt, l[ids.knee] as Pt, l[ids.ankle] as Pt);
  };
  switch (spec.pose) {
    case 'quad-set':
    case 'heel-slide':
      kneeLeg(value, -rad(value) / 2); // the thigh rises by half of the flexion, so the ankle stays on the floor
      break;
    case 'seated-extension-hold':
      kneeLeg(value, 0); // the thigh is horizontal, the shank hangs down
      break;
    case 'straight-leg-raise':
      kneeLeg(0, -Math.asin(Math.min(1, value / (2 * L))));
      break;
    case 'mini-squat': {
      // The ankle stays on the floor. The hip goes down. The knee goes forward.
      const f = rad(value) / 2;
      const ankle = { x: hip.x, y: hip.y + 2 * L };
      const knee = { x: ankle.x + L * Math.sin(f), y: ankle.y - L * Math.cos(f) };
      leg(out, side, { x: ankle.x, y: ankle.y - 2 * L * Math.cos(f) }, knee, ankle);
      break;
    }
    case 'ankle-pump': {
      const knee = { x: hip.x + L, y: hip.y };
      const ankle = { x: hip.x + 2 * L, y: hip.y };
      leg(out, side, hip, knee, ankle, value);
      break;
    }
    case 'leg-raise-side': {
      // Side-lying, front-on camera. The lifted leg is straight and rises above the horizontal.
      const a = rad(value);
      const ankle = { x: hip.x + 2 * L * Math.cos(a), y: hip.y - 2 * L * Math.sin(a) };
      leg(out, side, hip, { x: (hip.x + ankle.x) / 2, y: (hip.y + ankle.y) / 2 }, ankle);
      if (!spec.lowerLegHidden) {
        const lh = { x: hip.x, y: hip.y + 0.05 * k };
        leg(out, other(side), lh, { x: lh.x + L, y: lh.y }, { x: lh.x + 2 * L, y: lh.y });
      }
      break;
    }
    case 'leg-raise-back': {
      // Standing, side camera, the person looks to +x. The straight leg goes back (smaller x).
      const a = rad(value);
      const dir = spec.forward ? 1 : -1;
      const knee = { x: hip.x + dir * L * Math.sin(a), y: hip.y + L * Math.cos(a) };
      const ankle = { x: knee.x + dir * L * Math.sin(a), y: knee.y + L * Math.cos(a) };
      leg(out, side, hip, knee, ankle);
      leg(out, other(side), hip, { x: hip.x, y: hip.y + L }, { x: hip.x, y: hip.y + 2 * L });
      break;
    }
  }
  return out;
}

/** Aspect and mirror: x is scaled about the hip. Then every landmark that is set stays inside the image. */
function toImage(lm: SeriesLandmark[], hipX: number, aspect: number, mirror: boolean): SeriesLandmark[] {
  return lm.map((p) =>
    p.visibility === 0
      ? p
      : { ...p, x: Math.min(1, Math.max(0, hipX + ((mirror ? -1 : 1) * (p.x - hipX)) / aspect)), y: Math.min(1, Math.max(0, p.y)) },
  );
}

interface Timeline {
  value: (tMs: number) => number;
  lifts: Lift[];
  durationMs: number;
}

function timeline(spec: SeriesSpec, rest: number, peak: number): Timeline {
  const reps = spec.reps ?? spec.cycles ?? 1;
  const wave = (t: number, period: number) => (1 - Math.cos((2 * Math.PI * t) / period)) / 2;
  if (spec.pose === 'quad-set') {
    const d = spec.smallMovementDeg ?? 0;
    return { value: (t) => d * wave(t, 2000), lifts: [], durationMs: (spec.durationS ?? 5) * 1000 };
  }
  if (spec.pose === 'ankle-pump') {
    const period = (spec.periodS ?? 2) * 1000;
    const lifts = Array.from({ length: reps }, (_, i) => ({ startMs: i * period, peakMs: i * period + period / 2, endMs: (i + 1) * period }));
    return { value: (t) => rest + (peak - rest) * wave(t, period), lifts, durationMs: reps * period };
  }
  const lead = spec.leadMs ?? 1000;
  const up = spec.upMs ?? 1000;
  const hold = spec.holdMs ?? 500;
  const down = spec.downMs ?? 1000;
  const gap = spec.gapMs ?? 1000;
  const step = up + hold + down + gap;
  const lifts = Array.from({ length: reps }, (_, i) => {
    const startMs = lead + i * step;
    return { startMs, peakMs: startMs + up, endMs: startMs + up + hold + down };
  });
  const value = (t: number) => {
    const lift = lifts.find((l) => t >= l.startMs && t < l.startMs + step);
    if (!lift) return rest;
    const dt = t - lift.startMs;
    if (dt < up) return rest + (peak - rest) * ease(dt / up);
    if (dt <= up + hold) return peak;
    if (dt < up + hold + down) return peak + (rest - peak) * ease((dt - up - hold) / down);
    return rest;
  };
  return { value, lifts, durationMs: lead + reps * step };
}

export function makeSeries(spec: SeriesSpec): Series {
  const fps = spec.fps ?? 30;
  const [defRest, defPeak] = DEFAULT_VALUES[spec.pose];
  const rest = spec.pose === 'ankle-pump' ? (spec.lowDeg ?? defRest) : (spec.restValue ?? defRest);
  const peak = spec.pose === 'ankle-pump' ? (spec.highDeg ?? defPeak) : (spec.peakValue ?? defPeak);
  const hip = spec.hip ?? (spec.pose === 'leg-raise-back' || spec.pose === 'mini-squat' ? { x: 0.5, y: 0.3 } : { x: 0.25, y: 0.6 });
  const aspect = spec.aspect ?? 1;
  const mirror = spec.mirror ?? false;
  const tl = timeline(spec, rest, peak);
  // The second person is smaller and stands on the other side of the image.
  const hip2 = { x: hip.x < 0.5 ? 0.65 : 0.1, y: hip.y };

  const frames: SeriesFrame[] = [];
  for (let i = 0; i * 1000 <= tl.durationMs * fps; i++) {
    const tMs = Math.round((i * 1000) / fps);
    const truth = tl.value(tMs);
    const frame: SeriesFrame = { tMs, truth, landmarks: toImage(person(spec, truth, hip, LEN), hip.x, aspect, mirror) };
    if (spec.secondPerson) {
      const v2 = tl.value(tMs + 1500);
      frame.secondPerson = toImage(person(spec, v2, hip2, LEN * 0.6), hip2.x, aspect, mirror);
    }
    frames.push(frame);
  }
  const noisy = applyNoise(frames, spec);
  return { pose: spec.pose, fps, frames: noisy, tMs: noisy.map((f) => f.tMs), truth: noisy.map((f) => f.truth), rest, peak, lifts: tl.lifts };
}
