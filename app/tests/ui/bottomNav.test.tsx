import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { freshDb, mockSource, protocolText } from './helpers';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const nav = () => screen.queryByRole('navigation', { name: 'Main' });

async function toHome() {
  const db = freshDb();
  markPrivacyNoticeSeen();
  await saveProtocol(db, protocolText(), 'demo');
  render(<App db={db} mode="demo" source={mockSource()} />);
  await heading('Home');
}

describe('the bottom bar', () => {
  it('shows Home, Your sessions and My data, and marks the open screen', async () => {
    await toHome();
    const bar = nav()!;
    expect(bar).not.toBeNull();
    const items = [...bar.querySelectorAll('button')];
    expect(items.map((b) => b.textContent)).toEqual(['Home', 'Your sessions', 'My data']);
    expect(items[0]).toHaveAttribute('aria-current', 'page');
    click('Your sessions');
    await heading('Your sessions');
    expect(nav()!.querySelectorAll('button')[1]).toHaveAttribute('aria-current', 'page');
    click('My data');
    await heading('My data');
    expect(nav()!.querySelectorAll('button')[2]).toHaveAttribute('aria-current', 'page');
    click('Home');
    await heading('Home');
  });

  it('is absent on Red flag, Setup, Session and Summary', async () => {
    await toHome();
    click('Start Heel slide');
    await heading('Check before you exercise');
    expect(nav()).toBeNull();
    click(/none of these apply/i);
    await heading('Set up the camera');
    expect(nav()).toBeNull();
    click('Next: set up the camera');
    click('Start camera');
    fireEvent.click(await screen.findByRole('button', { name: 'Start exercise' }));
    await heading('Heel slide');
    expect(nav()).toBeNull();
    click('Stop');
    await heading('Summary');
    expect(nav()).toBeNull();
  });

  it('is absent on the first Privacy screen and on the Load screen of a new device', async () => {
    render(<App db={freshDb()} mode="demo" source={mockSource()} />);
    await heading('Privacy');
    expect(nav()).toBeNull();
    click('I understand');
    await heading('Load protocol file');
    expect(nav()).toBeNull();
  });
});
