import { describe, expect, it } from 'vitest';
import * as views from '../src/lib/views';
import { frontKneeInward, MIN_FRONT_FRAMES, pairReps, PAIR_TOLERANCE_MS } from '../src/lib/views';
import type { FrontFrame, RepStamp } from '../src/lib/views';
import type { Landmark, Side } from '../src/lib/angle';
import { MARGIN_DEG } from '../src/lib/margin';

const rep = (tMs: number, repMs = 2500): RepStamp => ({ tMs, repMs });

describe('pairReps', () => {
  it('returns empty lists for empty input', () => {
    expect(pairReps([], [], 500)).toEqual({ pairs: [], sideOnly: [], frontOnly: [] });
  });
  it('keeps all reps unpaired when one list is empty', () => {
    const r = pairReps([rep(0), rep(3000)], [], 500);
    expect(r.pairs).toEqual([]);
    expect(r.sideOnly).toHaveLength(2);
    expect(r.frontOnly).toEqual([]);
  });
  it('pairs an exact match', () => {
    const s = rep(1000);
    const f = rep(1000);
    expect(pairReps([s], [f], 500).pairs).toEqual([{ side: s, front: f }]);
  });
  it('pairs within the tolerance, edge included', () => {
    expect(pairReps([rep(1000)], [rep(1500)], 500).pairs).toHaveLength(1);
    expect(pairReps([rep(1000)], [rep(500)], 500).pairs).toHaveLength(1);
  });
  it('does not pair outside the tolerance', () => {
    const r = pairReps([rep(1000)], [rep(1501)], 500);
    expect(r.pairs).toEqual([]);
    expect(r.sideOnly).toHaveLength(1);
    expect(r.frontOnly).toHaveLength(1);
  });
  it('takes the nearest of two candidates', () => {
    const s = rep(1000);
    const near = rep(1100);
    const far = rep(1400);
    const r = pairReps([s], [far, near], 500);
    expect(r.pairs).toEqual([{ side: s, front: near }]);
    expect(r.frontOnly).toEqual([far]);
  });
  it('never uses the same rep twice', () => {
    const f = rep(1000);
    const r = pairReps([rep(900), rep(1200)], [f], 500);
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0]!.side.tMs).toBe(900);
    expect(r.sideOnly.map((x) => x.tMs)).toEqual([1200]);
  });
  it('gives the nearer pair priority over list order', () => {
    // Gap 300 (side 1700) is smaller than gap 400 (side 1000), so side 1700 wins.
    const r = pairReps([rep(1000), rep(1700)], [rep(1400)], 500);
    expect(r.pairs[0]!.side.tMs).toBe(1700);
    expect(r.sideOnly.map((x) => x.tMs)).toEqual([1000]);
  });
  it('breaks a tie by the lower index, whatever the values', () => {
    const a = rep(900, 1);
    const b = rep(1100, 2);
    const r = pairReps([a, b], [rep(1000)], 500);
    expect(r.pairs[0]!.side).toBe(a);
    expect(r.sideOnly).toEqual([b]);
    const r2 = pairReps([rep(1000)], [a, b], 500);
    expect(r2.pairs[0]!.front).toBe(a);
  });
  it('gives the same pairs when the input order changes (no ties)', () => {
    const side = [rep(0), rep(3000), rep(6000)];
    const front = [rep(100), rep(3200), rep(9000)];
    const a = pairReps(side, front, 500);
    const b = pairReps([...side].reverse(), [...front].reverse(), 500);
    const key = (p: { side: RepStamp; front: RepStamp }) => `${p.side.tMs}-${p.front.tMs}`;
    expect(a.pairs.map(key)).toEqual(['0-100', '3000-3200']);
    expect(b.pairs.map(key).sort()).toEqual(a.pairs.map(key));
  });
  it('does not mutate the inputs', () => {
    const side = [rep(3000), rep(0)];
    const front = [rep(100), rep(3100)];
    const copyS = structuredClone(side);
    const copyF = structuredClone(front);
    Object.freeze(side);
    Object.freeze(front);
    pairReps(side, front, 500);
    expect(side).toEqual(copyS);
    expect(front).toEqual(copyF);
  });
  it('uses the named default tolerance', () => {
    expect(PAIR_TOLERANCE_MS).toBe(500);
    expect(pairReps([rep(0)], [rep(500)]).pairs).toHaveLength(1);
    expect(pairReps([rep(0)], [rep(501)]).pairs).toHaveLength(0);
  });
});

