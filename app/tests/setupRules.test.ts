import { createSetupStabilizer, evaluateSetup, SETUP_CONFIG, SETUP_TEXT, type SetupSample } from '../src/lib/setupRules';
import type { Landmark } from '../src/lib/angle';
import { legLandmarks } from './helpers/leg';

const good = () => legLandmarks('left', 20);
const set = (lm: Landmark[], i: number, p: Landmark) => {
  lm[i] = p;
  return lm;
};
// Samples every 100 ms for the stillness window.
const steady = (lm: Landmark[]): SetupSample[] => Array.from({ length: 21 }, (_, i) => ({ tMs: i * 100, landmarks: lm }));
const run = (lm: Landmark[], history = steady(lm)) => evaluateSetup(lm, 'left', 1, SETUP_CONFIG, history);

describe('evaluateSetup, one test for each failing rule', () => {
  it('rule 1: no pose', () => {
    expect(evaluateSetup(null, 'left', 1).id).toBe('no-pose');
    expect(evaluateSetup([], 'left', 1).id).toBe('no-pose');
  });

  it('rule 2: operated leg hidden and the other side clearer', () => {
    const lm = good();
    lm[27] = { x: 0.5, y: 0.7, visibility: 0.2 };
    [24, 26, 28].forEach((i) => (lm[i] = { x: 0.5, y: 0.5, visibility: 1 }));
    expect(run(lm).id).toBe('turn-leg');
  });

  it('rule 3: operated leg hidden and the other side not clearer', () => {
    const lm = good();
    lm[27] = { x: 0.5, y: 0.7, visibility: 0.2 };
    expect(run(lm).id).toBe('show-leg');
  });

  it('rule 4: a leg landmark too near a frame edge', () => {
    expect(run(legLandmarks('left', 20, { hip: { x: 0.02, y: 0.3 } })).id).toBe('whole-leg');
  });

  it('rule 4: the foot too near a frame edge', () => {
    const lm = set(good(), 31, { x: 0.5, y: 0.99, visibility: 1 });
    expect(run(lm).id).toBe('whole-leg');
  });

  it('rule 5: leg too small in the frame', () => {
    expect(run(legLandmarks('left', 20, { length: 0.1 })).id).toBe('closer');
  });

  it('rule 6: hips not one above the other', () => {
    const lm = set(good(), 24, { x: 0.7, y: 0.3, visibility: 1 });
    expect(run(lm).id).toBe('side-on');
  });

  it('rule 7: not still', () => {
    const history = Array.from({ length: 21 }, (_, i) => ({ tMs: i * 100, landmarks: legLandmarks('left', 20, { hip: { x: 0.5 + i * 0.003, y: 0.3 } }) }));
    expect(run(good(), history).id).toBe('still');
  });

  it('rule 7: a history shorter than the window is not still', () => {
    expect(run(good(), steady(good()).slice(0, 10)).id).toBe('still');
    expect(run(good(), []).id).toBe('still');
  });

  it('ready: all rules pass', () => {
    expect(run(good())).toEqual({ id: 'ready', text: SETUP_TEXT.ready, ready: true });
  });
});

describe('evaluateSetup, details', () => {
  it('returns the first failed rule when several fail', () => {
    // Edge (4), small (5) and not side-on (6) all fail. Rule 4 wins.
    const lm = set(legLandmarks('left', 20, { hip: { x: 0.02, y: 0.3 }, length: 0.1 }), 24, { x: 0.9, y: 0.3, visibility: 1 });
    expect(run(lm).id).toBe('whole-leg');
    // Remove the edge fault. Rule 5 wins over rule 6.
    const lm2 = set(legLandmarks('left', 20, { length: 0.1 }), 24, { x: 0.9, y: 0.3, visibility: 1 });
    expect(run(lm2).id).toBe('closer');
    // No pose wins over everything.
    expect(evaluateSetup(null, 'left', 1, SETUP_CONFIG, []).id).toBe('no-pose');
  });

  it('uses the operated side that the caller names', () => {
    const lm = legLandmarks('right', 20);
    expect(evaluateSetup(lm, 'right', 1, SETUP_CONFIG, steady(lm)).id).toBe('ready');
    expect(evaluateSetup(lm, 'left', 1, SETUP_CONFIG, steady(lm)).id).toBe('turn-leg');
  });

  it('measures leg size against the long side of a wide frame', () => {
    // Leg length 0.4 of the height. In a 16:9 frame the long side is 1.78 high units: 0.22, too small.
    const lm = good();
    expect(evaluateSetup(lm, 'left', 16 / 9, SETUP_CONFIG, steady(lm)).id).toBe('closer');
  });

  it('keeps every number in one config and states the distance advice', () => {
    expect(SETUP_CONFIG.distanceAdviceM).toEqual({ min: 2.0, max: 2.5 });
  });
});

