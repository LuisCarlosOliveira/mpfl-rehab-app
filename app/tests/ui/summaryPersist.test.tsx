import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Summary as PlainSummary } from '../../src/lib/exercises';
import { loadProtocol } from '../../src/lib/protocol';
import { PAUSE_MESSAGE } from '../../src/lib/safety';
import { saveSession } from '../../src/lib/storage';
import { Summary } from '../../src/ui/Summary';
import { runToSessionInput } from '../../src/ui/sessionRecord';
import { HEEL_SLIDE, freshDb, protocolText } from './helpers';

afterEach(cleanup);

const summary: PlainSummary = { reps: 4, holds: null, peakFlexion: 62, topFlexion: null, topState: null, eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 } };
const r = loadProtocol(protocolText(), 'demo');
if (!r.ok) throw new Error('protocol');
const protocol = r.protocol;
const now = () => new Date('2026-03-04T10:00:00.000Z');
const base = { exercise: HEEL_SLIDE, protocol, redFlagBlocks: 0, now };

async function setup(record: 'ok' | 'failed') {
  const db = freshDb();
  const run = { reason: 'stop' as const, summary };
  const input = runToSessionInput({ ...base, phase: 1, run });
  const id = record === 'ok' ? await saveSession(db, input) : -1;
  const promise = record === 'ok' ? Promise.resolve(id) : Promise.reject(new Error('private mode'));
  const onDone = vi.fn();
  render(<Summary run={{ ...run, record: promise }} {...base} activePhase={1} db={db} onDone={onDone} />);
  return { db, id, onDone };
}
const answer = (pain: number, swelling: RegExp) => {
  fireEvent.click(screen.getByRole('radio', { name: String(pain) }));
  fireEvent.click(screen.getByRole('radio', { name: swelling }));
};

describe('Summary with a record that was saved at the end of the run', () => {
  it('Save adds the answers to that record and makes no second record', async () => {
    const { db, id } = await setup('ok');
    answer(3, /some swelling/i);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Session saved.');
    expect(await db.sessions.count()).toBe(1);
    expect(await db.sessions.get(id)).toMatchObject({ pain: 3, swelling: 'some', reps: 4 });
  });

  it('shows no storage message', async () => {
    await setup('ok');
    expect(screen.queryByText(/could not be stored/i)).toBeNull();
  });

  it('Skip the questions keeps the record and leaves it without answers', async () => {
    const { db, onDone } = await setup('ok');
    fireEvent.click(screen.getByRole('button', { name: 'Skip the questions' }));
    expect(onDone).toHaveBeenCalled();
    const rows = await db.sessions.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.pain).toBeUndefined();
  });

  it('Skip the questions still shows the pause message when an answer asks for it', async () => {
    await setup('ok');
    answer(8, /no swelling/i);
    fireEvent.click(screen.getByRole('button', { name: 'Skip the questions' }));
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
  });

  it('the pause message shows at once from pain 7, as before', async () => {
    await setup('ok');
    answer(7, /no swelling/i);
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
  });

  it('a failed update shows the save error and keeps Save usable', async () => {
    const { db } = await setup('ok');
    vi.spyOn(db.sessions, 'update').mockRejectedValueOnce(new Error('quota'));
    answer(1, /no swelling/i);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/could not be saved/i));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Session saved.');
    expect(await db.sessions.count()).toBe(1);
  });
});

describe('Summary when the write at the end of the run failed', () => {
  it('says so in plain words, keeps the screen usable, and the pause message still works', async () => {
    await setup('failed');
    const note = await screen.findByText(/could not be stored on this device/i);
    expect(note.textContent).not.toMatch(/\b(wrong|mistake|bad|fail)/i);
    expect(screen.getByRole('button', { name: 'Skip the questions' })).toBeEnabled();
    answer(9, /more than before/i);
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
  });

  it('Save then writes the whole record once, with the answers', async () => {
    const { db } = await setup('failed');
    await screen.findByText(/could not be stored on this device/i);
    answer(2, /no swelling/i);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Session saved.');
    const rows = await db.sessions.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ pain: 2, swelling: 'none', reps: 4 });
  });

  it('with a db that still fails, Save shows the save error and the screen stays usable', async () => {
    const { db } = await setup('failed');
    vi.spyOn(db.sessions, 'add').mockRejectedValue(new Error('quota'));
    answer(2, /no swelling/i);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText(/could not be saved/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});
