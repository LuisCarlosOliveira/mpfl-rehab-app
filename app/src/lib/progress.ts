// Patient dashboard data (FR13). Pure functions, no clock, no storage.
// One function builds the series that a chart draws. A second function turns the
// same series into table rows, so the chart and the table cannot differ.
// The output holds numbers and labels only. It has no goal, no target line, no
// colour, no status and no trend field (guardrails skill, section Wording).

import { PLAN_NAMES } from './planView';
import type { SessionRecord } from './storage';

// One name for each exercise: the plan name, with a capital letter. A screen never writes its own copy of a name.
export const EXERCISE_LABEL = PLAN_NAMES;

type ExerciseKind = SessionRecord['exercise'];
const NO_ANGLE_CHART: ReadonlySet<string> = new Set(['straight-leg-raise', 'quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back']);

/** True when Your sessions draws an angle chart for the exercise. The straight leg raise and the five new exercises have none. */
export const hasAngleChart = (kind: string): boolean => !NO_ANGLE_CHART.has(kind);

/**
 * The plain name of an exercise for a title. A stored name that is not one of the known kinds (a corrupt file, or a key such as
 * `__proto__`) shows as short plain text. It never reads a property of the label table, so it never shows "[object Object]".
 */
export function exerciseLabel(kind: string): string {
  if (typeof kind === 'string' && Object.hasOwn(EXERCISE_LABEL, kind)) return EXERCISE_LABEL[kind as keyof typeof EXERCISE_LABEL];
  if (typeof kind !== 'string') return 'unknown exercise';
  const text = kind.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  if (text === '') return 'unknown exercise';
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

/** Series titles. Units sit next to the numbers. The angle label is the one in the guardrails skill. */
export const SERIES_TITLE = {
  peakFlexion: (exercise: ExerciseKind) => `Peak knee bend, ${exerciseLabel(exercise)}, in degrees (estimated angle, not a medical measurement)`,
  repsPerDay: 'Reps for each day, in reps',
  pain: 'Pain after each session, from 0 to 10',
} as const;

export interface PeakPoint {
  sessionId: number;
  date: string;
  degrees: number | null;
}
export interface PeakSeries {
  exercise: ExerciseKind;
  title: string;
  points: PeakPoint[];
}
export interface RepsDay {
  day: string; // YYYY-MM-DD of the session timestamp (UTC, as stored)
  reps: number | null; // null when no session of that day has a rep count
}
export interface PainPoint {
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

/** Oldest first. Equal timestamps keep the order of the id. */
export function sortByDate<T extends { date: string; id: number }>(sessions: readonly T[]): T[] {
  return [...sessions].sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id - b.id);
}

/** Peak bend for each session and exercise, reps for each day, pain for each session. */
export function buildProgressSeries(sessions: readonly SessionRecord[]): ProgressSeries {
  const sorted = sortByDate(sessions);

  const byExercise = new Map<ExerciseKind, PeakPoint[]>();
  for (const s of sorted) {
    const points = byExercise.get(s.exercise) ?? [];
    // The straight leg raise has no angle chart (clinical decision): no source sets its plausibility limit, and a chart would show a sensor fault as a trend.
    // The five new exercises have no angle chart yet either: only reps and pain show for them (exercise monitoring, step A).
    // The stored numbers stay in the record, the clinician table and the export.
    if (!hasAngleChart(s.exercise)) continue;
    points.push({ sessionId: s.id, date: s.date, degrees: s.peakFlexion });
    byExercise.set(s.exercise, points);
  }

  const reps = new Map<string, number | null>();
  for (const s of sorted) {
    // A hold that the person timed is not a camera count, so it never enters "Reps for each day".
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

/** A record that the person timed by hand. It never mixes with a camera count. */
const isPersonTimed = (s: SessionRecord): boolean => s.timedBy === 'person' || s.exercise === 'quad-set' || s.exercise === 'gluteal-set';

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/**
 * One plain line for each exercise that the person timed: the count of holds and the longest hold of the LAST session of that exercise.
 * It is not a total over time, and it has no goal and no streak. The order is the order of the plan names.
 */
export function holdLines(sessions: readonly SessionRecord[]): string[] {
  const last = sortByDate(sessions.filter((s) => s.timedBy === 'person' && s.holdList !== undefined)).reverse();
  return (Object.keys(PLAN_NAMES) as ExerciseKind[]).flatMap((kind) => {
    const s = last.find((x) => x.exercise === kind);
    const list = s?.holdList ?? [];
    return list.length === 0 ? [] : [`${PLAN_NAMES[kind]}: ${plural(list.length, 'hold')} timed by you, the longest ${plural(Math.max(...list), 'second')}.`];
  });
}

/** Table rows for the same series. Each row carries the number of one chart point. */
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
