import { MARGIN_SOURCE } from '../src/lib/margin';
import { buildProgressSeries, exerciseLabel, toTableRows, type ProgressSeries } from '../src/lib/progress';
import type { SessionRecord } from '../src/lib/storage';

let nextId = 1;
function session(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: nextId++, date: '2026-11-01T10:00:00.000Z', exercise: 'mini-squat', side: 'left', reps: 10, peakFlexion: 60, holdSeconds: null,
    topFlexion: null, marginDeg: 9, marginSource: MARGIN_SOURCE, view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0,
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

  // Clinical decision: the straight leg raise has no angle chart. No source sets the 30 degree plausibility limit (cues.ts),
  // and a chart of the angle at the top would show a sensor fault as a trend. The stored values and the export keep the numbers.
  it('draws no series for the straight leg raise and keeps the other series', () => {
    const list = [
      session({ exercise: 'straight-leg-raise', peakFlexion: 12, topFlexion: 22, reps: 4, pain: 2, date: '2026-11-01T10:00:00.000Z' }),
      session({ exercise: 'straight-leg-raise', peakFlexion: 165, topFlexion: 12, reps: 6, pain: 1, date: '2026-11-02T10:00:00.000Z' }),
      session({ exercise: 'mini-squat', peakFlexion: 90, date: '2026-11-01T10:00:00.000Z' }),
    ];
    const s = buildProgressSeries(list);
    expect(s.peakFlexion.map((x) => x.exercise)).toEqual(['mini-squat']);
    expect(s.peakFlexion[0]!.points.map((p) => p.degrees)).toEqual([90]);
    expect(s.peakFlexion[0]!.title).toContain('Peak knee bend, Mini squat');
    expect(JSON.stringify(s)).not.toMatch(/Straight leg raise|Angle at the top/);
    // Reps per day and pain still count every session.
    expect(s.repsPerDay.points.map((p) => p.reps)).toEqual([14, 6]);
    expect(s.pain.points).toHaveLength(3);
    // The input and the stored numbers do not change.
    expect(list[0]!.topFlexion).toBe(22);
    expect(list[1]!.peakFlexion).toBe(165);
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

describe('chart titles for a corrupt exercise name', () => {
  const corrupt = (name: string) => session({ exercise: name as unknown as SessionRecord['exercise'] });

  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'prototype'])('reads %s as plain text, never as [object Object]', (name) => {
    const series = buildProgressSeries([corrupt(name)]);
    const title = series.peakFlexion[0]?.title ?? '';
    expect(title).not.toContain('[object');
    expect(title).not.toContain('function');
    expect(title).toContain(name);
    expect(toTableRows(series).every((r) => !r.series.includes('[object'))).toBe(true);
  });

  it('keeps the known labels', () => {
    expect(exerciseLabel('heel-slide')).toBe('Heel slide');
    expect(exerciseLabel('seated-extension-hold')).toBe('Seated knee extension hold');
  });

  it('gives a plain fallback for an empty, long or non-text name and removes control characters', () => {
    expect(exerciseLabel('')).toBe('unknown exercise');
    expect(exerciseLabel(undefined as unknown as string)).toBe('unknown exercise');
    expect(exerciseLabel({} as unknown as string)).toBe('unknown exercise');
    expect(exerciseLabel('a\u0000b\nc')).toBe('a b c');
    expect(exerciseLabel('x'.repeat(200)).length).toBeLessThanOrEqual(61);
  });
});