describe('createSetupStabilizer', () => {
  const sample = (lm: Landmark[] | null = good()) => ({ landmarks: lm, side: 'left' as const, aspect: 1 });
  // Same positions, but the knee is hidden and the right side is clear.
  const glitch = () => {
    const lm = good();
    lm[25] = { x: 0.5, y: 0.5, visibility: 0.1 };
    [24, 26, 28].forEach((i) => (lm[i] = { x: 0.5, y: 0.5, visibility: 1 }));
    return lm;
  };
  const feed = (stab: ReturnType<typeof createSetupStabilizer>, from: number, to: number, lm: () => Landmark[] | null = good) => {
    let last = stab(sample(lm()), from);
    for (let t = from + 100; t <= to; t += 100) last = stab(sample(lm()), t);
    return last;
  };
  // Steady from 0 to 3000: the ready rule holds for 1 s from 2000, so the text is ready at 3000.
  const readyStab = () => {
    const stab = createSetupStabilizer();
    const first = feed(stab, 0, 3000);
    return { stab, first };
  };

  it('shows ready only after the rule held for 1 second, and starts the countdown', () => {
    const { first } = readyStab();
    expect(first.text).toBe(SETUP_TEXT.ready);
    expect(first.ready).toBe(false);
    expect(first.countdownLeftMs).toBe(5000);
  });

  it('does not change the text for a failure under 1 second', () => {
    const { stab } = readyStab();
    const texts = new Set<string>();
    for (let t = 3100; t <= 3900; t += 100) texts.add(stab(sample(glitch()), t).text);
    expect(texts).toEqual(new Set([SETUP_TEXT.ready]));
    expect(feed(stab, 4000, 4000).text).toBe(SETUP_TEXT.ready);
  });

  it('changes the text after a failure of 1 second', () => {
    const { stab } = readyStab();
    expect(feed(stab, 3100, 3900, glitch).text).toBe(SETUP_TEXT.ready);
    expect(stab(sample(glitch()), 4100).text).toBe(SETUP_TEXT['turn-leg']);
  });

  it('announces at most every 3 seconds', () => {
    const stab = createSetupStabilizer();
    const times: number[] = [];
    // The condition switches every 1.1 s, so the shown text changes about every 1.1 s.
    for (let t = 0; t <= 20000; t += 100) {
      const lm = Math.floor(t / 1100) % 2 === 0 ? good() : glitch();
      if (stab(sample(lm), t).announce !== null) times.push(t);
    }
    expect(times.length).toBeGreaterThan(2);
    times.slice(1).forEach((t, i) => expect(t - (times[i] as number)).toBeGreaterThanOrEqual(3000));
  });

  it('announces the first text at once and a text only when it changes', () => {
    const stab = createSetupStabilizer();
    expect(stab(sample(null), 0).announce).toBe(SETUP_TEXT['no-pose']);
    expect(stab(sample(null), 100).announce).toBeNull();
  });

  it('runs a 5-second countdown and then reports ready', () => {
    const { stab } = readyStab();
    const before = feed(stab, 3100, 7900);
    expect(before.ready).toBe(false);
    expect(before.countdownLeftMs).toBe(100);
    expect(feed(stab, 8000, 8000).ready).toBe(true);
  });

  it('moreTime adds 30 seconds', () => {
    const { stab } = readyStab();
    feed(stab, 3100, 4000);
    stab.moreTime();
    expect(feed(stab, 4100, 8000).ready).toBe(false);
    expect(feed(stab, 8100, 37900).ready).toBe(false);
    expect(feed(stab, 38000, 38000).ready).toBe(true);
  });

  it('resets the countdown when a rule fails during it', () => {
    const { stab } = readyStab();
    feed(stab, 3100, 5000);
    // A failure of more than 1 second changes the shown rule and stops the countdown.
    const failed = feed(stab, 5100, 6200, glitch);
    expect(failed.countdownLeftMs).toBeNull();
    expect(failed.ready).toBe(false);
    // The rule holds again for 1 second. The countdown starts at 5000 again.
    feed(stab, 6300, 7200);
    const back = feed(stab, 7300, 7300);
    expect(back.text).toBe(SETUP_TEXT.ready);
    expect(back.countdownLeftMs).toBe(5000);
  });
});
