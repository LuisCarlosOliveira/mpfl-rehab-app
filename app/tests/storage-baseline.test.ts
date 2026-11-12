import { MARGIN_SOURCE } from '../src/lib/margin';
// F1: `baselineSource` is an optional field of the stored session ('still' or 'lowest'). Same pattern as the leg fields.
import { createDb, exportCsv, exportJson, importSessions, parseExport, saveSession, sessionSchema, type SessionInput } from '../src/lib/storage';

// Split one CSV line. A quoted cell can hold a comma (the margin source does).
const splitCsv = (line: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    if (ch === ',' && !quoted) { out.push(cur); cur = ''; } else cur += ch;
  }
  return [...out, cur];
};

let n = 0;
const freshDb = () => createDb(`baseline-${Date.now()}-${n++}`);
const session = (over: Partial<SessionInput> = {}): SessionInput => ({
  date: '2026-11-01T10:00:00.000Z',
  exercise: 'heel-slide',
  side: 'left',
  reps: 20,
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

describe('baselineSource in the session schema', () => {
  const ok = { ...session(), schemaVersion: 1 };
  it('accepts an old session without it, and still and lowest', () => {
    expect(sessionSchema.safeParse(ok).success).toBe(true);
    expect(sessionSchema.safeParse({ ...ok, baselineSource: 'still' }).success).toBe(true);
    expect(sessionSchema.safeParse({ ...ok, baselineSource: 'lowest' }).success).toBe(true);
  });
  it.each([['free text', 'by hand'], ['a number', 3], ['null', null]])('refuses %s', (_n, v) => {
    expect(sessionSchema.safeParse({ ...ok, baselineSource: v }).success).toBe(false);
  });
});

describe('save, export, import and CSV of baselineSource', () => {
  it('keeps the field through save, export and import', async () => {
    const a = freshDb();
    await saveSession(a, session({ baselineSource: 'lowest' }));
    const b = freshDb();
    expect(await importSessions(b, await exportJson(a))).toEqual({ ok: true, imported: 1 });
    expect((await b.sessions.toArray())[0]).toMatchObject({ baselineSource: 'lowest' });
  });
  it('adds no key to the export of an old session, and imports an old file', async () => {
    const db = freshDb();
    await saveSession(db, session());
    expect(Object.keys(JSON.parse(await exportJson(db)).sessions[0])).not.toContain('baselineSource');
    expect(parseExport(fileWith({})).ok).toBe(true);
  });
  it('refuses a wrong value and names the field', () => {
    const r = parseExport(fileWith({ baselineSource: 'guess' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('baselineSource');
  });
  it('adds no index', () => {
    expect(freshDb().sessions.schema.indexes.map((i) => i.name).sort()).toEqual(['date', 'exercise']);
  });
  it('writes a quoted baseline_source column and leaves it empty for an old session', async () => {
    const db = freshDb();
    await saveSession(db, session({ baselineSource: 'still' }));
    await saveSession(db, session({ date: '2026-11-02T10:00:00.000Z' }));
    const lines = (await exportCsv(db)).trimEnd().split('\n');
    const header = (lines[1] as string).split(',');
    const at = header.indexOf('baseline_source');
    expect(at).toBe(header.length - 6); // reps_by and the four columns of step E follow it, so older readers of the columns keep their places
    const cell = (row: string) => splitCsv(row)[at];
    expect(cell(lines[2] as string)).toBe('"still"');
    expect(cell(lines[3] as string)).toBe('');
  });
});
