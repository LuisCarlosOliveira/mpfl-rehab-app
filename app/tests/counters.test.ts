import {
  countBlock,
  holdInitial,
  holdStep,
  lagInitial,
  lagStep,
  repsInitial,
  repsStep,
  type HoldConfig,
  type RepsConfig,
} from '../src/lib/counters';

const cfg: RepsConfig = { enter: 60, baseline: 0, returnWithin: 30, target: 70, minStateMs: 300 };

// Run a list of [flexion, ms] samples through the reps counter.
function run(samples: Array<[number | null, number]>, config: RepsConfig = cfg) {
  let state = repsInitial();
  const events: string[] = [];
  for (const [flex, t] of samples) {
    const out = repsStep(state, { flexion: flex, t }, config);
    state = out.state;
    if (out.event) events.push(out.event);
  }
  return { state, events };
}

// One full rep: up to peak and back, 33 ms per sample.
function fullRep(start: number, peak: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let t = start;
  for (let f = 0; f <= peak; f += 5, t += 33) out.push([f, t]);
  for (let f = peak; f >= 0; f -= 5, t += 33) out.push([f, t]);
  // dwell at the bottom so the minimum state time passes
  for (let i = 0; i < 12; i++, t += 33) out.push([0, t]);
  return out;
}

describe('repsStep', () => {
  it('counts 0 for jitter around the enter threshold', () => {
    const samples: Array<[number, number]> = [];
    for (let i = 0; i < 100; i++) samples.push([60 + (i % 2 === 0 ? 3 : -3), i * 33]);
    expect(run(samples).events.filter((e) => e === 'rep')).toHaveLength(0);
  });

  it('does not end a rep on jitter around the exit threshold', () => {
    const samples: Array<[number, number]> = [];
    let t = 0;
    for (let f = 0; f <= 90; f += 10, t += 33) samples.push([f, t]); // up to the peak
    for (let i = 0; i < 12; i++, t += 33) samples.push([90, t]); // hold in FLEXED
    for (let i = 0; i < 20; i++, t += 33) samples.push([30 + (i % 2 === 0 ? 3 : -3), t]); // jitter at exit
    expect(run(samples).events.filter((e) => e === 'rep')).toHaveLength(0);
  });

  it('counts 0 for a partial range below the target', () => {
    const rep = fullRep(0, 65); // reaches FLEXED but not the target of 70
    expect(run(rep).events.filter((e) => e === 'rep')).toHaveLength(0);
  });

  it('counts 10 for ten full reps', () => {
    let t = 0;
    const all: Array<[number, number]> = [];
    for (let i = 0; i < 10; i++) {
      const rep = fullRep(t, 90);
      all.push(...rep);
      t = (rep[rep.length - 1] as [number, number])[1] + 33;
    }
    expect(run(all).events.filter((e) => e === 'rep')).toHaveLength(10);
  });

  it('gives an alert and counts 0 when the peak is above maxFlexion', () => {
    const config: RepsConfig = { ...cfg, maxFlexion: 80 };
    const { events } = run(fullRep(0, 95), config);
    expect(events).toContain('over-limit');
    expect(events.filter((e) => e === 'rep')).toHaveLength(0);
  });

  it('pauses on a null sample and keeps the count', () => {
    const rep = fullRep(0, 90);
    const half = rep.slice(0, 10);
    let state = repsInitial();
    for (const [f, t] of half) state = repsStep(state, { flexion: f, t }, cfg).state;
    const paused = repsStep(state, { flexion: null, t: 9999 }, cfg);
    expect(paused.event).toBe('paused');
    expect(paused.state.reps).toBe(state.reps);
  });

  it('ignores a spike shorter than the minimum state time', () => {
    const samples: Array<[number, number]> = [];
    for (let i = 0; i < 10; i++) samples.push([0, i * 33]);
    samples.push([95, 330]); // one spike sample
    for (let i = 0; i < 10; i++) samples.push([0, 363 + i * 33]);
    expect(run(samples).events.filter((e) => e === 'rep')).toHaveLength(0);
  });
});

// ---- Return to the resting angle (T17) -------------------------------------
// A rep ends when the flexion is back within returnWithin degrees of the baseline.
// The baseline is the resting angle that Setup measured. The protocol sets returnWithin.

