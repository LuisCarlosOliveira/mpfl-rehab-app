export const VERDICT_WORDS = [
  'correct',
  'incorrect',
  'good',
  'bad',
  'perfect',
  'wrong',
  'mistake',
  'safe',
  'dangerous',
  'score',
  'grade',
  'pass',
  'fail',
  'goal',
  'milestone',
] as const;

const PATTERN = new RegExp(`\\b(${VERDICT_WORDS.join('|')})\\b`, 'i');

/** The first verdict word in the text, or null. */
export function hasVerdictWord(text: string): string | null {
  return PATTERN.exec(text)?.[1] ?? null;
}
