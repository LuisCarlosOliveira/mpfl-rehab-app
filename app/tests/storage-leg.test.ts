// T17: the leg that was tracked and the camera side are optional fields of the stored session.
// They follow the pattern of the set fields: optional, no index, no schema version change.
import { createDb, exportCsv, exportJson, importSessions, parseExport, saveSession, sessionSchema, type SessionInput } from '../src/lib/storage';

let n = 0;
const freshDb = () => createDb(`leg-${Date.now()}-${n++}`);

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

beforeEach(() => localStorage.clear());

const fileWith = (over: Record<string, unknown>) =>
  JSON.stringify({
    schemaVersion: 1,
    appVersion: '0.1.0',
    angleMethod: '2D webcam estimate, not a goniometer measurement',
    pseudonymId: '123e4567-e89b-42d3-a456-426614174000',
    protocolId: 'p-001',
    exportedAt: '2026-11-08T10:00:00.000Z',
    sessions: [{ ...session(), schemaVersion: 1, ...over }],
  });

describe('leg fields in the session schema', () => {
  const ok = { ...session(), schemaVersion: 1 };

  it('accepts an old session that has neither field', () => {
    expect(sessionSchema.safeParse(ok).success).toBe(true);
  });

  it('accepts left and right for both fields', () => {
    expect(sessionSchema.safeParse({ ...ok, legTracked: 'right', cameraSide: 'left' }).success).toBe(true);
    expect(sessionSchema.safeParse({ ...ok, legTracked: 'left', cameraSide: 'right' }).success).toBe(true);
  });

  it.each([
    ['a free text leg', { legTracked: 'my operated leg' }],
    ['a number', { legTracked: 1 }],
    ['null', { cameraSide: null }],
    ['both as a word', { cameraSide: 'both' }],
    ['an unknown key', { legRole: 'near' }],
  ])('refuses %s', (_name, over) => {
    expect(sessionSchema.safeParse({ ...ok, ...over }).success).toBe(false);
  });
});

describe('save, export and import of the leg fields', () => {
  it('keeps both fields through save, export and import', async () => {
    const a = freshDb();
    await saveSession(a, session({ legTracked: 'right', cameraSide: 'left' }));
    const b = freshDb();
    expect(await importSessions(b, await exportJson(a))).toEqual({ ok: true, imported: 1 });
    expect((await b.sessions.toArray())[0]).toMatchObject({ legTracked: 'right', cameraSide: 'left' });
  });

  it('adds no key to the export of an old session', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const keys = Object.keys(JSON.parse(await exportJson(db)).sessions[0]);
    expect(keys).not.toContain('legTracked');
    expect(keys).not.toContain('cameraSide');
  });

  it('imports an old file that has no leg fields', () => {
    expect(parseExport(fileWith({})).ok).toBe(true);
  });

  it('refuses a wrong value and names the field', () => {
    const r = parseExport(fileWith({ legTracked: 'up' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('legTracked');
  });

  it('does not add an index and does not raise the database version', () => {
    const db = freshDb();
    expect(db.verno).toBe(2);
    expect(db.sessions.schema.indexes.map((i) => i.name).sort()).toEqual(['date', 'exercise']);
  });
});

describe('CSV leg columns', () => {
  const rows = async (over: Partial<SessionInput>) => {
    const db = freshDb();
    await saveSession(db, session(over));
    const lines = (await exportCsv(db)).trimEnd().split('\n');
    return { header: (lines[1] as string).split(','), row: lines[2] as string };
  };

  it('has the columns leg_tracked and camera_side after the set columns', async () => {
    const { header } = await rows({});
    expect(header.indexOf('leg_tracked')).toBe(header.indexOf('reps_per_set') + 1);
    expect(header.indexOf('camera_side')).toBe(header.indexOf('leg_tracked') + 1);
  });

  it('writes the two sides as quoted text at the end of the row', async () => {
    const { row } = await rows({ legTracked: 'right', cameraSide: 'left' });
    expect(row).toMatch(/,"right","left",,,$/); // the three second view cells follow, empty here
  });

  it('leaves both cells empty for an old session', async () => {
    const { row } = await rows({});
    expect(row).toMatch(/,,,,,$/); // the two leg cells and the three second view cells
    expect(row).not.toContain('undefined');
  });

  it('writes no claim of a diagnosis in the header', async () => {
    const { header } = await rows({});
    expect(header.join(',')).not.toMatch(/diagnos|operated|injur/i);
  });
});