describe('repsStep: return relative to the resting angle', () => {
  const rcfg = (baseline: number | undefined, returnWithin: number | undefined): RepsConfig => ({
    enter: 48,
    baseline,
    returnWithin,
    target: 60,
    minStateMs: 300,
    maxFlexion: 90,
    margin: 9,
  });

  // One rep from `rest` up to `peak` and back to `rest`, 33 ms a sample, with a dwell at rest.
  const repFrom = (rest: number, peak: number, start = 0): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    let t = start;
    for (let f = rest; f < peak; f += 5, t += 33) out.push([f, t]);
    for (let i = 0; i < 12; i++, t += 33) out.push([peak, t]);
    for (let f = peak; f > rest; f -= 5, t += 33) out.push([f, t]);
    for (let i = 0; i < 14; i++, t += 33) out.push([rest, t]);
    return out;
  };
  const reps = (samples: Array<[number | null, number]>, config: RepsConfig) =>
    run(samples, config).events.filter((e) => e === 'rep').length;

  it('counts reps for a person who rests at 25 degrees', () => {
    const config = rcfg(25, 10);
    const all: Array<[number, number]> = [];
    let t = 0;
    for (let i = 0; i < 3; i++) {
      const rep = repFrom(25, 70, t);
      all.push(...rep);
      t = (rep[rep.length - 1] as [number, number])[1] + 33;
    }
    expect(reps(all, config)).toBe(3);
  });

  it('counts the old failing case: the knee never goes below 22 and the baseline is 22', () => {
    // The old rule needed 18 degrees for a target of 60. This leg rests above it.
    const rep = repFrom(22, 70);
    expect(reps(rep, rcfg(0, 18))).toBe(0);
    expect(reps(rep, rcfg(22, 18))).toBe(1);
  });

  it('does not end the rep while the knee is farther from the baseline than returnWithin', () => {
    const rep = repFrom(25, 70).map(([f, t]): [number, number] => [f === 25 ? 40 : f, t]);
    expect(reps(rep, rcfg(25, 10))).toBe(0);
  });

  it('ends the rep exactly at the baseline plus returnWithin', () => {
    const config = rcfg(25, 10);
    const rep = repFrom(25, 70).map(([f, t]): [number, number] => [f === 25 ? 35 : f, t]);
    expect(reps(rep, config)).toBe(1);
    const above = repFrom(25, 70).map(([f, t]): [number, number] => [f === 25 ? 35.5 : f, t]);
    expect(reps(above, config)).toBe(0);
  });

  it('does not double count for noise around the return value', () => {
    const config = rcfg(25, 10);
    const samples: Array<[number, number]> = [];
    let t = 0;
    for (let f = 25; f <= 70; f += 5, t += 33) samples.push([f, t]);
    for (let i = 0; i < 12; i++, t += 33) samples.push([70, t]);
    for (let f = 70; f >= 25; f -= 5, t += 33) samples.push([f, t]);
    for (let i = 0; i < 14; i++, t += 33) samples.push([25, t]); // the rep ends here
    for (let i = 0; i < 40; i++, t += 33) samples.push([35 + (i % 2 === 0 ? 3 : -3), t]); // noise at the return value
    expect(reps(samples, config)).toBe(1);
  });

  it('counts no rep and gives the reason when the protocol has no return value', () => {
    const config = rcfg(0, undefined);
    const rep = repFrom(0, 70);
    expect(reps(rep, config)).toBe(0);
    expect(run(rep, config).state.blocked).toBe('no-return-value');
    expect(countBlock(config)).toBe('no-return-value');
  });

  it('counts no rep and gives the reason when there is no baseline', () => {
    const config = rcfg(undefined, 10);
    expect(reps(repFrom(0, 70), config)).toBe(0);
    expect(run(repFrom(0, 70), config).state.blocked).toBe('no-baseline');
    expect(countBlock(config)).toBe('no-baseline');
  });

  it('names the missing protocol value first when both are missing', () => {
    expect(countBlock(rcfg(undefined, undefined))).toBe('no-return-value');
  });

  it('gives no reason when both values are present', () => {
    expect(countBlock(rcfg(0, 10))).toBeNull();
    expect(run(repFrom(0, 70), rcfg(0, 10)).state.blocked).toBeNull();
  });

  it('keeps the ceiling alerts while it counts no rep', () => {
    const config = rcfg(0, undefined);
    const events = run(repFrom(0, 105), config).events;
    expect(events).toContain('near-limit');
    expect(events).toContain('over-limit');
  });

  it('gives the ceiling alert again for a second lift after the knee comes down, while it counts no rep', () => {
    const config = rcfg(0, undefined);
    const events = run([...repFrom(0, 105), ...repFrom(0, 105, 5000)], config).events;
    expect(events.filter((e) => e === 'over-limit')).toHaveLength(2);
  });
});

