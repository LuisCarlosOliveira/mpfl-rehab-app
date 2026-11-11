// P-DATA2 fix C2-03: the time axis of a line chart.
import { describe, expect, it } from 'vitest';
import { timeAxis } from '../../src/ui/Dashboard';

const at = (hhmm: string, day = '2026-11-11') => Date.parse(`${day}T${hhmm}:00.000Z`);
const xOf = (axis: ReturnType<typeof timeAxis>, t: number) => (t - axis.domain[0]) / (axis.domain[1] - axis.domain[0]);

describe('C2-03 time axis', () => {
  it('one day: one tick for each distinct label, times of day, distinct x positions inside the plot', () => {
    const times = [at('17:14'), at('17:20'), at('17:31')];
    const axis = timeAxis(times);
    const labels = axis.ticks.map(axis.format);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toEqual(['17:14', '17:31']);
    expect(axis.title).toBe('Time (UTC)');
    const xs = times.map((t) => xOf(axis, t));
    expect(new Set(xs).size).toBe(3);
    for (const x of xs) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('one point gives one tick, centred', () => {
    const axis = timeAxis([at('09:05')]);
    expect(axis.ticks.map(axis.format)).toEqual(['09:05']);
    expect(xOf(axis, at('09:05'))).toBeCloseTo(0.5);
  });

  it('several days: first and last day as labels, no padding', () => {
    const axis = timeAxis([at('10:00', '2026-11-01'), at('10:00', '2026-11-09')]);
    expect(axis.ticks.map(axis.format)).toEqual(['1 Nov', '9 Nov']);
    expect(axis.title).toBe('Date');
    expect(axis.domain).toEqual([at('10:00', '2026-11-01'), at('10:00', '2026-11-09')]);
  });

  it('two sessions on different days that are close in time keep two different labels', () => {
    const axis = timeAxis([at('23:50', '2026-11-01'), at('00:10', '2026-11-02')]);
    expect(axis.ticks.map(axis.format)).toEqual(['1 Nov', '2 Nov']);
  });
});
