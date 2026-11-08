import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLastExport, saveSession, type SessionInput } from '../../src/lib/storage';
import { DataScreen } from '../../src/ui/DataScreen';
import { freshDb, protocolText, sessionInput } from './helpers';
import { bigFile, exportText, installDialogStub, pick, session, stubDownload } from './t11helpers';
import { hasVerdictWord } from './verdict';

let stub: ReturnType<typeof stubDownload>;

beforeEach(() => {
  localStorage.clear();
  installDialogStub();
  stub = stubDownload();
});
afterEach(() => {
  cleanup();
  stub.restore();
  vi.useRealTimers();
});

async function setup(inputs: SessionInput[] = [sessionInput()]) {
  const db = freshDb();
  for (const input of inputs) await saveSession(db, input);
  const onBack = vi.fn();
  const onErased = vi.fn();
  const view = render(<DataScreen db={db} onBack={onBack} onErased={onErased} />);
  await waitFor(() => expect(screen.queryByText('Counting sessions.')).toBeNull());
  return { db, onBack, onErased, ...view };
}

const readBlob = (blob: Blob) => blob.text();

describe('DataScreen care team button', () => {
  const open = async (onOpenClinician?: () => void) => {
    const db = freshDb();
    render(<DataScreen db={db} onBack={vi.fn()} onErased={vi.fn()} onOpenClinician={onOpenClinician} />);
    await waitFor(() => expect(screen.queryByText('Counting sessions.')).toBeNull());
  };
  it('shows the button when a handler is given', async () => {
    const handler = vi.fn();
    await open(handler);
    fireEvent.click(screen.getByRole('button', { name: /open a session file \(care team\)/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('shows no button and no care team block when no handler is given', async () => {
    await open();
    expect(screen.queryByRole('button', { name: /care team/i })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Care team' })).toBeNull();
  });
});

describe('DataScreen export', () => {
  it('warns in plain words that the file holds health data', async () => {
    await setup();
    expect(screen.getByRole('note')).toHaveTextContent(/health data/i);
    expect(screen.getByRole('note')).toHaveTextContent(/secure channel of your clinic/i);
  });

  it('downloads the JSON text as a Blob link, then revokes the URL and marks the export', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await setup();
    expect(getLastExport()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON file' }));
    await waitFor(() => expect(stub.clicked).toHaveLength(1));
    expect(stub.clicked[0]!.download).toMatch(/^mpfl-sessions-\d{4}-\d{2}-\d{2}\.json$/);
    const text = await readBlob(stub.created[0]!);
    expect(JSON.parse(text)).toMatchObject({ schemaVersion: 1, sessions: [{ exercise: 'heel-slide' }] });
    expect(stub.created[0]!.type).toBe('application/json');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(stub.revoked).toEqual(['blob:test/1']);
    expect(getLastExport()).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/downloads/i);
  });

  it('downloads the CSV text with the angle method in the first row', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV file' }));
    await waitFor(() => expect(stub.clicked).toHaveLength(1));
    expect(stub.clicked[0]!.download).toMatch(/\.csv$/);
    const text = await readBlob(stub.created[0]!);
    expect(text.split('\n')[0]).toBe('"2D webcam estimate, not a goniometer measurement"');
    expect(stub.created[0]!.type).toBe('text/csv');
  });

  it('keeps the export buttons off when no session is stored', async () => {
    const db = freshDb();
    render(<DataScreen db={db} onBack={vi.fn()} onErased={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/no sessions are stored/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Export JSON file' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export CSV file' })).toBeDisabled();
    expect(getLastExport()).toBeNull();
  });

  it('shows the date of the last export', async () => {
    localStorage.setItem('mpfl.lastExport', '2026-10-05T08:00:00.000Z');
    await setup();
    expect(screen.getByText(/last export: 2026-10-05/i)).toBeInTheDocument();
  });

  it('shows an error and does not mark the export when it fails', async () => {
    const { db } = await setup();
    vi.spyOn(db.sessions, 'orderBy').mockImplementation(() => {
      throw new Error('boom');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON file' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/export did not work/i);
    expect(getLastExport()).toBeNull();
    expect(stub.clicked).toHaveLength(0);
  });
});

describe('DataScreen import check', () => {
  it('imports a valid file and shows the count', async () => {
    const { db } = await setup([]);
    pick(screen.getByLabelText(/import a session file/i), exportText([session({ date: '2026-11-02T10:00:00.000Z' }), session({ date: '2026-11-03T10:00:00.000Z' })]));
    expect(await screen.findByRole('status')).toHaveTextContent('Imported 2 sessions.');
    expect(await db.sessions.count()).toBe(2);
  });

  it('shows the named error for a file that is not valid, and stores nothing', async () => {
    const { db } = await setup([]);
    pick(screen.getByLabelText(/import a session file/i), 'not json');
    expect(await screen.findByRole('alert')).toHaveTextContent('The file is not valid JSON.');
    pick(screen.getByLabelText(/import a session file/i), exportText([], { schemaVersion: 2 }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/schema version/i));
    expect(await db.sessions.count()).toBe(0);
  });

  it('shows the duplicate error and keeps the stored sessions', async () => {
    const { db } = await setup([sessionInput()]);
    pick(screen.getByLabelText(/import a session file/i), exportText([session({ date: sessionInput().date, exercise: 'heel-slide' })]));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already stored/i);
    expect(await db.sessions.count()).toBe(1);
  });

  it('refuses a file over 5 MB before it reads the text', async () => {
    await setup([]);
    fireEvent.change(screen.getByLabelText(/import a session file/i), { target: { files: [bigFile()] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('The file is larger than 5 MB.');
  });
});

describe('DataScreen erase', () => {
  const open = () => fireEvent.click(screen.getByRole('button', { name: 'Erase all my data' }));

  it('opens a native dialog, moves focus to Keep my data and has two clear buttons', async () => {
    const { container } = await setup();
    const dialog = container.querySelector('dialog')!;
    expect(dialog).not.toHaveAttribute('open');
    open();
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Keep my data' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Erase my data' })).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName(/erase/i);
  });

  it('closes on Keep my data, returns focus to the button and erases nothing', async () => {
    const { container, db, onErased } = await setup();
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Keep my data' }));
    expect(container.querySelector('dialog')).not.toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Erase all my data' })).toHaveFocus();
    expect(onErased).not.toHaveBeenCalled();
    expect(await db.sessions.count()).toBe(1);
  });

  it('closes on the cancel and close events of Escape and returns focus', async () => {
    // jsdom does not send Escape to a dialog. The test sends the events that a browser sends.
    const { container, onErased } = await setup();
    open();
    const dialog = container.querySelector('dialog')!;
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    (dialog as HTMLDialogElement).close();
    expect(screen.getByRole('button', { name: 'Erase all my data' })).toHaveFocus();
    expect(onErased).not.toHaveBeenCalled();
  });

  it('erases sessions, protocol and local values, then calls onErased', async () => {
    const { db, onErased } = await setup();
    await db.protocol.put({ key: 'current', raw: protocolText(), savedAt: '2026-01-01T00:00:00.000Z' });
    localStorage.setItem('mpfl.lastExport', '2026-10-05T08:00:00.000Z');
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Erase my data' }));
    await waitFor(() => expect(onErased).toHaveBeenCalledOnce());
    expect(await db.sessions.count()).toBe(0);
    expect(await db.protocol.count()).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it('keeps the dialog open and shows an error when the erase fails', async () => {
    const { db, container, onErased } = await setup();
    vi.spyOn(db, 'delete').mockRejectedValue(new Error('blocked'));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Erase my data' }));
    expect(await within(container.querySelector('dialog')!).findByRole('alert')).toHaveTextContent(/did not erase/i);
    expect(container.querySelector('dialog')).toHaveAttribute('open');
    expect(onErased).not.toHaveBeenCalled();
  });
});

describe('DataScreen layout and text', () => {
  it('has an h1, a Back button and an optional care-team button', async () => {
    const onOpenClinician = vi.fn();
    const db = freshDb();
    const onBack = vi.fn();
    render(<DataScreen db={db} onBack={onBack} onErased={vi.fn()} onOpenClinician={onOpenClinician} />);
    expect(screen.getByRole('heading', { level: 1, name: 'My data' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: /open a session file/i }));
    expect(onOpenClinician).toHaveBeenCalledOnce();
  });

  it('has no care-team button when the prop is not set', async () => {
    await setup();
    expect(screen.queryByRole('button', { name: /open a session file/i })).toBeNull();
  });

  it('shows no verdict word, no inline style and no camera API', async () => {
    const { container } = await setup();
    open();
    const text = container.textContent ?? '';
    expect(hasVerdictWord(text), text).toBeNull();
    expect(container.querySelector('[style]')).toBeNull();
    const source = readFileSync('src/ui/DataScreen.tsx', 'utf8');
    expect(source).not.toMatch(/toBlob|toDataURL|MediaRecorder|ImageCapture|dangerouslySetInnerHTML|style=/);
    expect(source).toMatch(/URL\.revokeObjectURL/);
  });

  function open() {
    fireEvent.click(screen.getByRole('button', { name: 'Erase all my data' }));
  }
});
