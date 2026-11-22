import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { freshDb, mockSource, protocolText } from './helpers';
import { installDialogStub } from './t11helpers';

// Each lazy screen fails to import, as in a lost connection.
vi.mock('../../src/ui/Dashboard', () => {
  throw new Error('chunk Dashboard');
});
vi.mock('../../src/ui/DataScreen', () => {
  throw new Error('chunk DataScreen');
});
vi.mock('../../src/ui/Onboarding', () => {
  throw new Error('chunk Onboarding');
});

beforeEach(() => {
  localStorage.clear();
  installDialogStub();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(cleanup);

async function openHome() {
  const db = freshDb();
  markPrivacyNoticeSeen();
  await saveProtocol(db, protocolText(), 'demo');
  render(<App db={db} mode="demo" source={mockSource()} />);
  await screen.findByRole('heading', { level: 1, name: 'Today' });
}

describe('lazy screens that fail to load', () => {
  it.each([
    ['Sessions', 'Your sessions'],
    ['My data', 'My data'],
  ])('%s: shows the message with a heading and a way back to Home', async (button) => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(await screen.findByText('This screen could not load. The app may have been updated. Try again reloads the page. Saved sessions stay on this device. Unsaved answers are lost.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
  });
});

describe('a lazy screen that fails to load while the device is offline', () => {
  it('shows the offline text and the same two buttons', async () => {
    await openHome();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }));
    expect(await screen.findByText('You are offline. Reconnect, then press Try again. Saved sessions stay on this device. Unsaved answers are lost.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Screen not loaded' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

describe('the plan questions screen that fails to load', () => {
  it('shows the same message, and Back to Home goes to the load screen when no protocol is stored', async () => {
    markPrivacyNoticeSeen();
    render(<App db={freshDb()} mode="demo" source={mockSource()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create my plan' }));
    expect(await screen.findByText('This screen could not load. The app may have been updated. Try again reloads the page. Saved sessions stay on this device. Unsaved answers are lost.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Home' })).toBeInTheDocument();
  });
});
