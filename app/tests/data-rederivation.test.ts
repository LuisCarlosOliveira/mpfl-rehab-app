// Independent re-derivation of the protocol, red-flag and storage rules.
// These tests do not repeat the earlier tests. Each one comes from the rules in
// MPFL_APP_PLAN.md (FR1, FR5, FR14, FR16) and research/clinical.md section 7.
import example from '../src/lib/protocol/example-protocol.json';
import { loadProtocol, MAX_FILE_BYTES, SURGEON_FIELDS, protocolSchema } from '../src/lib/protocol';
import { GENERAL_GUIDANCE_NOTE, MESSAGES, RED_FLAGS, evaluateRedFlags } from '../src/lib/redflags';
import {
  ANGLE_METHOD,
  MAX_IMPORT_BYTES,
  createDb,
  eraseAll,
  exportCsv,
  exportJson,
  exportReminderDue,
  getPseudonymId,
  importSessions,
  loadStoredProtocol,
  parseExport,
  saveProtocol,
  saveSession,
  type SessionInput,
} from '../src/lib/storage';

const BANNED = /\b(correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|grade|pass|fail|goal|milestone)\b/i;

let n = 0;
const freshDb = () => createDb(`rederive-${Date.now()}-${n++}`);

const approved = {
  schemaVersion: 1,
  id: 'p-001',
  side: 'left',
  authoredBy: 'Clinic A',
  approvedOn: '2026-11-01',
  activePhase: 1,
  phases: [
    {
      id: 1,
      name: 'Protection',
      exercises: [{ kind: 'heel-slide', sets: 3, reps: 10, targetFlexion: 60, maxFlexion: 90, source: 'PROPOSAL' }],
    },
  ],
  surgeon: {},
};
const text = (o: unknown) => JSON.stringify(o);

