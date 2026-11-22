import { readFileSync } from 'node:fs';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BANNER } from '../../src/lib/reviewSummary';
import { ClinicianView } from '../../src/ui/ClinicianView';
import { DashboardCharts } from '../../src/ui/Dashboard';
import { day, exportText, peakCriterion, pick, protocolFileText, session, threeSquats } from './t11helpers';

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

describe('C3-04 care team tables', () => {
  it('keeps the date of the session list and of the pain table in a no-break span', async () => {
    render(<ClinicianView onBack={vi.fn()} mode="demo" now={() => new Date('2026-11-20T09:00:00.000Z')} />);
    pick(screen.getByLabelText(/session file/i), exportText(threeSquats(120)));
    await screen.findByText(BANNER);
    pick(screen.getByLabelText(/protocol file/i), protocolFileText([peakCriterion()]));
    await screen.findByRole('table', { name: 'Pain and swelling by session' });
    for (const name of ['Session list', 'Pain and swelling by session']) {
      const cell = within(screen.getByRole('table', { name })).getAllByRole('row')[1]!.querySelector('td')!;
      expect(cell.querySelector('span.no-break')!.textContent, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(cell.textContent, name).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    }
  });
});
