import { MARGIN_SOURCE } from '../src/lib/margin';
import {
  ANGLE_METHOD,
  createDb,
  eraseAll,
  exportCsv,
  exportJson,
  exportReminderDue,
  getPseudonymId,
  importSessions,
  markExported,
  parseExport,
  saveSession,
  getLastExport,
  type SessionInput,
} from '../src/lib/storage';

let n = 0;
const freshDb = () => createDb(`test-${Date.now()}-${n++}`);

const session = (over: Partial<SessionInput> = {}): SessionInput => ({
  date: '2026-11-01T10:00:00.000Z',
  exercise: 'heel-slide',
  side: 'left',
  reps: 10,
  peakFlexion: 72.4,
  holdSeconds: null,
  topFlexion: null,
  marginDeg: 9,
  marginSource: MARGIN_SOURCE,
  view: 'side',
  nearLimit: 0,
  overLimit: 0,
  tooFast: 0,
  gaveWayPresses: 0,
  redFlagBlocks: 0,
  pain: 3,
  swelling: 'none',
  protocolId: 'p-001',
  phase: 1,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
});

describe('save and read', () => {
  it('stores a session and adds schemaVersion', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const all = await db.sessions.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ exercise: 'heel-slide', schemaVersion: 1 });
  });

  it('asks for persistent storage at the first save only', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'storage', { value: { persist }, configurable: true });
    const db = freshDb();
    await saveSession(db, session());
    await saveSession(db, session({ date: '2026-11-02T10:00:00.000Z' }));
    expect(persist).toHaveBeenCalledTimes(1);
  });
});

describe('pseudonymous id', () => {
  it('is a random UUID, is stable, and holds no personal data', () => {
    const a = getPseudonymId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(getPseudonymId()).toBe(a);
  });
});

describe('JSON export and import', () => {
  it('carries version fields, the angle method and the protocol id', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const file = JSON.parse(await exportJson(db));
    expect(file).toMatchObject({
      schemaVersion: 1,
      angleMethod: ANGLE_METHOD,
      protocolId: 'p-001',
    });
    expect(typeof file.appVersion).toBe('string');
    expect(file.pseudonymId).toBe(getPseudonymId());
  });

  it('exports only fixed fields and no free text', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const file = JSON.parse(await exportJson(db));
    expect(Object.keys(file.sessions[0]).sort()).toEqual(
      ['date', 'exercise', 'gaveWayPresses', 'holdSeconds', 'marginDeg', 'marginSource', 'nearLimit', 'overLimit', 'pain', 'peakFlexion', 'phase', 'protocolId', 'redFlagBlocks', 'reps', 'schemaVersion', 'side', 'swelling', 'tooFast', 'topFlexion', 'view'],
    );
  });

  it('round-trips: export then import into an empty database gives the same sessions', async () => {
    const a = freshDb();
    await saveSession(a, session());
    await saveSession(a, session({ date: '2026-11-02T10:00:00.000Z', exercise: 'mini-squat', peakFlexion: 41 }));
    await saveSession(a, session({ date: '2026-11-03T10:00:00.000Z', exercise: 'seated-extension-hold', reps: null, holdSeconds: 5 }));
    const text = await exportJson(a);

    const b = freshDb();
    const result = await importSessions(b, text);
    expect(result).toEqual({ ok: true, imported: 3 });
    const strip = (rows: Array<Record<string, unknown>>) => rows.map(({ id: _id, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
    expect(strip(await b.sessions.toArray())).toEqual(strip(await a.sessions.toArray()));
  });

  it('rejects an unknown schema version', async () => {
    const file = JSON.parse(await exportJson(freshDb()));
    file.schemaVersion = 2;
    expect(parseExport(JSON.stringify(file))).toMatchObject({ ok: false, error: { code: 'unknown-version' } });
  });

  it('rejects a duplicate import with a clear message and imports nothing', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const text = await exportJson(db);
    const result = await importSessions(db, text);
    expect(result).toMatchObject({ ok: false, error: { code: 'duplicate' } });
    if (!result.ok) expect(result.error.message).toMatch(/already/i);
    expect(await db.sessions.count()).toBe(1);
  });

  it('rejects corrupt JSON, an unknown key, a __proto__ key and an oversize file', async () => {
    expect(parseExport('{oops')).toMatchObject({ ok: false, error: { code: 'invalid-json' } });
    const file = JSON.parse(await exportJson(freshDb()));
    expect(parseExport(JSON.stringify({ ...file, extra: 1 })).ok).toBe(false);
    expect(parseExport(JSON.stringify(file).replace('{', '{"__proto__":{"x":1},')).ok).toBe(false);
    expect(parseExport('x'.repeat(5 * 1024 * 1024 + 1))).toMatchObject({ ok: false, error: { code: 'too-large' } });
  });

  it('parseExport reads a file into memory and never writes to the database', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const before = await db.sessions.count();
    const parsed = parseExport(await exportJson(db));
    expect(parsed.ok).toBe(true);
    expect(await db.sessions.count()).toBe(before);
  });
});