const session = (over: Partial<SessionInput> = {}): SessionInput => ({
  date: '2026-11-01T10:00:00.000Z',
  exercise: 'heel-slide',
  side: 'left',
  reps: 10,
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

const exportFile = (sessions: unknown[]) => ({
  schemaVersion: 1,
  appVersion: '0.1.0',
  angleMethod: ANGLE_METHOD,
  pseudonymId: '123e4567-e89b-42d3-a456-426614174000',
  protocolId: 'p-001',
  exportedAt: '2026-11-08T10:00:00.000Z',
  sessions,
});

describe('every error code is reachable and readable', () => {
  const protocolCases: Array<[string, string, () => ReturnType<typeof loadProtocol>]> = [
    ['too-large', 'x'.repeat(MAX_FILE_BYTES + 1), () => loadProtocol('x'.repeat(MAX_FILE_BYTES + 1), 'demo')],
    ['invalid-json', '{', () => loadProtocol('{', 'demo')],
    ['schema', '{}', () => loadProtocol('{}', 'demo')],
    ['example-in-patient-mode', '', () => loadProtocol(text(example), 'patient')],
    ['not-approved', '', () => loadProtocol(text({ ...approved, approvedOn: undefined }), 'patient')],
  ];

  it.each(protocolCases)('loader code %s has a plain sentence with no verdict word', (code, _raw, run) => {
    const r = run();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe(code);
    expect(r.error.message).toMatch(/^[A-Z].*[.]$/s);
    expect(r.error.message.length).toBeLessThan(400);
    expect(r.error.message).not.toMatch(BANNED);
  });

  it('import code too-large, invalid-json, unknown-version, schema and duplicate all have plain sentences', async () => {
    const db = freshDb();
    await saveSession(db, session());
    const dupe = await exportJson(db);
    const results = [
      parseExport('x'.repeat(MAX_IMPORT_BYTES + 1)),
      parseExport('{'),
      parseExport(text({ ...exportFile([]), schemaVersion: 2 })),
      parseExport('{}'),
      await importSessions(db, dupe),
    ];
    const codes = results.map((r) => (r.ok ? 'ok' : r.error.code));
    expect(codes).toEqual(['too-large', 'invalid-json', 'unknown-version', 'schema', 'duplicate']);
    for (const r of results) {
      if (r.ok) continue;
      expect(r.error.message).toMatch(/^[A-Z].*[.]$/s);
      expect(r.error.message).not.toMatch(BANNED);
    }
  });

  it('never throws, whatever the text is', () => {
    const deep = '['.repeat(200000) + ']'.repeat(200000);
    for (const raw of ['', 'null', '[]', '"x"', '1e999', deep, '{"__proto__":1}', '\u0000']) {
      expect(() => loadProtocol(raw, 'patient')).not.toThrow();
      expect(() => parseExport(raw)).not.toThrow();
    }
  });
});

describe('size cap counts bytes, not characters (FR1)', () => {
  // A euro sign is 1 character and 3 bytes in UTF-8. 2 million of them are 6 MB.
  const heavy = '€'.repeat(2_000_000);

  it('rejects a protocol file that is over 5 MB in bytes', () => {
    expect(heavy.length).toBeLessThan(MAX_FILE_BYTES);
    expect(loadProtocol(heavy, 'demo')).toMatchObject({ ok: false, error: { code: 'too-large' } });
  });

  it('rejects an import file that is over 5 MB in bytes', () => {
    expect(parseExport(heavy)).toMatchObject({ ok: false, error: { code: 'too-large' } });
  });
});

describe('an export of 20000 sessions (checked numbers)', () => {
  const one = {
    ...session(),
    schemaVersion: 1,
  };
  const many = (count: number) => Array.from({ length: count }, () => one);

  it('is larger than the import cap, so the import names the problem', () => {
    const raw = JSON.stringify(exportFile(many(20000)), null, 2);
    expect(raw.length).toBeGreaterThan(MAX_IMPORT_BYTES);
    expect(parseExport(raw)).toMatchObject({ ok: false, error: { code: 'too-large' } });
  });

  it('5000 sessions stay under the cap and read back', () => {
    const raw = JSON.stringify(exportFile(many(5000)), null, 2);
    expect(raw.length).toBeLessThan(MAX_IMPORT_BYTES);
    const r = parseExport(raw);
    expect(r.ok && r.file.sessions.length).toBe(5000);
  });

  it('a count over the schema limit is rejected even in a small file', () => {
    const tiny = { date: one.date };
    const r = parseExport(JSON.stringify(exportFile(Array.from({ length: 20001 }, () => tiny))));
    expect(r.ok).toBe(false);
  });
});

describe('untrusted text in a file', () => {
  it('rejects __proto__ inside a session and does not pollute Object', () => {
    const raw =
      '{"schemaVersion":1,"appVersion":"0.1.0","angleMethod":"' +
      ANGLE_METHOD +
      '","pseudonymId":"123e4567-e89b-42d3-a456-426614174000","protocolId":"p-001","exportedAt":"2026-11-08T10:00:00.000Z",' +
      '"sessions":[{"__proto__":{"polluted":true},"date":"2026-11-01T10:00:00.000Z"}]}';
    expect(parseExport(raw)).toMatchObject({ ok: false, error: { code: 'schema' } });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects constructor and prototype keys in a protocol exercise', () => {
    for (const key of ['constructor', 'prototype', '__proto__']) {
      const raw = text(approved).replace('"kind":"heel-slide"', `"${key}":{"x":1},"kind":"heel-slide"`);
      expect(loadProtocol(raw, 'demo').ok).toBe(false);
    }
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it('does not echo a very long key from the file into the error text', () => {
    const r = loadProtocol(text({ ...approved, ['k'.repeat(100000)]: 1 }), 'demo');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message.length).toBeLessThan(400);
  });

  it('does not echo a bad value into the error text', () => {
    const attack = '<img src=x onerror=alert(1)>';
    const bad = { ...approved, side: attack };
    const r = loadProtocol(text(bad), 'demo');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).not.toContain('onerror');
  });

  it('rejects a number that is Infinity in JSON and a limit that is out of range', () => {
    const row = { kind: 'numeric', measure: 'painMax', op: 'atMost', lastSessions: 3, evidence: 'unvalidated' };
    const phase = (limit: string) => text(approved).replace('"name":"Protection"', `"name":"Protection","reviewCriteria":[${text(row).replace('}', `,"limit":${limit}}`)}]`);
    expect(loadProtocol(phase('5'), 'demo').ok).toBe(true);
    expect(loadProtocol(phase('1e999'), 'demo').ok).toBe(false);
    expect(loadProtocol(phase('1000000000'), 'demo').ok).toBe(false);
    expect(loadProtocol(phase('-5'), 'demo').ok).toBe(false);
  });
});

describe('protocol that points to nothing, or twice to one thing', () => {
  const withPhases = (phases: unknown[], activePhase = 1) => text({ ...approved, activePhase, phases });
  const heel = { kind: 'heel-slide', source: 'PROPOSAL' };

  it('rejects an active phase that is not in the list of phases', () => {
    expect(loadProtocol(withPhases([{ id: 1, name: 'A', exercises: [heel] }], 5), 'demo')).toMatchObject({
      ok: false,
      error: { code: 'schema' },
    });
  });

  it('rejects two phases with the same id', () => {
    const p = { id: 1, name: 'A', exercises: [heel] };
    expect(loadProtocol(withPhases([p, p]), 'demo').ok).toBe(false);
  });

  it('rejects the same exercise twice in one phase, because the limit would be unclear', () => {
    const twice = { id: 1, name: 'A', exercises: [{ ...heel, maxFlexion: 90 }, { ...heel, maxFlexion: 120 }] };
    const r = loadProtocol(withPhases([twice]), 'demo');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/only once/);
  });

  it('accepts the same exercise in two different phases', () => {
    const a = { id: 1, name: 'A', exercises: [heel] };
    const b = { id: 2, name: 'B', exercises: [heel] };
    expect(loadProtocol(withPhases([a, b]), 'demo').ok).toBe(true);
  });

  it('keeps the shape of the schema: the example and the approved file still load', () => {
    expect(loadProtocol(text(example), 'demo').ok).toBe(true);
    expect(loadProtocol(text(approved), 'patient').ok).toBe(true);
    expect(Object.keys(protocolSchema.shape)).toContain('activePhase');
  });
});

