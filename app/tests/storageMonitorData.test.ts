// Exercise monitoring, step E: the data of the new modes (person-timed holds, one measured value). Stored, exported, imported.
import { MARGIN_SOURCE } from '../src/lib/margin';
import { createDb, exportCsv, exportJson, importSessions, parseExport, saveSession, sessionSchema, type SessionInput } from '../src/lib/storage';

let n = 0;
const freshDb = () => createDb(`mon-${Date.now()}-${n++}`);
const session = (over: Partial<SessionInput> = {}): SessionInput => ({
  date: '2026-11-01T10:00:00.000Z', exercise: 'quad-set', side: 'left', reps: null, peakFlexion: null, holdSeconds: null, topFlexion: null,
  marginDeg: 9, marginSource: MARGIN_SOURCE, view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0, redFlagBlocks: 0,
  pain: 1, swelling: 'none', protocolId: 'p-001', phase: 1, ...over,
});
const withNew = (over: Partial<SessionInput> = {}) => session({ holdList: [5, 6, 7], timedBy: 'person', ...over });
const ok = (over: Record<string, unknown>) => sessionSchema.safeParse({ ...session(), schemaVersion: 1, ...over }).success;
const fileWith = (sessions: unknown[]) => JSON.stringify({
  schemaVersion: 1, appVersion: '0.1.0', angleMethod: '2D webcam estimate, not a goniometer measurement',
  pseudonymId: '123e4567-e89b-42d3-a456-426614174000', protocolId: 'p-001', exportedAt: '2026-11-08T10:00:00.000Z', sessions,
});
const splitCsv = (line: string): string[] => {
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i] as string;
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
};

beforeEach(() => localStorage.clear());

describe('new optional fields of the session schema', () => {
  it('accepts a record without them (old files) and with them', () => {
    expect(ok({})).toBe(true);
    expect(ok({ holdList: [1, 3600], timedBy: 'person' })).toBe(true);
    expect(ok({ timedBy: 'camera', reportKey: 'lift-angle', reportValue: 38.4 })).toBe(true);
    for (const k of ['ankle-range', 'lift-angle', 'knee-angle-top']) expect(ok({ reportKey: k, reportValue: 0 })).toBe(true);
  });

  it('refuses a bad hold list', () => {
    expect(ok({ holdList: [0] })).toBe(false);
    expect(ok({ holdList: [3601] })).toBe(false);
    expect(ok({ holdList: [1.5] })).toBe(false);
    expect(ok({ holdList: [Number.NaN] })).toBe(false);
    expect(ok({ holdList: [Infinity] })).toBe(false);
    expect(ok({ holdList: ['5'] })).toBe(false);
    expect(ok({ holdList: Array.from({ length: 51 }, () => 5) })).toBe(false);
    expect(ok({ holdList: Array.from({ length: 50 }, () => 5) })).toBe(true);
  });

  it('refuses a bad timedBy, report key or report value', () => {
    expect(ok({ timedBy: 'hand' })).toBe(false);
    expect(ok({ reportKey: 'peak', reportValue: 5 })).toBe(false);
    for (const v of [-1, 181, Number.NaN, Infinity, '40', null]) expect(ok({ reportKey: 'lift-angle', reportValue: v }), String(v)).toBe(false);
    expect(ok({ reportKey: 'lift-angle' })).toBe(false); // a key needs its value
    expect(ok({ reportValue: 40 })).toBe(false); // a value needs its key
  });

  it('refuses a __proto__ key and a huge array in an import', () => {
    const raw = fileWith([{ ...session(), schemaVersion: 1 }]).replace('"holdSeconds"', '"__proto__":{"x":1},"holdSeconds"');
    expect(parseExport(raw).ok).toBe(false);
    const big = fileWith([{ ...session(), schemaVersion: 1, holdList: Array.from({ length: 100000 }, () => 5) }]);
    expect(parseExport(big).ok).toBe(false);
    expect(parseExport(fileWith([{ ...session(), schemaVersion: 1, timedBy: 'x' }])).ok).toBe(false);
  });
});

