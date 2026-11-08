import { OneEuroFilter } from '../src/lib/oneEuro';

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Gaussian noise from two uniform values (Box-Muller).
function gauss(next: () => number, sigma: number) {
  const u = Math.max(next(), 1e-12);
  return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
}

const variance = (xs: number[]) => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
};

describe('OneEuroFilter', () => {
  it('keeps a constant input constant', () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0 });
    let out = 0;
    for (let t = 0; t < 1000; t += 33) out = f.filter(42, t);
    expect(out).toBeCloseTo(42, 6);
  });

  it('returns the first sample unchanged', () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0 });
    expect(f.filter(10, 0)).toBe(10);
  });

  it('cuts the jitter of a noisy slow signal by at least 50 percent', () => {
    // seed 1, sigma 2 degrees, 300 samples, slow sine.
    // Jitter is the variance of sample-to-sample differences. This is what causes
    // false threshold crossings. Lag against the truth is tested by the step test.
    const next = rng(1);
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0 });
    const noisy: number[] = [];
    const filtered: number[] = [];
    for (let i = 0; i < 300; i++) {
      const t = i * 33;
      const truth = 40 + 30 * Math.sin((2 * Math.PI * t) / 8000);
      const sample = truth + gauss(next, 2);
      noisy.push(sample);
      filtered.push(f.filter(sample, t));
    }
    const diffs = (xs: number[]) => xs.slice(1).map((x, i) => x - (xs[i] as number));
    expect(variance(diffs(filtered))).toBeLessThan(0.5 * variance(diffs(noisy)));
  });

  it('follows a step with bounded lag', () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0.05 });
    for (let t = 0; t < 1000; t += 33) f.filter(0, t);
    let out = 0;
    for (let t = 1000; t < 1000 + 33 * 60; t += 33) out = f.filter(90, t);
    expect(out).toBeGreaterThan(85);
  });

  it('resets so the next sample passes through', () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0 });
    f.filter(10, 0);
    f.filter(10, 33);
    f.reset();
    expect(f.filter(50, 66)).toBe(50);
  });
});
