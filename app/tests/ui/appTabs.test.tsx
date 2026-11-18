// The frame of the app (v3): four tabs on the main screens, the banner on every screen, the action bar after main.
// This file replaces bottomNav.test.tsx. The old bottom bar (Home, Your sessions, My data) is gone. AppShell has the tabs.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PROTOTYPE_BANNER } from '../../src/lib/mode';
import { markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { freshDb, mockSource, protocolText } from './helpers';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const heading = (name: string) => screen.findByRole('heading', { level: 1, name }, { timeout: 10_000 });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const nav = () => screen.queryByRole('navigation', { name: 'Main' });

async function toToday() {
  const db = freshDb();
  markPrivacyNoticeSeen();
  await saveProtocol(db, protocolText(), 'demo');
  render(<App db={db} mode="demo" source={mockSource()} />);
  await heading('Today');
}

describe('the tabs', () => {
  it('show Today, Progress, Sessions and My data, and mark the open screen', async () => {
    await toToday();
    const bar = nav()!;
    expect([...bar.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Today', 'Progress', 'Sessions', 'My data']);
    expect(within(bar).getByRole('button', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    click('Sessions');
    await heading('Your sessions');
    expect(within(nav()!).getByRole('button', { name: 'Sessions' })).toHaveAttribute('aria-current', 'page');
    click('My data');
    await heading('My data');
    expect(within(nav()!).getByRole('button', { name: 'My data' })).toHaveAttribute('aria-current', 'page');
    click('Progress');
    await heading('Check my progress');
    expect(within(nav()!).getByRole('button', { name: 'Progress' })).toHaveAttribute('aria-current', 'page');
    click('Today');
    await heading('Today');
  });

  it('are absent on Red flag, Setup and Summary', async () => {
    await toToday();
    click('Start Heel slide');
    await heading('Check before you exercise');
    expect(nav()).toBeNull();
    click(/none of these apply/i);
    await heading('Set up the camera');
    expect(nav()).toBeNull();
  });

  it('are absent on the first Privacy screen and on the Load screen of a new device', async () => {
    render(<App db={freshDb()} mode="demo" source={mockSource()} />);
    await heading('Privacy');
    expect(nav()).toBeNull();
    click('I understand');
    await heading('Load protocol file');
    expect(nav()).toBeNull();
  });
});

describe('the frame', () => {
  it('shows the prototype notice, a skip link and one main landmark on the tab screens', async () => {
    await toToday();
    for (const tab of ['Today', 'Sessions', 'My data'] as const) {
      click(tab);
      await heading(tab === 'Today' ? 'Today' : tab === 'Sessions' ? 'Your sessions' : 'My data');
      expect(within(screen.getByRole('complementary', { name: 'Notice' })).getByText(PROTOTYPE_BANNER)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
      expect(screen.getAllByRole('main')).toHaveLength(1);
    }
  });

  it('has no notice in patient mode, because the mode has none', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText({ approvedOn: '2026-01-02' }), 'patient');
    render(<App db={db} mode="patient" source={mockSource()} />);
    await heading('Today');
    expect(screen.queryByText(PROTOTYPE_BANNER)).toBeNull();
  });
});
