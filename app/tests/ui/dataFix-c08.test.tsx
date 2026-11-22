import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSession } from '../../src/lib/storage';
import { DataScreen } from '../../src/ui/DataScreen';
import { freshDb, sessionInput } from './helpers';
import { installDialogStub, stubDownload } from './t11helpers';

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


describe('My data counts only rows that the export holds (C-08)', () => {
  it('counts 36 valid rows, names the 2 left out, and exports 36', async () => {
    const db = freshDb();
    for (let i = 0; i < 36; i++) await saveSession(db, { ...sessionInput(), date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T${String(8 + Math.floor(i / 28)).padStart(2, '0')}:00:00.000Z` });
    await db.sessions.add({ broken: true } as never);
    await db.sessions.add({ exercise: 'mini-squat' } as never);
    render(<DataScreen db={db} onBack={vi.fn()} onErased={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Export 36 sessions as JSON' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export 36 sessions as CSV' })).toBeInTheDocument();
    expect(screen.getByText(/36 sessions on this device/)).toBeInTheDocument();
    expect(screen.getByText(/2 saved rows/)).toHaveTextContent(/left out of the export/);
  });
  it('shows no line when every row is valid', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    render(<DataScreen db={db} onBack={vi.fn()} onErased={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText('Counting sessions.')).toBeNull());
    expect(screen.queryByText(/left out of the export/)).toBeNull();
  });
});
