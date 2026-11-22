import { SETUP_TEXT, createSetupStabilizer, evaluateSetup, setupText, SETUP_CONFIG } from '../src/lib/setupRules';
import { doneLying } from '../src/lib/exercises';
import { legLandmarks } from './helpers/leg';
import { CLIP_SERIES } from './fixtures/clipSeries';
import { rowFrame } from './helpers/clip';

const turn = () => {
  const lm = legLandmarks('left', 20);
  lm[27] = { x: 0.5, y: 0.7, visibility: 0.2 };
  [24, 26, 28].forEach((i) => (lm[i] = { x: 0.5, y: 0.5, visibility: 1 }));
  return lm;
};

describe('exercises done lying', () => {
  it('names the heel slide and the straight leg raise, and not the mini squat or the seated hold', () => {
    expect(doneLying('heel-slide')).toBe(true);
    expect(doneLying('straight-leg-raise')).toBe(true);
    expect(doneLying('mini-squat')).toBe(false);
    expect(doneLying('seated-extension-hold')).toBe(false);
  });
});

describe('setup texts for a person who lies down', () => {
  it('keeps the text of an upright person', () => {
    expect(evaluateSetup(turn(), 'left', 1, SETUP_CONFIG, [], 'left').text).toBe(SETUP_TEXT['turn-leg']);
    expect(evaluateSetup(turn(), 'left', 1, SETUP_CONFIG, [], 'left', 'upright').text).toBe('Turn so your chosen leg faces the camera.');
  });

  it('asks to move the camera and not to turn the body, for the turn rule and the side-on rule', () => {
    const r = evaluateSetup(turn(), 'left', 1, SETUP_CONFIG, [], 'left', 'lying');
    expect(r.id).toBe('turn-leg');
    expect(r.text).toBe(setupText('turn-leg', 'lying'));
    expect(setupText('turn-leg', 'lying')).toMatch(/camera/i);
    expect(setupText('side-on', 'lying')).toMatch(/camera/i);
    for (const id of ['turn-leg', 'side-on'] as const) expect(setupText(id, 'lying')).not.toMatch(/\bturn\b/i);
  });

  it('keeps every other text for a lying person', () => {
    for (const id of ['no-pose', 'show-leg', 'whole-leg', 'closer', 'still', 'ready'] as const) {
      expect(setupText(id, 'lying')).toBe(SETUP_TEXT[id]);
    }
  });

  it('gives the lying text in the stabilizer and its announcement', () => {
    const stab = createSetupStabilizer();
    let out = stab({ landmarks: turn(), side: 'left', cameraSide: 'left', aspect: 1, posture: 'lying' }, 0);
    out = stab({ landmarks: turn(), side: 'left', cameraSide: 'left', aspect: 1, posture: 'lying' }, 3500);
    expect(out.text).toBe(setupText('turn-leg', 'lying'));
    expect(out.announce ?? out.text).not.toMatch(/\bturn\b/i);
  });
});

describe('the lying clips (saved landmarks)', () => {
  // Clips 01 and 03 show a person who lies on a mat. The rule "turn-leg" fires there. The text must not say turn.
  const texts = (clip: string, side: 'left' | 'right') => {
    const s = CLIP_SERIES[clip]!;
    const found = new Set<string>();
    for (const [i, row] of s.rows.entries()) {
      const f = rowFrame(row, i);
      const r = evaluateSetup(f.landmarks, side, s.aspect, SETUP_CONFIG, [], side, 'lying');
      found.add(`${r.id}|${r.text}`);
    }
    return [...found];
  };

  it('the rule fires on the lying clips for the chosen leg that the camera sees less (so the rule is reached)', () => {
    const ids = [...texts('01', 'right'), ...texts('03', 'left'), ...texts('03', 'right'), ...texts('01', 'left')].map((t) => t.split('|')[0]);
    expect(ids).toContain('turn-leg');
  });

  it('no frame of the lying clips gives a text that says to turn', () => {
    for (const clip of ['01', '02', '03', '04']) for (const side of ['left', 'right'] as const) {
      for (const t of texts(clip, side)) expect(t.split('|')[1]).not.toMatch(/\bturn\b/i);
    }
  });

  it('the same frames give the old text for an upright person', () => {
    const s = CLIP_SERIES['03']!;
    const found = new Set<string>();
    for (const [i, row] of s.rows.entries()) {
      const f = rowFrame(row, i);
      const r = evaluateSetup(f.landmarks, 'left', s.aspect, SETUP_CONFIG, [], 'left', 'upright');
      if (r.id === 'turn-leg') found.add(r.text);
    }
    expect([...found]).toEqual([SETUP_TEXT['turn-leg']]);
  });
});
