// T17: the moving-leg check. A soft hint only. It never picks a leg for the person.
import { IDENTITY_CONFIG, createIdentityWatcher, movingLeg } from '../src/lib/legIdentity';
import type { Landmark } from '../src/lib/angle';
import { legLandmarks } from './helpers/leg';
import { ASPECT, WINDOW_A_SEATED_EXTENSION, WINDOW_B_HEEL_SLIDE } from './fixtures/legWindows';

const both = (left: Landmark[], right: Landmark[]) => left.map((p, k) => (k === 24 || k === 26 || k === 28 ? right[k]! : p));

// One frame with the two legs. A flexion of null hides that leg.
function frame(l: number | null, r: number | null, over: { lAngle?: number; rAngle?: number } = {}): Landmark[] {
  const left = legLandmarks('left', l ?? 0, { thighAngle: over.lAngle });
  const right = legLandmarks('right', r ?? 0, { thighAngle: over.rAngle });
  if (l === null) [23, 25, 27].forEach((i) => (left[i] = { ...left[i]!, visibility: 0.1 }));
  if (r === null) [24, 26, 28].forEach((i) => (right[i] = { ...right[i]!, visibility: 0.1 }));
  return both(left, right);
}

const swing = (i: number, amp: number) => (amp / 2) * (1 - Math.cos((2 * Math.PI * i) / 40));
const series = (n: number, l: (i: number) => number | null, r: (i: number) => number | null) =>
  Array.from({ length: n }, (_, i) => frame(l(i), r(i)));

describe('movingLeg', () => {
  it('names the left leg when only the left knee moves', () => {
    expect(movingLeg(series(120, (i) => swing(i, 60), () => 5), 1)).toBe('left');
  });

  it('names the right leg when only the right knee moves', () => {
    expect(movingLeg(series(120, () => 5, (i) => swing(i, 60)), 1)).toBe('right');
  });

  it('gives ambiguous when both legs move by a similar range', () => {
    expect(movingLeg(series(120, (i) => swing(i, 60), (i) => swing(i, 55)), 1)).toBe('ambiguous');
  });

  it('gives ambiguous at the ratio limit and names a leg just below it', () => {
    // The smaller range over the larger range of 0.6 or more is ambiguous.
    expect(IDENTITY_CONFIG.ambiguousRatio).toBe(0.6);
    expect(movingLeg(series(120, (i) => swing(i, 60), (i) => swing(i, 30)), 1)).toBe('left');
    expect(movingLeg(series(120, (i) => swing(i, 60), (i) => swing(i, 45)), 1)).toBe('ambiguous');
  });

  it('gives none when neither leg moves enough', () => {
    expect(movingLeg(series(120, (i) => swing(i, 4), (i) => swing(i, 3)), 1)).toBe('none');
  });

  it('ignores a leg that is hidden and names the other leg', () => {
    expect(movingLeg(series(120, (i) => swing(i, 60), () => null), 1)).toBe('left');
  });

  it('gives none when both legs are hidden', () => {
    expect(movingLeg(series(120, () => null, () => null), 1)).toBe('none');
  });

  it('gives none for a series with fewer usable frames than the minimum', () => {
    expect(IDENTITY_CONFIG.minFrames).toBe(30);
    expect(movingLeg(series(29, (i) => swing(i * 3, 60), () => 5), 1)).toBe('none');
    expect(movingLeg(series(30, (i) => swing(i * 3, 60), () => 5), 1)).toBe('left');
  });

  it('counts only frames where the whole leg shows', () => {
    // 20 frames show the left leg, 40 hide it. Only 20 are usable, so there is no left range.
    const frames = series(60, (i) => (i < 20 ? swing(i * 2, 60) : null), () => 5);
    expect(movingLeg(frames, 1)).toBe('none');
  });

  it('counts the swing of the hip to ankle line as movement, because a straight leg raise has no knee bend', () => {
    // The left leg stays straight (flexion 0) and swings from the hip. The right leg lies still.
    const frames = Array.from({ length: 120 }, (_, i) => frame(0, 0, { lAngle: Math.PI / 2 + (swing(i, 60) * Math.PI) / 180 }));
    expect(movingLeg(frames, 1)).toBe('left');
  });

  it('uses the aspect ratio of the video', () => {
    expect(movingLeg(series(120, (i) => swing(i, 60), () => 5), 16 / 9)).toBe('left');
  });
});

describe('createIdentityWatcher', () => {
  const feed = (w: ReturnType<typeof createIdentityWatcher>, from: number, to: number, f: (i: number) => Landmark[] | null, step = 100) => {
    const out: Array<string | null> = [];
    for (let t = from, i = 0; t <= to; t += step, i++) out.push(w.push(f(i), t));
    return out.filter((o) => o !== null);
  };

  it('gives nothing before the first window is complete', () => {
    const w = createIdentityWatcher(1);
    expect(feed(w, 0, 5800, (i) => frame(swing(i, 60), 5))).toEqual([]);
  });

  it('gives one answer at the end of each 6 second window', () => {
    const w = createIdentityWatcher(1);
    expect(feed(w, 0, 12100, (i) => frame(swing(i * 3, 60), 5))).toEqual(['left', 'left']);
  });

  it('answers for the moving leg of each window and not for the earlier window', () => {
    const w = createIdentityWatcher(1);
    const first = feed(w, 0, 6000, (i) => frame(swing(i * 3, 60), 5));
    const second = feed(w, 6100, 12000, (i) => frame(5, swing(i * 3, 60)));
    expect(first).toEqual(['left']);
    expect(second).toEqual(['right']);
  });

  it('skips frames with no pose', () => {
    const w = createIdentityWatcher(1);
    expect(feed(w, 0, 6100, () => null)).toEqual(['none']);
  });

  it('stops after the configured number of windows, so a long session stores nothing more', () => {
    const w = createIdentityWatcher(1);
    const answers = feed(w, 0, (IDENTITY_CONFIG.maxWindows + 3) * 6000 + 100, (i) => frame(swing(i * 3, 60), 5));
    expect(answers).toHaveLength(IDENTITY_CONFIG.maxWindows);
  });
});

// Two real windows, numbers only (tests/fixtures/legWindows.ts). There is no trusted ground truth for the leg
// in these clips. These tests pin what the rule gives today, as the replay of the saved clips did.
describe('movingLeg on real clip windows', () => {
  const toFrames = (rows: number[][]): Landmark[][] =>
    rows.map((r) => {
      const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
      const put = (ids: number[], o: number) =>
        ids.forEach((id, i) => (lm[id] = { x: r[o + i * 2]!, y: r[o + i * 2 + 1]!, visibility: r[o + 6]! }));
      put([23, 25, 27], 0);
      put([24, 26, 28], 7);
      return lm;
    });

  it('names the left leg in the seated extension window, where only the left leg is seen well', () => {
    expect(movingLeg(toFrames(WINDOW_A_SEATED_EXTENSION), ASPECT)).toBe('left');
  });

  it('gives ambiguous in the heel slide window, where both legs move', () => {
    expect(movingLeg(toFrames(WINDOW_B_HEEL_SLIDE), ASPECT)).toBe('ambiguous');
  });
});
