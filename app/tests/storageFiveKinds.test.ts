// Exercise monitoring, step A: the stored session accepts the five new exercise ids. No new storage field (Step E adds timer data).
import { MARGIN_SOURCE } from '../src/lib/margin';
import { buildProgressSeries, exerciseLabel } from '../src/lib/progress';
import { createDb, exportJson, importSessions, parseExport, saveSession, sessionSchema, type SessionInput, type SessionRecord } from '../src/lib/storage';

let n = 0;
const freshDb = () => createDb(`five-${Date.now()}-${n++}`);
const FIVE = ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'] as const;
const NAMES: Record<(typeof FIVE)[number], string> = {
  'quad-set': 'Quadriceps set',
  'gluteal-set': 'Gluteal set',
  'ankle-pump': 'Ankle pump',
  'leg-raise-side': 'Leg raise to the side',
  'leg-raise-back': 'Leg raise to the back',
};
const session = (exercise: SessionInput['exercise'], over: Partial<SessionInput> = {}): SessionInput => ({
  date: '2026-11-01T10:00:00.000Z', exercise, side: 'left', reps: 8, peakFlexion: null, holdSeconds: null, topFlexion: null, marginDeg: 9, marginSource: MARGIN_SOURCE,
  view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0, redFlagBlocks: 0, pain: 2, swelling: 'none', protocolId: 'p-001', phase: 1, ...over,
});

beforeEach(() => localStorage.clear());

describe('stored sessions of the five exercises', () => {
  it('the session schema accepts each id and refuses an unknown one', () => {
    for (const k of FIVE) expect(sessionSchema.safeParse({ ...session(k), schemaVersion: 1 }).success, k).toBe(true);
    expect(sessionSchema.safeParse({ ...session('heel-slide'), exercise: 'lunge' }).success).toBe(false);
  });

  it('saves and exports a session of each exercise, and the export reads back and imports into another database', async () => {
    const db = freshDb();
    let minute = 0;
    for (const k of FIVE) await saveSession(db, session(k, { date: `2026-11-01T10:0${minute++}:00.000Z` }));
    const raw = await exportJson(db);
    const parsed = parseExport(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.sessions.map((s) => s.exercise).sort()).toEqual([...FIVE].sort());
    const other = freshDb();
    const result = await importSessions(other, raw);
    expect(result).toEqual({ ok: true, imported: 5 });
    expect(await other.sessions.count()).toBe(5);
  });
});

describe('names of the five exercises', () => {
  it('has a plain name for each id, for titles and tables', () => {
    for (const k of FIVE) expect(exerciseLabel(k)).toBe(NAMES[k]);
    expect(exerciseLabel('heel-slide')).toBe('heel slide');
  });
});

describe('Your sessions for the five exercises', () => {
  const record = (k: SessionInput['exercise'], id: number): SessionRecord => ({ ...session(k, { peakFlexion: k === 'heel-slide' ? 70 : 12 }), id, schemaVersion: 1 }) as SessionRecord;

  it('draws no angle chart for them, and still counts their reps and pain', () => {
    const rows = [record('heel-slide', 1), ...FIVE.map((k, i) => record(k, i + 2))];
    const series = buildProgressSeries(rows);
    expect(series.peakFlexion.map((s) => s.exercise)).toEqual(['heel-slide']);
    expect(series.repsPerDay.points).toEqual([{ day: '2026-11-01', reps: 48 }]);
    expect(series.pain.points).toHaveLength(6);
  });

  it('keeps the rule for the straight leg raise: no angle chart', () => {
    expect(buildProgressSeries([record('straight-leg-raise', 1)]).peakFlexion).toEqual([]);
  });
});
