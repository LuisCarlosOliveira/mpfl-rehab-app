// Frames for the simulated pose (simPose.ts), built from the synthetic series of tests/helpers/landmarkSeries.ts.
// The fake camera of the browser has 640 x 480 pixels, so the aspect is 4 / 3.
import { makeSeries, type PoseId, type SeriesSpec } from '../../tests/helpers/landmarkSeries';
import type { SimFrame } from './simPose';

export const ASPECT = 4 / 3;
const STEP_MS = 33;

/** Lifts, reps or cycles of one pose. `lead` and `gap` are the still time before and between the lifts. */
export function reps(pose: PoseId, spec: Omit<SeriesSpec, 'pose' | 'aspect'>): SimFrame[] {
  return makeSeries({ pose, aspect: ASPECT, ...spec }).frames.map((f) => ({ tMs: f.tMs, landmarks: f.landmarks }));
}

/** The leg stays at one value for `ms`. */
export const still = (pose: PoseId, value: number, ms: number, spec: Omit<SeriesSpec, 'pose' | 'aspect'> = {}): SimFrame[] =>
  reps(pose, { ...spec, reps: 1, restValue: value, peakValue: value, leadMs: ms, upMs: 1, holdMs: 1, downMs: 1, gapMs: 0 });

/** No person for `ms`. */
export const gone = (ms: number): SimFrame[] =>
  Array.from({ length: Math.ceil(ms / STEP_MS) + 1 }, (_, i) => ({ tMs: i * STEP_MS, landmarks: null }));

/** Join parts in time. Each part starts when the one before it ends. */
export function cat(...parts: SimFrame[][]): SimFrame[] {
  const out: SimFrame[] = [];
  let offset = 0;
  for (const part of parts) {
    for (const f of part) out.push({ tMs: offset + f.tMs, landmarks: f.landmarks });
    offset += (part.at(-1)?.tMs ?? 0) + STEP_MS;
  }
  return out;
}

/** The length of a series in ms. */
export const duration = (frames: SimFrame[]) => (frames.at(-1)?.tMs ?? 0) + STEP_MS;
