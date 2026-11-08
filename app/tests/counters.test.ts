import {
  holdInitial,
  holdStep,
  lagInitial,
  lagStep,
  repsInitial,
  repsStep,
  type RepsConfig,
} from '../src/lib/counters';

const cfg: RepsConfig = { enter: 60, exit: 30, target: 70, minStateMs: 300 };

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
