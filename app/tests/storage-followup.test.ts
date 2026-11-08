// The word lag as a name part: lag, extensionLag, topLag. It does not match Flag in redFlagBlocks.
const LAG_WORD = /\b[Ll]ag\b|[a-z]Lag(?![a-z])/;

// T6b: storage follow-up. A stored protocol (FR26), the privacy flag (FR18), and the new
// session fields: topFlexion, margin, view and the fixed event counters.
import example from '../src/lib/protocol/example-protocol.json';
import {
  clearProtocol,
  createDb,
  eraseAll,
  exportCsv,
  exportJson,
  hasSeenPrivacyNotice,
  importSessions,
  loadStoredProtocol,
  markPrivacyNoticeSeen,
  parseExport,
  saveProtocol,
  saveSession,
  type SessionInput,
} from '../src/lib/storage';

let n = 0;
const freshDb = () => createDb(`followup-${Date.now()}-${n++}`);

const approved = {
  schemaVersion: 1,
  id: 'p-010',
  side: 'left',
  authoredBy: 'Clinic A',
  approvedOn: '2026-11-01',
  activePhase: 1,
  phases: [
    { id: 1, name: 'Protection', exercises: [{ kind: 'heel-slide', sets: 3, reps: 10, targetFlexion: 60, maxFlexion: 90, source: 'PROPOSAL' }] },
  ],
  surgeon: {},
};
const raw = (o: unknown) => JSON.stringify(o);

const session = (over: Partial<SessionInput> = {}): SessionInput => ({
  date: '2026-11-01T10:00:00.000Z',
  exercise: 'straight-leg-raise',
  side: 'left',
  reps: null,
  peakFlexion: 30,
  holdSeconds: null,
  topFlexion: 14.5,
  marginDeg: 9,
  marginSource: 'start value, UNVERIFIED for the lite model',
  view: 'side',
  nearLimit: 2,
  overLimit: 1,
  tooFast: 3,
  gaveWayPresses: 1,
  redFlagBlocks: 0,
  pain: 4,
  swelling: 'some',
  protocolId: 'p-010',
  phase: 1,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
});

describe('stored protocol (FR26)', () => {
  it('stores a valid protocol and loads it again without the file', async () => {
    const db = freshDb();
    const saved = await saveProtocol(db, raw(approved), 'patient');
    expect(saved.ok).toBe(true);
    const again = await loadStoredProtocol(db, 'patient');
    expect(again).toMatchObject({ ok: true, protocol: { id: 'p-010' } });
  });

  it('stores nothing and returns the named error for an invalid file', async () => {
    const db = freshDb();
    const r = await saveProtocol(db, '{oops', 'patient');
    expect(r).toMatchObject({ ok: false, error: { code: 'invalid-json' } });
    expect(await loadStoredProtocol(db, 'patient')).toBeNull();
  });

  it('refuses and does not store the example in patient mode', async () => {
    const db = freshDb();
    const r = await saveProtocol(db, raw(example), 'patient');
    expect(r).toMatchObject({ ok: false, error: { code: 'example-in-patient-mode' } });
    expect(await loadStoredProtocol(db, 'patient')).toBeNull();
  });

  it('stores the example in demo mode', async () => {
    const db = freshDb();
    expect((await saveProtocol(db, raw(example), 'demo')).ok).toBe(true);
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadStoredProtocol(freshDb(), 'patient')).toBeNull();
  });

  it('checks the stored text again and returns an error if it was changed', async () => {
    const db = freshDb();
    await saveProtocol(db, raw(approved), 'patient');
    await db.protocol.put({ key: 'current', raw: '{"schemaVersion": 2}', savedAt: 'x' });
    expect(await loadStoredProtocol(db, 'patient')).toMatchObject({ ok: false });
  });

  it('keeps only one protocol: a new one replaces the old one', async () => {
    const db = freshDb();
    await saveProtocol(db, raw(approved), 'patient');
    await saveProtocol(db, raw({ ...approved, id: 'p-011' }), 'patient');
    expect(await db.protocol.count()).toBe(1);
    expect(await loadStoredProtocol(db, 'patient')).toMatchObject({ ok: true, protocol: { id: 'p-011' } });
  });

  it('clears the protocol on request', async () => {
    const db = freshDb();
    await saveProtocol(db, raw(approved), 'patient');
    await clearProtocol(db);
    expect(await loadStoredProtocol(db, 'patient')).toBeNull();
  });

  it('is gone after erase', async () => {
    const db = freshDb();
    await saveProtocol(db, raw(approved), 'patient');
    await eraseAll(db);
    expect(await loadStoredProtocol(db, 'patient')).toBeNull();
  });
});

describe('privacy notice flag (FR18)', () => {
  it('is false at first, true after it is marked, and the flag is cleared by erase', async () => {
    const db = freshDb();
    expect(hasSeenPrivacyNotice()).toBe(false);
    markPrivacyNoticeSeen();
    expect(hasSeenPrivacyNotice()).toBe(true);
    await eraseAll(db);
    expect(hasSeenPrivacyNotice()).toBe(false);
  });
});

describe('new session fields', () => {
  it('keeps them through save, export and import', async () => {
    const a = freshDb();
    await saveSession(a, session());
    const b = freshDb();
    expect(await importSessions(b, await exportJson(a))).toEqual({ ok: true, imported: 1 });
    const [row] = await b.sessions.toArray();
    expect(row).toMatchObject({
      topFlexion: 14.5,
      marginDeg: 9,
      view: 'side',
      nearLimit: 2,
      overLimit: 1,
      tooFast: 3,
      gaveWayPresses: 1,
      redFlagBlocks: 0,
    });
    expect(row?.marginSource).toMatch(/UNVERIFIED/);
  });

  it('puts them in the CSV, with no column or key that uses the word lag', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const csv = await exportCsv(db);
    const header = csv.split('\n')[1] as string;
    for (const col of ['topFlexion', 'marginDeg', 'marginSource', 'view', 'nearLimit', 'overLimit', 'tooFast', 'gaveWayPresses', 'redFlagBlocks']) {
      expect(header).toContain(col);
    }
    expect(header).not.toMatch(LAG_WORD);
    const file = JSON.parse(await exportJson(db));
    expect(Object.keys(file.sessions[0]).join(' ')).not.toMatch(LAG_WORD);
  });

  it('rejects an unknown field in a session of an import file', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const file = JSON.parse(await exportJson(db));
    file.sessions[0].note = 'free text';
    expect(parseExport(JSON.stringify(file)).ok).toBe(false);
  });

  it('rejects the old field name extensionLag', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const file = JSON.parse(await exportJson(db));
    file.sessions[0].extensionLag = 5;
    expect(parseExport(JSON.stringify(file)).ok).toBe(false);
  });

  it('rejects a view that is not side or front', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const file = JSON.parse(await exportJson(db));
    file.sessions[0].view = 'top';
    expect(parseExport(JSON.stringify(file)).ok).toBe(false);
  });

  it.each([-1, 1.5, 100001])('rejects an event counter of %s', async (bad) => {
    const db = freshDb();
    await saveSession(db, session());
    const file = JSON.parse(await exportJson(db));
    file.sessions[0].tooFast = bad;
    expect(parseExport(JSON.stringify(file)).ok).toBe(false);
  });

  it('accepts a front view session', async () => {
    const db = freshDb();
    await saveSession(db, session({ view: 'front' }));
    expect(parseExport(await exportJson(db)).ok).toBe(true);
  });
});
