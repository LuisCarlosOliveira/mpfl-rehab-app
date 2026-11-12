// Guide texts of the five new exercises (Step C). Every line is a PROPOSAL of the app.
import { specFor } from '../../src/lib/monitor/registry';
import { guideFor, type NewGuideKind } from '../../src/lib/guides';

const NEW: NewGuideKind[] = ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'];
const BANNED = ['correct', 'incorrect', 'good', 'bad', 'perfect', 'wrong', 'mistake', 'safe', 'dangerous', 'score', 'grade', 'pass', 'fail', 'goal', 'milestone', 'should'];
const text = (k: NewGuideKind) => Object.values(guideFor(k)).join(' ');

describe('guides of the five new exercises', () => {
  it.each(NEW)('%s: guideFor returns six texts, a PROPOSAL basis, sentences of 20 words at most, no verdict word, no "should"', (k) => {
    expect(specFor(k)!.guide.basis.kind).toBe('proposal');
    expect(Object.keys(guideFor(k))).toHaveLength(6);
    text(k).split(/(?<=[.!?])\s+/).forEach((s) => expect(s.split(/\s+/).length, s).toBeLessThanOrEqual(20));
    BANNED.forEach((w) => expect(text(k).toLowerCase()).not.toMatch(new RegExp(`\\b${w}\\b`)));
  });

  it('names only the sources that name the exercise', () => {
    const ids = (k: NewGuideKind) => [...specFor(k)!.guide.basis.sourceIds].sort();
    expect(ids('quad-set')).toEqual(['N3', 'P1', 'P2', 'P3', 'S1']);
    expect(ids('gluteal-set')).toEqual(['N3', 'P1', 'P2']);
    expect(ids('ankle-pump')).toEqual(['P1', 'P3']);
    expect(ids('leg-raise-side')).toEqual(['P2', 'P3', 'S1']);
    expect(ids('leg-raise-back')).toEqual(['P2', 'P3', 'S1']);
  });

  it('the quad set and the gluteal set say that the camera cannot see the effort and that the app times the hold', () => {
    for (const k of ['quad-set', 'gluteal-set'] as const) {
      expect(guideFor(k).cameraMustSee).toBe('The camera cannot see this effort. The app times your hold.');
      expect(guideFor(k).speed).toMatch(/start and to end each hold/);
    }
  });

  it('the ankle pump needs knee to toe in the side view', () => {
    expect(guideFor('ankle-pump').cameraMustSee).toMatch(/knee to your toes/);
    expect(guideFor('ankle-pump').legFacingCamera).toMatch(/side view/);
  });

  it('the leg raise to the side has the camera in front at hip height', () => {
    const g = guideFor('leg-raise-side');
    expect(g.startPosition).toMatch(/Lie on your side/);
    // R-01: side-lying only. A standing leg is near vertical and would read as raised at once.
    for (const text of [g.startPosition, g.legFacingCamera, g.handsAndSupport, g.range, g.speed, g.cameraMustSee]) expect(text).not.toMatch(/stand/i);
    expect(g.legFacingCamera).toMatch(/in front of you/);
    expect(g.legFacingCamera).toMatch(/hip height/);
  });

  it('the leg raise to the back is side-on with hand support and the camera at the side', () => {
    const g = guideFor('leg-raise-back');
    expect(g.startPosition).toMatch(/side-on/);
    expect(g.handsAndSupport).toMatch(/Hold a counter or a chair back/);
    expect(g.legFacingCamera).toMatch(/at the side/);
  });

  it('the chosen leg legend replaces "operated"', () => {
    NEW.forEach((k) => expect(JSON.stringify(guideFor(k, 'chosen'))).not.toMatch(/operated/));
  });
});
