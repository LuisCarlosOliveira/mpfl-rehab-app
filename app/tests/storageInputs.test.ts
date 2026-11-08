// The answers of the person for the plan generator (I1 to I9). They stay on the device, in the same database.
// They are optional, strict, in the export and gone after erase. An old export file still imports.
import {
  createDb,
  eraseAll,
  exportCsv,
  exportJson,
  importSessions,
  loadGeneratorInputs,
  parseExport,
  saveGeneratorInputs,
  saveSession,
  storedInputsSchema,
  type SessionInput,
  type StoredInputs,
} from '../src/lib/storage';

let n = 0;
const freshDb = () => createDb(`inputs-${Date.now()}-${n++}`);

const inputs: StoredInputs = {
  writtenPlan: 'no',
  procedure: 'mpflr-only',
  ageBand: '18-plus',
  bothKnees: false,
  firstSurgery: 'yes',
  specialRules: 'no',
  surgeryDate: '2026-10-01',
  side: 'left',
  surgeonLimit: { kind: 'degrees', degrees: 60 },
};

const session = (over: Partial<SessionInput> = {}): SessionInput => ({
  date: '2026-11-01T10:00:00.000Z',
  exercise: 'heel-slide',
  side: 'left',
  reps: 10,
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

describe('stored generator answers', () => {
  it('has no answers on a new device', async () => {
    expect(await loadGeneratorInputs(freshDb())).toBeNull();
  });

  it('keeps the answers and reads them back unchanged', async () => {
    const db = freshDb();
    await saveGeneratorInputs(db, inputs);
    expect(await loadGeneratorInputs(db)).toEqual(inputs);
  });

  it('replaces the answers of an earlier plan', async () => {
    const db = freshDb();
    await saveGeneratorInputs(db, inputs);
    await saveGeneratorInputs(db, { ...inputs, surgeonLimit: { kind: 'degrees', degrees: 50 } });
    expect(await db.generatorInputs.count()).toBe(1);
    expect((await loadGeneratorInputs(db))?.surgeonLimit).toEqual({ kind: 'degrees', degrees: 50 });
  });

  it('does not store the red flags, the pain or the swelling', async () => {
    const db = freshDb();
    await saveGeneratorInputs(db, { ...inputs, redFlags: { calf: true }, pain: 9, swelling: 'more' } as unknown as StoredInputs);
    const row = (await db.generatorInputs.get('current')) as unknown as { inputs: Record<string, unknown> };
    expect(Object.keys(row.inputs).sort()).toEqual(Object.keys(inputs).sort());
  });

  it.each([
    ['an unknown key', { ...inputs, name: 'x' }],
    ['free text in an answer', { ...inputs, writtenPlan: 'maybe' }],
    ['a limit over 180', { ...inputs, surgeonLimit: { kind: 'degrees', degrees: 181 } }],
    ['a date longer than 10 characters', { ...inputs, surgeryDate: '2026-10-01T00:00' }],
    ['a missing answer', { ...inputs, side: undefined }],
  ])('refuses %s', (_name, value) => {
    expect(storedInputsSchema.safeParse(value).success).toBe(false);
  });

  it('reads a row that does not pass the schema as no answers', async () => {
    const db = freshDb();
    await db.generatorInputs.put({ key: 'current', inputs: { ...inputs, extra: 1 } as unknown as StoredInputs, savedAt: '2026-11-08T00:00:00.000Z' });
    expect(await loadGeneratorInputs(db)).toBeNull();
  });

  it('is gone after erase', async () => {
    const db = freshDb();
    await saveGeneratorInputs(db, inputs);
    await eraseAll(db);
    expect(await loadGeneratorInputs(db)).toBeNull();
    expect(await db.generatorInputs.count()).toBe(0);
  });
});

describe('export of the generator answers', () => {
  it('has no field when no answers are stored, so the file looks as before', async () => {
    const db = freshDb();
    await saveSession(db, session());
    expect('generatorInputs' in JSON.parse(await exportJson(db))).toBe(false);
  });

  it('holds the answers when they are stored, in the JSON file only', async () => {
    const db = freshDb();
    await saveSession(db, session());
    await saveGeneratorInputs(db, inputs);
    expect(JSON.parse(await exportJson(db)).generatorInputs).toEqual(inputs);
    const csv = await exportCsv(db);
    expect(csv).not.toContain('2026-10-01');
    expect(csv).not.toContain('generatorInputs');
  });

  it('exports the answers when there are no sessions yet', async () => {
    const db = freshDb();
    await saveGeneratorInputs(db, inputs);
    expect(JSON.parse(await exportJson(db)).generatorInputs.surgeryDate).toBe('2026-10-01');
  });

  it('parses a new file, and an old file without the field still imports', async () => {
    const a = freshDb();
    await saveSession(a, session());
    await saveGeneratorInputs(a, inputs);
    const withField = await exportJson(a);
    expect(parseExport(withField).ok).toBe(true);

    const old = JSON.parse(withField) as Record<string, unknown>;
    delete old.generatorInputs;
    const b = freshDb();
    expect(await importSessions(b, JSON.stringify(old))).toEqual({ ok: true, imported: 1 });
  });

  it('refuses a file whose answers hold an unknown key', async () => {
    const a = freshDb();
    await saveSession(a, session());
    const file = JSON.parse(await exportJson(a)) as Record<string, unknown>;
    file.generatorInputs = { ...inputs, name: 'x' };
    expect(parseExport(JSON.stringify(file)).ok).toBe(false);
  });

  it('imports the sessions of a new file and does not write the answers to the device', async () => {
    const a = freshDb();
    await saveSession(a, session());
    await saveGeneratorInputs(a, inputs);
    const b = freshDb();
    expect(await importSessions(b, await exportJson(a))).toEqual({ ok: true, imported: 1 });
    expect(await loadGeneratorInputs(b)).toBeNull();
  });
});

describe('database version', () => {
  it('is 3 and keeps the old tables', () => {
    const db = freshDb();
    expect(db.verno).toBe(3);
    expect(db.tables.map((t) => t.name).sort()).toEqual(['generatorInputs', 'protocol', 'sessions']);
  });
});
