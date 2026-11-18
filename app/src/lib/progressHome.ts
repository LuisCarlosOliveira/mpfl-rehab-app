// The small part of the progress check that Home needs: the last plan week, the card text and the last session line.
// It is its own file so that Home does not carry the whole check. progressCheck.ts imports and lists every text in allProgressTexts.
import { PLAN_NAMES, localIsoDate } from './planView';
import { hasAngleChart } from './progress';
import type { SessionRecord } from './storage';

/** The last week for which the app makes a plan. S1 and P3 start the next stage at week 12 (audit rows V3 and V4, EXACT). */
export const LAST_PLAN_WEEK = 11;
export const CHECK_TITLE = 'Check my progress';
export const ANGLE = 'estimated angle, not a medical measurement';

export const weekLine = (n: number): string => `You are in week ${n} after your surgery.`;

/** The text of the card on Home. */
export const progressCard = (week: number): string => `${weekLine(week)} The app compares your sessions with published guidelines. The app changes nothing.`;

/** The local calendar day of a stored timestamp. The plan date is a local date, so the UTC day (slice of the text) can be a day off. */
export const localDayOf = (iso: string): string => localIsoDate(new Date(iso));

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

export interface SessionParts {
  day: string;
  /** The exercise name in lower case. */
  name: string;
  /** The measured number in words, or null when the session has none. */
  measure: string | null;
  /** True when the measure is a camera angle. The text next to it must say "estimated angle, not a medical measurement". */
  angle: boolean;
}

/** The parts of one session line, for Home and for the list of last sessions. They give no verdict. */
export function sessionParts(s: SessionRecord): SessionParts {
  const base = { day: localDayOf(s.date), name: PLAN_NAMES[s.exercise].toLowerCase() };
  if (s.peakFlexion !== null && hasAngleChart(s.exercise)) return { ...base, measure: `peak knee bend ${Math.round(s.peakFlexion)} degrees`, angle: true };
  if (s.reps !== null) return { ...base, measure: plural(s.reps, 'rep'), angle: false };
  if (s.holdSeconds !== null) return { ...base, measure: `hold ${plural(s.holdSeconds, 'second')}`, angle: false };
  return { ...base, measure: null, angle: false };
}

/** One line for Home: the last session with its measured number. It gives no verdict. */
export function lastSessionLine(s: SessionRecord): string {
  const { day, name, measure, angle } = sessionParts(s);
  const head = `Last session: ${day}, ${name}`;
  return measure === null ? `${head}.` : angle ? `${head}, ${measure} (${ANGLE}).` : `${head}, ${measure}.`;
}
