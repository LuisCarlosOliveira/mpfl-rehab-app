// W3, U12 and U9 on My data: the states of the import drop area, and export buttons that keep their width.
import { act, cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSession } from '../../src/lib/storage';
import { DataScreen } from '../../src/ui/DataScreen';
import { freshDb, sessionInput } from './helpers';
import { bigFile, exportText, installDialogStub, session, stubDownload } from './t11helpers';
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

async function open(withSession = false) {
  const db = freshDb();
  if (withSession) await saveSession(db, sessionInput());
  const view = render(<DataScreen db={db} onBack={vi.fn()} onErased={vi.fn()} />);
  await waitFor(() => expect(screen.queryByText('Counting sessions.')).toBeNull());
  return { db, ...view };
}

const zone = () => document.querySelector<HTMLElement>('.dropzone')!;
const input = () => screen.getByLabelText(/import a session file/i);
const goodFile = (name = 'sessions.json') => new File([exportText([session({ date: '2026-11-02T10:00:00.000Z' }), session({ date: '2026-11-03T10:00:00.000Z' })])], name, { type: 'application/json' });

describe('import drop area states (U12)', () => {
  it('idle: shows how to start, with no live role and no verdict word', async () => {
    await open();
    expect(zone()).toHaveAttribute('data-state', 'idle');
    expect(zone()).toHaveTextContent('Drop the session file here, or choose a file');
    expect(zone().querySelector('[role]')).toBeNull();
    expect(hasVerdictWord(zone().textContent ?? '')).toBeFalsy();
  });

  it('drag over: says Drop to open, and goes back to idle when the file leaves', async () => {
    await open();
    fireEvent.dragEnter(zone(), { dataTransfer: { files: [], types: ['Files'] } });
    expect(zone()).toHaveAttribute('data-state', 'over');
    expect(zone()).toHaveTextContent('Drop to open');
    fireEvent.dragLeave(zone(), { dataTransfer: { files: [] } });
    expect(zone()).toHaveAttribute('data-state', 'idle');
  });

  it('drag over keeps the default of the browser away, so the drop reaches the app', async () => {
    await open();
    const event = createEvent.dragOver(zone(), { dataTransfer: { files: [], types: ['Files'] } });
    fireEvent(zone(), event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('reading: shows the file name and the size while the text loads, then the number of sessions', async () => {
    const { db } = await open();
    const file = goodFile('my-sessions.json');
    let release!: (text: string) => void;
    const text = vi.spyOn(file, 'text').mockReturnValue(new Promise<string>((resolve) => (release = resolve)));
    Object.defineProperty(file, 'size', { value: 3 * 1024 });
    fireEvent.change(input(), { target: { files: [file] } });
    expect(zone()).toHaveAttribute('data-state', 'reading');
    expect(zone()).toHaveTextContent('Reading my-sessions.json (3 KB)');
    expect(input()).toBeDisabled();
    await act(async () => release(exportText([session({ date: '2026-11-02T10:00:00.000Z' }), session({ date: '2026-11-03T10:00:00.000Z' })])));
    expect(text).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('Imported 2 sessions.');
    expect(zone()).toHaveAttribute('data-state', 'imported');
    expect(zone()).toHaveTextContent('my-sessions.json (3 KB)');
    expect(input()).not.toBeDisabled();
    expect(await db.sessions.count()).toBe(2);
  });

  it('a dropped file imports like a chosen file', async () => {
    const { db } = await open();
    fireEvent.drop(zone(), { dataTransfer: { files: [goodFile()], types: ['Files'] } });
    expect(await screen.findByRole('status')).toHaveTextContent('Imported 2 sessions.');
    expect(zone()).toHaveAttribute('data-state', 'imported');
    expect(await db.sessions.count()).toBe(2);
  });

  it('refused, too large: names the reason and the file, and stores nothing', async () => {
    await open();
    fireEvent.change(input(), { target: { files: [bigFile()] } });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The file is larger than 5 MB.');
    expect(zone()).toHaveAttribute('data-state', 'refused');
    expect(zone()).toHaveTextContent('big.json');
  });

  it('refused, wrong type: says that the app opens JSON session files only', async () => {
    const { db } = await open();
    fireEvent.drop(zone(), { dataTransfer: { files: [new File(['a,b'], 'notes.csv', { type: 'text/csv' })], types: ['Files'] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('The app opens JSON session files only.');
    expect(zone()).toHaveAttribute('data-state', 'refused');
    expect(await db.sessions.count()).toBe(0);
  });

  it('refused, bad content: keeps the reason of the import check as plain text', async () => {
    await open();
    fireEvent.change(input(), { target: { files: [new File(['not json'], 'x.json', { type: 'application/json' })] } });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The file is not valid JSON.');
    expect([...alert.children].map((c) => c.tagName)).toEqual(['svg']);
  });

  it('a file name with markup stays plain text', async () => {
    await open();
    fireEvent.drop(zone(), { dataTransfer: { files: [new File(['x'], '<img src=x onerror=alert(1)>.csv', { type: 'text/csv' })], types: ['Files'] } });
    await screen.findByRole('alert');
    expect(zone().querySelector('img')).toBeNull();
    expect(zone()).toHaveTextContent('<img src=x onerror=alert(1)>.csv');
  });

  it('a new file after a refusal starts again from the reading state', async () => {
    await open();
    fireEvent.change(input(), { target: { files: [bigFile()] } });
    await screen.findByRole('alert');
    fireEvent.change(input(), { target: { files: [goodFile()] } });
    expect(await screen.findByRole('status')).toHaveTextContent('Imported 2 sessions.');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('the drop area styles use no green and no red, and only a border and a fill change between states', () => {
    const css = readFileSync('src/ui/styles.css', 'utf8');
    const block = css.slice(css.indexOf('W3 START'), css.indexOf('W3 END')).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(block).toMatch(/\.dropzone\[data-state='over'\]/);
    expect(block).not.toMatch(/#(?:0f0|f00|00ff00|ff0000)|green|red\b/i);
  });
});

describe('export buttons keep their width (U9)', () => {
  it('both export buttons use the width-keeping class, and its rule sets a minimum width', async () => {
    await open(true);
    expect(screen.getByRole('button', { name: 'Export 1 session as JSON' })).toHaveClass('btn-keep');
    expect(screen.getByRole('button', { name: 'Export 1 session as CSV' })).toHaveClass('btn-keep');
    const css = readFileSync('src/ui/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(/\.btn-keep\s*\{[^}]*min-width:\s*1[2-9](\.\d+)?rem/.exec(css)).not.toBeNull();
  });

  it('the label goes from Export 1 session as JSON to Exporting to Done and back, and the buttons stay off in between', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await open(true);
    fireEvent.click(screen.getByRole('button', { name: 'Export 1 session as JSON' }));
    expect(screen.getByRole('button', { name: 'Exporting' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export 1 session as CSV' })).toBeDisabled();
    expect(await screen.findByRole('button', { name: 'Done' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/mpfl-sessions-\d{4}-\d{2}-\d{2}\.json/);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByRole('button', { name: 'Export 1 session as JSON' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Export 1 session as CSV' })).toBeEnabled();
  });

  it('the CSV button swaps its own label and leaves the JSON label alone', async () => {
    await open(true);
    fireEvent.click(screen.getByRole('button', { name: 'Export 1 session as CSV' }));
    expect(screen.getByRole('button', { name: 'Exporting' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export 1 session as JSON/ })).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Done' });
  });

  it('a failed export brings the label back and shows the alert', async () => {
    const { db } = await open(true);
    vi.spyOn(db.sessions, 'orderBy').mockImplementation(() => {
      throw new Error('boom');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export 1 session as JSON' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/export did not work/i);
    expect(screen.getByRole('button', { name: 'Export 1 session as JSON' })).toBeEnabled();
  });
});
