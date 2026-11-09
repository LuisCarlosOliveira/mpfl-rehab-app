// The whole app with a real database (fake-indexeddb). It checks that the T11 screens work inside the shell.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BANNER } from '../../src/lib/reviewSummary';
import { getLastExport, loadStoredProtocol, markPrivacyNoticeSeen, saveProtocol, saveSession } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { freshDb, mockSource, protocolText, sessionInput } from './helpers';
import { installDialogStub, pick, stubDownload } from './t11helpers';

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

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** A database with a stored protocol and two saved sessions, and the app open on Home. */
async function openHome(mode: 'demo' | 'patient' = 'demo') {
  const db = freshDb();
  markPrivacyNoticeSeen();
  await saveProtocol(db, protocolText(), mode);
  await saveSession(db, { ...sessionInput(), date: '2026-03-01T10:00:00.000Z', peakFlexion: 50, pain: 2 });
  await saveSession(db, { ...sessionInput(), date: '2026-03-02T10:00:00.000Z', peakFlexion: 60, pain: 3 });
  const view = render(<App db={db} mode={mode} source={mockSource()} />);
  await heading('Home');
  return { db, ...view };
}

describe('Your sessions', () => {
  it('shows the charts and a table for each chart, and Back returns to Home', async () => {
    await openHome();
    click('Your sessions');
    expect(await heading('Your sessions')).toBeInTheDocument();
    expect(document.querySelectorAll('section.dash-chart').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
    expect(screen.queryByText('Loading')).toBeNull();
    click('Back');
    await heading('Home');
  });

  it('moves the focus to the new heading', async () => {
    await openHome();
    click('Your sessions');
    const h1 = await heading('Your sessions');
    await waitFor(() => expect(h1).toHaveFocus());
  });

  it('shows an error in plain text when the sessions cannot be read', async () => {
    const { db } = await openHome();
    const count = db.sessions.count.bind(db.sessions);
    vi.spyOn(db.sessions, 'orderBy').mockImplementation(() => {
      throw new Error('read failed');
    });
    click('Your sessions');
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be read/i);
    expect(document.querySelector('.recharts-wrapper')).toBeNull(); // no chart, only the notice icon
    click('Back');
    await heading('Home');
    expect(await count()).toBe(2);
  });
});

describe('My data', () => {
  it('exports the JSON file, marks the export and shows the date on Home', async () => {
    await openHome();
    expect(screen.getByText(/no export yet/i)).toBeInTheDocument();
    click('My data');
    await heading('My data');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Export JSON file' })).toBeEnabled());
    click('Export JSON file');
    await waitFor(() => expect(stub.clicked).toHaveLength(1));
    await waitFor(() => expect(getLastExport()).not.toBeNull());
    expect(JSON.parse(await stub.created[0]!.text()).sessions).toHaveLength(2);
    click('Back');
    await heading('Home');
    const today = getLastExport()!.slice(0, 10);
    expect(screen.getByText(today)).toBeInTheDocument();
  });

  it('shows no way to the care team view in patient mode', async () => {
    await openHome('patient');
    click('My data');
    await heading('My data');
    expect(screen.queryByRole('button', { name: /care team/i })).toBeNull();
  });

  it('opens the care team view with an exported file and goes back to My data', async () => {
    await openHome();
    click('My data');
    await heading('My data');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Export JSON file' })).toBeEnabled());
    click('Export JSON file');
    await waitFor(() => expect(stub.created).toHaveLength(1));
    const text = await stub.created[0]!.text();
    click(/open a session file \(care team\)/i);
    await heading('Care team view');
    pick(screen.getByLabelText(/session file/i), text);
    expect(await screen.findByText(BANNER)).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: /session list/i })).getAllByRole('row')).toHaveLength(3);
    click('Back');
    await heading('My data');
  });
});

describe('Focus on each screen change', () => {
  // Found by the browser test: My data and the Care team view shared one FocusHeading in the
  // same place of the tree, so React kept it and the focus never moved to the new heading.
  // jsdom does not show this bug. This test only guards the behavior. The browser test proves the fix.
  it('moves the focus to the heading when My data opens the Care team view, and back', async () => {
    await openHome();
    click('My data');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'My data' })).toHaveFocus());
    click(/open a session file \(care team\)/i);
    const care = await heading('Care team view');
    await waitFor(() => expect(care).toHaveFocus());
    click('Back');
    const data = await heading('My data');
    await waitFor(() => expect(data).toHaveFocus());
  });
});

describe('Erase', () => {
  async function eraseThroughDialog() {
    click('My data');
    await heading('My data');
    click('Erase all my data');
    fireEvent.click(await screen.findByRole('button', { name: 'Erase my data' }));
  }

  it('shows the privacy notice again and keeps no session and no protocol', async () => {
    const { db } = await openHome();
    await eraseThroughDialog();
    expect(await heading('Privacy')).toBeInTheDocument();
    expect(screen.queryByText('Test clinic')).toBeNull();
    expect(await db.sessions.count()).toBe(0);
    expect(await loadStoredProtocol(db, 'demo')).toBeNull();
    click('I understand');
    await heading('Load protocol file');
  });

  it('shows no session and no protocol after a reload with the same database', async () => {
    const { db, unmount } = await openHome();
    await eraseThroughDialog();
    await heading('Privacy');
    unmount();
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Privacy');
    click('I understand');
    await heading('Load protocol file');
    expect(screen.queryByText('Test clinic')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Your sessions' })).toBeNull();
    expect(await db.sessions.count()).toBe(0);
  });
});
