import { guideFor, type Guide } from '../src/lib/guides';
import { EXERCISE_KINDS } from '../src/lib/protocol/schema';

const FIELDS: (keyof Guide)[] = ['startPosition', 'legFacingCamera', 'handsAndSupport', 'range', 'speed', 'cameraMustSee'];
const BANNED = ['correct', 'incorrect', 'good', 'bad', 'perfect', 'wrong', 'mistake', 'safe', 'dangerous', 'score', 'grade', 'pass', 'fail', 'goal', 'milestone'];

describe('guideFor', () => {
  it.each(EXERCISE_KINDS)('%s has every field with text', (kind) => {
    const guide = guideFor(kind);
    FIELDS.forEach((f) => expect(guide[f].trim().length).toBeGreaterThan(0));
    expect(Object.keys(guide).sort()).toEqual([...FIELDS].sort());
  });

  it.each(EXERCISE_KINDS)('%s has no verdict word', (kind) => {
    const text = Object.values(guideFor(kind)).join(' ').toLowerCase();
    BANNED.forEach((w) => expect(text).not.toMatch(new RegExp(`\\b${w}\\b`)));
  });

  it.each(EXERCISE_KINDS)('%s has sentences of 25 words at most', (kind) => {
    (Object.values(guideFor(kind)) as string[]).forEach((text) =>
      text.split(/(?<=[.!?])\s+/).forEach((s: string) => expect(s.split(/\s+/).length).toBeLessThanOrEqual(25)),
    );
  });

  it.each(EXERCISE_KINDS)('%s sets no number that the protocol sets and leaves the limit to the care team', (kind) => {
    const g = guideFor(kind);
    expect(Object.values(g).join(' ')).not.toMatch(/\d/);
    if (kind !== 'straight-leg-raise') expect(g.range).toMatch(/care team sets/);
  });

  it('the near leg is the operated leg in every guide', () => {
    EXERCISE_KINDS.forEach((k) => expect(guideFor(k).legFacingCamera.toLowerCase()).toMatch(/operated (leg|side)/));
  });

  it('the mini squat is side-on to the camera', () => {
    expect(guideFor('mini-squat').startPosition).toMatch(/side-on/);
  });
});
