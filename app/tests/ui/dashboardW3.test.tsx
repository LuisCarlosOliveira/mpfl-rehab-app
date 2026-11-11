// W3, U15 and U16: clean chart cards, and a band for the camera error around the angle series.
// The band is a neutral tint. It is never a target, a goal or a line. Pain and reps have no band.
import { cleanup, render, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { buildProgressSeries } from '../../src/lib/progress';
import { chartSeries, Dashboard, DashboardCharts } from '../../src/ui/Dashboard';
import { day, session } from './t11helpers';
import { hasVerdictWord } from './verdict';

afterEach(cleanup);

const list = () => [
  session({ date: day(1), exercise: 'mini-squat', peakFlexion: 62, reps: 8, pain: 3 }),
  session({ date: day(2), exercise: 'mini-squat', peakFlexion: 70, reps: 6, pain: 4 }),
  session({ date: day(8), exercise: 'mini-squat', peakFlexion: 4, reps: 5, pain: 1 }),
  session({ date: day(3), exercise: 'heel-slide', peakFlexion: 85, reps: 4, pain: 0, marginDeg: 9 }),
];

const section = (container: HTMLElement, text: string) =>
  [...container.querySelectorAll<HTMLElement>('section.dash-chart')].find((s) => s.querySelector('h2')!.textContent!.startsWith(text))!;

describe('the camera error band (U16)', () => {
  it('draws one band for each angle chart and none for reps or pain', () => {
    const { container } = render(<DashboardCharts sessions={list()} />);
    expect(container.querySelectorAll('section.dash-chart')).toHaveLength(4);
    expect(section(container, 'Peak knee bend, mini squat').querySelector('.recharts-area-area')).not.toBeNull();
    // One point cannot make an area. The caption still names the error.
    expect(section(container, 'Peak knee bend, heel slide').querySelector('.dash-band-note')).not.toBeNull();
    expect(section(container, 'Reps for each day').querySelector('.recharts-area, .dash-band-note')).toBeNull();
    expect(section(container, 'Pain after each session').querySelector('.recharts-area, .dash-band-note')).toBeNull();
  });

  it('gives only the angle series band data, from the margin that each session stored', () => {
    const sessions = [session({ date: day(1), peakFlexion: 62, marginDeg: 9 }), session({ date: day(2), peakFlexion: 70, marginDeg: 6 }), session({ date: day(3), peakFlexion: null })];
    const charts = chartSeries(buildProgressSeries(sessions), sessions);
    const [peak, reps, pain] = charts;
    expect(peak!.data.map((p) => p.band)).toEqual([[53, 71], [64, 76], null]);
    expect(reps!.data.every((p) => p.band === undefined)).toBe(true);
    expect(pain!.data.every((p) => p.band === undefined)).toBe(true);
  });

  it('keeps the lower end of the band at 0 degrees or more', () => {
    const sessions = [session({ date: day(1), peakFlexion: 4, marginDeg: 9 })];
    expect(chartSeries(buildProgressSeries(sessions), sessions)[0]!.data[0]!.band).toEqual([0, 13]);
  });

  it('writes the caption with the estimate, the source and the note that the lite model is not measured', () => {
    const { container } = render(<DashboardCharts sessions={list()} />);
    const note = section(container, 'Peak knee bend, mini squat').querySelector('.dash-band-note')!;
    expect(note).toHaveTextContent('Camera error, estimated: about 9 degrees (best case, from still photos of healthy people).');
    expect(note).toHaveTextContent('Not measured for this model.');
  });

  it('names a range of margins when the sessions stored different ones', () => {
    const sessions = [session({ date: day(1), peakFlexion: 62, marginDeg: 6 }), session({ date: day(2), peakFlexion: 70, marginDeg: 9 })];
    const { container } = render(<DashboardCharts sessions={sessions} />);
    expect(container.querySelector('.dash-band-note')).toHaveTextContent('about 6 to 9 degrees');
  });

  it('adds a column Camera error range to the data table of an angle chart, and only there', () => {
    const { container } = render(<DashboardCharts sessions={list()} />);
    const squat = within(section(container, 'Peak knee bend, mini squat')).getByRole('table');
    expect(within(squat).getByRole('columnheader', { name: 'Camera error range' })).toBeInTheDocument();
    const cells = within(squat).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell').map((c) => c.textContent));
    expect(cells.map((c) => c[2])).toEqual(['53 to 71 degrees', '61 to 79 degrees', '0 to 13 degrees']);
    for (const title of ['Reps for each day', 'Pain after each session']) {
      expect(within(within(section(container, title)).getByRole('table')).queryByRole('columnheader', { name: 'Camera error range' })).toBeNull();
    }
  });

  it('writes no value in the range cell of a session without a peak', () => {
    const { container } = render(<DashboardCharts sessions={[session({ date: day(1), peakFlexion: 60 }), session({ date: day(2), peakFlexion: null })]} />);
    const cells = within(within(section(container, 'Peak knee bend')).getByRole('table')).getAllByRole('cell');
    expect(cells[5]).toHaveTextContent('no value');
  });

  it('draws no goal, target or reference line, and the band is an area, not a line', () => {
    const { container } = render(<Dashboard sessions={list()} onBack={() => undefined} />);
    expect(container.querySelector('.recharts-reference-line, .recharts-reference-area, .recharts-reference-dot')).toBeNull();
    const source = readFileSync('src/ui/Dashboard.tsx', 'utf8');
    expect(source).not.toMatch(/ReferenceLine|ReferenceArea|ReferenceDot|\b(goal|target)\b/i);
    expect(source).toMatch(/<Area\b/);
    const text = container.textContent ?? '';
    expect(hasVerdictWord(text), text).toBeNull();
    expect(text).not.toMatch(/\b(normal|target|goal)\b/i);
  });

  it('tints the band in the neutral chart colour with a fill opacity, and no stroke', () => {
    const css = readFileSync('src/ui/dashboard.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = /\.recharts-area-area\s*\{([^}]*)\}/.exec(css);
    expect(rule, 'a rule for the band').not.toBeNull();
    expect(rule![1]).toMatch(/fill:\s*var\(--chart\)/);
    expect(rule![1]).toMatch(/fill-opacity:\s*0?\.\d+/);
    expect(rule![1]).toMatch(/stroke:\s*none/);
  });
});

describe('clean chart cards (U15)', () => {
  it('shows one heading for each card, a range line and the last value as text', () => {
    const { container } = render(<DashboardCharts sessions={list()} />);
    for (const card of container.querySelectorAll<HTMLElement>('section.dash-chart')) {
      expect(card.querySelectorAll('h2, h3')).toHaveLength(1);
      expect(card.querySelector('.dash-range')).not.toBeNull();
      expect(card.querySelector('.dash-last')).not.toBeNull();
    }
    const squat = section(container, 'Peak knee bend, mini squat');
    expect(squat.querySelector('.dash-range')).toHaveTextContent('3 sessions, 1 Nov 2026 to 8 Nov 2026');
    expect(squat.querySelector('.dash-last')).toHaveTextContent('4 degrees');
    expect(section(container, 'Reps for each day').querySelector('.dash-range')).toHaveTextContent('4 days, 1 Nov 2026 to 8 Nov 2026');
    expect(section(container, 'Pain after each session').querySelector('.dash-last')).toHaveTextContent('1 (0 to 10)');
  });

  it('draws only the title and "No values." for a chart without a value', () => {
    const { container } = render(<DashboardCharts sessions={[session({ peakFlexion: null, reps: null, pain: undefined })]} />);
    for (const title of ['Peak knee bend', 'Reps for each day', 'Pain after each session']) {
      const card = section(container, title);
      expect(card.querySelector('h2')).not.toBeNull();
      expect(card.querySelector('.dash-note')).toHaveTextContent('No values.');
      expect(card.textContent!.match(/No values\./g)).toHaveLength(1);
      expect(card.querySelector('.recharts-wrapper, svg, table, .dash-chart-box, .dash-last, .dash-range')).toBeNull();
      expect(card.children).toHaveLength(2);
    }
  });

  it('keeps the text of the summary for a screen reader, and hides the repeat of the last value', () => {
    const { container } = render(<DashboardCharts sessions={list()} />);
    const squat = section(container, 'Peak knee bend, mini squat');
    expect(squat.querySelector('.dash-last')).toHaveAttribute('aria-hidden', 'true');
    expect(squat.querySelector('[role="img"]')!.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('uses three ticks on the value axis and keeps 0 to 10 for pain', () => {
    const charts = chartSeries(buildProgressSeries(list()));
    for (const c of charts) expect(c.yTicks, c.title).toHaveLength(3);
    expect(charts.at(-1)!.yTicks).toEqual([0, 5, 10]);
    expect(charts[0]!.yTicks).toEqual([0, 40, 80]);
    expect(charts[0]!.yDomain).toEqual([0, 80]);
  });

  it('puts the highest value and its band inside the axis', () => {
    const sessions = [session({ date: day(1), peakFlexion: 92, marginDeg: 9 })];
    const [peak] = chartSeries(buildProgressSeries(sessions), sessions);
    expect(peak!.yDomain[1]).toBeGreaterThanOrEqual(101);
  });

  it('shows the first and the last date only on the date axis, as day and month', () => {
    const { container } = render(<DashboardCharts sessions={list()} />);
    const ticks = [...section(container, 'Peak knee bend, mini squat').querySelectorAll('.recharts-cartesian-axis-tick-value')].map((t) => t.textContent!).filter((t) => /[A-Z][a-z]{2}$/.test(t));
    expect(ticks).toEqual(['1 Nov', '8 Nov']);
  });
});

describe('the words of a chart summary', () => {
  it('says 1 value, not 1 values', () => {
    const { container } = render(<DashboardCharts sessions={[session({ peakFlexion: 62, reps: 8, pain: 3 })]} />);
    for (const card of container.querySelectorAll<HTMLElement>('section.dash-chart')) {
      expect(card.querySelector('.dash-note')!.textContent).toMatch(/^1 value\. /);
    }
  });

  const SLR_NOTE = 'The angle at the top of a straight leg raise is saved for your care team. The app does not draw it.';
  const slr = () => session({ exercise: 'straight-leg-raise', peakFlexion: 4, topFlexion: 22, reps: 5, pain: 1 });

  it('draws no chart for the straight leg raise, and says in one plain line that the angle is saved for the care team', () => {
    const { container } = render(<Dashboard sessions={[slr(), ...list()]} onBack={() => undefined} />);
    expect(container.textContent!.match(/The angle at the top of a straight leg raise is saved for your care team\. The app does not draw it\./g)).toHaveLength(1);
    expect(container.textContent).not.toMatch(/Peak knee bend, straight leg raise|Angle at the top, straight leg raise/);
    const line = [...container.querySelectorAll('p')].find((p) => p.textContent === SLR_NOTE)!;
    expect(line.closest('section.dash-chart')).toBeNull();
    expect(line.textContent).not.toMatch(/\d/);
    expect(hasVerdictWord(line.textContent ?? '')).toBeNull();
  });

  it('shows no such line without a straight leg raise session, and not in the care team charts', () => {
    const none = render(<Dashboard sessions={list()} onBack={() => undefined} />);
    expect(none.container.textContent).not.toContain(SLR_NOTE);
    none.unmount();
    const care = render(<DashboardCharts sessions={[slr()]} />);
    expect(care.container.textContent).not.toContain(SLR_NOTE);
  });
});
