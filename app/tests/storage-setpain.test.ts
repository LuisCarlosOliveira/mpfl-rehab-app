// The pain answers between sets (adaptation design 5.2, `setPain`). Optional, strict, in JSON and CSV. Old files still read.
import { createDb, exportCsv, exportJson, importSessions, parseExport, saveSession, sessionSchema, type SessionInput } from '../src/lib/storage';

let n = 0;
const freshDb = () => createDb(`setpain-${Date.now()}-${n++}`);

const session = (over: Partial<SessionInput> = {}): SessionInput => ({
  date: '2026-11-01T10:00:00.000Z',
  exercise: 'heel-slide',
  side: 'left',
  reps: 20,
  peakFlexion: 72.4,
  holdSeconds: null,
  topFlexion: null,
  marginDeg: 9,
  marginSource: 'start value',
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

const fileText = (sessions: unknown[]) =>
  JSON.stringify({
    schemaVersion: 1, appVersion: '0.1.0', angleMethod: '2D webcam estimate, not a goniometer measurement',
    pseudonymId: '123e4567-e89b-42d3-a456-426614174000', protocolId: 'p-001',
    exportedAt: '2026-11-08T10:00:00.000Z', sessions,
  });

describe('setPain in the session schema', () => {
  const parse = (over: Record<string, unknown>) => sessionSchema.safeParse({ ...session(), schemaVersion: 1, ...over });

  it('accepts a session without it (old files)', () => {
    expect(parse({}).success).toBe(true);
  });

  it('accepts answers from 0 to 10 and null for no answer', () => {
    expect(parse({ setPain: [3, null, 10, 0] }).success).toBe(true);
  });

  it.each([[[11]], [[-1]], [[2.5]], [['3']], [new Array(21).fill(1)]])('refuses %j', (value) => {
    expect(parse({ setPain: value }).success).toBe(false);
  });

  it('refuses an unknown key next to it', () => {
    expect(parse({ setPain: [1], setPainNote: 'x' }).success).toBe(false);
  });
});

describe('setPain through save, export and import', () => {
  it('keeps it through JSON export and import', async () => {
    const a = freshDb();
    await saveSession(a, session({ setPain: [2, null, 7] }));
    const json = await exportJson(a);
    expect(parseExport(json).ok).toBe(true);
    localStorage.clear();
    const b = freshDb();
    expect((await importSessions(b, json)).ok).toBe(true);
    expect((await b.sessions.toArray())[0]!.setPain).toEqual([2, null, 7]);
  });

  it('adds no key to the export of an old session', async () => {
    const db = freshDb();
    await saveSession(db, session());
    expect(await exportJson(db)).not.toContain('setPain');
  });

  it('imports an old file that has no setPain', async () => {
    const db = freshDb();
    expect((await importSessions(db, fileText([{ ...session(), schemaVersion: 1 }]))).ok).toBe(true);
  });

  it('refuses an import with a bad setPain and writes nothing', async () => {
    const db = freshDb();
    const result = await importSessions(db, fileText([{ ...session(), schemaVersion: 1, setPain: [99] }]));
    expect(result.ok).toBe(false);
    expect(await db.sessions.count()).toBe(0);
  });
});

describe('CSV column set_pain', () => {
  const rows = async (over: Partial<SessionInput>) => {
    const db = freshDb();
    await saveSession(db, session(over));
    const lines = (await exportCsv(db)).trimEnd().split('\n');
    return { header: (lines[1] as string).split(','), row: lines[2] as string };
  };

  it('is the last column, so old positions stay', async () => {
    const { header } = await rows({});
    expect(header[header.length - 1]).toBe('set_pain');
    expect(header.indexOf('front_change_deg')).toBe(header.length - 2);
  });

  it('writes the answers joined by a space, and "no-answer" for a skipped set', async () => {
    const { row } = await rows({ setPain: [2, null, 7] });
    expect(row.endsWith(',"2 no-answer 7"')).toBe(true);
  });

  it('leaves the cell empty for an old session', async () => {
    const { row } = await rows({});
    expect(row.endsWith(',')).toBe(true);
    expect(row).not.toContain('undefined');
  });
});
