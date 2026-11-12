// Exercise monitoring, step E: the words of the care team view for the new stored values.
import { MARGIN_SOURCE } from '../src/lib/margin';
import { holdsText, measuredText, REPORT_NAME, TIMED_BY_PERSON } from '../src/lib/reviewSummary';
import { REPORT_KEYS, type SessionRecord } from '../src/lib/storage/db';

const rec = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  id: 1, date: '2026-11-01T10:00:00.000Z', exercise: 'leg-raise-back', side: 'left', reps: 5, peakFlexion: null, holdSeconds: null, topFlexion: null,
  marginDeg: 9, marginSource: MARGIN_SOURCE, view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0, redFlagBlocks: 0,
  pain: 1, swelling: 'none', protocolId: 'p', phase: 1, schemaVersion: 1, ...over,
});

describe('measuredText', () => {
  it('writes the name and whole degrees', () => {
    expect(measuredText(rec({ reportKey: 'lift-angle', reportValue: 38.4 }))).toBe('Lift angle 38 degrees');
    expect(measuredText(rec({ reportKey: 'lift-angle', reportValue: 38.5 }))).toBe('Lift angle 39 degrees');
    expect(measuredText(rec({ reportKey: 'ankle-range', reportValue: 22 }))).toBe('Ankle range 22 degrees');
    expect(measuredText(rec({ reportKey: 'knee-angle-top', reportValue: 0.2 }))).toBe('Knee angle at the top 0 degrees');
  });
  it('has a name for every key and returns null when there is no value', () => {
    for (const k of REPORT_KEYS) expect(REPORT_NAME[k]).toMatch(/^[A-Z]/);
    expect(measuredText(rec())).toBeNull();
  });
});

describe('holdsText', () => {
  it('writes the seconds in the order of the list, and null with no list', () => {
    expect(holdsText(rec({ holdList: [5, 8, 6] }))).toBe('5, 8, 6 seconds');
    expect(holdsText(rec({ holdList: [1] }))).toBe('1 second');
    expect(holdsText(rec({ holdList: [] }))).toBeNull();
    expect(holdsText(rec())).toBeNull();
  });
  it('has a fixed mark for a record that the person timed', () => {
    expect(TIMED_BY_PERSON).toBe('timed by the person');
  });
});
