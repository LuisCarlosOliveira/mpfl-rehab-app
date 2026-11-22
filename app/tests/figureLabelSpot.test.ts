import { describe, expect, it } from 'vitest';
import { pickLabelSpot, type Box } from '../src/lib/figure';

const bounds: Box = { x: 0, y: 0, w: 100, h: 100 };
const box = (x: number, y: number): Box => ({ x, y, w: 20, h: 10 });

describe('pickLabelSpot', () => {
  it('keeps the first candidate when it is clear', () => {
    expect(pickLabelSpot([box(10, 10), box(50, 50)], [], bounds, 2)).toBe(0);
  });

  it('skips a candidate that sits on a shape or too near it', () => {
    const bone = { k: 'seg' as const, a: { x: 0, y: 25 }, b: { x: 100, y: 25 }, r: 1 };
    expect(pickLabelSpot([box(10, 20), box(10, 15), box(10, 60)], [bone], bounds, 2)).toBe(2);
  });

  it('skips a candidate outside the bounds', () => {
    expect(pickLabelSpot([box(90, 10), box(50, 10)], [], bounds, 2)).toBe(1);
  });

  it('takes the candidate with the most room when none is clear', () => {
    const near = { k: 'seg' as const, a: { x: 0, y: 5 }, b: { x: 100, y: 5 }, r: 1 };
    expect(pickLabelSpot([box(10, 1), box(10, 70)], [near], bounds, 200)).toBe(1);
  });
});
