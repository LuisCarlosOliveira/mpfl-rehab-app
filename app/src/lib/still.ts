// The hold-still rule of the setup check. Setup and the resting angle (baseline.ts) both use it.
import { selectLeg, type Side } from './angle';
import type { SetupConfig, SetupSample } from './setupRules';

export type StillConfig = Pick<SetupConfig, 'stillMaxMove' | 'stillWindowMs'>;

/** True when hip, knee and ankle of the leg moved by at most `stillMaxMove` over a window of at least `stillWindowMs`. */
export function isStill(history: SetupSample[], side: Side, aspect: number, config: StillConfig): boolean {
  const first = history[0];
  const last = history[history.length - 1];
  if (!first || !last || last.tMs - first.tMs < config.stillWindowMs) return false;
  return ([0, 1, 2] as const).every((i) => {
    const pts = history.map((s) => selectLeg(s.landmarks, side)[i]);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const dx = (Math.max(...xs) - Math.min(...xs)) * aspect;
    const dy = Math.max(...ys) - Math.min(...ys);
    return Math.hypot(dx, dy) <= config.stillMaxMove;
  });
}
