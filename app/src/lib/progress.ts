import { PLAN_NAMES } from './planView';
import type { SessionRecord } from './storage';

export const EXERCISE_LABEL = PLAN_NAMES;

type ExerciseKind = SessionRecord['exercise'];
const NO_ANGLE_CHART: ReadonlySet<string> = new Set(['straight-leg-raise', 'quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back']);

export const hasAngleChart = (kind: string): boolean => !NO_ANGLE_CHART.has(kind);

export function exerciseLabel(kind: string): string {
  if (typeof kind === 'string' && Object.hasOwn(EXERCISE_LABEL, kind)) return EXERCISE_LABEL[kind as keyof typeof EXERCISE_LABEL];
  if (typeof kind !== 'string') return 'unknown exercise';
  const text = kind.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  if (text === '') return 'unknown exercise';
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

const SERIES_TITLE = {
  peakFlexion: (exercise: ExerciseKind) => `Peak knee bend, ${exerciseLabel(exercise)}, in degrees (estimated angle, not a medical measurement)`,
  repsPerDay: 'Reps for each day, in reps',
  pain: 'Pain after each session, from 0 to 10',
} as const;

interface PeakPoint {
  sessionId: number;
  date: string;
  degrees: number | null;
}
interface PeakSeries {
  exercise: ExerciseKind;
  title: string;
  points: PeakPoint[];
}
interface RepsDay {
  day: string; // YYYY-MM-DD of the session timestamp (UTC, as stored)
  reps: number | null; // null when no session of that day has a rep count
}
interface PainPoint {
  sessionId: number;
  date: string;
  pain: number;
}
export interface ProgressSeries {
  peakFlexion: PeakSeries[];
  repsPerDay: { title: string; points: RepsDay[] };
  pain: { title: string; points: PainPoint[] };
}

export interface TableRow {
  series: string; // the series title, with units
  when: string; // a session timestamp, or a day for reps
  value: number | null; // the same number as in the series
  valueText: string; // the number with its unit
}

export function sortByDate<T extends { date: string; id: number }>(sessions: readonly T[]): T[] {
  return [...sessions].sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id - b.id);
}

export function buildProgressSeries(sessions: readonly SessionRecord[]): ProgressSeries {
  const sorted = sortByDate(sessions);

  const byExercise = new Map<ExerciseKind, PeakPoint[]>();
  for (const s of sorted) {
    const points = byExercise.get(s.exercise) ?? [];
    if (!hasAngleChart(s.exercise)) continue;
    points.push({ sessionId: s.id, date: s.date, degrees: s.peakFlexion });
    byExercise.set(s.exercise, points);
  }

  const reps = new Map<string, number | null>();
  for (const s of sorted) {
    if (isPersonTimed(s)) continue;
    const day = s.date.slice(0, 10);
    const before = reps.get(day) ?? null;
    reps.set(day, s.reps === null ? before : (before ?? 0) + s.reps);
  }

  return {
    peakFlexion: [...byExercise].map(([exercise, points]) => ({ exercise, title: SERIES_TITLE.peakFlexion(exercise), points })),
    repsPerDay: { title: SERIES_TITLE.repsPerDay, points: [...reps].map(([day, count]) => ({ day, reps: count })) },
    pain: { title: SERIES_TITLE.pain, points: sorted.flatMap((s) => (s.pain === undefined ? [] : [{ sessionId: s.id, date: s.date, pain: s.pain }])) },
  };
}

const NO_VALUE = 'no value';

const isPersonTimed = (s: SessionRecord): boolean => s.timedBy === 'person' || s.exercise === 'quad-set' || s.exercise === 'gluteal-set';

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

export function holdLines(sessions: readonly SessionRecord[]): string[] {
  const last = sortByDate(sessions.filter((s) => s.timedBy === 'person' && s.holdList !== undefined)).reverse();
  return (Object.keys(PLAN_NAMES) as ExerciseKind[]).flatMap((kind) => {
    const s = last.find((x) => x.exercise === kind);
    const list = s?.holdList ?? [];
    return list.length === 0 ? [] : [`${PLAN_NAMES[kind]}: ${plural(list.length, 'hold')} timed by you, the longest ${plural(Math.max(...list), 'second')}.`];
  });
}

export function toTableRows(series: ProgressSeries): TableRow[] {
  const rows: TableRow[] = [];
  for (const peak of series.peakFlexion) {
    for (const p of peak.points) {
      rows.push({ series: peak.title, when: p.date, value: p.degrees, valueText: p.degrees === null ? NO_VALUE : `${p.degrees} degrees` });
    }
  }
  for (const d of series.repsPerDay.points) {
    rows.push({ series: series.repsPerDay.title, when: d.day, value: d.reps, valueText: d.reps === null ? NO_VALUE : `${d.reps} reps` });
  }
  for (const p of series.pain.points) {
    rows.push({ series: series.pain.title, when: p.date, value: p.pain, valueText: `${p.pain} (0 to 10)` });
  }
  return rows;
}
