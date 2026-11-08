import { PAIN_FLOOR, PAUSE_MESSAGE, evaluateSession } from '../src/lib/safety';

const BANNED = /\b(correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|grade|pass|fail|goal|milestone)\b/i;

describe('evaluateSession: the safety floor of FR12', () => {
  it('pauses at the pain floor when the protocol sets no threshold', () => {
    expect(evaluateSession({ pain: PAIN_FLOOR, swelling: 'none' })).toMatchObject({ pause: true, reasons: ['pain'] });
  });

  it('does not pause below the pain floor', () => {
    expect(evaluateSession({ pain: PAIN_FLOOR - 1, swelling: 'none' })).toMatchObject({ pause: false, reasons: [] });
  });

  it('pauses for swelling "more" with no pain', () => {
    expect(evaluateSession({ pain: 0, swelling: 'more' })).toMatchObject({ pause: true, reasons: ['swelling'] });
  });

  it.each(['none', 'some'] as const)('does not pause for swelling %s', (swelling) => {
    expect(evaluateSession({ pain: 2, swelling }).pause).toBe(false);
  });

  it('uses a lower protocol threshold in place of the floor', () => {
    expect(evaluateSession({ pain: 5, swelling: 'none', painPauseThreshold: 5 }).pause).toBe(true);
    expect(evaluateSession({ pain: 4, swelling: 'none', painPauseThreshold: 5 }).pause).toBe(false);
  });

  it('keeps the floor when the protocol threshold is higher', () => {
    expect(evaluateSession({ pain: PAIN_FLOOR, swelling: 'none', painPauseThreshold: 9 }).pause).toBe(true);
  });

  it('pauses at the highest pain', () => {
    expect(evaluateSession({ pain: 10, swelling: 'none' }).pause).toBe(true);
  });

  it('lists both reasons when pain and swelling both apply', () => {
    expect(evaluateSession({ pain: 8, swelling: 'more' }).reasons).toEqual(['pain', 'swelling']);
  });

  it.each([Number.NaN, -1, 11, 2.5, Number.POSITIVE_INFINITY])('pauses for the invalid pain value %s', (pain) => {
    expect(evaluateSession({ pain, swelling: 'none' })).toMatchObject({ pause: true, reasons: ['invalid-input'] });
  });

  it('shows the fixed message only when it pauses', () => {
    expect(evaluateSession({ pain: 8, swelling: 'none' }).message).toBe(PAUSE_MESSAGE);
    expect(evaluateSession({ pain: 1, swelling: 'none' }).message).toBeNull();
  });
});

describe('PAUSE_MESSAGE', () => {
  it('tells the patient to pause and contact the care team', () => {
    expect(PAUSE_MESSAGE).toMatch(/pause/i);
    expect(PAUSE_MESSAGE).toMatch(/care team/i);
  });

  it('gives no diagnosis and no verdict word', () => {
    expect(PAUSE_MESSAGE).not.toMatch(BANNED);
    expect(PAUSE_MESSAGE).not.toMatch(/\b(infection|clot|dislocation|injury|tear|arthritis)\b/i);
  });
});
