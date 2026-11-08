import type { Landmark, Side } from '../../src/lib/angle';

// Seeded random numbers, so a test is repeatable.
export function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function gauss(next: () => number, sigma: number) {
  const u = Math.max(next(), 1e-12);
  return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
}

export interface LegOptions {
  hip?: { x: number; y: number };
  thighAngle?: number; // radians, direction from hip to knee, screen coordinates (y down)
  length?: number;
  noise?: () => number; // returns a noise value in image fraction
}

const LEG_IDS: Record<Side, [number, number, number]> = { left: [23, 25, 27], right: [24, 26, 28] };

/** 33 landmarks. Only hip, knee and ankle of one side are visible. Flexion is in degrees. */
export function legLandmarks(side: Side, flexionDeg: number, opts: LegOptions = {}): Landmark[] {
  const hip = opts.hip ?? { x: 0.5, y: 0.3 };
  const a = opts.thighAngle ?? Math.PI / 2; // thigh pointing down
  const len = opts.length ?? 0.2;
  const f = (flexionDeg * Math.PI) / 180;
  const knee = { x: hip.x + len * Math.cos(a), y: hip.y + len * Math.sin(a) };
  const ankle = { x: knee.x + len * Math.cos(a + f), y: knee.y + len * Math.sin(a + f) };
  const n = () => (opts.noise ? opts.noise() : 0);
  const out: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const [h, k, an] = LEG_IDS[side];
  out[h] = { x: hip.x + n(), y: hip.y + n(), visibility: 1 };
  out[k] = { x: knee.x + n(), y: knee.y + n(), visibility: 1 };
  out[an] = { x: ankle.x + n(), y: ankle.y + n(), visibility: 1 };
  return out;
}
