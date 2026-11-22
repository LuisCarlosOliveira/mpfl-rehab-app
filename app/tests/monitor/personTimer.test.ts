import { describe, expect, it } from 'vitest';
import { createPersonTimer, holdSeconds } from '../../src/lib/monitor/modes';

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

  it('drops a hold over 3600 seconds and stores no clamped value (R-04)', () => {
    const t = createPersonTimer();
    t.startHold(0);
    t.endHold(3600 * 1000);
    expect(t.data().holdList).toEqual([3600]);
    t.startHold(10_000_000);
    expect(t.endHold(10_000_000 + 3601 * 1000)).toEqual({ saved: false, reason: 'too-long' });
    expect(t.data().holdList).toEqual([3600]);
  });

  it('keeps the list at 50 holds and says list-full for the next one', () => {
    const t = createPersonTimer();
    let last;
    for (let i = 0; i < 51; i++) {
      t.startHold(i * 10_000);
      last = t.endHold(i * 10_000 + 2000);
    }
    expect(t.data().holdList).toHaveLength(50);
    expect(t.count()).toBe(50);
    expect(last).toEqual({ saved: false, reason: 'list-full' });
  });

  it('endHold says why in one of the four reasons, and ok when it saved', () => {
    const t = createPersonTimer();
    expect(t.endHold(1000)).toEqual({ saved: false, reason: 'not-holding' });
    t.startHold(0);
    expect(t.endHold(500)).toEqual({ saved: false, reason: 'too-short' });
    t.startHold(2000);
    expect(t.endHold(5000)).toEqual({ saved: true, reason: 'ok' });
    expect(t.endHold(6000)).toEqual({ saved: false, reason: 'not-holding' });
  });

  it('a hold with an end before its start is too-short', () => {
    const t = createPersonTimer();
    t.startHold(5000);
    expect(t.endHold(4000)).toEqual({ saved: false, reason: 'too-short' });
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

describe('holdSeconds (R-05): the one rule for the stored value, and for the screen', () => {
  it('rounds to whole seconds with a minimum of 1', () => {
    expect(holdSeconds(1000)).toBe(1);
    expect(holdSeconds(1499)).toBe(1);
    expect(holdSeconds(1500)).toBe(2);
    expect(holdSeconds(2999)).toBe(3);
    expect(holdSeconds(0)).toBe(1);
    expect(holdSeconds(400)).toBe(1);
  });
  it('is the value that the timer stores', () => {
    for (const ms of [1000, 1499, 1500, 2999, 59_400, 60_500]) {
      const t = createPersonTimer();
      t.startHold(0);
      t.endHold(ms);
      expect(t.data().holdList).toEqual([holdSeconds(ms)]);
    }
  });
});
