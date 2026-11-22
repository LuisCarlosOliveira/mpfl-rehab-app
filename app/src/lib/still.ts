import { selectLeg, type Side } from './angle';
import type { SetupConfig, SetupSample } from './setupRules';

export type StillConfig = Pick<SetupConfig, 'stillMaxMove' | 'stillWindowMs'>;

export function legMove(history: SetupSample[], side: Side, aspect: number): number {
  return Math.max(
    ...([0, 1, 2] as const).map((i) => {
      const pts = history.map((s) => selectLeg(s.landmarks, side)[i]);
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      return Math.hypot((Math.max(...xs) - Math.min(...xs)) * aspect, Math.max(...ys) - Math.min(...ys));
    }),
  );
}

export function isStill(history: SetupSample[], side: Side, aspect: number, config: StillConfig): boolean {
  const first = history[0];
  const last = history[history.length - 1];
  if (!first || !last || last.tMs - first.tMs < config.stillWindowMs) return false;
  return legMove(history, side, aspect) <= config.stillMaxMove;
}

export function calmRun(history: SetupSample[], side: Side, aspect: number, maxMove: number): SetupSample[] {
  const lo = [Infinity, Infinity, Infinity].map(() => [Infinity, Infinity]);
  const hi = [-Infinity, -Infinity, -Infinity].map(() => [-Infinity, -Infinity]);
  let start = history.length;
  for (let k = history.length - 1; k >= 0; k--) {
    const leg = selectLeg((history[k] as SetupSample).landmarks, side);
    const nextLo = lo.map((l, i) => [Math.min(l[0] as number, leg[i]!.x), Math.min(l[1] as number, leg[i]!.y)]);
    const nextHi = hi.map((h, i) => [Math.max(h[0] as number, leg[i]!.x), Math.max(h[1] as number, leg[i]!.y)]);
    const move = Math.max(...nextLo.map((l, i) => Math.hypot(((nextHi[i]![0] as number) - (l[0] as number)) * aspect, (nextHi[i]![1] as number) - (l[1] as number))));
    if (move > maxMove) break;
    nextLo.forEach((l, i) => (lo[i] = l));
    nextHi.forEach((h, i) => (hi[i] = h));
    start = k;
  }
  return history.slice(start);
}
