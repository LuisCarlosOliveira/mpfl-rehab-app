// Step B2: the mode person-timer (quad set, gluteal set). The person starts and ends each hold with a button.
// The camera never decides the effort. The timer has no report value (R-08).
import { describe, expect, it } from 'vitest';
import { createPersonTimer } from '../../src/lib/monitor/modes';

describe('person-timer events', () => {
  it('records a hold in whole seconds and counts it', () => {
    const t = createPersonTimer();
    t.startHold(1000);
    t.endHold(6400);
    expect(t.data().holdList).toEqual([5]);
    expect(t.count()).toBe(1);
    t.startHold(10000);
    t.endHold(10000 + 5600);
    expect(t.data().holdList).toEqual([5, 6]);
  });

  it('returns the shape of the stored record', () => {
    const t = createPersonTimer();
    t.startHold(0);
    t.endHold(3000);
    expect(t.data()).toEqual({ holdList: [3], timedBy: 'person' });
  });

  it('drops a hold shorter than 1 second, and keeps one of exactly 1 second', () => {
    const t = createPersonTimer();
    t.startHold(0);
    t.endHold(999);
    expect(t.data().holdList).toEqual([]);
    expect(t.count()).toBe(0);
    t.startHold(2000);
    t.endHold(3000);
    expect(t.data().holdList).toEqual([1]);
  });

  it('ignores a second startHold while holding: the hold keeps the first start', () => {
    const t = createPersonTimer();
    t.startHold(0);
    t.startHold(4000);
    t.endHold(5000);
    expect(t.data().holdList).toEqual([5]);
  });

  it('ignores an endHold with no start, also after a finished hold', () => {
    const t = createPersonTimer();
    t.endHold(1000);
    expect(t.data().holdList).toEqual([]);
    t.startHold(2000);
    t.endHold(5000);
    t.endHold(9000);
    expect(t.data().holdList).toEqual([3]);
  });

  it('drops a hold whose end is before its start', () => {
    const t = createPersonTimer();
    t.startHold(5000);
    t.endHold(4000);
    expect(t.data().holdList).toEqual([]);
    t.startHold(6000);
    t.endHold(8000);
    expect(t.data().holdList).toEqual([2]);
  });

  it('caps a hold at 3600 seconds and the list at 50 holds', () => {
    const t = createPersonTimer();
    t.startHold(0);
    t.endHold(5 * 3600 * 1000);
    expect(t.data().holdList).toEqual([3600]);
    for (let i = 0; i < 60; i++) {
      t.startHold(10_000_000 + i * 10_000);
      t.endHold(10_000_000 + i * 10_000 + 2000);
    }
    expect(t.data().holdList).toHaveLength(50);
    expect(t.count()).toBe(50);
  });

  it('reports whether a hold is running', () => {
    const t = createPersonTimer();
    expect(t.holding()).toBe(false);
    t.startHold(0);
    expect(t.holding()).toBe(true);
    t.endHold(2000);
    expect(t.holding()).toBe(false);
  });

  it('gives no report key and no cue (gluteal set)', () => {
    const t = createPersonTimer();
    t.startHold(1000);
    t.endHold(4000);
    expect(t.data()).toEqual({ holdList: [3], timedBy: 'person' });
  });

  it('newSet and an empty session give an empty list with timedBy person', () => {
    expect(createPersonTimer().data()).toEqual({ holdList: [], timedBy: 'person' });
  });
});

describe('person-timer has no report value (R-08)', () => {
  it('gives no reportKey and no reportValue after holds', () => {
    const t = createPersonTimer();
    t.startHold(1000);
    t.endHold(3000);
    t.startHold(5000);
    t.endHold(7000);
    expect(t.data()).toEqual({ holdList: [2, 2], timedBy: 'person' });
  });
  it('has no function that reads the knee', () => {
    expect('sample' in createPersonTimer()).toBe(false);
  });
});
