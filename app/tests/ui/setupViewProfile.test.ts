import { cameraStatusText, chipFor, jointsSeen, ruleRows, beforeYouStart } from '../../src/ui/setupView';

const foot = { track: 'knee-to-toe', view: 'side' } as const;
const front = { track: 'whole-leg', view: 'front' } as const;

describe('rule rows by profile', () => {
  it('knee to toe: rows for knee, ankle and foot, and "Knee to toes in the frame"', () => {
    const labels = ruleRows('ready', foot).map((r) => r.label);
    expect(labels).toEqual(['Person in the view', 'Knee, ankle and foot', 'Knee to toes in the frame']);
  });
  it('knee to toe: a hidden foot is "not seen" on the foot row', () => {
    expect(ruleRows('show-leg', foot).find((r) => r.label === 'Knee, ankle and foot')?.word).toBe('not seen');
    expect(jointsSeen('show-leg', foot)).toBe(false);
    expect(jointsSeen('ready', foot)).toBe(true);
    expect(chipFor('whole-leg', foot).text).toBe('Knee to toes in the frame: not seen');
  });
  it('front view: no side-on row, because the check has no hip rule for it', () => {
    const labels = ruleRows('ready', front).map((r) => r.label);
    expect(labels).toEqual(['Person in the view', 'Hip, knee and ankle', 'Whole leg in the frame', 'Leg big enough in the frame', 'Leg held still']);
  });
  it('the default profile keeps the six rows', () => {
    expect(ruleRows('ready').map((r) => r.label)).toEqual([
      'Person in the view', 'Hip, knee and ankle', 'Whole leg in the frame', 'Leg big enough in the frame', 'Side-on to the camera', 'Leg held still',
    ]);
  });
  it('the status text names what the check waits for', () => {
    expect(cameraStatusText('whole-leg', foot)).toBe('Waiting for your knee to your toes');
    expect(cameraStatusText('whole-leg')).toBe('Waiting for your whole leg');
  });
  it('the note before the start follows the profile, and the timers get their own line', () => {
    expect(beforeYouStart(foot)).toMatch(/knee to your toes/);
    expect(beforeYouStart(front)).toMatch(/in front of you/);
    expect(beforeYouStart(null)).toBe('The camera cannot see this effort. The app times your hold.');
    expect(beforeYouStart({ track: 'whole-leg', view: 'side' })).toMatch(/side that you chose/);
  });
});
