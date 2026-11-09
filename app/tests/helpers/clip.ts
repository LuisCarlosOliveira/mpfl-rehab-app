import type { Landmark } from '../../src/lib/angle';
import type { ClipRow } from '../fixtures/clipSeries';

/** 33 landmarks from one fixture row. Only hip, knee and ankle of both legs are set. The rest has visibility 0. */
export function rowLandmarks(row: NonNullable<ClipRow>): Landmark[] {
  const out: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const ids = [23, 25, 27, 24, 26, 28];
  ids.forEach((id, i) => {
    out[id] = { x: row[1 + i * 2] as number, y: row[2 + i * 2] as number, visibility: (i < 3 ? row[13] : row[14]) as number };
  });
  return out;
}

/** The time of a row and its landmarks, or null landmarks when no person was found. */
export const rowFrame = (row: ClipRow, index: number): { landmarks: Landmark[] | null; tMs: number } => ({
  landmarks: row === null ? null : rowLandmarks(row),
  tMs: row === null ? index * 100 : (row[0] as number),
});
