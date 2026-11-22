import { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MIN_VISIBILITY, type Landmark, type Side } from '../../src/lib/angle';
import { evaluateSetup } from '../../src/lib/setupRules';
import { BodyMap, resetBodyMapHidden, type BodyMapHandle } from '../../src/ui/BodyMap';

afterEach(() => {
  cleanup();
  resetBodyMapHidden();
});

const ASPECT = 16 / 9;

function person(low: Record<number, number> = {}): Landmark[] {
  const out: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  const at: Record<number, [number, number]> = {
    11: [0.45, 0.2], 12: [0.55, 0.2], 13: [0.42, 0.35], 14: [0.58, 0.35], 15: [0.4, 0.5], 16: [0.6, 0.5],
    23: [0.46, 0.5], 25: [0.46, 0.7], 27: [0.46, 0.9], 31: [0.5, 0.95], 24: [0.54, 0.5], 26: [0.54, 0.7], 28: [0.54, 0.9], 32: [0.58, 0.95],
  };
  for (const [i, [x, y]] of Object.entries(at)) out[Number(i)] = { x, y, visibility: low[Number(i)] ?? 1 };
  return out;
}

function mount(leg: Side, labels: boolean) {
  const handle = createRef<BodyMapHandle>();
  const view = render(<BodyMap ref={handle} leg={leg} labels={labels} />);
  const shown = (k: string) => (view.container.querySelector(`[data-k="${k}"]`) as SVGElement).getAttribute('display') !== 'none';
  const push = (lm: Landmark[], t: number) => act(() => handle.current!.update(lm, t, ASPECT));
  return { shown, push };
}

describe('the body map and the setup check agree on "seen"', () => {
  it('draws a chosen joint only while the check calls it seen, also inside the 500 ms hold of the label', () => {
    const m = mount('left', false);
    m.push(person(), 0);
    expect(m.shown('left-j2')).toBe(true);
    for (const v of [MIN_VISIBILITY - 0.01, 0.1]) {
      m.push(person({ 27: v }), 100);
      expect(evaluateSetup(person({ 27: v }), 'left', ASPECT).ready).toBe(false);
      expect(m.shown('left-j2')).toBe(false);
      expect(m.shown('left-2')).toBe(false);
    }
    m.push(person({ 27: MIN_VISIBILITY }), 200);
    expect(m.shown('left-j2')).toBe(true);
    expect(m.shown('left-2')).toBe(true);
  });

  it('in Setup, draws no torso, arm or other leg while the chosen leg is not whole', () => {
    const m = mount('left', true);
    m.push(person({ 25: 0.1, 27: 0.1 }), 0);
    expect(m.shown('soft-11-12')).toBe(false);
    expect(m.shown('soft-11-13')).toBe(false);
    expect(m.shown('right-0')).toBe(false);
    expect(m.shown('right-j0')).toBe(false);
    expect(m.shown('left-j0')).toBe(true);
    m.push(person(), 100);
    expect(m.shown('soft-11-12')).toBe(true);
    expect(m.shown('right-0')).toBe(true);
  });

  it('in Session, keeps the torso and the other leg when the chosen leg is not whole', () => {
    const m = mount('left', false);
    m.push(person({ 27: 0.1 }), 0);
    expect(m.shown('soft-11-12')).toBe(true);
    expect(m.shown('right-0')).toBe(true);
  });
});
