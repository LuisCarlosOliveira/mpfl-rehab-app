// The body map must not jump (user report 2026-11-09, "jumping around the image"). Measured on 7 real clips in the real app:
// a point leaves its place for one update and comes back (11 times in about 200 s), and the angle text and the chosen leg text hop
// across the picture. See docs/live-test/skeleton-validation.md. These tests pin the repair. The numbers are ENGINEERING values.
import { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Landmark } from '../../src/lib/angle';
import { BodyMap, resetBodyMapHidden, type BodyMapHandle } from '../../src/ui/BodyMap';

afterEach(() => {
  cleanup();
  resetBodyMapHidden();
});

const ASPECT = 16 / 9;
const W = ASPECT * 1000;

/** A person who lies on the side. Hip, knee and ankle of the left leg are set, and the knee x and the ankle position can move. */
function lying(opts: { kneeX?: number; ankle?: { x: number; y: number } } = {}): Landmark[] {
  const out: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  const seen = (i: number, x: number, y: number) => (out[i] = { x, y, visibility: 1 });
  seen(23, 0.3, 0.6);
  seen(25, opts.kneeX ?? 0.5, 0.55);
  const a = opts.ankle ?? { x: 0.7, y: 0.5 };
  seen(27, a.x, a.y);
  return out;
}

function mount() {
  const handle = createRef<BodyMapHandle>();
  const view = render(<BodyMap ref={handle} leg="left" />);
  const q = (k: string) => view.container.querySelector(`[data-k="${k}"]`) as SVGElement;
  const push = (lm: Landmark[] | null, t: number) => act(() => handle.current!.update(lm, t, ASPECT));
  const pos = (k: string) => [Number(q(k).getAttribute('cx')), Number(q(k).getAttribute('cy'))] as const;
  return { q, push, pos, handle };
}

