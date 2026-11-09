// F1: the in-place capture of the starting angle in Session.
// It uses the same still rule as Setup. The lowest steady angle is taken only after a press.
import { CAPTURE_CONFIG, createBaselineCapture, lowestSteadyAngle } from '../src/lib/baseline';
import { SETUP_CONFIG } from '../src/lib/setupRules';
import { flexion, kneeAngle, selectLeg } from '../src/lib/angle';
import { legLandmarks } from './helpers/leg';
import { CLIP_SERIES } from './fixtures/clipSeries';
import { rowFrame } from './helpers/clip';

const make = () => createBaselineCapture('left', 1, SETUP_CONFIG);
const leg = (f: number, hipX = 0.5) => legLandmarks('left', f, { hip: { x: hipX, y: 0.3 } });

// 100 ms steps. `f` gives the flexion of each step. A null gives a lost leg.
// `hip` gives the hip position of each step. The default is a still hip with a tiny jitter.
function run(c: ReturnType<typeof make>, from: number, to: number, f: (i: number) => number | null, hip = (i: number) => 0.5 + (i % 2) * 0.001) {
  let last!: ReturnType<ReturnType<typeof make>['push']>;
  for (let t = from, i = 0; t <= to; t += 100, i++) {
    const v = f(i);
    last = c.push(v === null ? null : leg(v, hip(i)), t, v);
  }
  return last;
}
const heelSlideCycle = (i: number) => 5 + 35 * (1 - Math.cos((2 * Math.PI * i) / 40));

describe('createBaselineCapture: the still capture', () => {
  it('starts in the finding state with no baseline and no progress', () => {
    const s = make().push(leg(10), 0, 10);
    expect(s).toMatchObject({ phase: 'finding', baselineDeg: null, source: null });
    expect(s.progress).toBe(0);
  });

  it('shows rising progress while the leg holds still and sets a baseline from the median at the end of the window', () => {
    const c = make();
    const half = run(c, 0, 1000, () => 12);
    expect(half.progress).toBeGreaterThan(0.4);
    expect(half.progress).toBeLessThan(0.6);
    expect(half.baselineDeg).toBeNull();
    const done = run(c, 1100, 2100, () => 12);
    expect(done).toMatchObject({ phase: 'done', source: 'still' });
    expect(done.baselineDeg).toBeCloseTo(12, 0);
    expect(done.progress).toBe(1);
  });

  it('uses the same rule as the baseline of Setup: a leg that moves gets no baseline and the progress stays low', () => {
    const c = make();
    const s = run(c, 0, 8000, heelSlideCycle);
    expect(s.baselineDeg).toBeNull();
    expect(s.phase).toBe('finding');
    expect(s.progress).toBeLessThan(0.5);
  });

  it('starts the window again when the leg is lost', () => {
    const c = make();
    run(c, 0, 1500, () => 12);
    const lost = run(c, 1600, 1900, () => null);
    expect(lost.progress).toBe(0);
    // 1.5 s of still after the loss is not enough. The old 1.5 s do not count.
    const again = run(c, 2000, 3400, () => 12);
    expect(again.baselineDeg).toBeNull();
    expect(run(c, 3500, 4200, () => 12).baselineDeg).toBeCloseTo(12, 0);
  });

  it('starts the window again when no person is found', () => {
    const c = make();
    run(c, 0, 1500, () => 12);
    expect(c.push(null, 1600, null).progress).toBe(0);
  });

  it('keeps looking after the time limit and still sets a still baseline when the leg holds still later', () => {
    const c = make();
    const late = run(c, 0, CAPTURE_CONFIG.limitMs + 500, heelSlideCycle);
    expect(late.phase).toBe('choose');
    const s = run(c, CAPTURE_CONFIG.limitMs + 600, CAPTURE_CONFIG.limitMs + 3000, () => 8);
    expect(s).toMatchObject({ phase: 'done', source: 'still' });
  });
});

