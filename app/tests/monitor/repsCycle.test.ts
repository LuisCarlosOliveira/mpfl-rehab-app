// Step B3: the mode reps-cycle (ankle pump). One rep is one rise and one fall of the angle at the ankle (knee, ankle, foot index).
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60000 }); // the noise tests run minutes of frames
import type { Landmark } from '../../src/lib/angle';
import { readMeasure } from '../../src/lib/monitor/measure';
import { ANKLE_MAX_RISE_MS, ANKLE_MIN_AMPLITUDE, createCycleDriver, cycleInitial, cycleStep } from '../../src/lib/monitor/modes';
import { specFor } from '../../src/lib/monitor/registry';
import { makeSeries, type Series, type SeriesSpec } from '../helpers/landmarkSeries';

const ANKLE = { kind: 'joint-angle', joint: 'knee-ankle-footIndex' } as const;
const threshold = (name: string) => specFor('ankle-pump')?.thresholds.find((t) => t.name === name)?.value as number;

/** Feeds a series to a driver. `until` cuts the series (ms). Returns the reps and the driver. */
function run(s: Series, until = Infinity) {
  const d = createCycleDriver({ minAmplitude: threshold('min-amplitude'), minStateMs: threshold('min-state-ms'), maxRiseMs: threshold('max-rise-ms') });
  for (const f of s.frames) {
    if (f.tMs > until) break;
    d.sample(f.landmarks ? readMeasure(ANKLE, f.landmarks as Landmark[], 'left', 1) : null, f.tMs);
  }
  return d;
}
/** N pumps and then a short rest, so the last fall has time to finish. 11 cycles are made, and the series stops at N + 0.15 of a cycle. */
const pumps = (n: number, extra: Partial<SeriesSpec> = {}) => {
  const periodMs = (extra.periodS ?? 2) * 1000;
  return { s: makeSeries({ pose: 'ankle-pump', cycles: n + 1, ...extra }), until: (n + 0.15) * periodMs };
};

describe('the values of the definition', () => {
  it('sets min-amplitude and min-state-ms, both with origin engineering', () => {
    const t = specFor('ankle-pump')?.thresholds ?? [];
    expect(t.find((x) => x.name === 'min-amplitude')).toMatchObject({ value: ANKLE_MIN_AMPLITUDE, origin: 'engineering' });
    expect(t.find((x) => x.name === 'min-state-ms')).toMatchObject({ value: 300, origin: 'engineering' });
    expect(ANKLE_MIN_AMPLITUDE).toBe(30);
    expect(t.find((x) => x.name === 'max-rise-ms')).toMatchObject({ value: ANKLE_MAX_RISE_MS, origin: 'engineering' });
  });
});

describe('cycleStep, with no noise', () => {
  it('counts one rep for one rise and one fall, and not for a rise alone', () => {
    const cfg = { minAmplitude: 30, minStateMs: 300, maxRiseMs: 4000 };
    let st = cycleInitial();
    const feed = (v: number, from: number, ms: number) => {
      for (let t = from; t < from + ms; t += 33) st = cycleStep(st, v, t, cfg).state;
      return from + ms;
    };
    let t = feed(80, 0, 500);
    t = feed(120, t, 600);
    expect(st.reps).toBe(0);
    t = feed(80, t, 600);
    expect(st.reps).toBe(1);
    expect(st.range).toBe(40);
    feed(120, t, 600);
    expect(st.reps).toBe(1);
  });

  it('needs the state time: a rise of 200 ms counts nothing', () => {
    const cfg = { minAmplitude: 30, minStateMs: 300, maxRiseMs: 4000 };
    let st = cycleInitial();
    for (let t = 0; t < 500; t += 33) st = cycleStep(st, 80, t, cfg).state;
    for (let t = 500; t < 700; t += 33) st = cycleStep(st, 120, t, cfg).state;
    for (let t = 700; t < 1500; t += 33) st = cycleStep(st, 80, t, cfg).state;
    expect(st.reps).toBe(0);
    expect(st.range).toBe(0);
  });

  it('a rise smaller than the amplitude counts nothing', () => {
    const cfg = { minAmplitude: 30, minStateMs: 300, maxRiseMs: 4000 };
    let st = cycleInitial();
    for (let c = 0; c < 5; c++) for (let t = 0; t < 2000; t += 33) st = cycleStep(st, t < 1000 ? 80 : 105, c * 2000 + t, cfg).state;
    expect(st.reps).toBe(0);
  });
});

describe('N cycles give N reps', () => {
  it('without noise, for 1, 5 and 12 pumps, at 30 and at 10 frames each second', () => {
    for (const fps of [30, 10] as const)
      for (const n of [1, 5, 12]) {
        const { s, until } = pumps(n, { fps });
        expect(run(s, until).reps(), `n ${n} fps ${fps}`).toBe(n);
      }
  });

  it('with a slower pump (3 s) and a pump of 40 degrees', () => {
    const a = pumps(6, { periodS: 3 });
    expect(run(a.s, a.until).reps()).toBe(6);
    const b = pumps(6, { lowDeg: 80, highDeg: 120 });
    expect(run(b.s, b.until).reps()).toBe(6);
  });

  it('with the 9 degree RMS noise model, within one rep, and never more (10 seeds of 10 pumps)', () => {
    let exact = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const { s, until } = pumps(10, { noise: { kneeRmsDeg: 9 }, seed });
      const reps = run(s, until).reps();
      expect(reps, `seed ${seed}`).toBeGreaterThanOrEqual(9);
      expect(reps, `seed ${seed}`).toBeLessThanOrEqual(10);
      if (reps === 10) exact += 1;
    }
    expect(exact).toBeGreaterThanOrEqual(7);
  });
});

