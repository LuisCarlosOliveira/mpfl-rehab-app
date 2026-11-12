// Technique lines of the five new exercises (Step C). Each line is a PROPOSAL of the app.
// The sources name the exercise. The repo holds no technique quote for them, so a line is a paraphrase of the name only.
import { PROPOSAL_NOTE, SOURCE_NAMES, techniqueFor } from '../src/lib/technique';
import { HOME_EXERCISE_KINDS } from '../src/lib/protocol/schema';
import { SOURCES } from '../src/lib/protocolGen/sources';

const BANNED = ['correct', 'incorrect', 'good', 'bad', 'perfect', 'wrong', 'mistake', 'safe', 'dangerous', 'score', 'grade', 'pass', 'fail', 'goal', 'milestone', 'should'];
const NAMED_BY: Record<(typeof HOME_EXERCISE_KINDS)[number], string[]> = {
  'quad-set': ['S1', 'P1', 'P2', 'P3', 'N3'],
  'gluteal-set': ['P1', 'P2', 'N3'],
  'ankle-pump': ['P1', 'P3'],
  'leg-raise-side': ['S1', 'P2', 'P3'],
  'leg-raise-back': ['S1', 'P2', 'P3'],
};

describe('techniqueFor the five new exercises', () => {
  it.each(HOME_EXERCISE_KINDS)('%s: at least three lines, each marked PROPOSAL, with known sources that name the exercise', (kind) => {
    const lines = techniqueFor(kind);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    lines.forEach((l) => {
      expect(l.proposal, l.text).toBe(true);
      expect(l.sources.length).toBeGreaterThan(0);
      l.sources.forEach((s) => {
        expect(SOURCE_NAMES[s], s).toBeTruthy();
        expect(NAMED_BY[kind], `${kind} ${s}`).toContain(s);
        expect(SOURCES[s as keyof typeof SOURCES]?.id).toBe(s);
      });
    });
  });

  it.each(HOME_EXERCISE_KINDS)('%s: no number, no verdict word, no "should", sentences of 20 words at most', (kind) => {
    const text = techniqueFor(kind).map((l) => l.text).join(' ');
    expect(text).not.toMatch(/\d/);
    BANNED.forEach((w) => expect(text.toLowerCase()).not.toMatch(new RegExp(`\\b${w}\\b`)));
    text.split(/(?<=[.!?])\s+/).forEach((s) => expect(s.split(/\s+/).length, s).toBeLessThanOrEqual(20));
  });

  it('the four existing exercises are not marked PROPOSAL', () => {
    (['heel-slide', 'straight-leg-raise', 'mini-squat', 'seated-extension-hold'] as const).forEach((k) => techniqueFor(k).forEach((l) => expect(l.proposal).toBe(false)));
  });

  it('the note says that the lines are a proposal of the app and that the care team decides', () => {
    expect(PROPOSAL_NOTE).toMatch(/proposal of the app/);
    expect(PROPOSAL_NOTE).toMatch(/care team/);
  });

  it('the quad set and the towel roll: only P1 names the towel', () => {
    const towel = techniqueFor('quad-set').find((l) => /towel/.test(l.text))!;
    expect(towel.sources).toEqual(['P1']);
  });
});
