import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { markPrivacyNoticeSeen, saveProtocol, saveSession } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { freshDb, mockSource, protocolText, sessionInput, type MockSource } from './helpers';
import { installDialogStub } from './t11helpers';

beforeEach(() => {
  localStorage.clear();
  installDialogStub();
});
afterEach(cleanup);

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });
const currentHeading = () => screen.getByRole('heading', { level: 1 }).textContent;
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
/** The browser Back button, and the wait for its popstate event. */
const back = async () => {
  await act(async () => {
    window.history.back();
    await new Promise((r) => setTimeout(r, 30));
  });
};
const forward = async () => {
  await act(async () => {
    window.history.forward();
    await new Promise((r) => setTimeout(r, 30));
  });
};
const GUARDED = ['Check before you exercise', 'Set up the camera', 'Heel slide'];

async function openHome(source: MockSource = mockSource()) {
  const db = freshDb();
  markPrivacyNoticeSeen();
  await saveProtocol(db, protocolText(), 'demo');
  await saveSession(db, { ...sessionInput(), date: '2026-03-01T10:00:00.000Z' });
  const view = render(<App db={db} mode="demo" source={source} />);
  await heading('Today');
  return { db, source, ...view };
}
const toSetup = async () => {
  click('Start Heel slide');
  await heading('Check before you exercise');
  click(/none of these apply/i);
  await heading('Set up the camera');
};
const toSession = async () => {
  await toSetup();
  click('Next: set up the camera');
  click('Start camera');
  fireEvent.click(await screen.findByRole('button', { name: 'Start exercise' }));
  await heading('Heel slide');
};

describe('Back of the browser stays in the app', () => {
  it('pushes one history entry when a screen opens that is not the first, and none for the first screen', async () => {
    await openHome();
    const before = window.history.length;
    click('My data');
    await heading('My data');
    expect(window.history.length).toBe(before + 1);
    click('Back');
    await heading('Today');
    await act(() => new Promise((r) => setTimeout(r, 30))); // the entry goes away with an async history step
    click('Sessions');
    await heading('Your sessions');
    expect(window.history.length).toBeLessThanOrEqual(before + 1);
  });

  it('keeps only a screen id string in the history state', async () => {
    await openHome();
    expect(typeof window.history.state).toBe('string');
    click('My data');
    await heading('My data');
    expect(window.history.state).toBe('data');
    await toSetupFromData();
    expect(['redflag', 'setup', 'home']).toContain(window.history.state);
  });
  async function toSetupFromData() {
    click('Back');
    await heading('Today');
    await toSetup();
  }

  it.each([
    ['My data', async () => { click('My data'); await heading('My data'); }],
    ['Your sessions', async () => { click('Sessions'); await heading('Your sessions'); }],
    ['the red-flag check', async () => { click('Start Heel slide'); await heading('Check before you exercise'); }],
    ['Setup', toSetup],
  ])('Back from %s goes Home, and Forward does nothing', async (_name, open) => {
    await openHome();
    await open();
    await back();
    expect(currentHeading()).toBe('Today');
    await forward();
    expect(currentHeading()).toBe('Today');
    expect(GUARDED).not.toContain(currentHeading());
    // Forward went to the entry above and came back at once, so the history stands on the first entry of Home.
    expect(window.history.state).toBe('home');
  });

  it('Back from Session stops the camera and shows the Summary, like the Stop button', async () => {
    const { source } = await openHome();
    await toSession();
    expect(source.stop).not.toHaveBeenCalled();
    await back();
    await heading('Summary');
    expect(source.stop).toHaveBeenCalled();
  });

  it('a second Back on the Summary keeps the Summary, so a session is not dropped by a press', async () => {
    await openHome();
    await toSession();
    await back();
    await heading('Summary');
    await back();
    expect(currentHeading()).toBe('Summary');
    click('Skip the questions');
    await heading('Today');
  });

  it('never reaches Setup or Session by Back, Forward or a reload from any screen without the red-flag step', async () => {
    const { db, source, unmount } = await openHome();
    const seen: (string | null)[] = [];
    const screens = [
      async () => { click('My data'); await heading('My data'); },
      async () => { click('Sessions'); await heading('Your sessions'); },
      async () => { click('Start Heel slide'); await heading('Check before you exercise'); },
    ];
    for (const open of screens) {
      await open();
      for (let i = 0; i < 3; i++) {
        await back();
        seen.push(currentHeading());
        await forward();
        seen.push(currentHeading());
      }
      if (currentHeading() !== 'Today') click(/^(Back|Cancel)$/);
      await heading('Today');
    }
    expect(seen.filter((h) => GUARDED.includes(h ?? ''))).toEqual([]);
    // A reload starts the app again. The first start still goes through the check.
    unmount();
    render(<App db={db} mode="demo" source={source} />);
    await heading('Today');
    click('Start Heel slide');
    await heading('Check before you exercise');
  });

  it('keeps the red-flag gate after a block: Back and Forward never open Setup', async () => {
    await openHome();
    click('Start Heel slide');
    await heading('Check before you exercise');
    await back();
    await heading('Today');
    await forward();
    expect(currentHeading()).toBe('Today');
    click('Start Heel slide');
    await heading('Check before you exercise');
    expect(screen.getByRole('button', { name: /none of these apply/i })).toBeEnabled();
    expect(screen.queryByRole('heading', { name: 'Set up the camera' })).toBeNull();
  });

  it('Cancel to Home takes the history entry away, so Forward does nothing', async () => {
    await openHome();
    const start = window.history.length;
    await toSetup();
    click('Cancel');
    await heading('Today');
    await act(() => new Promise((r) => setTimeout(r, 30)));
    await forward(); // the entry that Cancel left ahead does nothing
    expect(currentHeading()).toBe('Today');
    expect(window.history.length).toBeGreaterThanOrEqual(start);
  });

  it('the erase flow still ends on the Privacy screen, and Back opens no other screen', async () => {
    await openHome();
    click('My data');
    await heading('My data');
    click('Erase all my data');
    click('Erase my data');
    await heading('Privacy');
    await back();
    expect(currentHeading()).toBe('Privacy');
  });
});
