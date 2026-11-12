export interface Comparison {
  /** Largest absolute error. */
  max: number;
  /** Root mean square of the errors. NaN when nothing was compared. */
  rms: number;
  /** Count of frames with an absolute error larger than the tolerance. */
  outside: number;
  /** Count of frames with a measurement. */
  compared: number;
  /** Count of frames with a null measurement. They are no error, and the test can assert on them. */
  missing: number;
}

/** Compare a measured series (null for a frame with no value) with the true values of the same frames. */
export function compareToTruth(measured: ReadonlyArray<number | null>, truth: readonly number[], tolerance = 0): Comparison {
  if (measured.length !== truth.length) throw new Error(`length differs: ${measured.length} measured, ${truth.length} true`);
  let max = 0;
  let sumSq = 0;
  let outside = 0;
  let compared = 0;
  measured.forEach((m, i) => {
    if (m === null) return;
    const err = Math.abs(m - (truth[i] as number));
    compared++;
    sumSq += err * err;
    max = Math.max(max, err);
    if (err > tolerance) outside++;
  });
  return { max, rms: compared === 0 ? NaN : Math.sqrt(sumSq / compared), outside, compared, missing: measured.length - compared };
}
