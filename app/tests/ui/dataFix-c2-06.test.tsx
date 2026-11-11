// P-DATA2 fix C2-06: the date of a table cell never breaks inside; it can wrap between date and time.
import { readFileSync } from 'node:fs';
import { cleanup, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DashboardCharts } from '../../src/ui/Dashboard';
import { day, session } from './t11helpers';

afterEach(cleanup);

describe('C2-06 session cell of the angle table', () => {
  it('holds the date in a no-wrap span and the time after a space, with the same text as before', () => {
    const { container } = render(<DashboardCharts sessions={[session({ date: '2026-11-11T17:14:00.000Z' }), session({ date: day(12) })]} />);
    const cell = within(container.querySelector('section.dash-chart')!).getAllByRole('cell')[0]!;
    expect(cell.textContent).toBe('2026-11-11 17:14');
    const date = cell.querySelector('span.no-break')!;
    expect(date.textContent).toBe('2026-11-11');
    expect(readFileSync('src/ui/dashboard.css', 'utf8')).toMatch(/\.no-break\s*{[^}]*white-space:\s*nowrap/);
  });

  it('keeps a plain day (reps table) as one piece too', () => {
    const { container } = render(<DashboardCharts sessions={[session({ date: day(1), reps: 4 }), session({ date: day(2), reps: 5 })]} />);
    const reps = [...container.querySelectorAll('section.dash-chart')].find((s) => s.querySelector('h2')!.textContent!.startsWith('Reps'))!;
    const cell = within(reps as HTMLElement).getAllByRole('cell')[0]!;
    expect(cell.querySelector('span.no-break')!.textContent).toBe(cell.textContent);
  });
});