describe('the points of the body map', () => {
  it('draw the first update as it is', () => {
    const m = mount();
    m.push(lying(), 0);
    expect(m.pos('left-j2')[0]).toBeCloseTo(0.7 * W, 0);
  });

  it('do not show a two-update spike: the ankle that leaves for two updates and comes back keeps its place', () => {
    const m = mount();
    m.push(lying(), 0);
    m.push(lying(), 40);
    m.push(lying({ ankle: { x: 0.85, y: 0.3 } }), 80);
    m.push(lying({ ankle: { x: 0.85, y: 0.3 } }), 120); // 40 ms after the first jumped update: still held
    expect(m.pos('left-j2')[0]).toBeCloseTo(0.7 * W, 0);
    m.push(lying(), 160);
    expect(m.pos('left-j2')[0]).toBeCloseTo(0.7 * W, 0);
  });

  it('do not show a one-update spike: the ankle that leaves for one update and comes back keeps its place', () => {
    const m = mount();
    m.push(lying(), 0);
    m.push(lying(), 100);
    m.push(lying({ ankle: { x: 0.85, y: 0.3 } }), 200); // the spike
    expect(m.pos('left-j2')[0]).toBeCloseTo(0.7 * W, 0);
    m.push(lying(), 300);
    expect(m.pos('left-j2')[0]).toBeCloseTo(0.7 * W, 0);
  });

  it('show a move that holds, 100 ms after the first jumped update', () => {
    const m = mount();
    m.push(lying(), 0);
    m.push(lying({ ankle: { x: 0.9, y: 0.3 } }), 100);
    m.push(lying({ ankle: { x: 0.9, y: 0.3 } }), 150);
    expect(m.pos('left-j2')[0]).toBeCloseTo(0.7 * W, 0);
    m.push(lying({ ankle: { x: 0.9, y: 0.3 } }), 200);
    expect(m.pos('left-j2')[0]).toBeCloseTo(0.9 * W, 0);
    expect(m.pos('left-j2')[1]).toBeCloseTo(0.3 * 1000, 0);
  });

  // The hold of a jumped point is by time (about 100 ms), not by update count. The time is the timestamp of the update (a fake clock).
  describe('hold by time', () => {
    const jumped = () => lying({ ankle: { x: 0.9, y: 0.3 } });
    const settle = (m: ReturnType<typeof mount>, gap: number) => {
      m.push(lying(), 0);
      m.push(lying(), gap);
    };

    it('shows a jump that stays at the first update that comes 100 ms after the jump, also when updates are slow (143 ms)', () => {
      const m = mount();
      settle(m, 143);
      m.push(jumped(), 286); // the first jumped update: held, it can be a one-update spike
      expect(m.pos('left-j2')[0]).toBeCloseTo(0.7 * W, 0);
      m.push(jumped(), 429); // 143 ms after the jump: shown. The old rule held this update too (285 ms in all)
      expect(m.pos('left-j2')[0]).toBeCloseTo(0.9 * W, 0);
    });

    it('holds a spike of two fast updates (30 ms apart) and ignores it when the point comes back', () => {
      const m = mount();
      settle(m, 30);
      m.push(jumped(), 60);
      m.push(jumped(), 90);
      expect(m.pos('left-j2')[0]).toBeCloseTo(0.7 * W, 0);
      m.push(lying(), 120);
      expect(m.pos('left-j2')[0]).toBeCloseTo(0.7 * W, 0);
    });

    it('never holds a jump longer than 100 ms, however many fast updates come', () => {
      const m = mount();
      settle(m, 20);
      for (const t of [40, 60, 80, 100, 120, 139]) {
        m.push(jumped(), t);
        expect(m.pos('left-j2')[0], `t=${t}`).toBeCloseTo(0.7 * W, 0);
      }
      m.push(jumped(), 140); // 100 ms after the first jumped update
      expect(m.pos('left-j2')[0]).toBeCloseTo(0.9 * W, 0);
    });

    it('starts a new hold for a second jump later', () => {
      const m = mount();
      settle(m, 143);
      m.push(jumped(), 286);
      m.push(jumped(), 429);
      m.push(lying(), 572); // the point goes back: a new jump, a new hold
      expect(m.pos('left-j2')[0]).toBeCloseTo(0.9 * W, 0);
      m.push(lying(), 715);
      expect(m.pos('left-j2')[0]).toBeCloseTo(0.7 * W, 0);
    });
  });

  it('show a leg that moves steadily with no delay at all', () => {
    const m = mount();
    for (let i = 0; i < 12; i++) {
      const x = 0.4 + i * 0.015; // 1.5 percent of the width at each update, a fast lift
      m.push(lying({ ankle: { x, y: 0.5 } }), i * 100);
      expect(m.pos('left-j2')[0], `update ${i}`).toBeCloseTo(x * W, 0);
    }
  });

  it('keep the angle text of the arc steady through a one-update glitch of the ankle', () => {
    const m = mount();
    m.push(lying(), 0);
    m.push(lying(), 100);
    const text = () => m.q('arc-text').textContent;
    const before = text();
    m.push(lying({ ankle: { x: 0.3, y: 0.55 } }), 200); // the ankle folds back onto the knee line: a reading near 172 degrees
    expect(text()).toBe(before);
  });

  it('draw nothing for a point that is not seen, and draw it again at its new place (no hold of an old place)', () => {
    const m = mount();
    m.push(lying(), 0);
    const low = lying();
    low[27] = { ...low[27]!, visibility: 0.1 };
    m.push(low, 100);
    m.push(low, 800); // the map keeps a joint for 500 ms so that it does not blink, then hides it
    expect(m.q('left-j2').getAttribute('display')).toBe('none');
    m.push(lying({ ankle: { x: 0.9, y: 0.3 } }), 900);
    expect(m.pos('left-j2')[0]).toBeCloseTo(0.9 * W, 0);
  });
});

describe('the text of the body map', () => {
  /** x of a text for knee x values. The knee is bent, so the arc and its text show. */
  function textX(key: string, kneeXs: number[]): number[] {
    const m = mount();
    const out: number[] = [];
    kneeXs.forEach((kx, i) => {
      const lm = lying({ kneeX: kx });
      lm[27] = { x: 0.9, y: 0.35, visibility: 1 };
      m.push(lm, i * 100);
      const el = m.q(key);
      if (el.getAttribute('display') !== 'none') out.push(Number(el.getAttribute('x')));
    });
    return out;
  }
  const bigSteps = (xs: number[]) => xs.slice(1).filter((x, i) => Math.abs(x - xs[i]!) > 0.05 * W).length;
  const sweep = Array.from({ length: 41 }, (_, i) => 0.3 + i * 0.01);
  const wobble = Array.from({ length: 40 }, (_, i) => 0.5 + (i % 2 === 0 ? 0.03 : -0.03));

  it.each(['arc-text', 'chosen-label'])('%s hops at most once when the knee moves across the middle of the picture', (key) => {
    const xs = textX(key, sweep);
    expect(xs.length).toBeGreaterThan(30);
    expect(bigSteps(xs)).toBeLessThanOrEqual(1);
  });

  it.each(['arc-text', 'chosen-label'])('%s does not hop when the knee wobbles around the middle', (key) => {
    const xs = textX(key, wobble);
    expect(xs.length).toBeGreaterThan(30);
    expect(bigSteps(xs)).toBe(0);
  });
});

