import { PLAN_NAMES, localIsoDate } from './planView';
import { hasAngleChart } from './progress';
import type { SessionRecord } from './storage';

export const LAST_PLAN_WEEK = 11;
export const CHECK_TITLE = 'Check my progress';
export const ANGLE = 'estimated angle, not a medical measurement';

export const weekLine = (n: number): string => `You are in week ${n} after your surgery.`;

export const progressCard = (week: number): string => `${weekLine(week)} The app compares your sessions with published guidelines. The app changes nothing.`;

export const localDayOf = (iso: string): string => localIsoDate(new Date(iso));

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

export interface SessionParts {
  day: string;
  name: string;
  measure: string | null;
  angle: boolean;
}

export function sessionParts(s: SessionRecord): SessionParts {
  const base = { day: localDayOf(s.date), name: PLAN_NAMES[s.exercise].toLowerCase() };
  if (s.peakFlexion !== null && hasAngleChart(s.exercise)) return { ...base, measure: `peak knee bend ${Math.round(s.peakFlexion)} degrees`, angle: true };
  if (s.reps !== null) return { ...base, measure: plural(s.reps, 'rep'), angle: false };
  if (s.holdSeconds !== null) return { ...base, measure: `hold ${plural(s.holdSeconds, 'second')}`, angle: false };
  return { ...base, measure: null, angle: false };
}

export function lastSessionLine(s: SessionRecord): string {
  const { day, name, measure, angle } = sessionParts(s);
  const head = `Last session: ${day}, ${name}`;
  return measure === null ? `${head}.` : angle ? `${head}, ${measure} (${ANGLE}).` : `${head}, ${measure}.`;
}