describe('CSV export', () => {
  const csvFor = async (over: Partial<SessionInput>) => {
    const db = freshDb();
    await saveSession(db, session(over));
    return exportCsv(db);
  };

  it('puts the angle method in the first row', async () => {
    const first = (await csvFor({})).split('\n')[0];
    expect(first).toBe(`"${ANGLE_METHOD}"`);
  });

  it('has a header with version, protocol and pseudonym columns', async () => {
    const header = (await csvFor({})).split('\n')[1] as string;
    for (const col of ['pseudonymId', 'schemaVersion', 'appVersion', 'protocolId', 'date', 'exercise', 'pain', 'swelling']) {
      expect(header).toContain(col);
    }
  });

  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx'])('puts a leading quote in a text cell that starts with %j', async (evil) => {
    const csv = await csvFor({ protocolId: evil });
    const row = csv.split('\n').slice(2).join('\n');
    expect(row).toContain(`"'${evil}"`);
  });

  it('quotes every text cell, keeps commas inside quotes and doubles quotes', async () => {
    const csv = await csvFor({ protocolId: 'a,"b"' });
    expect(csv).toContain('"a,""b"""');
  });

  it('writes numbers as numbers and null as an empty cell', async () => {
    const csv = await csvFor({ reps: 10, peakFlexion: 72.4, holdSeconds: null });
    const row = csv.trimEnd().split('\n').pop() as string;
    expect(row).toContain(',10,72.4,,');
  });
});

describe('export reminder (FR17)', () => {
  const now = new Date('2026-11-10T12:00:00.000Z');

  it('is not due when there are no sessions', () => {
    expect(exportReminderDue(null, now, false)).toBe(false);
  });

  it('is due when there are sessions and no export yet', () => {
    expect(exportReminderDue(null, now, true)).toBe(true);
  });

  it('is due after 7 days and not before', () => {
    expect(exportReminderDue('2026-11-03T12:00:00.000Z', now, true)).toBe(true);
    expect(exportReminderDue('2026-11-04T12:00:00.000Z', now, true)).toBe(false);
  });

  it('records the last export date', () => {
    expect(getLastExport()).toBeNull();
    markExported(now);
    expect(getLastExport()).toBe('2026-11-10T12:00:00.000Z');
  });
});

describe('erase (FR16)', () => {
  it('clears IndexedDB, the mpfl. keys of localStorage, Cache storage and service workers', async () => {
    const db = freshDb();
    await saveSession(db, session());
    localStorage.setItem('other', 'x');
    getPseudonymId();

    const deleted: string[] = [];
    const unregistered: string[] = [];
    Object.defineProperty(globalThis, 'caches', {
      value: { keys: async () => ['c1', 'c2'], delete: async (k: string) => { deleted.push(k); return true; } },
      configurable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistrations: async () => [{ unregister: async () => { unregistered.push('sw'); return true; } }] },
      configurable: true,
    });

    await eraseAll(db);

    expect(await db.sessions.count()).toBe(0);
    expect(localStorage.getItem('mpfl.pseudoId')).toBeNull();
    expect(localStorage.getItem('other')).toBe('x'); // a key of another app stays (S-09)
    expect(deleted).toEqual(['c1', 'c2']);
    expect(unregistered).toEqual(['sw']);
  });

  it('gives a new pseudonymous id after erase', async () => {
    const db = freshDb();
    const before = getPseudonymId();
    await eraseAll(db);
    expect(getPseudonymId()).not.toBe(before);
  });
});