describe('the cost of one update (gate G1)', () => {
  // The best of 3 runs of 100 updates, so that a busy machine does not fail the test. The real browser number is in docs/live-test/skeleton-validation.md.
  it('has a p95 below 2 ms for a whole body', () => {
    const { handle } = mount();
    const body = lying();
    for (const i of [11, 12, 13, 14, 15, 16, 24, 26, 28, 31, 32]) body[i] = { x: 0.4 + (i % 7) * 0.05, y: 0.3 + (i % 5) * 0.08, visibility: 1 };
    const run = () => {
      const times: number[] = [];
      for (let i = 0; i < 100; i++) {
        const lm = body.map((p) => ({ ...p, x: p.x + Math.sin(i / 5) * 0.01 }));
        let cost = 0;
        act(() => {
          const t0 = performance.now();
          handle.current!.update(lm, i * 33, ASPECT);
          cost = performance.now() - t0;
        });
        times.push(cost);
      }
      times.sort((x, y) => x - y);
      return times[Math.floor(times.length * 0.95)]!;
    };
    expect(Math.min(run(), run(), run())).toBeLessThan(2);
  });
});

describe('the two texts of the chosen leg', () => {
  it('do not lie on each other when the thigh is level (the seated hold of clip 06 showed them on top of each other)', () => {
    const m = mount();
    const lm = lying({ kneeX: 0.44 });
    lm[23] = { x: 0.56, y: 0.55, visibility: 1 }; // hip and knee on one level: a short level thigh
    lm[27] = { x: 0.46, y: 0.8, visibility: 1 }; // the shank hangs down, so the arc and its text show
    m.push(lm, 0);
    m.push(lm, 100);
    const a = m.q('chosen-label');
    const b = m.q('arc-text');
    expect(a.getAttribute('display')).not.toBe('none');
    expect(b.getAttribute('display')).not.toBe('none');
    const height = Number(b.getAttribute('font-size'));
    // A text is about 6 times its height wide. The two boxes must not cross.
    const apart = Math.abs(Number(a.getAttribute('y')) - Number(b.getAttribute('y'))) >= 1.5 * height;
    const wide = Math.abs(Number(a.getAttribute('x')) - Number(b.getAttribute('x'))) >= 6 * height;
    expect(apart || wide).toBe(true);
  });
});

describe('the two texts of the chosen leg on a slanted thigh', () => {
  /** The box of a text: x to x plus its width, depending on the anchor. A text is about 0.6 of its font size wide for each letter. */
  const box = (el: SVGElement) => {
    const h = Number(el.getAttribute('font-size'));
    const w = (el.textContent ?? '').length * 0.6 * h;
    const x = Number(el.getAttribute('x'));
    const left = el.getAttribute('text-anchor') === 'end' ? x - w : x;
    return { left, right: left + w, top: Number(el.getAttribute('y')) - h, bottom: Number(el.getAttribute('y')) };
  };
  const overlap = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

  it.each([
    ['the hip lower than the knee, thigh going up to the left', { hip: [0.62, 0.62], knee: [0.45, 0.5], ankle: [0.3, 0.55] }],
    ['the hip higher than the knee', { hip: [0.6, 0.35], knee: [0.45, 0.5], ankle: [0.5, 0.75] }],
    ['a standing leg', { hip: [0.5, 0.3], knee: [0.5, 0.55], ankle: [0.52, 0.8] }],
    ['a thigh that goes up to the right', { hip: [0.3, 0.62], knee: [0.45, 0.5], ankle: [0.6, 0.45] }],
  ] as const)('never lie on each other for %s', (_name, p) => {
    const m = mount();
    const lm = lying();
    lm[23] = { x: p.hip[0], y: p.hip[1], visibility: 1 };
    lm[25] = { x: p.knee[0], y: p.knee[1], visibility: 1 };
    lm[27] = { x: p.ankle[0], y: p.ankle[1], visibility: 1 };
    m.push(lm, 0);
    m.push(lm, 100);
    const a = m.q('chosen-label');
    const b = m.q('arc-text');
    expect(a.getAttribute('display')).not.toBe('none');
    expect(b.getAttribute('display')).not.toBe('none');
    expect(overlap(box(a), box(b))).toBe(false);
  });
});