// Front-view test data. The geometry is built in a square image, so x is scaled by the aspect.
const IDS: Record<Side, [number, number, number]> = { left: [23, 25, 27], right: [24, 26, 28] };
const rad = (d: number) => (d * Math.PI) / 180;

/**
 * One front frame. The thigh points down and tilts toward the midline by `inwardDeg`.
 * The shank tilts away from the midline by the same angle. So the knee alignment is 2 * inwardDeg.
 * Right leg: midline is +x. Left leg: midline is -x. The image is not mirrored.
 */
function frontFrame(side: Side, alignmentDeg: number, opts: { aspect?: number; hip?: { x: number; y: number }; len?: number } = {}): FrontFrame {
  const aspect = opts.aspect ?? 1;
  const hip = opts.hip ?? { x: 0.5, y: 0.3 };
  const len = opts.len ?? 0.2;
  const m = side === 'right' ? 1 : -1;
  const tilt = rad(alignmentDeg / 2);
  const knee = { x: hip.x + (m * len * Math.sin(tilt)) / aspect, y: hip.y + len * Math.cos(tilt) };
  const ankle = { x: knee.x - (m * len * Math.sin(tilt)) / aspect, y: knee.y + len * Math.cos(tilt) };
  const out: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const [h, k, a] = IDS[side];
  out[h] = { ...hip, visibility: 1 };
  out[k] = { ...knee, visibility: 1 };
  out[a] = { ...ankle, visibility: 1 };
  return out;
}

const rep5 = (side: Side, deg: number[], o = {}) => deg.map((d) => frontFrame(side, d, o));

