// B-04: on Setup, no joint chip lies on the angle text. The boxes are measured in view box units, with the same width estimate as BodyMap.
import { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Landmark } from '../../src/lib/angle';
import { BodyMap, resetBodyMapHidden, type BodyMapHandle } from '../../src/ui/BodyMap';

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  resetBodyMapHidden();
});

const ASPECT = 16 / 9;
const W = ASPECT * 1000;

/** A person lying: the left leg has hip, knee and ankle at the given picture fractions. */
function lying(hip: [number, number], knee: [number, number], flex: number): Landmark[] {
  const out: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  const along = Math.atan2((knee[1] - hip[1]) * 1000, (knee[0] - hip[0]) * W);
  const len = Math.hypot((knee[0] - hip[0]) * W, (knee[1] - hip[1]) * 1000);
  // The shank turns back from the thigh line by (180 - flex) degrees (flex 0 is a straight leg).
  const turn = along + ((flex * Math.PI) / 180) * -1;
  out[23] = { x: hip[0], y: hip[1], visibility: 1 };
  out[25] = { x: knee[0], y: knee[1], visibility: 1 };
  out[27] = { x: knee[0] + (len * Math.cos(turn)) / W, y: knee[1] + (len * Math.sin(turn)) / 1000, visibility: 1 };
  return out;
}

const box = (el: Element, text: boolean) => {
  if (!text) {
    const g = (k: string) => Number(el.getAttribute(k));
    return { left: g('x'), right: g('x') + g('width'), top: g('y'), bottom: g('y') + g('height') };
  }
  const lines = [...el.children] as SVGElement[];
  const size = Number(el.getAttribute('font-size')); // the second line
  const first = Number(lines[0]!.getAttribute('font-size'));
  const w = Math.max(lines[0]!.textContent!.length * 0.6 * first, lines[1]!.textContent!.length * 0.6 * size);
  const x = Number(lines[0]!.getAttribute('x'));
  const y = Number(el.getAttribute('y'));
  const left = el.getAttribute('text-anchor') === 'end' ? x - w : x;
  return { left, right: left + w, top: y - first, bottom: y + 1.15 * size };
};
const overlap = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

describe('B-04: Setup joint chips and the angle text', () => {
  it.each([
    ['clip 01: lying, hip at the right, knee left of the middle', [0.8, 0.56], [0.4, 0.5], 139],
    ['hip a little lower than the knee', [0.85, 0.62], [0.45, 0.5], 139],
    ['knee just left of the middle, hip at the right edge', [0.9, 0.58], [0.55, 0.5], 139],
    ['knee near the middle', [0.7, 0.6], [0.5, 0.5], 100],
    ['hip at the left', [0.2, 0.6], [0.6, 0.5], 60],
    ['all three joints close together', [0.55, 0.5], [0.5, 0.5], 120],
  ] as [string, [number, number], [number, number], number][])('%s', (_name, hip, knee, flex) => {
    // The picture of Setup at 1280 x 800 is about 484 x 272 px. One screen pixel is then about 3.7 view box units.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 484, height: 272, x: 0, y: 0, top: 0, left: 0, right: 484, bottom: 272, toJSON: () => ({}) });
    const handle = createRef<BodyMapHandle>();
    const view = render(<BodyMap ref={handle} leg="left" labels />);
    const q = (k: string) => view.container.querySelector(`[data-k="${k}"]`) as SVGElement;
    for (const t of [0, 100, 200, 300]) act(() => handle.current!.update(lying(hip, knee, flex), t, ASPECT));
    expect(q('arc-text').getAttribute('display')).not.toBe('none');
    const text = box(q('arc-text'), true);
    for (const j of [0, 1, 2]) {
      if (q(`jl-${j}`).getAttribute('display') === 'none') continue;
      expect(overlap(box(q(`jl-${j}-r`), false), text), `chip ${j} against the angle text`).toBe(false);
    }
  });
});
