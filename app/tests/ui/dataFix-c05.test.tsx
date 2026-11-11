// P-DATA fix c05.
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildProgressSeries } from '../../src/lib/progress';
import { chartSeries, DashboardCharts } from '../../src/ui/Dashboard';
import { day, installDialogStub, session, stubDownload } from './t11helpers';

let stub: ReturnType<typeof stubDownload>;
beforeEach(() => {
  localStorage.clear();
  installDialogStub();
  stub = stubDownload();
});
afterEach(() => {
  cleanup();
  stub.restore();
});


describe('C-05 line charts use a real time axis', () => {
  const spread = () => [0, 1, 25].map((n) => session({ date: n === 0 ? '2026-10-31T10:00:00.000Z' : day(n), exercise: 'heel-slide', peakFlexion: 80 + n, pain: 1 }));
  it('gives numeric timestamps with real gaps', () => {
    const charts = chartSeries(buildProgressSeries(spread()));
    for (const chart of charts.filter((c) => c.kind === 'line')) {
      const t = chart.data.map((d) => d.t);
      expect(t[2]! - t[1]!).toBeGreaterThan(10 * (t[1]! - t[0]!));
    }
  });
  it('draws the dots with real gaps', () => {
    const { container } = render(<DashboardCharts sessions={spread()} />);
    const dots = [...container.querySelector('.dash-chart')!.querySelectorAll('.recharts-line-dots .recharts-dot')].map((d) => Number(d.getAttribute('cx')));
    expect(dots).toHaveLength(3);
    expect(dots[2]! - dots[1]!).toBeGreaterThan(10 * (dots[1]! - dots[0]!));
  });
  it('names the reps axis as days with sessions', () => {
    const { container } = render(<DashboardCharts sessions={spread()} />);
    const labels = [...container.querySelectorAll('.recharts-label')].map((l) => l.textContent);
    expect(labels).toContain('Days with sessions');
    expect(labels).toContain('Date');
  });
});
