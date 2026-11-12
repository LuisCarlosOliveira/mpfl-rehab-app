// Step B2: the mode person-timer (quad set, gluteal set). The person starts and ends each hold with a button.
// The camera never decides the effort. The knee angle at the end of a hold is an optional report value (quad set only).
import { describe, expect, it } from 'vitest';
import { pick, flexion, kneeAngle, type Landmark } from '../../src/lib/angle';
import { createPersonTimer } from '../../src/lib/monitor/modes';
import { makeSeries } from '../helpers/landmarkSeries';

const kneeOf = (l: Landmark[] | null): number | null =>
  l === null ? null : flexion(kneeAngle(pick(l, 'left', 'hip'), pick(l, 'left', 'knee'), pick(l, 'left', 'ankle'), 1));

describe('person-timer events', () => {
  it('records a hold in whole seconds and counts it', () => {
    const t = createPersonTimer({ reportKnee: false });
    t.startHold(1000);
    t.endHold(6400);
    expect(t.data().holdList).toEqual([5]);
    expect(t.count()).toBe(1);
    t.startHold(10000);
    t.endHold(10000 + 5600);
    expect(t.data().holdList).toEqual([5, 6]);
  });

  it('returns the shape of the stored record', () => {
    const t = createPersonTimer({ reportKnee: false });
    t.startHold(0);
    t.endHold(3000);
    expect(t.data()).toEqual({ holdList: [3], timedBy: 'person' });
  });

  it('drops a hold shorter than 1 second, and keeps one of exactly 1 second', () => {
    const t = createPersonTimer({ reportKnee: false });
    t.startHold(0);
    t.endHold(999);
    expect(t.data().holdList).toEqual([]);
    expect(t.count()).toBe(0);
    t.startHold(2000);
    t.endHold(3000);
    expect(t.data().holdList).toEqual([1]);
  });

  it('ignores a second startHold while holding: the hold keeps the first start', () => {
    const t = createPersonTimer({ reportKnee: false });
    t.startHold(0);
    t.startHold(4000);
    t.endHold(5000);
    expect(t.data().holdList).toEqual([5]);
  });

  it('ignores an endHold with no start, also after a finished hold', () => {
    const t = createPersonTimer({ reportKnee: false });
    t.endHold(1000);
    expect(t.data().holdList).toEqual([]);
    t.startHold(2000);
    t.endHold(5000);
    t.endHold(9000);
    expect(t.data().holdList).toEqual([3]);
  });

  it('drops a hold whose end is before its start', () => {
    const t = createPersonTimer({ reportKnee: false });
    t.startHold(5000);
    t.endHold(4000);
    expect(t.data().holdList).toEqual([]);
    t.startHold(6000);
    t.endHold(8000);
    expect(t.data().holdList).toEqual([2]);
  });

  it('caps a hold at 3600 seconds and the list at 50 holds', () => {
    const t = createPersonTimer({ reportKnee: false });
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
    const t = createPersonTimer({ reportKnee: false });
    expect(t.holding()).toBe(false);
    t.startHold(0);
    expect(t.holding()).toBe(true);
    t.endHold(2000);
    expect(t.holding()).toBe(false);
  });

  it('gives no report key and no cue when the knee is not used (gluteal set)', () => {
    const t = createPersonTimer({ reportKnee: false });
    t.sample(30, 500);
    t.startHold(1000);
    t.endHold(4000);
    expect(t.data()).toEqual({ holdList: [3], timedBy: 'person' });
  });

  it('newSet and an empty session give an empty list with timedBy person', () => {
    expect(createPersonTimer({ reportKnee: true }).data()).toEqual({ holdList: [], timedBy: 'person' });
  });
});

describe('person-timer with the quad set series', () => {
  // The quad-set series: the knee moves by a small angle with a 2 s period. The truth is the knee flexion.
  const s = makeSeries({ pose: 'quad-set', durationS: 12, smallMovementDeg: 6 });

  it('never counts a hold by itself, however the knee moves', () => {
    const t = createPersonTimer({ reportKnee: true });
    for (const f of s.frames) t.sample(kneeOf(f.landmarks), f.tMs);
    expect(t.count()).toBe(0);
    expect(t.data().holdList).toEqual([]);
    expect(t.data().reportKey).toBeUndefined();
  });

  it('reports the knee flexion at the end of each hold as knee-angle-top (the largest of the session)', () => {
    const t = createPersonTimer({ reportKnee: true });
    const holds: Array<[number, number]> = [[1000, 3000], [5000, 7000], [9000, 11000]];
    let h = 0;
    const ends = new Map<number, number>();
    for (const f of s.frames) {
      const hold = holds[h];
      if (hold && f.tMs >= hold[0] && !t.holding() && f.tMs < hold[1]) t.startHold(f.tMs);
      t.sample(kneeOf(f.landmarks), f.tMs);
      if (hold && t.holding() && f.tMs >= hold[1]) {
        t.endHold(f.tMs);
        ends.set(h, f.truth);
        h++;
      }
    }
    const d = t.data();
    expect(d.holdList).toEqual([2, 2, 2]);
    expect(d.timedBy).toBe('person');
    expect(d.reportKey).toBe('knee-angle-top');
    expect(d.reportValue).toBeCloseTo(Math.max(...ends.values()), 3);
  });

  it('gives no report value when the leg is not seen at the end of the hold', () => {
    const t = createPersonTimer({ reportKnee: true });
    t.sample(3, 1000);
    t.startHold(1000);
    t.sample(null, 2000);
    t.sample(null, 4000);
    t.endHold(4000);
    expect(t.data()).toEqual({ holdList: [3], timedBy: 'person' });
  });

  it('uses the newest reading when it is fresh (500 ms), and ignores a reading that is older', () => {
    const t = createPersonTimer({ reportKnee: true });
    t.startHold(0);
    t.sample(4, 2300);
    t.endHold(2500);
    expect(t.data().reportValue).toBe(4);
    t.startHold(3000);
    t.sample(9, 3100);
    t.endHold(4200);
    expect(t.data().reportValue).toBe(4);
  });
});
