// Patient dashboard data (FR13). Pure functions, no clock, no storage.
// One function builds the series that a chart draws. A second function turns the
// same series into table rows, so the chart and the table cannot differ.
// The output holds numbers and labels only. It has no goal, no target line, no
// colour, no status and no trend field (guardrails skill, section Wording).

import type { SessionRecord } from './storage';

export const EXERCISE_LABEL = {
  'heel-slide': 'heel slide',
  'straight-leg-raise': 'straight leg raise',
  'mini-squat': 'mini squat',
  'seated-extension-hold': 'seated extension hold',
} as const;

type ExerciseKind = SessionRecord['exercise'];

/** Series titles. Units sit next to the numbers. The angle label is the one in the guardrails skill. */
export const SERIES_TITLE = {
  peakFlexion: (exercise: ExerciseKind) => `Peak knee bend, ${EXERCISE_LABEL[exercise]}, in degrees (estimated angle, not a medical measurement)`,
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
    points.push({ sessionId: s.id, date: s.date, degrees: s.peakFlexion });
    byExercise.set(s.exercise, points);
  }

  const reps = new Map<string, number | null>();
  for (const s of sorted) {
    const day = s.date.slice(0, 10);
    const before = reps.get(day) ?? null;
    reps.set(day, s.reps === null ? before : (before ?? 0) + s.reps);
  }

  return {
    peakFlexion: [...byExercise].map(([exercise, points]) => ({ exercise, title: SERIES_TITLE.peakFlexion(exercise), points })),
    repsPerDay: { title: SERIES_TITLE.repsPerDay, points: [...reps].map(([day, count]) => ({ day, reps: count })) },
    pain: { title: SERIES_TITLE.pain, points: sorted.map((s) => ({ sessionId: s.id, date: s.date, pain: s.pain })) },
  };
}

const NO_VALUE = 'no value';

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
