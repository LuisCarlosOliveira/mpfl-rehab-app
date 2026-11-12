// Exercise monitoring, step E: Your sessions for the exercises that the person times.
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../../src/ui/Dashboard';
import { day, session } from './t11helpers';
import { hasVerdictWord } from './verdict';

afterEach(cleanup);

const timed = (over = {}) => session({ exercise: 'quad-set', reps: null, peakFlexion: null, timedBy: 'person', holdList: [5, 8, 6], date: day(3), ...over });

describe('Your sessions with timed holds', () => {
  it('shows one plain line for the last session of each timed exercise', () => {
    render(<Dashboard sessions={[timed({ date: day(1), holdList: [30, 40] }), timed(), timed({ exercise: 'gluteal-set', holdList: [10] })]} onBack={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Holds timed by you' });
    const items = within(list).getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['Quadriceps set: 3 holds timed by you, the longest 8 seconds.', 'Gluteal set: 1 hold timed by you, the longest 10 seconds.']);
  });

  it('shows no line and no hold list for a camera-only history', () => {
    render(<Dashboard sessions={[session({ date: day(1) })]} onBack={vi.fn()} />);
    expect(screen.queryByRole('list', { name: 'Holds timed by you' })).toBeNull();
  });

  it('keeps the timed hold out of the reps chart and draws no angle chart for it', () => {
    const { container } = render(<Dashboard sessions={[session({ date: day(1), reps: 9 }), timed({ reps: 7 })]} onBack={vi.fn()} />);
    const repsTable = screen.getByRole('table', { name: /Reps for each day/ });
    expect(within(repsTable).getByText('9 reps')).toBeInTheDocument();
    expect(repsTable.textContent).not.toMatch(/16 reps|7 reps/);
    expect(container.textContent).not.toMatch(/Peak knee bend, Quadriceps/);
  });

  it('uses no verdict word, no total and no goal in the line', () => {
    render(<Dashboard sessions={[timed()]} onBack={vi.fn()} />);
    const text = within(screen.getByRole('list', { name: 'Holds timed by you' })).getByRole('listitem').textContent ?? '';
    expect(hasVerdictWord(text)).toBeNull();
    expect(text).not.toMatch(/total|goal|streak/i);
  });
});