describe('export and import of the new fields', () => {
  it('round-trips through JSON into another database', async () => {
    const db = freshDb();
    await saveSession(db, withNew());
    await saveSession(db, session({ exercise: 'leg-raise-back', date: '2026-11-02T10:00:00.000Z', reps: 6, reportKey: 'lift-angle', reportValue: 38.4 }));
    const raw = await exportJson(db);
    const parsed = parseExport(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.sessions[0]).toMatchObject({ holdList: [5, 6, 7], timedBy: 'person' });
    expect(parsed.file.sessions[1]).toMatchObject({ reportKey: 'lift-angle', reportValue: 38.4 });
    const other = freshDb();
    expect(await importSessions(other, raw)).toEqual({ ok: true, imported: 2 });
    const back = await other.sessions.orderBy('date').toArray();
    expect(back[0]).toMatchObject({ holdList: [5, 6, 7], timedBy: 'person' });
    expect(back[1]).toMatchObject({ reportKey: 'lift-angle', reportValue: 38.4 });
  });

  it('still imports an old export that has none of the new fields', async () => {
    const old = fileWith([{ ...session({ exercise: 'heel-slide', reps: 10, peakFlexion: 70 }), schemaVersion: 1 }]);
    const db = freshDb();
    expect(await importSessions(db, old)).toEqual({ ok: true, imported: 1 });
    expect(JSON.parse(await exportJson(db)).sessions[0]).not.toHaveProperty('holdList');
  });

  it('writes nothing to the database for a file with a bad new value', async () => {
    const db = freshDb();
    const bad = fileWith([{ ...session(), schemaVersion: 1, holdList: [0] }]);
    expect((await importSessions(db, bad)).ok).toBe(false);
    expect(await db.sessions.count()).toBe(0);
  });
});

describe('CSV columns of the new fields', () => {
  const csv = async (over: Partial<SessionInput>, more: Partial<SessionInput>[] = []) => {
    const db = freshDb();
    await saveSession(db, session(over));
    let m = 1;
    for (const x of more) await saveSession(db, session({ date: `2026-11-02T10:0${m++}:00.000Z`, ...x }));
    const lines = (await exportCsv(db)).trimEnd().split('\n');
    return { header: (lines[1] as string).split(','), rows: lines.slice(2) };
  };

  it('has the four columns after the old ones', async () => {
    const { header } = await csv({});
    expect(header.slice(-4)).toEqual(['hold_list', 'timed_by', 'report_key', 'report_value']);
    expect(header.indexOf('reps_by')).toBe(header.length - 5);
  });

  it('writes the holds joined by a space in one quoted cell, and raw digits for the value', async () => {
    const { header, rows } = await csv(withNew({ reportKey: 'knee-angle-top', reportValue: 38.456 }));
    const cells = splitCsv(rows[0] as string);
    expect(cells).toHaveLength(header.length);
    expect(rows[0]).toContain('"5 6 7","person","knee-angle-top",38.456');
    expect(cells[header.indexOf('hold_list')]).toBe('5 6 7');
  });

  it('leaves the four cells empty for an old record and keeps the field count equal to the header', async () => {
    const { header, rows } = await csv(session({ exercise: 'heel-slide', reps: 4 }), [withNew(), session({ reportKey: 'ankle-range', reportValue: 22 })]);
    for (const r of rows) expect(splitCsv(r)).toHaveLength(header.length);
    expect(rows[0]).toMatch(/,,,,$/);
    expect(rows[0]).not.toContain('undefined');
  });

  it('quotes the new text cells, and a formula sign stays safe with the new columns in the row', async () => {
    const { textCell } = await import('../src/lib/storage/export');
    expect(textCell('=1+1')).toBe(`"'=1+1"`);
    const { rows } = await csv(withNew({ reportKey: 'lift-angle', reportValue: 1 }));
    const row = rows[0] as string;
    expect(row).toMatch(/,"person","lift-angle",1$/);
    // A value that starts with a formula sign never reaches a cell: the enums refuse it, the numbers are plain digits.
    expect(ok({ timedBy: '=1+1' })).toBe(false);
    expect(ok({ reportKey: '@SUM(A1)', reportValue: 1 })).toBe(false);
  });
});
