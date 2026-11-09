// F1: the hold-still rule and the measured noise floor of the saved pose output of real clips.
// The numbers in the comments come from tests/fixtures/clipSeries.ts (first 18 s of each clip, 10 frames each second).
import { SETUP_CONFIG, type SetupSample } from '../src/lib/setupRules';
import { calmRun, isStill, legMove } from '../src/lib/still';
import { legLandmarks } from './helpers/leg';
import { CLIP_SERIES } from './fixtures/clipSeries';
import { rowFrame } from './helpers/clip';

const still = (side: 'left' | 'right', from: number, to: number, hipX = 0.5): SetupSample[] => {
  const out: SetupSample[] = [];
  for (let t = from; t <= to; t += 100) out.push({ tMs: t, landmarks: legLandmarks(side, 10, { hip: { x: hipX, y: 0.3 } }) });
  return out;
};

describe('legMove and calmRun', () => {
  it('measures the largest move of hip, knee or ankle as a fraction of the frame height', () => {
    const h = [...still('left', 0, 500, 0.5), ...still('left', 600, 1000, 0.55)];
    expect(legMove(h, 'left', 1)).toBeCloseTo(0.05, 3);
  });

  it('returns only the calm samples at the end of the history', () => {
    // The leg jumps by 0.1 at 2000 ms and then holds still.
    const h = [...still('left', 0, 1900, 0.4), ...still('left', 2000, 4000, 0.5)];
    const run = calmRun(h, 'left', 1, SETUP_CONFIG.stillMaxMove);
    expect(run[0]!.tMs).toBe(2000);
    expect(run[run.length - 1]!.tMs).toBe(4000);
  });

  it('returns an empty list for an empty history and one sample for a single sample', () => {
    expect(calmRun([], 'left', 1, 0.02)).toEqual([]);
    expect(calmRun(still('left', 0, 0), 'left', 1, 0.02)).toHaveLength(1);
  });
});

describe('the hold-still rule against the noise floor of real clips (F1)', () => {
  const windows = (clip: string, side: 'left' | 'right') => {
    const s = CLIP_SERIES[clip]!;
    const frames = s.rows
      .map((r, i) => rowFrame(r, i))
      .filter((f) => f.landmarks !== null)
      .map((f) => ({ tMs: f.tMs, landmarks: f.landmarks! }));
    const out: SetupSample[][] = [];
    for (const f of frames) {
      const w = frames.filter((g) => g.tMs >= f.tMs && g.tMs <= f.tMs + SETUP_CONFIG.stillWindowMs);
      if (w.length >= 20 && w[w.length - 1]!.tMs - w[0]!.tMs >= SETUP_CONFIG.stillWindowMs) out.push(w);
    }
    return { out, aspect: s.aspect, side };
  };
  const calmest = (clip: string, side: 'left' | 'right') => {
    const { out, aspect } = windows(clip, side);
    return Math.min(...out.map((w) => legMove(w, side, aspect)));
  };

  it('a person who moves all the time never meets the rule (clips 01 and 02: the calmest 2 s window moves 0.040 and 0.046)', () => {
    for (const clip of ['01', '02']) {
      const { out, aspect } = windows(clip, 'left');
      expect(out.length).toBeGreaterThan(50);
      expect(out.some((w) => isStill(w, 'left', aspect, SETUP_CONFIG))).toBe(false);
    }
  });

  it('a leg that holds still meets the rule (clips 03 to 07: the calmest 2 s window moves 0.004 to 0.013)', () => {
    for (const clip of ['03', '04', '05', '06', '07']) {
      const { out, aspect } = windows(clip, 'left');
      expect(out.some((w) => isStill(w, 'left', aspect, SETUP_CONFIG))).toBe(true);
    }
  });

  it('the limit is at least 1.4 times the noise floor and well under the move of a moving person', () => {
    const floor = Math.max(...['03', '04', '05', '06', '07'].map((c) => calmest(c, 'left')));
    const moving = Math.min(calmest('01', 'left'), calmest('02', 'left'));
    expect(floor).toBeLessThan(0.0135);
    expect(moving).toBeGreaterThan(0.039);
    expect(SETUP_CONFIG.stillMaxMove).toBeGreaterThanOrEqual(floor * 1.4);
    expect(SETUP_CONFIG.stillMaxMove).toBeLessThan(moving / 1.5);
    expect(SETUP_CONFIG.stillWindowMs).toBe(2000);
  });
});
