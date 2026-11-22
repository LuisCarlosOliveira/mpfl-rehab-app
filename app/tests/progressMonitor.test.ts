import { MARGIN_SOURCE } from '../src/lib/margin';
import { PLAN_NAMES } from '../src/lib/planView';
import { buildProgressSeries, exerciseLabel, EXERCISE_LABEL, holdLines, toTableRows } from '../src/lib/progress';
import { PLAN_EXERCISE_KINDS } from '../src/lib/protocol/schema';
import type { SessionRecord } from '../src/lib/storage';
import { EXERCISE_NAMES } from '../src/ui/labels';

let nextId = 1;
const session = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  id: nextId++, date: '2026-11-01T10:00:00.000Z', exercise: 'mini-squat', side: 'left', reps: 10, peakFlexion: 60, holdSeconds: null,
  topFlexion: null, marginDeg: 9, marginSource: MARGIN_SOURCE, view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0,
  redFlagBlocks: 0, pain: 2, swelling: 'none', protocolId: 'p-1', phase: 1, schemaVersion: 1, ...over,
});
const timed = (over: Partial<SessionRecord> = {}) => session({ exercise: 'quad-set', reps: null, peakFlexion: null, timedBy: 'person', holdList: [5, 8, 6], ...over });

describe('one name for each exercise', () => {
  it('uses the plan name everywhere, with a capital letter', () => {
    for (const k of PLAN_EXERCISE_KINDS) {
      expect(exerciseLabel(k), k).toBe(PLAN_NAMES[k]);
      expect(EXERCISE_LABEL[k], k).toBe(PLAN_NAMES[k]);
      expect(EXERCISE_NAMES[k], k).toBe(PLAN_NAMES[k]);
      expect(exerciseLabel(k)).toMatch(/^[A-Z]/);
    }
  });

  it('puts the capital name in a chart title and in a table row', () => {
    const s = buildProgressSeries([session({ exercise: 'heel-slide', peakFlexion: 80 })]);
    expect(s.peakFlexion[0]?.title).toContain('Peak knee bend, Heel slide,');
    expect(toTableRows(s)[0]?.series).toContain('Heel slide');
    expect(JSON.stringify(s)).not.toContain('heel slide');
  });
});

describe('reps for each day with person-timed holds', () => {
  it('does not count a hand-timed record, even when a reps number is stored', () => {
    const s = buildProgressSeries([session({ reps: 10 }), timed({ reps: 7 }), timed({ exercise: 'gluteal-set', reps: 3 })]);
    expect(s.repsPerDay.points).toEqual([{ day: '2026-11-01', reps: 10 }]);
  });

  it('shows no reps day when only hand-timed sessions exist, and draws no angle series for them', () => {
    const s = buildProgressSeries([timed(), timed({ exercise: 'gluteal-set' })]);
    expect(s.repsPerDay.points).toEqual([]);
    expect(s.peakFlexion).toEqual([]);
  });

  it('keeps camera counts of the three camera exercises with the others', () => {
    const s = buildProgressSeries([
      session({ exercise: 'ankle-pump', reps: 12, peakFlexion: null }), session({ exercise: 'leg-raise-side', reps: 6, peakFlexion: null }),
      session({ exercise: 'leg-raise-back', reps: 5, peakFlexion: null, reportKey: 'lift-angle', reportValue: 31 }),
    ]);
    expect(s.repsPerDay.points).toEqual([{ day: '2026-11-01', reps: 23 }]);
    expect(s.peakFlexion).toEqual([]); // the angle values show in the care team table only
  });
});

describe('holdLines, one line for each person-timed exercise', () => {
  it('writes the count and the longest hold of the last session only', () => {
    const lines = holdLines([
      timed({ date: '2026-11-01T10:00:00.000Z', holdList: [30, 40, 50, 60] }),
      timed({ date: '2026-11-03T10:00:00.000Z', holdList: [5, 8, 6] }),
    ]);
    expect(lines).toEqual(['Quadriceps set: 3 holds timed by you, the longest 8 seconds.']);
  });

  it('writes one line for each exercise in plan order, and singular words for one hold', () => {
    const lines = holdLines([timed({ exercise: 'gluteal-set', holdList: [1] }), timed({ holdList: [4, 9] })]);
    expect(lines).toEqual(['Quadriceps set: 2 holds timed by you, the longest 9 seconds.', 'Gluteal set: 1 hold timed by you, the longest 1 second.']);
  });

  it('skips a session with no hold, a camera session and a record with no list', () => {
    expect(holdLines([timed({ holdList: [] }), session(), timed({ holdList: undefined })])).toEqual([]);
  });

  it('has no total, no goal and no running count', () => {
    const text = holdLines([timed(), timed({ date: '2026-11-02T10:00:00.000Z' })]).join(' ');
    expect(text).not.toMatch(/total|goal|streak|in a row|so far|days|target/i);
  });
});
