// Audit A1-2. PROPOSAL: a clinician or the user has not confirmed this rule yet.
// An import is refused when the file has another pseudonymous id and this device already holds sessions.
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exportJson, getLastExport, getPseudonymId, importSessions, markExported, saveSession } from '../../src/lib/storage';
import { DataScreen } from '../../src/ui/DataScreen';
import { freshDb, sessionInput } from './helpers';
import { exportText, installDialogStub, pick, session, PSEUDONYM } from './t11helpers';

const OTHER_REFUSAL = /belongs to another person/i;
const LOCAL_ID = '99999999-8888-4777-8666-555555555555';
const NEW_DATE = '2026-11-05T10:00:00.000Z';

beforeEach(() => {
  localStorage.clear();
  installDialogStub();
});
afterEach(cleanup);

/** Everything that an import must not change when it is refused. */
async function snapshot(db: ReturnType<typeof freshDb>) {
  return {
    rows: await db.sessions.toArray(),
    pseudoId: localStorage.getItem('mpfl.pseudoId'),
    lastExport: getLastExport(),
    keys: Object.keys(localStorage).sort(),
  };
}

describe('importSessions with a different pseudonymous id', () => {
  it('refuses the file when the database has sessions, and writes nothing', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    localStorage.setItem('mpfl.pseudoId', LOCAL_ID);
    markExported(new Date('2026-11-04T08:00:00.000Z'));
    const before = await snapshot(db);

    const result = await importSessions(db, exportText([session({ date: NEW_DATE })]));

    expect(result).toMatchObject({ ok: false, error: { code: 'other-person' } });
    if (!result.ok) expect(result.error.message).toMatch(OTHER_REFUSAL);
    expect(await snapshot(db)).toEqual(before);
    expect(await db.sessions.count()).toBe(1);
  });

  it('refuses and writes no id when the device has sessions but no stored id', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    const before = await snapshot(db);
    expect(before.pseudoId).toBeNull();

    const result = await importSessions(db, exportText([session({ date: NEW_DATE })]));

    expect(result).toMatchObject({ ok: false, error: { code: 'other-person' } });
    expect(await snapshot(db)).toEqual(before);
  });

  it('accepts any id when the database is empty', async () => {
    const db = freshDb();
    localStorage.setItem('mpfl.pseudoId', LOCAL_ID);
    const result = await importSessions(db, exportText([session({ date: NEW_DATE })]));
    expect(result).toEqual({ ok: true, imported: 1 });
    expect(await db.sessions.count()).toBe(1);
  });

  it('accepts the same id and adds the new sessions as before', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    localStorage.setItem('mpfl.pseudoId', PSEUDONYM);
    const result = await importSessions(db, exportText([session({ date: NEW_DATE })]));
    expect(result).toEqual({ ok: true, imported: 1 });
    expect(await db.sessions.count()).toBe(2);
  });

  it('still refuses a duplicate session when the id is the same', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    const own = await exportJson(db);
    expect(JSON.parse(own).pseudonymId).toBe(getPseudonymId());
    expect(await importSessions(db, own)).toMatchObject({ ok: false, error: { code: 'duplicate' } });
    expect(await db.sessions.count()).toBe(1);
  });

  it('handles a file with no id as before: a schema error, and nothing is written', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    const before = await snapshot(db);
    const file = JSON.parse(exportText([session({ date: NEW_DATE })]));
    delete file.pseudonymId;
    const result = await importSessions(db, JSON.stringify(file));
    expect(result).toMatchObject({ ok: false, error: { code: 'schema' } });
    expect(await snapshot(db)).toEqual(before);
  });
});

describe('importSessions on a device with no sessions takes the id of the file (L1-02)', () => {
  it('keeps the id of file A, so a second import of A is a duplicate and not another person', async () => {
    const db = freshDb();
    const text = exportText([session({ date: NEW_DATE })]);
    expect(await importSessions(db, text)).toEqual({ ok: true, imported: 1 });
    expect(getPseudonymId()).toBe(PSEUDONYM);

    const again = await importSessions(db, text);
    expect(again).toMatchObject({ ok: false, error: { code: 'duplicate' } });
    if (!again.ok) expect(again.error.message).not.toMatch(OTHER_REFUSAL);
    expect(await db.sessions.count()).toBe(1);
  });

  it('carries the id of file A in a re-export', async () => {
    const db = freshDb();
    await importSessions(db, exportText([session({ date: NEW_DATE })]));
    expect(JSON.parse(await exportJson(db)).pseudonymId).toBe(PSEUDONYM);
  });

  it('takes the id of the file when the device exported first and has a stored id but no sessions', async () => {
    // The device id comes from an export of an empty record. The device holds no session, so the file wins.
    const db = freshDb();
    localStorage.setItem('mpfl.pseudoId', LOCAL_ID);
    expect(JSON.parse(await exportJson(db)).pseudonymId).toBe(LOCAL_ID);
    expect(await importSessions(db, exportText([session({ date: NEW_DATE })]))).toEqual({ ok: true, imported: 1 });
    expect(getPseudonymId()).toBe(PSEUDONYM);
  });

  it('refuses file B after file A, and writes nothing', async () => {
    const db = freshDb();
    await importSessions(db, exportText([session({ date: NEW_DATE })]));
    const before = await snapshot(db);
    const other = exportText([session({ date: '2026-11-06T10:00:00.000Z' })], { pseudonymId: LOCAL_ID });
    expect(await importSessions(db, other)).toMatchObject({ ok: false, error: { code: 'other-person' } });
    expect(await snapshot(db)).toEqual(before);
  });

  it('does not change the id when the import fails as a duplicate or with a bad file', async () => {
    const db = freshDb();
    localStorage.setItem('mpfl.pseudoId', LOCAL_ID);
    expect(await importSessions(db, '{"a":1}')).toMatchObject({ ok: false });
    expect(getPseudonymId()).toBe(LOCAL_ID);
  });
});

describe('DataScreen with a file of another person', () => {
  it('shows the refusal as plain text in an alert and keeps the file input usable', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    localStorage.setItem('mpfl.pseudoId', LOCAL_ID);
    render(<DataScreen db={db} onBack={() => {}} onErased={() => {}} />);
    await waitFor(() => expect(screen.queryByText('Counting sessions.')).toBeNull());

    const input = screen.getByLabelText(/import a session file/i) as HTMLInputElement;
    pick(input, exportText([session({ date: NEW_DATE })]));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(OTHER_REFUSAL);
    expect(alert).toHaveTextContent(/nothing was imported/i);
    expect(alert).toHaveTextContent(/erase this device first/i);
    expect([...alert.children].map((c) => c.tagName)).toEqual(['svg']); // only the icon, no markup from file data
    expect(await db.sessions.count()).toBe(1);

    expect(input).not.toBeDisabled();
    expect(input.value).toBe('');
    pick(input, exportText([session({ date: NEW_DATE })], { pseudonymId: LOCAL_ID }));
    expect(await screen.findByRole('status')).toHaveTextContent('Imported 1 session.');
    expect(await db.sessions.count()).toBe(2);
  });
});