describe('createBaselineCapture: the lowest steady angle', () => {
  it('shows the choice only after the time limit of 15 seconds, and the limit is an engineering value', () => {
    expect(CAPTURE_CONFIG.limitMs).toBe(15000);
    const c = make();
    expect(run(c, 0, CAPTURE_CONFIG.limitMs - 500, heelSlideCycle).phase).toBe('finding');
    expect(run(c, CAPTURE_CONFIG.limitMs - 400, CAPTURE_CONFIG.limitMs + 300, heelSlideCycle).phase).toBe('choose');
  });

  it('sets no baseline before the press, even after the limit and with enough samples', () => {
    const c = make();
    const s = run(c, 0, 20000, heelSlideCycle);
    expect(s.phase).toBe('choose');
    expect(s.canUseLowest).toBe(true);
    expect(s.baselineDeg).toBeNull();
    expect(s.source).toBeNull();
  });

  it('takes the median of the lowest quarter of the angles seen, and only when pressed', () => {
    const c = make();
    run(c, 0, 20000, heelSlideCycle);
    const pressed = c.useLowest();
    expect(pressed).toMatchObject({ phase: 'done', source: 'lowest' });
    expect(pressed!.baselineDeg).toBeGreaterThan(4);
    expect(pressed!.baselineDeg).toBeLessThan(15);
    // The next frame keeps the value.
    expect(c.push(leg(30), 20100, 30).baselineDeg).toBe(pressed!.baselineDeg);
  });

  it('uses only the last 15 seconds of angles', () => {
    const c = make();
    run(c, 0, 10000, () => 2, (i) => 0.3 + i * 0.002); // old and low. The hip drifts, so no still baseline sets.
    run(c, 10100, 40000, (i) => 40 + 35 * (1 - Math.cos((2 * Math.PI * i) / 40)));
    const v = c.useLowest()!.baselineDeg as number;
    expect(v).toBeGreaterThan(38);
  });

  it('refuses when too few angles were seen', () => {
    const c = make();
    c.push(leg(10), 0, 10);
    c.push(leg(30), 16000, 30);
    expect(c.useLowest()).toBeNull();
    expect(c.push(leg(30), 16100, 30).canUseLowest).toBe(false);
  });

  it('lowestSteadyAngle is the median of the lowest quarter', () => {
    const v = Array.from({ length: 100 }, (_, i) => i); // 0 to 99
    expect(lowestSteadyAngle(v, 0.25)).toBe(12); // the lowest 25 values are 0 to 24
    expect(lowestSteadyAngle([50, 1, 3, 2, 80, 90, 70, 60], 0.25)).toBe(1.5);
  });
});

describe('createBaselineCapture: a hold at the bottom of a rep is not a start', () => {
  const bent = () => createBaselineCapture('left', 1, SETUP_CONFIG, 48);

  it('refuses a still window at or above the flexion where a rep starts, and says the knee is too bent', () => {
    const c = bent();
    const s = run(c, 0, 3000, () => 70);
    expect(s.baselineDeg).toBeNull();
    expect(s.tooBent).toBe(true);
    expect(s.phase).toBe('finding');
  });

  it('takes a still window below that flexion and shows no bent flag', () => {
    const c = bent();
    const s = run(c, 0, 2500, () => 20);
    expect(s).toMatchObject({ phase: 'done', source: 'still', tooBent: false });
  });

  it('refuses the lowest angle when it is a bent knee, and sets nothing', () => {
    const c = bent();
    run(c, 0, 20000, (i) => 60 + 10 * (1 - Math.cos((2 * Math.PI * i) / 40)));
    expect(c.useLowest()).toBeNull();
    expect(c.push(leg(60), 20100, 60)).toMatchObject({ baselineDeg: null, tooBent: true });
  });
});

describe('createBaselineCapture on real clips (numbers only)', () => {
  const play = (clip: string, side: 'left' | 'right') => {
    const s = CLIP_SERIES[clip]!;
    const c = createBaselineCapture(side, s.aspect, SETUP_CONFIG);
    const states = s.rows.map((r, i) => {
      const f = rowFrame(r, i);
      const flex = f.landmarks === null ? null : flexion(kneeAngle(...selectLeg(f.landmarks, side), s.aspect));
      return { t: f.tMs, st: c.push(f.landmarks, f.tMs, flex) };
    });
    return { c, states };
  };

  it('clip 01 (heel slide, the person never holds still): no still baseline, the choice shows after 15 s', () => {
    const { states } = play('01', 'left');
    expect(states.some((s) => s.st.phase === 'done')).toBe(false);
    expect(states.find((s) => s.t >= 15000)!.st.phase).toBe('choose');
  });

  it('clip 01: the lowest steady angle after the press is a plausible resting angle of the leg', () => {
    const { c } = play('01', 'left');
    const r = c.useLowest()!;
    expect(r.source).toBe('lowest');
    expect(r.baselineDeg).toBeGreaterThanOrEqual(0);
    expect(r.baselineDeg).toBeLessThan(40);
  });

  it('clip 05 (mini squat): the leg holds still in the first 18 s, so a still baseline sets without a press', () => {
    const { states } = play('05', 'left');
    const done = states.find((s) => s.st.phase === 'done')!;
    expect(done.st.source).toBe('still');
    expect(done.t).toBeLessThan(8000);
  });
});
