// A tab that stays open while the app is rebuilt asks for chunk names that answer 404. "Try again" must reload the page.
// The reload must never land on Setup or Session without the red-flag check: the check state is in memory, so a new page starts at Home.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { freshDb, mockSource, protocolText } from './helpers';
import { installDialogStub } from './t11helpers';

vi.mock('../../src/ui/Setup', () => {
  throw new Error('Failed to fetch dynamically imported module: /assets/Setup-old.js');
});

const reload = vi.fn();
beforeEach(() => {
  reload.mockClear();
  localStorage.clear();
  installDialogStub();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.stubGlobal('location', { ...window.location, reload });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });

describe('a failed screen chunk, then Try again', () => {
  it('reloads the page, and a new page starts at Home with the red-flag check still ahead of Setup', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Home');
    fireEvent.click(screen.getByRole('button', { name: 'Start Heel slide' }));
    await heading('Check before you exercise');
    fireEvent.click(screen.getByRole('button', { name: /none of these apply/i }));
    await heading('Screen not loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalledTimes(1);

    // The reload makes a new page: new memory, the same IndexedDB.
    cleanup();
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Home');
    expect(screen.queryByRole('heading', { name: 'Set up the camera' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start Heel slide' }));
    await heading('Check before you exercise');
  });
});