describe('protocol id goes into the export, so it holds no free text', () => {
  it.each(['Jane Doe', '', ' p1', 'p\n1', 'a'.repeat(65), '=cmd', '<b>'])('rejects the id %j', (id) => {
    expect(loadProtocol(text({ ...approved, id }), 'demo').ok).toBe(false);
  });

  it.each(['p-001', 'example-001', 'A.b_c-9'])('accepts the id %j', (id) => {
    expect(loadProtocol(text({ ...approved, id }), 'demo').ok).toBe(true);
  });

  it('the import also rejects an id with a space', () => {
    const r = parseExport(text(exportFile([{ ...session({ protocolId: 'Jane Doe' }), schemaVersion: 1 }])));
    expect(r.ok).toBe(false);
  });
});

describe('example protocol, value by value (research/clinical.md sections 2 and 4)', () => {
  type Ex = { kind: string; source: string; maxFlexion?: number; maxTopFlexion?: number };
  const exercises = (example.phases as Array<{ exercises: Ex[] }>).flatMap((p) => p.exercises);
  const byKind = (kind: string) => exercises.find((e) => e.kind === kind)!;

  it('keeps every source under the import limit and names S-number or PROPOSAL', () => {
    for (const e of exercises) {
      expect(e.source.length).toBeLessThan(200);
      expect(e.source).toMatch(/\bS\d+\b|PROPOSAL/);
    }
  });

  it('marks the squat limit as BORROWED, because S16 studied healthy people', () => {
    expect(byKind('mini-squat').source).toMatch(/BORROWED/);
  });

  it('says that the phase of the seated hold is a PROPOSAL, because S1 lists it in phase 1', () => {
    expect(byKind('seated-extension-hold').source).toMatch(/phase/i);
    expect(byKind('seated-extension-hold').source).toMatch(/PROPOSAL/);
  });

  it('has no value in a field that has no source claim: the leg raise sets no limit', () => {
    const slr = byKind('straight-leg-raise');
    expect(slr.maxFlexion).toBeUndefined();
    expect(slr.maxTopFlexion).toBeUndefined();
  });

  it('names no limit as a result for a patient: no verdict word in any source or phase name', () => {
    for (const e of exercises) expect(e.source).not.toMatch(BANNED);
    for (const p of example.phases) expect(p.name).not.toMatch(BANNED);
  });
});

describe('surgeon fields', () => {
  it('lists the five fields that the schema accepts, and no other', () => {
    expect([...SURGEON_FIELDS].sort()).toEqual(['brace', 'concurrentProcedures', 'depthLimit', 'phaseClearance', 'weightBearing']);
    const extra = loadProtocol(text({ ...approved, surgeon: { anticoagulation: 'x' } }), 'demo');
    expect(extra.ok).toBe(false);
  });
});

describe('red flags against research/clinical.md section 7 and the Cincinnati guideline (clinical-update.md 2.5)', () => {
  const ids = RED_FLAGS.map((f) => f.id);
  const group = (id: string) => RED_FLAGS.find((f) => f.id === id)?.group;

  it('has the catching or locking sign of the guideline, in the care-team group', () => {
    expect(group('catching-locking')).toBe('care-team');
  });

  it('has the loss or no progress of knee bend of the guideline, in the care-team group', () => {
    expect(group('bend-loss')).toBe('care-team');
  });

  it('keeps the 3 emergency items and every earlier care-team item', () => {
    expect(RED_FLAGS.filter((f) => f.group === 'emergency').map((f) => f.id)).toEqual(['breathless-chest', 'kneecap-moved', 'foot-numb-cold']);
    for (const id of ['calf', 'infection', 'swelling', 'giving-way']) expect(ids).toContain(id);
  });

  it('puts the calf signs in the care-team group, as the guideline does, and not in the emergency group', () => {
    expect(group('calf')).toBe('care-team');
  });

  it('writes every item as a plain sentence a patient can answer, with no verdict word and no number', () => {
    for (const f of RED_FLAGS) {
      expect(f.text).toMatch(/^[A-Z].*[.]$/);
      expect(f.text.split(/\s+/).length).toBeLessThanOrEqual(25);
      expect(f.text).not.toMatch(BANNED);
      expect(f.text).not.toMatch(/\d/);
    }
  });

  it('gives each group a message that tells the person to stop, and the emergency one names the service', () => {
    expect(MESSAGES.emergency).toMatch(/emergency services/);
    expect(MESSAGES['care-team']).toMatch(/care team/);
    for (const m of Object.values(MESSAGES)) {
      expect(m).toMatch(/^Stop\./);
      expect(m).not.toMatch(BANNED);
    }
    expect(GENERAL_GUIDANCE_NOTE).not.toMatch(BANNED);
  });

  it('blocks on every item alone, with the message of its own group', () => {
    for (const f of RED_FLAGS) {
      const r = evaluateRedFlags({ [f.id]: true });
      expect(r.message).toBe(MESSAGES[f.group]);
    }
  });
});

