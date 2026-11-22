import { SOURCE_NAMES, TECHNIQUE_NOTE, techniqueFor } from '../src/lib/technique';
import { EXERCISE_KINDS } from '../src/lib/protocol/schema';

const BANNED = ['correct', 'incorrect', 'good', 'bad', 'perfect', 'wrong', 'mistake', 'safe', 'dangerous', 'score', 'grade', 'pass', 'fail', 'goal', 'milestone'];
const all = (kind: (typeof EXERCISE_KINDS)[number]) => techniqueFor(kind).map((l) => l.text).join(' ');

describe('techniqueFor', () => {
  it.each(EXERCISE_KINDS)('%s has lines and each line names known sources', (kind) => {
    const lines = techniqueFor(kind);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    lines.forEach((l) => {
      expect(l.sources.length).toBeGreaterThan(0);
      l.sources.forEach((s) => expect(SOURCE_NAMES[s]).toBeTruthy());
    });
  });

  it.each(EXERCISE_KINDS)('%s has no number, no verdict word and short sentences', (kind) => {
    const text = all(kind);
    expect(text).not.toMatch(/\d/);
    BANNED.forEach((w) => expect(text.toLowerCase()).not.toMatch(new RegExp(`\\b${w}\\b`)));
    text.split(/(?<=[.!?])\s+/).forEach((s) => expect(s.split(/\s+/).length).toBeLessThanOrEqual(25));
  });

  it('marks a line BORROWED when no source of it is about MPFL reconstruction', () => {
    const heel = techniqueFor('heel-slide');
    expect(heel.find((l) => /sock or a towel/.test(l.text))?.borrowed).toBe(true);
    expect(heel.find((l) => /limit that your care team sets/.test(l.text))?.borrowed).toBe(false);
  });

  it('the leg raise gives no lift height and sends the person to the care team', () => {
    const slr = all('straight-leg-raise');
    expect(slr).toMatch(/Ask your care team how high to lift your leg/);
    expect(slr).not.toMatch(/height of your other knee/);
  });

  it('the leg raise names that sources differ on the other leg and the toes', () => {
    expect(all('straight-leg-raise')).toMatch(/Sources differ on the position of your other leg/);
    expect(all('straight-leg-raise')).toMatch(/Sources differ on the position of your toes/);
  });

  it('the seated hold never asks for a straight knee and leaves out the toe position', () => {
    const text = all('seated-extension-hold');
    expect(text).toMatch(/Do not straighten your knee past that angle/);
    expect(text).not.toMatch(/Straighten your knee\./);
    expect(text).not.toMatch(/toes/i);
  });

  it('leaves out the points that only one source states (weak)', () => {
    expect(all('mini-squat')).not.toMatch(/heels|lock/i);
    expect(all('heel-slide')).not.toMatch(/hips/i);
  });

  it('the mini squat says that the app does not check the knee direction', () => {
    expect(all('mini-squat')).toMatch(/The app does not check this/);
  });

  it('the note says paraphrase, level of evidence and that the care team decides', () => {
    expect(TECHNIQUE_NOTE).toMatch(/paraphrase/i);
    expect(TECHNIQUE_NOTE).toMatch(/opinion/i);
    expect(TECHNIQUE_NOTE).toMatch(/care team/);
  });
});