describe('frontKneeInward', () => {
  it('gives 0 for a leg that does not move', () => {
    const frames = rep5('right', [4, 4, 4, 4, 4, 4]);
    expect(frontKneeInward(frames, 'right', 1)?.changeDeg).toBeCloseTo(0, 9);
  });
  it('gives the known inward change within 0.5 degrees, with the start value removed', () => {
    const frames = rep5('right', [2, 4, 7, 10, 7, 3]);
    const r = frontKneeInward(frames, 'right', 1);
    expect(r?.changeDeg).toBeGreaterThan(7.5);
    expect(Math.abs((r?.changeDeg ?? 0) - 8)).toBeLessThan(0.5);
  });
  it('is correct for a wide image aspect', () => {
    const o = { aspect: 16 / 9 };
    const frames = [0, 3, 6, 9, 12].map((d) => frontFrame('right', d, o));
    expect(Math.abs((frontKneeInward(frames, 'right', 16 / 9)?.changeDeg ?? 0) - 12)).toBeLessThan(0.5);
  });
  it('uses the same sign for the left and the right leg', () => {
    const deg = [0, 2, 5, 8, 10];
    const l = frontKneeInward(deg.map((d) => frontFrame('left', d)), 'left', 1)?.changeDeg ?? 0;
    const r = frontKneeInward(deg.map((d) => frontFrame('right', d)), 'right', 1)?.changeDeg ?? 0;
    expect(l).toBeGreaterThan(9.5);
    expect(l).toBeCloseTo(r, 9);
  });
  it('gives a negative value when the knee moves away from the midline', () => {
    const frames = [0, -2, -5, -8, -10].map((d) => frontFrame('right', d));
    expect(frontKneeInward(frames, 'right', 1)?.changeDeg).toBeLessThan(-9.5);
  });
  it('does not change when the whole leg moves in the image', () => {
    const deg = [0, 3, 6, 9, 12];
    const a = frontKneeInward(deg.map((d) => frontFrame('right', d)), 'right', 1)?.changeDeg;
    const b = frontKneeInward(deg.map((d) => frontFrame('right', d, { hip: { x: 0.31, y: 0.12 } })), 'right', 1)?.changeDeg;
    expect(b).toBeCloseTo(a ?? NaN, 9);
  });
  it('skips a frame with a hidden landmark', () => {
    const frames = [0, 3, 6, 9, 12, 15].map((d) => frontFrame('right', d));
    frames[5]![26] = { x: 0, y: 0, visibility: 0.1 }; // the 15 degree frame is hidden
    expect(Math.abs((frontKneeInward(frames, 'right', 1)?.changeDeg ?? 0) - 12)).toBeLessThan(0.5);
  });
  it('returns null when the start frame is unusable', () => {
    const frames = [0, 3, 6, 9, 12, 15].map((d) => frontFrame('right', d));
    frames[0]![24] = { x: 0, y: 0, visibility: 0 };
    expect(frontKneeInward(frames, 'right', 1)).toBeNull();
  });
  it('returns null for too few usable frames, and works at the minimum', () => {
    const make = (n: number) => Array.from({ length: n }, (_, i) => frontFrame('right', i * 2));
    expect(frontKneeInward(make(MIN_FRONT_FRAMES - 1), 'right', 1)).toBeNull();
    expect(frontKneeInward(make(MIN_FRONT_FRAMES), 'right', 1)).not.toBeNull();
    const hiddenMost = make(MIN_FRONT_FRAMES + 1);
    hiddenMost[2]![26] = { x: 0, y: 0, visibility: 0 };
    hiddenMost[3]![26] = { x: 0, y: 0, visibility: 0 };
    expect(frontKneeInward(hiddenMost, 'right', 1)).toBeNull();
  });
  it('returns null for an empty rep and for a zero-length segment', () => {
    expect(frontKneeInward([], 'right', 1)).toBeNull();
    const frames = [0, 1, 2, 3, 4].map((d) => frontFrame('right', d));
    frames[0]![26] = { x: 0.5, y: 0.3, visibility: 1 }; // same point as the hip
    expect(frontKneeInward(frames, 'right', 1)).toBeNull();
  });
  it('does not mutate the frames', () => {
    const frames = [0, 3, 6, 9, 12].map((d) => frontFrame('right', d));
    const copy = structuredClone(frames);
    frontKneeInward(frames, 'right', 1);
    expect(frames).toEqual(copy);
  });
  it('exports no absolute valgus or FPPA function or field', () => {
    const bad = /valgus|fppa|absolute/i;
    expect(Object.keys(views).filter((k) => bad.test(k))).toEqual([]);
    const r = frontKneeInward([0, 3, 6, 9, 12].map((d) => frontFrame('right', d)), 'right', 1);
    expect(Object.keys(r ?? {}).filter((k) => bad.test(k))).toEqual([]);
  });

  describe('state', () => {
    const frames = [0, 5, 10, 15, 20, 25].map((d) => frontFrame('right', d)); // change 25
    it('is no-limit without a clinician limit', () => {
      const r = frontKneeInward(frames, 'right', 1);
      expect(r?.state).toBe('no-limit');
      expect(r?.marginDeg).toBe(MARGIN_DEG);
    });
    it('uses the margin rule with a limit', () => {
      expect(frontKneeInward(frames, 'right', 1, 10)?.state).toBe('above');
      expect(frontKneeInward(frames, 'right', 1, 40)?.state).toBe('below');
      expect(frontKneeInward(frames, 'right', 1, 20)?.state).toBe('cannot-tell');
    });
    it('treats a limit of 0 as a limit', () => {
      expect(frontKneeInward(frames, 'right', 1, 0)?.state).toBe('above');
    });
  });
});