describe('CSV formula guard', () => {
  const csvWith = async (over: Partial<SessionInput>) => {
    const db = freshDb();
    await saveSession(db, session(over));
    return exportCsv(db);
  };

  it.each(['＝1+1', '＋1', '－1', '＠SUM(A1)'])('quotes a cell that starts with the wide sign %j', async (start) => {
    const csv = await csvWith({ marginSource: `${start}` });
    expect(csv).toContain(`"'${start}"`);
  });

  it.each(['=1+1', '+1', '-1', '@x', '\tx', '\rx'])('keeps the leading-quote rule for the ASCII start %j', async (start) => {
    const csv = await csvWith({ marginSource: start });
    expect(csv).toContain(`"'${start}"`);
  });

  it('does not change a plain text cell', async () => {
    expect(await csvWith({ marginSource: 'plain text' })).toContain('"plain text"');
  });

  it('has the same number of cells in the header and in every row', async () => {
    const db = freshDb();
    await saveSession(db, session({ marginSource: 'a,b' }));
    await saveSession(db, session({ date: '2026-11-02T10:00:00.000Z', marginSource: 'say "hi"', peakFlexion: null }));
    const lines = (await exportCsv(db)).trimEnd().split('\n').slice(1);
    const count = (l: string) => l.replace(/"(?:[^"]|"")*"/g, 'T').split(',').length;
    expect(new Set(lines.map(count)).size).toBe(1);
  });
});

describe('local values and the stored protocol', () => {
  beforeEach(() => localStorage.clear());

  it('replaces a pseudonymous id in localStorage that is not a UUID', () => {
    localStorage.setItem('mpfl.pseudoId', 'Jane Doe');
    const id = getPseudonymId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(getPseudonymId()).toBe(id);
  });

  it('shows the export reminder when the stored date is not a date', () => {
    expect(exportReminderDue('not a date', new Date('2026-11-08T00:00:00Z'), true)).toBe(true);
  });

  it('refuses a stored example in patient mode, even when it was saved in demo mode', async () => {
    const db = freshDb();
    await saveProtocol(db, text(example), 'demo');
    expect(await loadStoredProtocol(db, 'patient')).toMatchObject({ ok: false, error: { code: 'example-in-patient-mode' } });
    expect(await loadStoredProtocol(db, 'demo')).toMatchObject({ ok: true });
  });

  it('checks the stored text again for a __proto__ key and for the byte cap', async () => {
    const db = freshDb();
    await saveProtocol(db, text(approved), 'patient');
    await db.protocol.put({ key: 'current', raw: text(approved).replace('{', '{"__proto__":{"a":1},'), savedAt: 'x' });
    expect(await loadStoredProtocol(db, 'patient')).toMatchObject({ ok: false });
    await db.protocol.put({ key: 'current', raw: '€'.repeat(2_000_000), savedAt: 'x' });
    expect(await loadStoredProtocol(db, 'patient')).toMatchObject({ ok: false, error: { code: 'too-large' } });
  });

  it('keeps no video or image value anywhere after a save: only text and numbers', async () => {
    const db = freshDb();
    await saveSession(db, session());
    await saveProtocol(db, text(approved), 'patient');
    const rows = JSON.stringify(await db.sessions.toArray()) + JSON.stringify(await db.protocol.toArray());
    expect(rows).not.toMatch(/data:image|data:video|blob:/);
    await eraseAll(db);
    expect(await db.sessions.count()).toBe(0);
    expect(await db.protocol.count()).toBe(0);
    expect(localStorage.length).toBe(0);
  });
});

describe('import refuses a file that would add free text', () => {
  it('rejects a name key at the top level and in a session', () => {
    expect(parseExport(text({ ...exportFile([]), name: 'Jane' })).ok).toBe(false);
    expect(parseExport(text(exportFile([{ ...session(), schemaVersion: 1, note: 'sore' }]))).ok).toBe(false);
  });
});
