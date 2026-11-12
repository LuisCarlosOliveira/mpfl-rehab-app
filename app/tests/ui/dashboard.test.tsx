import type { SessionRecord } from '../../src/lib/storage';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildProgressSeries, toTableRows } from '../../src/lib/progress';
import { chartSeries, Dashboard, DashboardCharts } from '../../src/ui/Dashboard';
import { day, session } from './t11helpers';
import { hasVerdictWord } from './verdict';

afterEach(cleanup);

const sessions = () => [
  session({ date: day(1), exercise: 'mini-squat', peakFlexion: 62, reps: 8, pain: 3 }),
  session({ date: day(1, 15), exercise: 'mini-squat', peakFlexion: 70.5, reps: 6, pain: 4 }),
  session({ date: day(2), exercise: 'mini-squat', peakFlexion: null, reps: 5, pain: 1 }),
  session({ date: day(3), exercise: 'heel-slide', peakFlexion: 85, reps: null, pain: 0 }),
];

describe('Dashboard', () => {
  it('shows an empty state in plain words and no chart', () => {
    const { container } = render(<Dashboard sessions={[]} onBack={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your sessions' })).toBeInTheDocument();
    expect(screen.getByText(/no sessions yet/i)).toBeInTheDocument();
    expect(container.querySelector('.recharts-wrapper')).toBeNull(); // the empty state has an icon, so any svg is allowed
    expect(container.querySelector('.empty svg')).not.toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('uses the title prop and calls onBack', () => {
    const onBack = vi.fn();
    render(<Dashboard sessions={sessions()} title="Session file" onBack={onBack} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Session file' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('gives chart and table the same numbers for every series', () => {
    const list = sessions();
    const series = buildProgressSeries(list);
    const rows = toTableRows(series);
    const charts = chartSeries(series);
    // One chart for each exercise with a peak, one for reps and one for pain.
    expect(charts).toHaveLength(series.peakFlexion.length + 2);
    for (const chart of charts) {
      const tableValues = rows.filter((r) => r.series === chart.title).map((r) => r.value);
      expect(chart.data.map((p) => p.value)).toEqual(tableValues);
    }
  });

  it('draws one dot or bar for each value and writes the same values in the table', () => {
    const list = sessions();
    const { container } = render(<Dashboard sessions={list} onBack={vi.fn()} />);
    const series = buildProgressSeries(list);
    const rows = toTableRows(series);
    const sections = container.querySelectorAll('section.dash-chart');
    expect(sections).toHaveLength(series.peakFlexion.length + 2);
    for (const section of sections) {
      const title = section.querySelector('h2')!.textContent!;
      const expected = rows.filter((r) => r.series === title);
      const table = within(section as HTMLElement).getByRole('table');
      const cells = within(table).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[1]!.textContent);
      // The table shows whole degrees. The series keeps the digits.
      expect(cells).toEqual(expected.map((r) => r.valueText.replace(/-?\d+\.\d+/g, (m) => String(Math.round(Number(m))))));
      const marks = section.querySelectorAll('.recharts-dot, .recharts-bar-rectangle').length;
      expect(marks).toBe(expected.filter((r) => r.value !== null).length);
    }
  });

  it('puts units in the titles and on the axes', () => {
    const { container } = render(<Dashboard sessions={sessions()} onBack={vi.fn()} />);
    const titles = [...container.querySelectorAll('h2')].map((h) => h.textContent);
    expect(titles).toContain('Peak knee bend, Mini squat, in degrees (estimated angle, not a medical measurement)');
    expect(titles).toContain('Reps for each day, in reps');
    expect(titles).toContain('Pain after each session, from 0 to 10');
    const axisLabels = [...container.querySelectorAll('.recharts-label')].map((l) => l.textContent);
    expect(axisLabels).toEqual(expect.arrayContaining(['degrees', 'reps', 'pain, 0 to 10']));
  });

  it('gives every chart a name, a text summary and a data table next to it', () => {
    const { container } = render(<Dashboard sessions={sessions()} onBack={vi.fn()} />);
    for (const section of container.querySelectorAll('section.dash-chart')) {
      const img = section.querySelector('[role="img"]')!;
      expect(img.getAttribute('aria-labelledby')).toBe(section.querySelector('h2')!.id);
      const summaryId = img.getAttribute('aria-describedby')!;
      expect(document.getElementById(summaryId)!.textContent).toMatch(/Lowest .* Highest .* Last /);
      expect(within(section as HTMLElement).getByRole('table')).toBeInTheDocument();
    }
  });

  it('says so in the summary when a chart has no value', () => {
    render(<DashboardCharts sessions={[session({ peakFlexion: null, reps: null })]} />);
    expect(screen.getAllByText(/no values/i).length).toBeGreaterThan(0);
  });

  it('turns animation off and sets no inline style attribute in the markup', () => {
    const { container } = render(<Dashboard sessions={sessions()} onBack={vi.fn()} />);
    // Recharts sets style on its wrapper and its svg through the CSSOM. The browser check of T11 shows that a CSP allows it.
    expect(container.querySelector('[style]:not(.recharts-wrapper):not(.recharts-surface)')).toBeNull();
    expect(container.querySelector('.recharts-line-curve')).not.toBeNull();
    const source = readFileSync('src/ui/Dashboard.tsx', 'utf8');
    expect(source.match(/isAnimationActive=\{false\}/g)).toHaveLength(3);
    expect(source).not.toMatch(/style=/);
  });

  it('draws no goal line, no status mark and no colour value in the markup', () => {
    const { container } = render(<Dashboard sessions={sessions()} onBack={vi.fn()} />);
    expect(container.querySelector('.recharts-reference-line, .recharts-reference-area, .recharts-legend-wrapper')).toBeNull();
    const source = readFileSync('src/ui/Dashboard.tsx', 'utf8');
    expect(source).not.toMatch(/ReferenceLine|ReferenceArea|#[0-9a-fA-F]{3,6}\b|\b(red|green)\b/i);
  });

  it('shows no verdict word in the empty state, with data, or in the styles', () => {
    for (const list of [[], sessions()]) {
      const { container } = render(<Dashboard sessions={list} onBack={vi.fn()} />);
      const text = container.textContent ?? '';
      expect(hasVerdictWord(text), text).toBeNull();
      expect(text).not.toMatch(/\b(met|passed)\b/i);
      cleanup();
    }
  });

  it('shows text from the data as plain text only', () => {
    // The title comes from the app. A session field is not shown by this screen.
    const { container } = render(<Dashboard sessions={[session({ marginSource: '<img src=x onerror=alert(1)>' as SessionRecord['marginSource'] })]} onBack={vi.fn()} />);
    expect(container.querySelector('img, script, a')).toBeNull();
  });
});

describe('dashboard.css', () => {
  const css = readFileSync('src/ui/dashboard.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const known = new Set([...readFileSync('src/ui/styles.css', 'utf8').matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]));

  it('uses only custom properties that styles.css defines', () => {
    const used = [...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(3);
    for (const name of used) expect(known.has(name), name).toBe(true);
  });

  it('holds no colour value, no keyframes and no animation', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b|\b(rgb|hsl)a?\(|\b(red|green)\b/i);
    expect(css).not.toMatch(/@keyframes|animation:/);
  });

  it('moves only the erase dialog, and only after a person opens it', () => {
    const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*transition:[^{}]*)\}/g)];
    expect(blocks.length).toBeGreaterThan(0);
    for (const [, selector] of blocks) expect(selector, selector).toMatch(/\.erase-dialog/);
  });
});
