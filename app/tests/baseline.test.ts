// T17: the resting angle from the Setup hold-still. It is the median flexion of the chosen leg.
import { BASELINE_MIN_SAMPLES, median, restingBaseline } from '../src/lib/baseline';
import { SETUP_CONFIG, createSetupStabilizer, type SetupSample } from '../src/lib/setupRules';
import { legLandmarks } from './helpers/leg';

// Samples every 100 ms for 2.1 seconds. `flexions` gives the flexion of each sample.
const history = (flexions: number[], side: 'left' | 'right' = 'left', step = 100): SetupSample[] =>
  flexions.map((f, i) => ({ tMs: i * step, landmarks: legLandmarks(side, f) }));
const steady = (value: number, n = 21) => Array.from({ length: n }, () => value);

describe('median', () => {
  it('takes the middle value of an odd list and the mean of the middle two of an even list', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});

describe('restingBaseline', () => {
  it('returns the median flexion of a steady leg', () => {
    const r = restingBaseline(history(steady(12)), 'left', 1, SETUP_CONFIG);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.baselineDeg).toBeCloseTo(12, 1);
  });

  it('uses the median and not the mean: one outlier frame does not move it', () => {
    // 20 samples at 12 degrees and one at 15. The steady rule allows the small move. The mean is 12.14.
    const flex = [...steady(12, 20), 15];
    const r = restingBaseline(history(flex), 'left', 1, SETUP_CONFIG);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.baselineDeg).toBeCloseTo(12, 1);
  });

  it('measures the chosen leg and not the other leg', () => {
    const a = legLandmarks('left', 10);
    const b = legLandmarks('right', 40);
    const both = a.map((p, k) => (k === 24 || k === 26 || k === 28 ? b[k]! : p));
    const h: SetupSample[] = Array.from({ length: 21 }, (_, i) => ({ tMs: i * 100, landmarks: both }));
    const left = restingBaseline(h, 'left', 1, SETUP_CONFIG);
    const right = restingBaseline(h, 'right', 1, SETUP_CONFIG);
    if (!left.ok || !right.ok) throw new Error('both legs are visible and steady');
    expect(left.baselineDeg).toBeCloseTo(10, 0);
    expect(right.baselineDeg).toBeCloseTo(40, 0);
  });

  it('refuses when the leg moves in the window', () => {
    const moving = Array.from({ length: 21 }, (_, i) => 10 + i * 2);
    expect(restingBaseline(history(moving), 'left', 1, SETUP_CONFIG)).toEqual({ ok: false, reason: 'not-steady' });
  });

  it('refuses when the window is shorter than the still window', () => {
    expect(restingBaseline(history(steady(12, 25), 'left', 50), 'left', 1, SETUP_CONFIG)).toEqual({ ok: false, reason: 'not-steady' });
  });

  it('refuses when there are too few usable samples', () => {
    // 3 samples that span the window are steady, but too few to take a median.
    const h: SetupSample[] = [0, 1000, 2100].map((t) => ({ tMs: t, landmarks: legLandmarks('left', 12) }));
    expect(restingBaseline(h, 'left', 1, SETUP_CONFIG)).toEqual({ ok: false, reason: 'too-few-samples' });
    expect(BASELINE_MIN_SAMPLES).toBeGreaterThanOrEqual(10);
  });

  it('ignores samples where the leg is hidden', () => {
    const h = history(steady(12, 40), 'left', 55);
    const hidden = h.map((s, i) => (i % 2 === 0 ? s : { ...s, landmarks: legLandmarks('left', 12).map((p, k) => (k === 27 ? { ...p, visibility: 0.1 } : p)) }));
    const r = restingBaseline(hidden, 'left', 1, SETUP_CONFIG);
    expect(r.ok).toBe(true);
  });

  it('reuses the still rule of the setup check: the same limit decides', () => {
    // A move of 2 percent of the frame height is the limit of SETUP_CONFIG.stillMaxMove.
    const big: SetupSample[] = Array.from({ length: 21 }, (_, i) => ({
      tMs: i * 100,
      landmarks: legLandmarks('left', 12, { hip: { x: 0.5, y: 0.3 + (i === 20 ? SETUP_CONFIG.stillMaxMove * 2 : 0) } }),
    }));
    expect(restingBaseline(big, 'left', 1, SETUP_CONFIG)).toEqual({ ok: false, reason: 'not-steady' });
  });
});

describe('stabilizer: the baseline comes with the ready state', () => {
  const run = (flex: (i: number) => number, frames = 120) => {
    const step = createSetupStabilizer();
    let out = step({ landmarks: legLandmarks('left', flex(0), { length: 0.3, hip: { x: 0.5, y: 0.2 } }), side: 'left', aspect: 1 }, 0);
    for (let i = 1; i < frames; i++) {
      out = step({ landmarks: legLandmarks('left', flex(i), { length: 0.3, hip: { x: 0.5, y: 0.2 } }), side: 'left', aspect: 1 }, i * 100);
    }
    return out;
  };

  it('gives the median resting flexion once the check is ready', () => {
    const out = run(() => 22);
    expect(out.rule).toBe('ready');
    expect(out.baselineDeg).toBeCloseTo(22, 0);
  });

  it('gives no baseline while the leg moves', () => {
    const out = run((i) => 10 + (i % 20) * 3);
    expect(out.rule).not.toBe('ready');
    expect(out.baselineDeg).toBeNull();
  });

  it('gives no baseline before the first frame', () => {
    const step = createSetupStabilizer();
    expect(step({ landmarks: null, side: 'left', aspect: 1 }, 0).baselineDeg).toBeNull();
  });
});
