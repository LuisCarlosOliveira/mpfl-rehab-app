import type { Side } from '../../src/lib/angle';
import type { SeriesFrame, SeriesLandmark } from './landmarkSeries';
import { gauss, rng } from './leg';

/** The length of the thigh and of the shank of the generated person, in normalised image units. */
export const SEGMENT_LEN = 0.2;

/**
 * SCALE AND SOURCE. The worst documented error of the knee angle is about 9 degrees (research/form-evidence.md: F1 Okuno 2026,
 * limits of agreement of plus or minus 8.7 degrees in the best case. F3 Rode 2025, mean absolute error of 9.3 to 21.9 degrees in
 * exercise video. The text there reads "the best case error for a knee angle is about 9 degrees"). The user asked for 9 degrees RMS.
 * The model adds independent Gaussian noise to the x and y of every visible landmark. For a knee angle from three points with two
 * segments of length L, the variance of the angle is sigma squared times (4 minus 2 cos(interior angle)) divided by L squared.
 * The worst case is a straight leg (interior angle 180 degrees, factor 6). So sigma = rms (in radians) times L divided by sqrt(6).
 * For 9 degrees and L = 0.2 this is 0.0128 of the image size. A bent knee gets less error (7.3 degrees at 90 degrees).
 * Note: 9 degrees RMS is a worst case of the repo numbers. F1 gives a standard deviation of about 4.5 degrees in the best case.
 */
export const KNEE_RMS_WORST_DEG = 9;

export function sigmaForKneeRms(rmsDeg: number, segmentLen = SEGMENT_LEN): number {
  return (((rmsDeg * Math.PI) / 180) * segmentLen) / Math.sqrt(6);
}

/** The visibility that a dropout sets. It is below the app limit MIN_VISIBILITY (0.5). */
export const DROPOUT_VISIBILITY = 0.1;

const LEG: Record<Side, number[]> = { left: [23, 25, 27, 29, 31], right: [24, 26, 28, 30, 32] };
/** Landmark ids of one leg: hip, knee, ankle, heel, foot index. */
export const legIds = (side: Side): number[] => [...LEG[side]];

interface Range {
  startMs: number;
  durationMs: number;
}
const inRange = (t: number, r: Range) => t >= r.startMs && t < r.startMs + r.durationMs;

export interface SeriesNoiseSpec {
  /** Seed of the random numbers. The default is 1. The same seed gives the same series. */
  seed?: number;
  /** Gaussian noise on the landmark positions. `kneeRmsDeg` sets the scale as the RMS error of the knee angle for a straight leg. */
  noise?: { kneeRmsDeg: number };
  /** A leg out of view: the visibility of these landmark ids is DROPOUT_VISIBILITY for the stated time. */
  dropouts?: Array<{ ids: number[] } & Range>;
  /** Frames that the camera loses: in a range, or at random. The frame and its truth value are removed. */
  frameDrops?: { ranges?: Range[]; probability?: number };
  /** Frames where the pose model finds no person: the landmarks are null. */
  noPerson?: Range[];
  /** Add a second person (see landmarkSeries.ts). */
  secondPerson?: boolean;
}

export function applyNoise(frames: SeriesFrame[], spec: SeriesNoiseSpec): SeriesFrame[] {
  const seed = spec.seed ?? 1;
  const sigma = spec.noise ? sigmaForKneeRms(spec.noise.kneeRmsDeg) : 0;
  const noiseRng = rng(seed);
  const dropRng = rng(seed + 100003);
  for (let i = 0; i < 5; i++) {
    noiseRng();
    dropRng();
  }
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const jitter = (lm: SeriesLandmark[]): SeriesLandmark[] =>
    sigma === 0
      ? lm
      : lm.map((p) => (p.visibility === 0 ? p : { ...p, x: clamp(p.x + gauss(noiseRng, sigma)), y: clamp(p.y + gauss(noiseRng, sigma)) }));
  const out: SeriesFrame[] = [];
  for (const f of frames) {
    if (spec.frameDrops?.ranges?.some((r) => inRange(f.tMs, r))) continue;
    if (spec.frameDrops?.probability !== undefined && dropRng() < spec.frameDrops.probability) continue;
    let landmarks = f.landmarks ? jitter(f.landmarks) : null;
    const secondPerson = f.secondPerson ? jitter(f.secondPerson) : undefined;
    const hidden = new Set<number>();
    for (const d of spec.dropouts ?? []) if (inRange(f.tMs, d)) d.ids.forEach((id) => hidden.add(id));
    if (landmarks && hidden.size > 0) landmarks = landmarks.map((p, id) => (hidden.has(id) ? { ...p, visibility: DROPOUT_VISIBILITY } : p));
    if (spec.noPerson?.some((r) => inRange(f.tMs, r))) landmarks = null;
    out.push({ ...f, landmarks, ...(secondPerson ? { secondPerson } : {}) });
  }
  return out;
}
