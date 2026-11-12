import type { SeriesFrame } from './landmarkSeries';

/** Noise options of a series. Step 2 of the work fills this in. */
export interface SeriesNoiseSpec {
  noise?: never;
}

export function applyNoise(frames: SeriesFrame[], spec: SeriesNoiseSpec): SeriesFrame[] {
  void spec;
  return frames;
}
