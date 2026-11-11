// P-DATA fix c10.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../../src/ui/Dashboard';
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


describe('C-10 legend has no reps total', () => {
  it('keeps the session count and drops the reps', () => {
    render(<Dashboard sessions={[session({ reps: 8 }), session({ reps: 6, date: day(2) })]} onBack={vi.fn()} />);
    const legend = screen.getByRole('list', { name: /exercises in your sessions/i });
    expect(legend).toHaveTextContent('2 sessions');
    expect(legend.textContent).not.toMatch(/reps?/i);
  });
});
