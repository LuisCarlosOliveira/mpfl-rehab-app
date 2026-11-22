// F4a: `repsBy` (M3) and the short fixed list for `marginSource` (A1-3). Same pattern as the leg and baseline fields.
import { MARGIN_SOURCE } from '../src/lib/margin';
import { createDb, exportCsv, exportJson, importSessions, parseExport, readValidRows, saveSession, sessionSchema, type SessionInput } from '../src/lib/storage';

let n = 0;
const freshDb = () => createDb(`f4a-${Date.now()}-${n++}`);
const session = (over: Partial<SessionInput> = {}): SessionInput => ({
  date: '2026-11-01T10:00:00.000Z',
  exercise: 'straight-leg-raise',
  side: 'left',
  reps: 10,
  peakFlexion: null,
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

describe('repsBy in the session schema', () => {
  const ok = { ...session(), schemaVersion: 1 };
  it('accepts an old session without it, and camera and hand', () => {
    expect(sessionSchema.safeParse(ok).success).toBe(true);
    expect(sessionSchema.safeParse({ ...ok, repsBy: 'camera' }).success).toBe(true);
    expect(sessionSchema.safeParse({ ...ok, repsBy: 'hand' }).success).toBe(true);
  });
  it.each([['free text', 'by foot'], ['a number', 1], ['null', null]])('refuses %s', (_n, v) => {
    expect(sessionSchema.safeParse({ ...ok, repsBy: v }).success).toBe(false);
  });
  it('keeps the field through save, export and import', async () => {
    const a = freshDb();
    await saveSession(a, session({ repsBy: 'hand' }));
    const b = freshDb();
    expect(await importSessions(b, await exportJson(a))).toEqual({ ok: true, imported: 1 });
    expect((await b.sessions.toArray())[0]).toMatchObject({ repsBy: 'hand' });
  });
  it('adds no key to the export of an old session, and imports an old file', async () => {
    const db = freshDb();
    await saveSession(db, session());
    expect(Object.keys(JSON.parse(await exportJson(db)).sessions[0])).not.toContain('repsBy');
    expect(parseExport(fileWith({})).ok).toBe(true);
  });
  it('refuses a wrong value and names the field', () => {
    const r = parseExport(fileWith({ repsBy: 'guess' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('repsBy');
  });
  it('adds no index', () => {
    expect(freshDb().sessions.schema.indexes.map((i) => i.name).sort()).toEqual(['date', 'exercise']);
  });
  it('writes a quoted reps_by column before the four columns of step E and leaves it empty for an old session', async () => {
    const db = freshDb();
    await saveSession(db, session({ repsBy: 'hand' }));
    await saveSession(db, session({ date: '2026-11-02T10:00:00.000Z' }));
    const lines = (await exportCsv(db)).trimEnd().split('\n');
    const header = (lines[1] as string).split(',');
    expect(header.at(-5)).toBe('reps_by');
    const cell = (row: string) => row.split(',').at(-5);
    expect(cell(lines[2] as string)).toBe('"hand"');
    expect(cell(lines[3] as string)).toBe('');
  });
});

describe('marginSource is a short fixed list (A1-3)', () => {
  const ok = { ...session(), schemaVersion: 1 };
  it('accepts the value that this version writes', () => {
    expect(sessionSchema.safeParse(ok).success).toBe(true);
  });
  it.each([
    'start value, UNVERIFIED for the lite model (Okuno 2026, heavy model, still photos)',
    'start value, UNVERIFIED for the lite model (Okuno 2026, highest-complexity model, tablet, healthy adults)',
  ])('maps the sentence of an older version to its id: %s', (v) => {
    const r = sessionSchema.safeParse({ ...ok, marginSource: v });
    expect(r.success && r.data.marginSource).toBe(v.includes('heavy model') ? 'lite-start-v0' : 'lite-start-v1');
  });
  it('keeps a new id as it is and reads an old-sentence row and a new-id row from the db', () => {
    const oldRow = { ...ok, id: 1, marginSource: 'start value, UNVERIFIED for the lite model (Okuno 2026, highest-complexity model, tablet, healthy adults)' };
    const { rows, skipped } = readValidRows([oldRow, { ...ok, id: 2, marginSource: 'lite-start-v1' }]);
    expect(skipped).toBe(0);
    expect(rows.map((r) => r.marginSource)).toEqual(['lite-start-v1', 'lite-start-v1']);
  });
  it.each([['free text', 'my knee felt fine today'], ['empty', ''], ['a changed old value', `${MARGIN_SOURCE} plus a note`]])('refuses %s and names the field', (_n, v) => {
    const r = parseExport(fileWith({ marginSource: v }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('schema');
      expect(r.error.message).toContain('marginSource');
    }
  });
});
