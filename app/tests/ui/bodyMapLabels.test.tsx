import { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Landmark } from '../../src/lib/angle';
import { boxShapeGap, type Box } from '../../src/lib/figure';
import { BodyMap, resetBodyMapHidden, type BodyMapHandle } from '../../src/ui/BodyMap';
import { seeded } from '../pairing/helpers';

afterEach(() => {
  cleanup();
  resetBodyMapHidden();
});

const MIN_GAP = 1.5;
const H = 1000;
const ASPECT = 4 / 3;
const W = ASPECT * H;

type Pt = { x: number; y: number };

function labelsFor(hip: Pt, knee: Pt, ankle: Pt) {
  cleanup();
  const handle = createRef<BodyMapHandle>();
  const { container } = render(<BodyMap ref={handle} leg="left" />);
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  lm[23] = { ...hip, visibility: 1 };
  lm[25] = { ...knee, visibility: 1 };
  lm[27] = { ...ankle, visibility: 1 };
  lm[31] = { ...ankle, visibility: 1 };
  act(() => handle.current!.update(lm, 0, ASPECT));
  const q = (k: string) => container.querySelector(`[data-k="${k}"]`) as SVGElement;
  const num = (el: Element, a: string) => Number(el.getAttribute(a));
  const arc = q('arc-text');
  const ch = q('chosen-label');
  const shown = arc.getAttribute('display') !== 'none' && ch.getAttribute('display') !== 'none';
  const [l1, l2] = [...arc.children];
  const sizeA = num(l1!, 'font-size');
  const sizeB = num(l2!, 'font-size');
  const wA = Math.max(l1!.textContent!.length * 0.6 * sizeA, l2!.textContent!.length * 0.6 * sizeB);
  const ax = num(arc, 'x');
  const angle: Box = { x: arc.getAttribute('text-anchor') === 'end' ? ax - wA : ax, y: num(arc, 'y') - sizeA, w: wA, h: sizeA + 1.15 * sizeB };
  const size = num(ch, 'font-size');
  const wC = ch.textContent!.trim().length * 0.6 * size;
  const cx = num(ch, 'x');
  const chosen: Box = { x: ch.getAttribute('text-anchor') === 'end' ? cx - wC : cx, y: num(ch, 'y') - size, w: wC, h: size };
  const at = (p: Pt) => ({ x: p.x * W, y: p.y * H });
  const bones = [
    { a: at(hip), b: at(knee) },
    { a: at(knee), b: at(ankle) },
  ];
  return { shown, angle, chosen, bones };
}

const inside = (b: Box) => b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
const gapBetween = (a: Box, b: Box) => boxShapeGap(a, { k: 'rect', box: b });

function expectClear(hip: Pt, knee: Pt, ankle: Pt, tag: string) {
  const r = labelsFor(hip, knee, ankle);
  expect(r.shown, tag).toBe(true);
  expect(gapBetween(r.angle, r.chosen), tag).toBeGreaterThanOrEqual(MIN_GAP);
  expect(inside(r.angle), tag).toBe(true);
  expect(inside(r.chosen), tag).toBe(true);
  return r;
}

const around = (knee: Pt, deg: number, len: number): Pt => ({ x: knee.x + (len * Math.cos((deg * Math.PI) / 180)) / ASPECT, y: knee.y + len * Math.sin((deg * Math.PI) / 180) });

describe('BodyMap labels: the angle text and "Chosen leg" never overlap', () => {
  it('the live Straight leg raise of the first session: both labels clear of each other and of the leg line', () => {
    const r = expectClear({ x: 0.3, y: 0.64 }, { x: 0.44, y: 0.6 }, { x: 0.55, y: 0.3 }, 'session');
    for (const box of [r.angle, r.chosen]) for (const s of r.bones) expect(boxShapeGap(box, { k: 'seg', ...s, r: 0 })).toBeGreaterThan(MIN_GAP);
  });

  const knees: Pt[] = [
    { x: 0.5, y: 0.5 },
    { x: 0.08, y: 0.5 },
    { x: 0.92, y: 0.5 },
    { x: 0.5, y: 0.06 },
    { x: 0.5, y: 0.94 },
    { x: 0.06, y: 0.06 },
    { x: 0.94, y: 0.94 },
  ];
  for (const [i, knee] of knees.entries()) {
    it(`knee ${i} (${knee.x}, ${knee.y}): the legs in many directions`, () => {
      for (const base of [0, 60, 120, 200, 280]) {
        for (const turn of [-170, -130, -90, -50, -10, 10, 50, 90, 130, 170]) {
          expectClear(around(knee, base, 0.25), knee, around(knee, base + turn, 0.25), `${i}/${base}/${turn}`);
        }
      }
    });
  }

  it('property: 200 seeded random knees and leg directions', () => {
    const rnd = seeded(20261122);
    for (let n = 0; n < 200; n++) {
      const knee = { x: 0.04 + 0.92 * rnd(), y: 0.04 + 0.92 * rnd() };
      const a = rnd() * 360;
      const bend = 15 + rnd() * 150;
      const len = 0.1 + 0.15 * rnd();
      expectClear(around(knee, a, len), knee, around(knee, a + 180 - bend, len), `case ${n}`);
    }
  });
});
