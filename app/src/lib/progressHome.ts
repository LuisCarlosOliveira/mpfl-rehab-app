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

/** One line for Home: the last session with its measured number. It gives no verdict. */
export function lastSessionLine(s: SessionRecord): string {
  const head = `Last session: ${localDayOf(s.date)}, ${PLAN_NAMES[s.exercise].toLowerCase()}`;
  if (s.peakFlexion !== null && hasAngleChart(s.exercise)) return `${head}, peak knee bend ${Math.round(s.peakFlexion)} degrees (${ANGLE}).`;
  if (s.reps !== null) return `${head}, ${plural(s.reps, 'rep')}.`;
  if (s.holdSeconds !== null) return `${head}, hold ${plural(s.holdSeconds, 'second')}.`;
  return `${head}.`;
}
