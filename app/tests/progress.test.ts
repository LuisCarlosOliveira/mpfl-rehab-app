import { buildProgressSeries, toTableRows, type ProgressSeries } from '../src/lib/progress';
import type { SessionRecord } from '../src/lib/storage';

let nextId = 1;
function session(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: nextId++, date: '2026-11-01T10:00:00.000Z', exercise: 'mini-squat', side: 'left', reps: 10, peakFlexion: 60, holdSeconds: null,
    topFlexion: null, marginDeg: 9, marginSource: 'start value', view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0,
    redFlagBlocks: 0, pain: 2, swelling: 'none', protocolId: 'p-1', phase: 1, schemaVersion: 1, ...over,
  };
}

const FORBIDDEN_KEYS = /goal|target|pass|fail|colou?r|status|trend|arrow|verdict|score|total|percent|met$/i;
function walk(value: unknown, visit: (key: string | null, v: unknown) => void, key: string | null = null): void {
  visit(key, value);
  if (Array.isArray(value)) value.forEach((v) => walk(v, visit));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, visit, k);
}

describe('buildProgressSeries', () => {
  it('returns empty series for an empty list', () => {
    const s = buildProgressSeries([]);
    expect(s.peakFlexion).toEqual([]);
    expect(s.repsPerDay.points).toEqual([]);
    expect(s.pain.points).toEqual([]);
    expect(toTableRows(s)).toEqual([]);
  });

  it('sorts by date and groups peaks by exercise', () => {
    const s = buildProgressSeries([
      session({ date: '2026-11-03T10:00:00.000Z', peakFlexion: 70 }),
      session({ date: '2026-11-01T10:00:00.000Z', peakFlexion: 50 }),
      session({ date: '2026-11-02T10:00:00.000Z', exercise: 'heel-slide', peakFlexion: 90 }),
    ]);
    const squat = s.peakFlexion.find((x) => x.exercise === 'mini-squat');
    expect(squat?.points.map((p) => p.degrees)).toEqual([50, 70]);
    expect(s.peakFlexion.find((x) => x.exercise === 'heel-slide')?.points.map((p) => p.degrees)).toEqual([90]);
    expect(s.pain.points.map((p) => p.date)).toEqual(['2026-11-01T10:00:00.000Z', '2026-11-02T10:00:00.000Z', '2026-11-03T10:00:00.000Z']);
  });

  it('adds the reps of one day and keeps null when no session has a count', () => {
    const s = buildProgressSeries([
      session({ date: '2026-11-01T08:00:00.000Z', reps: 10 }),
      session({ date: '2026-11-01T18:00:00.000Z', reps: 5 }),
      session({ date: '2026-11-02T08:00:00.000Z', reps: null }),
      session({ date: '2026-11-03T08:00:00.000Z', reps: 0 }),
      session({ date: '2026-11-03T09:00:00.000Z', reps: null }),
    ]);
    expect(s.repsPerDay.points).toEqual([
      { day: '2026-11-01', reps: 15 },
      { day: '2026-11-02', reps: null },
      { day: '2026-11-03', reps: 0 },
    ]);
  });

  it('keeps null peak values as null', () => {
    const s = buildProgressSeries([session({ peakFlexion: null })]);
    expect(s.peakFlexion[0]?.points[0]?.degrees).toBeNull();
  });

  it('does not change the input list', () => {
    const list = [session({ date: '2026-11-03T10:00:00.000Z' }), session({ date: '2026-11-01T10:00:00.000Z' })];
    const copy = [...list];
    buildProgressSeries(list);
    expect(list).toEqual(copy);
  });

  it('has no field that can carry a verdict', () => {
    const s = buildProgressSeries([session(), session({ pain: 9 })]);
    const keys: string[] = [];
    walk(s, (k) => k && keys.push(k));
    expect(keys.filter((k) => FORBIDDEN_KEYS.test(k))).toEqual([]);
  });
});

describe('toTableRows', () => {
  const sessions = [
    session({ date: '2026-11-02T10:00:00.000Z', peakFlexion: 72.5, reps: 8, pain: 3 }),
    session({ date: '2026-11-01T10:00:00.000Z', peakFlexion: null, reps: null, pain: 0 }),
    session({ date: '2026-11-01T12:00:00.000Z', exercise: 'heel-slide', peakFlexion: 88, reps: 12, pain: 10 }),
  ];
  const series: ProgressSeries = buildProgressSeries(sessions);
  const rows = toTableRows(series);

  it('shows exactly the numbers of the series', () => {
    const fromSeries = [
      ...series.peakFlexion.flatMap((p) => p.points.map((x) => x.degrees)),
      ...series.repsPerDay.points.map((x) => x.reps),
      ...series.pain.points.map((x) => x.pain),
    ];
    expect(rows.map((r) => r.value)).toEqual(fromSeries);
    for (const r of rows) {
      if (r.value !== null) expect(r.valueText).toContain(String(r.value));
    }
  });

  it('puts units next to the numbers', () => {
    expect(rows.some((r) => r.valueText === '72.5 degrees')).toBe(true);
    expect(rows.some((r) => r.valueText === '12 reps')).toBe(true);
    expect(rows.some((r) => r.valueText === '10 (0 to 10)')).toBe(true);
    expect(rows.some((r) => r.valueText === 'no value')).toBe(true);
    expect(series.peakFlexion[0]?.title).toContain('estimated angle, not a medical measurement');
  });
});
