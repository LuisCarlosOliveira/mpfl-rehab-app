import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PLAN_EXERCISE_KINDS } from '../../src/lib/protocol/schema';
import { BANNER } from '../../src/lib/reviewSummary';
import type { SessionRecord } from '../../src/lib/storage';
import { ClinicianView } from '../../src/ui/ClinicianView';
import { exportText, pick, session } from './t11helpers';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const fixture = (): SessionRecord[] =>
  Array.from({ length: 100 }, (_, i) => {
    const kind = PLAN_EXERCISE_KINDS[i % PLAN_EXERCISE_KINDS.length] as SessionRecord['exercise'];
    const date = `2026-${String(1 + (i % 9)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00.000Z`;
    const base = { date, exercise: kind, reps: 6, peakFlexion: null, topFlexion: null };
    if (kind === 'quad-set' || kind === 'gluteal-set') return session({ ...base, reps: null, timedBy: 'person', holdList: [5 + (i % 5), 7] });
    if (kind === 'leg-raise-back' || kind === 'leg-raise-side') return session({ ...base, reportKey: 'lift-angle', reportValue: 30 + (i % 7) + 0.4 });
    if (kind === 'ankle-pump') return session({ ...base, reportKey: 'ankle-range', reportValue: 20.6 });
    return session({ ...base, peakFlexion: 70 });
  });

async function open(sessions: SessionRecord[]) {
  render(<ClinicianView onBack={() => undefined} mode="demo" now={() => new Date('2026-11-20T09:00:00.000Z')} />);
  pick(screen.getByLabelText(/session file/i), exportText(sessions));
  await screen.findByText(BANNER);
  await waitFor(() => expect(screen.getByRole('table', { name: /session list/i })).toBeInTheDocument());
  return screen.getByRole('table', { name: /session list/i });
}

describe('care team session list with the new data', () => {
  it('has the two new columns and a row for each of 100 sessions', async () => {
    const list = await open(fixture());
    const heads = within(list).getAllByRole('columnheader').map((h) => h.textContent);
    expect(heads).toContain('Measured value');
    expect(heads).toContain('Holds timed by the person');
    expect(within(list).getAllByRole('row')).toHaveLength(101);
    for (const row of within(list).getAllByRole('row').slice(1)) expect(within(row).getAllByRole('cell')).toHaveLength(heads.length);
  });

  it('shows the whole-degree value with its name, the hold seconds, and the mark for a hand-timed record', async () => {
    const list = await open([
      session({ date: '2026-11-01T10:00:00.000Z', exercise: 'leg-raise-back', reportKey: 'lift-angle', reportValue: 38.4 }),
      session({ date: '2026-11-02T10:00:00.000Z', exercise: 'quad-set', reps: null, peakFlexion: null, timedBy: 'person', holdList: [5, 8, 6] }),
      session({ date: '2026-11-03T10:00:00.000Z', exercise: 'heel-slide' }),
    ]);
    const rows = within(list).getAllByRole('row');
    expect(within(rows[1] as HTMLElement).getByText('Lift angle 38 degrees')).toBeInTheDocument();
    expect(list.textContent).not.toContain('38.4');
    expect(within(rows[2] as HTMLElement).getByText('5, 8, 6 seconds')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText(/Quadriceps set/).textContent).toContain('timed by the person');
    expect(within(rows[1] as HTMLElement).queryByText(/timed by the person/)).toBeNull();
    expect(within(rows[3] as HTMLElement).queryByText(/timed by the person/)).toBeNull();
  });

  it('keeps the table inside its own scroll box, so the page does not scroll sideways', async () => {
    const list = await open(fixture());
    const box = list.closest('.table-scroll');
    expect(box).not.toBeNull();
    expect(box?.getAttribute('role')).toBe('region');
    const css = readFileSync('src/ui/dashboard.css', 'utf8');
    expect(css).toMatch(/\.table-scroll\s*\{[^}]*overflow:\s*auto/);
  });

  it('uses the plan name for every exercise in the session list', async () => {
    const list = await open(fixture());
    expect(list.textContent).not.toMatch(/heel slide|mini squat|straight leg raise/);
    expect(list.textContent).toContain('Leg raise to the back');
  });
});