describe('holdStep', () => {
  const hcfg = { direction: 'at-least' as const, threshold: 60, minHoldMs: 1000 };

  it('reports a hold when the angle stays in range long enough', () => {
    let state = holdInitial();
    let last: string | null = null;
    for (let t = 0; t <= 1200; t += 100) {
      const out = holdStep(state, { flexion: 70, t }, hcfg);
      state = out.state;
      if (out.event) last = out.event;
    }
    expect(last).toBe('hold-complete');
    expect(state.holds).toBe(1);
  });

  it('resets the timer on a drop', () => {
    let state = holdInitial();
    for (let t = 0; t <= 800; t += 100) state = holdStep(state, { flexion: 70, t }, hcfg).state;
    state = holdStep(state, { flexion: 20, t: 900 }, hcfg).state;
    for (let t = 1000; t <= 1700; t += 100) state = holdStep(state, { flexion: 70, t }, hcfg).state;
    expect(state.holds).toBe(0);
  });

  it('holds in the extended direction when flexion stays at or below the threshold', () => {
    const ext = { direction: 'at-most' as const, threshold: 10, minHoldMs: 1000 };
    let state = holdInitial();
    for (let t = 0; t <= 1200; t += 100) state = holdStep(state, { flexion: 5, t }, ext).state;
    expect(state.holds).toBe(1);
    let bent = holdInitial();
    for (let t = 0; t <= 1200; t += 100) bent = holdStep(bent, { flexion: 40, t }, ext).state;
    expect(bent.holds).toBe(0);
  });

  it('pauses on a null sample', () => {
    const out = holdStep(holdInitial(), { flexion: null, t: 0 }, hcfg);
    expect(out.event).toBe('paused');
  });
});

// T28: the hold between the straightest allowed angle (arcEnd.limit) and the hold angle (threshold minus the margin).
describe('holdStep: arc end of the seated hold', () => {
  const MARGIN = 9;
  const arc = { direction: 'at-most' as const, threshold: 60 + MARGIN, minHoldMs: 1000, arcEnd: { limit: 40, margin: MARGIN } };
  const feed = (flexions: number[], config: HoldConfig = arc, step = 100) => {
    let state = holdInitial();
    const events: string[] = [];
    flexions.forEach((flexion, i) => {
      const out = holdStep(state, { flexion, t: i * step }, config);
      state = out.state;
      if (out.event) events.push(out.event);
    });
    return { state, events };
  };
  const at = (flexion: number, n: number) => Array.from({ length: n }, () => flexion);

  it('counts a hold at the hold angle and gives no cue', () => {
    const r = feed(at(55, 13));
    expect(r.state.holds).toBe(1);
    expect(r.events).toEqual(['hold-complete']);
  });

  it('does not count a knee that is straighter than the limit minus the margin, and gives the stop cue once', () => {
    const r = feed(at(30, 30));
    expect(r.state.holds).toBe(0);
    expect(r.events).toEqual(['over-limit']);
  });

  it('counts at the limit minus the margin, because the counting side gives the benefit of the doubt', () => {
    expect(feed(at(40 - MARGIN, 13)).state.holds).toBe(1);
    expect(feed(at(40 - MARGIN - 1, 13)).state.holds).toBe(0);
  });

  it('warns once inside the margin of the limit and still counts the hold', () => {
    const r = feed(at(45, 13));
    expect(r.events).toEqual(['near-limit', 'hold-complete']);
    expect(r.state.holds).toBe(1);
  });

  it('starts the timer again when the knee goes straighter than the limit', () => {
    const r = feed([...at(55, 8), ...at(20, 2), ...at(55, 8)]);
    expect(r.state.holds).toBe(0);
    expect(r.events).toEqual(['over-limit']);
  });

  it('gives the restart cue when the knee bends more than the hold angle plus the margin before the hold ends', () => {
    const r = feed([...at(55, 8), ...at(95, 2), ...at(55, 8)]);
    expect(r.events).toEqual(['hold-restart']);
    expect(r.state.holds).toBe(0);
  });

  it('gives no restart cue when the knee was never in the hold', () => {
    expect(feed(at(95, 10)).events).toEqual([]);
  });

  it('gives no restart cue when the foot goes down after a counted hold', () => {
    const r = feed([...at(55, 13), ...at(95, 3)]);
    expect(r.events).toEqual(['hold-complete']);
  });

  it('warns again for a second excursion after the knee left the margin', () => {
    const r = feed([...at(20, 2), ...at(70, 2), ...at(20, 2)]);
    expect(r.events).toEqual(['over-limit', 'over-limit']);
  });

  it('works without an arc end, as before', () => {
    const plain = { direction: 'at-most' as const, threshold: 10, minHoldMs: 1000 };
    expect(feed(at(5, 13), plain).state.holds).toBe(1);
  });
});

describe('lagStep', () => {
  it('keeps the smallest flexion seen at the top of the lift as the lag', () => {
    let state = lagInitial();
    for (const f of [12, 9, 7, 8, 11]) state = lagStep(state, { flexion: f, t: 0 }).state;
    expect(state.lag).toBe(7);
  });

  it('ignores null samples', () => {
    const state = lagStep(lagInitial(), { flexion: null, t: 0 });
    expect(state.event).toBe('paused');
    expect(state.state.lag).toBeNull();
  });
});

