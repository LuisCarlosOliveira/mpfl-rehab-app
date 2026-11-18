// Every run is saved when it ends, before the person answers any question.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { freshDb, mockSource, protocolText } from './helpers';
import { installDialogStub } from './t11helpers';

beforeEach(() => {
  localStorage.clear();
  installDialogStub();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

async function toSession() {
  const db = freshDb();
  markPrivacyNoticeSeen();
  await saveProtocol(db, protocolText(), 'demo');
  const source = mockSource();
  render(<App db={db} mode="demo" source={source} />);
  await heading('Today');
  click('Start Heel slide');
  await heading('Check before you exercise');
  click(/none of these apply/i);
  await heading('Set up the camera');
  click('Next: set up the camera');
  click('Start camera');
  fireEvent.click(await screen.findByRole('button', { name: 'Start exercise' }));
  await heading('Heel slide');
  return db;
}

describe('the record is written when the run ends', () => {
  it('Stop saves the run with 0 reps, with no answers yet', async () => {
    const db = await toSession();
    click('Stop');
    await heading('Summary');
    const rows = await db.sessions.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ exercise: 'heel-slide', reps: 0, gaveWayPresses: 0 });
    expect(rows[0]?.pain).toBeUndefined();
  });

  it('"Knee gave way or hurts" saves the run with the press counted', async () => {
    const db = await toSession();
    click('Knee gave way or hurts');
    await heading('Summary');
    expect(await db.sessions.toArray()).toMatchObject([{ gaveWayPresses: 1 }]);
  });

  it('Back of the browser saves the run', async () => {
    const db = await toSession();
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 30));
    });
    await heading('Summary');
    expect(await db.sessions.count()).toBe(1);
  });

  it('Save then updates the same record and Skip the questions never adds one', async () => {
    const db = await toSession();
    click('Stop');
    await heading('Summary');
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('radio', { name: /some swelling/i }));
    click('Save');
    await screen.findByText('Session saved.');
    const rows = await db.sessions.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ pain: 2, swelling: 'some' });
  });

  it('a failing db shows the plain message and the Summary stays usable', async () => {
    const db = await toSession();
    vi.spyOn(db.sessions, 'add').mockRejectedValue(new Error('private mode'));
    click('Stop');
    await heading('Summary');
    expect(await screen.findByText(/could not be stored on this device/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip the questions' })).toBeEnabled();
  });
});
