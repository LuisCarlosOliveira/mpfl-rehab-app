import { IDENTITY_CONFIG, createIdentityWatcher, otherLegConfirmed, type MovingLeg } from '../src/lib/legIdentity';
import type { Side } from '../src/lib/angle';
import { CLIP_SERIES } from './fixtures/clipSeries';
import { rowFrame } from './helpers/clip';

const answers = (clip: string): MovingLeg[] => {
  const s = CLIP_SERIES[clip]!;
  const w = createIdentityWatcher(s.aspect);
  const out: MovingLeg[] = [];
  s.rows.forEach((r, i) => {
    const f = rowFrame(r, i);
    const a = w.push(f.landmarks, f.tMs);
    if (a !== null) out.push(a);
  });
  return out;
};
const otherOf = (side: Side): Side => (side === 'left' ? 'right' : 'left');
const noteShows = (clip: string, chosen: Side) => otherLegConfirmed(answers(clip), otherOf(chosen));

describe('otherLegConfirmed', () => {
  it('needs the same other leg in the last two windows', () => {
    expect(IDENTITY_CONFIG.confirmWindows).toBe(2);
    expect(otherLegConfirmed(['right'], 'right')).toBe(false);
    expect(otherLegConfirmed(['right', 'right'], 'right')).toBe(true);
    expect(otherLegConfirmed(['left', 'right'], 'right')).toBe(false);
    expect(otherLegConfirmed(['right', 'ambiguous'], 'right')).toBe(false);
    expect(otherLegConfirmed(['right', 'none'], 'right')).toBe(false);
    expect(otherLegConfirmed([], 'right')).toBe(false);
  });

  it('clears when a later window does not name the other leg', () => {
    expect(otherLegConfirmed(['right', 'right', 'ambiguous'], 'right')).toBe(false);
    expect(otherLegConfirmed(['right', 'left', 'right', 'right'], 'right')).toBe(true);
  });
});

describe('the note on the saved clips (the first 18 seconds, two windows)', () => {
  it('the windows of the clips are what the replay gave', () => {
    expect(answers('01')).toEqual(['ambiguous', 'ambiguous']);
    expect(answers('03')).toEqual(['right', 'right']);
    expect(answers('06')).toEqual(['left', 'left']);
  });

  it('shows nothing when the chosen leg is the one that the pose data shows moving (clips 02, 03, 04, 05, 06)', () => {
    expect(noteShows('02', 'left')).toBe(false);
    expect(noteShows('03', 'right')).toBe(false);
    expect(noteShows('04', 'left')).toBe(false);
    expect(noteShows('05', 'left')).toBe(false);
    expect(noteShows('06', 'left')).toBe(false);
  });

  it('shows nothing on clips where both legs move or the view is not a side view (01, 07), whatever leg is chosen', () => {
    for (const side of ['left', 'right'] as const) {
      expect(noteShows('01', side)).toBe(false);
      expect(noteShows('07', side)).toBe(false);
    }
  });

  it('shows nothing on clips 02, 04 and 05 for either leg, because no leg wins two windows in a row', () => {
    for (const clip of ['02', '04', '05']) for (const side of ['left', 'right'] as const) expect(noteShows(clip, side)).toBe(false);
  });

  it('shows the note only where one leg clearly wins both windows and the other leg is chosen (clips 03 and 06)', () => {
    expect(noteShows('03', 'left')).toBe(true);
    expect(noteShows('06', 'right')).toBe(true);
  });
});