// ---- margin rule (FR8) -------------------------------------------------------
// Target 45, ceiling 50, margin 9. The rep counts from 36 (target minus margin).
// The warning starts at 41 (limit minus margin). The count is refused above 59 (limit plus margin).
describe('repsStep with a margin', () => {
  const mcfg: RepsConfig = { enter: 36, baseline: 0, returnWithin: 15, target: 45, minStateMs: 300, maxFlexion: 50, margin: 9 };

  // Ramp 1 degree per sample up to the peak, hold the peak for 12 samples (a spike shorter
  // than the minimum state time must not count), come back, then dwell at rest.
  function shape(peak: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    let t = 0;
    for (let f = 0; f <= peak; f += 1, t += 33) out.push([f, t]);
    for (let i = 0; i < 12; i++, t += 33) out.push([peak, t]);
    for (let f = peak; f >= 0; f -= 1, t += 33) out.push([f, t]);
    for (let i = 0; i < 12; i++, t += 33) out.push([0, t]);
    return out;
  }
  const count = (events: string[], name: string) => events.filter((e) => e === name).length;

  it('counts nothing when the peak stays below the entry threshold of target minus margin', () => {
    const { state, events } = run(shape(35), mcfg);
    expect(state.reps).toBe(0);
    expect(events).toEqual([]);
  });

  it('counts a rep that reaches target minus margin, with no warning', () => {
    const { state, events } = run(shape(40), mcfg);
    expect(state.reps).toBe(1);
    expect(count(events, 'near-limit')).toBe(0);
    expect(count(events, 'over-limit')).toBe(0);
  });

  it('warns once from limit minus margin and still counts the rep', () => {
    const { state, events } = run(shape(41), mcfg);
    expect(state.reps).toBe(1);
    expect(count(events, 'near-limit')).toBe(1);
  });

  it.each([45, 50, 55, 59])('counts a rep that peaks at %s, inside the margin of the limit, with one warning', (peak) => {
    const { state, events } = run(shape(peak), mcfg);
    expect(state.reps).toBe(1);
    expect(count(events, 'near-limit')).toBe(1);
    expect(count(events, 'over-limit')).toBe(0);
  });

  it.each([60, 70, 90])('alerts and refuses the count when the peak is %s, above limit plus margin', (peak) => {
    const { state, events } = run(shape(peak), mcfg);
    expect(state.reps).toBe(0);
    expect(count(events, 'over-limit')).toBe(1);
  });

  it('keeps the alert and gives no count for a rep that went over, then counts the next good rep', () => {
    const both = [...shape(70), ...shape(40).map(([f, t]) => [f, t + 100000] as [number, number])];
    const { state } = run(both, mcfg);
    expect(state.reps).toBe(1);
  });

  it('works without a margin as before (a margin of zero)', () => {
    const { state, events } = run(shape(51), { ...mcfg, margin: undefined });
    expect(state.reps).toBe(0);
    expect(count(events, 'over-limit')).toBe(1);
  });
});

describe('repsStep rep time', () => {
  const tcfg: RepsConfig = { enter: 36, baseline: 0, returnWithin: 15, target: 45, minStateMs: 300, margin: 9, minRepMs: 2000 };

  // One rep as a triangle of the given length, then a dwell at rest.
  function triangle(peak: number, durationMs: number): Array<[number, number]> {
    const n = Math.round(durationMs / 33);
    const out: Array<[number, number]> = [];
    let t = 0;
    for (let i = 0; i <= n; i++, t += 33) out.push([peak * (1 - Math.abs((2 * i) / n - 1)), t]);
    for (let i = 0; i < 12; i++, t += 33) out.push([0, t]);
    return out;
  }

  it('gives too-fast and still counts the rep when the rep is shorter than the minimum', () => {
    const { state, events } = run(triangle(90, 1200), tcfg);
    expect(state.reps).toBe(1);
    expect(events).toContain('too-fast');
    expect(events).not.toContain('rep');
  });

  it('gives a plain rep when the rep is longer than the minimum', () => {
    const { state, events } = run(triangle(90, 3600), tcfg);
    expect(state.reps).toBe(1);
    expect(events).toContain('rep');
    expect(events).not.toContain('too-fast');
  });

  it('gives no too-fast event when the protocol sets no minimum', () => {
    const { events } = run(triangle(90, 1200), { ...tcfg, minRepMs: undefined });
    expect(events).not.toContain('too-fast');
    expect(events).toContain('rep');
  });

  it('records the rep time in the state', () => {
    const { state } = run(triangle(90, 3600), tcfg);
    expect(state.lastRepMs).not.toBeNull();
    expect(state.lastRepMs as number).toBeGreaterThan(2000);
    expect(state.lastRepMs as number).toBeLessThan(3600);
  });
});
