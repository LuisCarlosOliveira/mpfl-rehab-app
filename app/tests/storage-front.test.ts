import { MARGIN_SOURCE } from '../src/lib/margin';
// T12b: a second view and the front-view change are optional fields of the stored session (FR24).
// They are for the clinician only. They follow the pattern of the set and leg fields: optional, no index, no version change.
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
const freshDb = () => createDb(`front-${Date.now()}-${n++}`);

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

const FRONT = { secondView: 'front', frontReps: 4, frontChangeDeg: 6.4 } as const;

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

describe('second view fields in the session schema', () => {
  const ok = { ...session(), schemaVersion: 1 };

  it('accepts an old session that has none of the fields', () => {
    expect(sessionSchema.safeParse(ok).success).toBe(true);
  });

  it('accepts the three fields, and a front record with no change value', () => {
    expect(sessionSchema.safeParse({ ...ok, ...FRONT }).success).toBe(true);
    expect(sessionSchema.safeParse({ ...ok, secondView: 'front', frontReps: 0 }).success).toBe(true);
    expect(sessionSchema.safeParse({ ...ok, frontChangeDeg: -3 }).success).toBe(true);
  });

  it.each([
    ['a second view with the side tag', { secondView: 'side' }],
    ['a free text view', { secondView: 'phone' }],
    ['null', { frontReps: null }],
    ['a fraction of a rep', { frontReps: 1.5 }],
    ['a negative count', { frontReps: -1 }],
    ['too many reps', { frontReps: 1001 }],
    ['an angle above 90', { frontChangeDeg: 91 }],
    ['an angle below -90', { frontChangeDeg: -91 }],
    ['a text angle', { frontChangeDeg: '6' }],
    ['a verdict key', { frontVerdict: 'above' }],
    ['an unknown key for a frame', { frontFrames: [] }],
  ])('refuses %s', (_name, over) => {
    expect(sessionSchema.safeParse({ ...ok, ...over }).success).toBe(false);
  });
});

describe('save, export and import of the second view fields', () => {
  it('keeps the fields through save, export and import', async () => {
    const a = freshDb();
    await saveSession(a, session(FRONT));
    const b = freshDb();
    expect(await importSessions(b, await exportJson(a))).toEqual({ ok: true, imported: 1 });
    expect((await b.sessions.toArray())[0]).toMatchObject(FRONT);
  });

  it('adds no key to the export of an old session', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const keys = Object.keys(JSON.parse(await exportJson(db)).sessions[0]);
    for (const k of ['secondView', 'frontReps', 'frontChangeDeg']) expect(keys).not.toContain(k);
  });

  it('imports an old file that has none of the fields', () => {
    expect(parseExport(fileWith({})).ok).toBe(true);
  });

  it('refuses a wrong value and names the field', () => {
    const r = parseExport(fileWith({ frontChangeDeg: 'big' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('frontChangeDeg');
  });

  it('adds no index for the session fields', () => {
    const db = freshDb();
    expect(db.verno).toBe(3); // version 3 adds the generator answers table. These session fields still add no index.
    expect(db.sessions.schema.indexes.map((i) => i.name).sort()).toEqual(['date', 'exercise']);
  });
});

describe('CSV second view columns', () => {
  const rows = async (over: Partial<SessionInput>) => {
    const db = freshDb();
    await saveSession(db, session({ marginSource: MARGIN_SOURCE, ...over })); // no comma in the text, so a split is safe
    const lines = (await exportCsv(db)).trimEnd().split('\n');
    return { header: (lines[1] as string).split(','), row: splitCsv(lines[2] as string) };
  };

  it('has the columns second_view, front_reps and front_change_deg after the leg columns', async () => {
    const { header } = await rows({});
    expect(header.indexOf('second_view')).toBe(header.indexOf('camera_side') + 1);
    expect(header.indexOf('front_reps')).toBe(header.indexOf('second_view') + 1);
    expect(header.indexOf('front_change_deg')).toBe(header.indexOf('front_reps') + 1);
  });

  it('writes the tag as quoted text and the numbers plain', async () => {
    const { header, row } = await rows(FRONT);
    expect(row[header.indexOf('second_view')]).toBe('"front"');
    expect(row[header.indexOf('front_reps')]).toBe('4');
    expect(row[header.indexOf('front_change_deg')]).toBe('6.4');
  });

  it('leaves the three cells empty for an old session', async () => {
    const { header, row } = await rows({});
    for (const c of ['second_view', 'front_reps', 'front_change_deg']) expect(row[header.indexOf(c)]).toBe('');
    expect(row.join(',')).not.toContain('undefined');
  });

  it('writes a negative change as a plain number', async () => {
    const { header, row } = await rows({ secondView: 'front', frontReps: 1, frontChangeDeg: -2.5 });
    expect(row[header.indexOf('front_change_deg')]).toBe('-2.5');
  });

  it('has no verdict word in the new column names', async () => {
    const { header } = await rows({});
    expect(header.slice(-3).join(',')).not.toMatch(/valgus|verdict|good|bad|fail|pass/i);
  });
});