describe('noise alone counts no rep', () => {
  // A constant angle (lowDeg equal to highDeg) with the 9 degree RMS noise. 2 minutes, 12 seeds, 30 frames each second.
  it('gives 0 reps for 12 seeds', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const s = makeSeries({ pose: 'ankle-pump', cycles: 60, lowDeg: 100, highDeg: 100, noise: { kneeRmsDeg: 9 }, seed: 100 + seed });
      expect(run(s).reps(), `seed ${seed}`).toBe(0);
    }
  });
  it('gives 0 reps for a leg that lies still with a small movement of the foot (6 degrees)', () => {
    for (let seed = 1; seed <= 4; seed++) {
      const s = makeSeries({ pose: 'ankle-pump', cycles: 30, lowDeg: 97, highDeg: 103, noise: { kneeRmsDeg: 9 }, seed });
      expect(run(s).reps(), `seed ${seed}`).toBe(0);
    }
  });
});

describe('a dropout', () => {
  it('of 500 ms across the top of a pump counts no rep, and no other rep appears', () => {
    // One pump of 2 s. The foot is not seen from 600 ms to 1900 ms, so the rise is not held and the fall is not seen.
    const s = makeSeries({ pose: 'ankle-pump', cycles: 2, dropouts: [{ ids: [31], startMs: 600, durationMs: 1300 }] });
    expect(run(s, 2300).reps()).toBe(0);
  });
  it('of 500 ms in the middle of a series never makes an extra rep', () => {
    const { s, until } = pumps(6, { dropouts: [{ ids: [31], startMs: 5300, durationMs: 500 }] });
    expect(run(s, until).reps()).toBeLessThanOrEqual(6);
    expect(run(s, until).reps()).toBeGreaterThanOrEqual(5);
  });
  it('the time of a rise starts again after a null sample', () => {
    const cfg = { minAmplitude: 30, minStateMs: 300, maxRiseMs: 4000 };
    let st = cycleInitial();
    for (let t = 0; t < 500; t += 33) st = cycleStep(st, 80, t, cfg).state;
    for (let t = 500; t < 700; t += 33) st = cycleStep(st, 120, t, cfg).state;
    st = cycleStep(st, null, 733, cfg).state;
    for (let t = 766; t < 966; t += 33) st = cycleStep(st, 120, t, cfg).state;
    expect(st.phase).toBe('low');
  });
  it('a frame with no person keeps the count', () => {
    const { s, until } = pumps(4, { noPerson: [{ startMs: 5000, durationMs: 400 }] });
    expect(run(s, until).reps()).toBeGreaterThanOrEqual(3);
  });
});

describe('ankle-range', () => {
  it('is the largest rise seen, as reportKey and reportValue', () => {
    const { s, until } = pumps(3);
    const d = run(s, until);
    expect(d.data().reportKey).toBe('ankle-range');
    // The filter takes a part of the top and the bottom: the range is a bit under the 50 degrees of the series.
    expect(d.data().reportValue).toBeGreaterThan(40);
    expect(d.data().reportValue).toBeLessThanOrEqual(50.001);
    expect(d.range()).toBe(d.data().reportValue);
  });
  it('is absent before a first rise', () => {
    const d = createCycleDriver({ minAmplitude: 30, minStateMs: 300, maxRiseMs: 4000 });
    expect(d.data()).toEqual({});
    expect(d.range()).toBeNull();
  });
});

describe('R-10: a rise that is too slow is a drift, not a pump', () => {
  const cfg = { minAmplitude: 30, minStateMs: 300, maxRiseMs: ANKLE_MAX_RISE_MS };
  it('the maximum rise time is 4 s', () => {
    expect(ANKLE_MAX_RISE_MS).toBe(4000);
  });
  it('a ramp of 30 degrees over 20 s, and then back, counts 0 reps (cycleStep)', () => {
    let st = cycleInitial();
    for (let t = 0; t <= 60000; t += 33) {
      const v = 80 + 40 * (t <= 30000 ? t / 30000 : Math.max(0, 1 - (t - 30000) / 20000));
      st = cycleStep(st, v, t, cfg).state;
    }
    expect(st.reps).toBe(0);
  });
  it('the same through the driver, with a half cosine of 40 s (30 degrees over 20 s)', () => {
    const s = makeSeries({ pose: 'ankle-pump', cycles: 2, periodS: 40, lowDeg: 80, highDeg: 110 });
    expect(run(s).reps()).toBe(0);
  });
  it('a ramp that takes 3 s still counts', () => {
    let st = cycleInitial();
    for (let t = 0; t <= 12000; t += 33) {
      const ph = t % 6000;
      const v = ph < 3000 ? 80 + 40 * (ph / 3000) : 120 - 40 * ((ph - 3000) / 3000);
      st = cycleStep(st, v, t, cfg).state;
    }
    expect(st.reps).toBeGreaterThanOrEqual(1);
  });
  it('a long rest before a normal pump does not stop it', () => {
    const cfg2 = { ...cfg };
    let st = cycleInitial();
    for (let t = 0; t < 20000; t += 33) st = cycleStep(st, 80 + (t % 200 < 100 ? 1 : 0), t, cfg2).state;
    for (let t = 20000; t < 21000; t += 33) st = cycleStep(st, 80 + 50 * ((t - 20000) / 1000), t, cfg2).state;
    for (let t = 21000; t < 22000; t += 33) st = cycleStep(st, 130, t, cfg2).state;
    for (let t = 22000; t < 23500; t += 33) st = cycleStep(st, 80, t, cfg2).state;
    expect(st.reps).toBe(1);
  });
});
