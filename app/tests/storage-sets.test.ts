import {
  createDb,
  exportCsv,
  exportJson,
  importSessions,
  parseExport,
  saveSession,
  sessionSchema,
  type SessionInput,
} from '../src/lib/storage';

let n = 0;
const freshDb = () => createDb(`sets-${Date.now()}-${n++}`);

const session = (over: Partial<SessionInput> = {}): SessionInput => ({
  date: '2026-11-01T10:00:00.000Z',
  exercise: 'heel-slide',
  side: 'left',
  reps: 20,
  peakFlexion: 72.4,
  holdSeconds: null,
  topFlexion: null,
  marginDeg: 9,
  marginSource: 'start value, UNVERIFIED for the lite model',
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

const withSets = (over: Partial<SessionInput> = {}) => session({ setsPrescribed: 3, repsPrescribed: 10, repsPerSet: [10, 10, 4], ...over });

beforeEach(() => {
  localStorage.clear();
});

const parsedSession = (over: Record<string, unknown>) => {
  const file = {
    schemaVersion: 1, appVersion: '0.1.0', angleMethod: '2D webcam estimate, not a goniometer measurement',
    pseudonymId: '123e4567-e89b-42d3-a456-426614174000', protocolId: 'p-001',
    exportedAt: '2026-11-08T10:00:00.000Z', sessions: [{ ...session(), schemaVersion: 1, ...over }],
  };
  return parseExport(JSON.stringify(file));
};

describe('set fields in the session schema', () => {
  const ok = { ...session(), schemaVersion: 1 };

  it('accepts a session without the set fields (old files)', () => {
    expect(sessionSchema.safeParse(ok).success).toBe(true);
  });

  it('accepts a session with valid set fields', () => {
    expect(sessionSchema.safeParse({ ...ok, setsPrescribed: 3, repsPrescribed: 10, repsPerSet: [10, 10, 4] }).success).toBe(true);
  });

  it.each([
    ['sets of 0', { setsPrescribed: 0 }],
    ['sets of 21', { setsPrescribed: 21 }],
    ['sets with a decimal', { setsPrescribed: 2.5 }],
    ['sets as text', { setsPrescribed: '3' }],
    ['reps of 0', { repsPrescribed: 0 }],
    ['reps of 101', { repsPrescribed: 101 }],
    ['reps as text', { repsPrescribed: '10' }],
    ['repsPerSet as a number', { repsPerSet: 10 }],
    ['repsPerSet with text', { repsPerSet: [10, 'x'] }],
    ['repsPerSet with a negative', { repsPerSet: [-1] }],
    ['repsPerSet with a decimal', { repsPerSet: [1.5] }],
    ['repsPerSet over 1000', { repsPerSet: [1001] }],
    ['21 entries', { repsPerSet: Array.from({ length: 21 }, () => 1) }],
    ['null', { repsPerSet: null }],
    ['an entry above the prescribed reps', { repsPrescribed: 10, repsPerSet: [11] }],
    ['more entries than the prescribed sets', { setsPrescribed: 2, repsPerSet: [1, 1, 1] }],
    ['an unknown set key', { setsDone: 2 }],
  ])('refuses %s', (_name, over) => {
    expect(sessionSchema.safeParse({ ...ok, ...over }).success).toBe(false);
  });

  it('accepts 20 entries and an entry of 1000 when no reps are prescribed', () => {
    expect(sessionSchema.safeParse({ ...ok, repsPerSet: Array.from({ length: 20 }, () => 0) }).success).toBe(true);
    expect(sessionSchema.safeParse({ ...ok, repsPerSet: [1000] }).success).toBe(true);
  });
});

describe('save, export and import', () => {
  it('keeps the set fields through save, export and import', async () => {
    const a = freshDb();
    await saveSession(a, withSets());
    const b = freshDb();
    expect(await importSessions(b, await exportJson(a))).toEqual({ ok: true, imported: 1 });
    const [row] = await b.sessions.toArray();
    expect(row).toMatchObject({ setsPrescribed: 3, repsPrescribed: 10, repsPerSet: [10, 10, 4] });
  });

  it('does not add set keys to the export of an old session', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const file = JSON.parse(await exportJson(db));
    expect(Object.keys(file.sessions[0])).not.toContain('repsPerSet');
    expect(Object.keys(file.sessions[0])).not.toContain('setsPrescribed');
  });

  it('imports an old file that has no set fields', async () => {
    const db = freshDb();
    const result = parsedSession({});
    expect(result.ok).toBe(true);
    const a = freshDb();
    await saveSession(a, session());
    expect(await importSessions(db, await exportJson(a))).toEqual({ ok: true, imported: 1 });
  });

  it.each([
    ['repsPerSet', 'ten'],
    ['repsPerSet', [10, 'x']],
    ['setsPrescribed', '3'],
    ['repsPrescribed', 1.5],
  ])('refuses a file with a wrong type in %s and names the field', (key, value) => {
    const result = parsedSession({ [key as string]: value });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('schema');
      expect(result.error.message).toContain(key as string);
    }
  });

  it('writes nothing to the database for a refused file', async () => {
    const db = freshDb();
    const a = freshDb();
    await saveSession(a, withSets());
    const file = JSON.parse(await exportJson(a));
    file.sessions[0].repsPerSet = 'x';
    const result = await importSessions(db, JSON.stringify(file));
    expect(result.ok).toBe(false);
    expect(await db.sessions.count()).toBe(0);
  });
});

describe('CSV set columns', () => {
  const rows = async (over: Partial<SessionInput>) => {
    const db = freshDb();
    await saveSession(db, session(over));
    const lines = (await exportCsv(db)).trimEnd().split('\n');
    return { header: (lines[1] as string).split(','), row: lines[2] as string };
  };

  it('has the three columns', async () => {
    const { header } = await rows({});
    for (const col of ['sets_prescribed', 'reps_prescribed', 'reps_per_set']) expect(header).toContain(col);
  });

  it('writes the counts, with the per-set counts joined by a space in one quoted cell', async () => {
    const { row } = await rows({ setsPrescribed: 3, repsPrescribed: 10, repsPerSet: [10, 10, 4] });
    expect(row).toMatch(/,3,10,"10 10 4"/);
  });

  it('leaves the cells empty for an old session', async () => {
    const { row } = await rows({});
    expect(row).toMatch(/,,,$/);
    expect(row).not.toContain('undefined');
  });

  it('keeps the columns after the existing ones, so old column positions stay', async () => {
    const { header } = await rows({});
    expect(header.slice(0, 22).join(',')).toContain('pain,swelling');
    expect(header.indexOf('swelling')).toBe(21);
    expect(header.indexOf('sets_prescribed')).toBe(22);
  });

  it('never starts the cell with a formula sign', async () => {
    const { row } = await rows({ repsPerSet: [0, 5] });
    expect(row).toMatch(/"0 5"/);
  });
});
