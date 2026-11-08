import { readFileSync } from 'node:fs';
import { classifyAgainstLimit } from '../src/lib/margin';
import { protocolSchema, type Protocol } from '../src/lib/protocol/schema';
import { allSummaryTexts, buildReviewSummary, STATE, type ReviewRow } from '../src/lib/reviewSummary';
import type { SessionRecord } from '../src/lib/storage';

let nextId = 1;
function session(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: nextId++, date: '2026-11-01T10:00:00.000Z', exercise: 'mini-squat', side: 'left', reps: 10, peakFlexion: 100, holdSeconds: null,
    topFlexion: null, marginDeg: 9, marginSource: 'start value', view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0,
    redFlagBlocks: 0, pain: 2, swelling: 'none', protocolId: 'p-1', phase: 1, schemaVersion: 1, ...over,
  };
}
const day = (n: number) => `2026-11-${String(n).padStart(2, '0')}T10:00:00.000Z`;
/** One mini-squat session on day n with this peak. */
const squat = (n: number, peak: number | null, over: Partial<SessionRecord> = {}) => session({ date: day(n), peakFlexion: peak, ...over });

const NOW = new Date('2026-11-20T09:00:00.000Z');

function protocolWith(reviewCriteria: unknown[], extra: Record<string, unknown> = {}): Protocol {
  return protocolSchema.parse({
    schemaVersion: 1, id: 'p-1', side: 'left', activePhase: 1, surgeon: {}, ...extra,
    phases: [{ id: 1, name: 'Protection', reviewDate: '2026-12-01', exercises: [{ kind: 'mini-squat', source: 'PROPOSAL' }], reviewCriteria }],
  });
}
const peakCriterion = (over: Record<string, unknown> = {}) => ({
  kind: 'numeric', measure: 'peakFlexionDeg', exerciseId: 'mini-squat', op: 'atLeast', limit: 110, lastSessions: 3, evidence: 'borrowed', ...over,
});

function firstRow(sessions: SessionRecord[], criterion: unknown = peakCriterion(), lastExportAt: string | null = null): ReviewRow {
  const summary = buildReviewSummary({ protocol: protocolWith([criterion]), phaseId: 1, sessions, lastExportAt, now: NOW });
  return summary.rows[0] as ReviewRow;
}
/** Three sessions with the same peak, so the median is that peak. */
const threeAt = (peak: number) => [squat(1, peak), squat(2, peak), squat(3, peak)];

describe('limit 110, margin 9 (progression.md section 5.2)', () => {
  it.each([
    [100, STATE.below],
    [101, STATE.cannotTell],
    [105, STATE.cannotTell],
    [110, STATE.cannotTell],
    [119, STATE.cannotTell],
    [120, STATE.above],
    [130, STATE.above],
  ])('a median of %i reads "%s"', (peak, state) => {
    expect(firstRow(threeAt(peak)).state).toBe(state);
  });

  it('agrees with classifyAgainstLimit at every whole degree', () => {
    const phrase = { above: STATE.above, below: STATE.below, 'cannot-tell': STATE.cannotTell };
    for (let v = 80; v <= 140; v++) expect(firstRow(threeAt(v)).state).toBe(phrase[classifyAgainstLimit(v, 110, 9)]);
  });

  it('uses the same phrase for atMost, and the criterion text carries the operator', () => {
    const least = firstRow(threeAt(125));
    const most = firstRow(threeAt(125), peakCriterion({ op: 'atMost' }));
    expect(least.state).toBe(STATE.above);
    expect(most.state).toBe(STATE.above);
    expect(least.criterion).toBe('Peak knee bend, mini squat, at least 110 degrees');
    expect(most.criterion).toBe('Peak knee bend, mini squat, at most 110 degrees');
    expect(firstRow(threeAt(95), peakCriterion({ op: 'atMost' })).state).toBe(STATE.below);
  });

  it('shows the limit, the evidence label and the margin from the sessions', () => {
    const row = firstRow([squat(1, 100, { marginDeg: 6, marginSource: 'A' }), squat(2, 100, { marginDeg: 12, marginSource: 'B' }), squat(3, 100)]);
    expect(row.limitText).toBe('110 degrees');
    expect(row.evidenceLabel).toBe('Evidence: borrowed from another condition');
    expect(row.marginDeg).toBe(12);
    expect(row.marginText).toBe('plus or minus 12 degrees');
    expect(row.marginSource).toBe('B');
    expect(row.measuredText).toContain('estimated angle, not a medical measurement');
  });
});

describe('the window', () => {
  it('gives "Not enough data" for fewer than N sessions', () => {
    const row = firstRow([squat(1, 130), squat(2, 130)]);
    expect(row.state).toBe(STATE.notEnough);
    expect(row.measured).toBeNull();
    expect(row.dataText).toBe('2 of 3 sessions');
  });

  it('ignores sessions with fewer than 5 counted reps, or with no rep count', () => {
    const sessions = [squat(1, 130), squat(2, 130), squat(3, 130, { reps: 4 }), squat(4, 130, { reps: null })];
    const row = firstRow(sessions);
    expect(row.state).toBe(STATE.notEnough);
    expect(row.sessionsUsed).toBe(2);
    expect(firstRow([...sessions, squat(5, 130, { reps: 5 })]).state).toBe(STATE.above);
  });

  it('ignores other exercises and other phases', () => {
    const sessions = [squat(1, 130), squat(2, 130), session({ date: day(3), exercise: 'heel-slide', peakFlexion: 130 }), squat(4, 130, { phase: 2 })];
    expect(firstRow(sessions).state).toBe(STATE.notEnough);
  });

  it('takes the LAST N sessions by date, whatever the list order', () => {
    const sessions = [squat(9, 130), squat(1, 50), squat(8, 130), squat(2, 50), squat(7, 130)];
    const row = firstRow(sessions);
    expect(row.measured).toBe(130);
    expect(row.state).toBe(STATE.above);
    expect(row.dataText).toBe('3 of 3 sessions');
  });

  it('uses the median of an odd count', () => {
    expect(firstRow([squat(1, 80), squat(2, 140), squat(3, 120)]).measured).toBe(120);
  });

  it('uses the mean of the two middle values for an even count', () => {
    const row = firstRow([squat(1, 100), squat(2, 140), squat(3, 120), squat(4, 130)], peakCriterion({ lastSessions: 4 }));
    expect(row.measured).toBe(125);
  });
});

describe('null values', () => {
  it('reads "Cannot tell" when the leg was hidden in one session of the window', () => {
    const row = firstRow([squat(1, 130), squat(2, null), squat(3, 130)]);
    expect(row.state).toBe(STATE.cannotTell);
    expect(row.measured).toBeNull();
  });

  it('reads "Cannot tell" for a straight leg raise top angle that is null', () => {
    const slr = (n: number, top: number | null) => session({ date: day(n), exercise: 'straight-leg-raise', topFlexion: top, peakFlexion: null });
    const crit = { kind: 'numeric', measure: 'topFlexionDeg', op: 'atMost', limit: 20, lastSessions: 3, evidence: 'unvalidated' };
    expect(firstRow([slr(1, 5), slr(2, null), slr(3, 5)], crit).state).toBe(STATE.cannotTell);
    expect(firstRow([slr(1, 40), slr(2, 40), slr(3, 40)], crit).state).toBe(STATE.above);
    expect(firstRow([slr(1, 40), slr(2, 40), slr(3, 40)], crit).criterion).toBe('Knee angle at the top, straight leg raise, at most 20 degrees');
  });
});

describe('pain, session count and swelling rows', () => {
  it('uses the highest pain of the last N sessions, with no camera margin', () => {
    const crit = { kind: 'numeric', measure: 'painMax', op: 'atMost', limit: 3, lastSessions: 3, evidence: 'unvalidated' };
    const row = firstRow([squat(1, 100, { pain: 9 }), squat(2, 100, { pain: 2 }), squat(3, 100, { pain: 5 }), squat(4, 100, { pain: 1 })], crit);
    expect(row.measured).toBe(5);
    expect(row.state).toBe(STATE.above);
    expect(row.marginDeg).toBeNull();
    expect(firstRow([squat(1, 100), squat(2, 100)], crit).state).toBe(STATE.notEnough);
  });

  it('counts the sessions of the phase', () => {
    const crit = { kind: 'numeric', measure: 'sessionsDone', op: 'atLeast', limit: 4, lastSessions: 3, evidence: 'unvalidated' };
    const row = firstRow([squat(1, 100), squat(2, 100), squat(3, 100), squat(4, 100, { phase: 2 })], crit);
    expect(row.measured).toBe(3);
    expect(row.state).toBe(STATE.below);
  });

  it('reads "Equal to the limit" for pain equal to the limit, and keeps the camera phrase out', () => {
    const crit = { kind: 'numeric', measure: 'painMax', op: 'atMost', limit: 5, lastSessions: 3, evidence: 'unvalidated' };
    const row = firstRow([squat(1, 100, { pain: 5 }), squat(2, 100, { pain: 1 }), squat(3, 100, { pain: 2 })], crit);
    expect(row.state).toBe(STATE.equal);
    expect(STATE.equal).toBe('Equal to the limit');
    expect(firstRow([squat(1, 100, { pain: 4 }), squat(2, 100), squat(3, 100)], crit).state).toBe(STATE.below);
  });

  it('reads "Equal to the limit" for a session count equal to the limit, with both operators', () => {
    for (const op of ['atLeast', 'atMost']) {
      const crit = { kind: 'numeric', measure: 'sessionsDone', op, limit: 3, lastSessions: 3, evidence: 'unvalidated' };
      expect(firstRow([squat(1, 100), squat(2, 100), squat(3, 100)], crit).state).toBe(STATE.equal);
    }
  });

  it('keeps the camera phrase for an angle equal to the limit', () => {
    expect(firstRow(threeAt(110)).state).toBe(STATE.cannotTell);
  });

  it('counts all sessions of the phase for sessionsDone, not only the last N', () => {
    const crit = { kind: 'numeric', measure: 'sessionsDone', op: 'atLeast', limit: 4, lastSessions: 3, evidence: 'unvalidated' };
    const row = firstRow([1, 2, 3, 4, 5].map((n) => squat(n, 100)), crit);
    expect(row.measured).toBe(5);
    expect(row.state).toBe(STATE.above);
  });

  it('counts the swelling answers of the last N sessions and gives no verdict state', () => {
    const crit = { kind: 'swelling', noneOrSomeOnly: true, lastSessions: 3, evidence: 'mpflr' };
    const row = firstRow([squat(1, 100, { swelling: 'more' }), squat(2, 100, { swelling: 'none' }), squat(3, 100, { swelling: 'some' }), squat(4, 100, { swelling: 'none' })], crit);
    expect(row.swellingAnswers).toEqual({ none: 2, some: 1, more: 0 });
    expect(row.state).toBeNull();
    expect(row.dataText).toBe('3 of 3 sessions');
    expect(firstRow([squat(1, 100)], crit).state).toBe(STATE.notEnough);
  });
});

describe('header, events and tables', () => {
  const protocol = protocolWith([peakCriterion()], { painPauseThreshold: 5 });
  const sessions = [
    squat(1, 100, { redFlagBlocks: 1, gaveWayPresses: 2, pain: 6, swelling: 'more' }),
    squat(5, 100, { redFlagBlocks: 2, gaveWayPresses: 1, pain: 5, swelling: 'more' }),
    squat(6, 100, { redFlagBlocks: 0, gaveWayPresses: 0, pain: 4, swelling: 'some' }),
    squat(7, 100, { redFlagBlocks: 3, gaveWayPresses: 4, pain: 9, swelling: 'none', phase: 2 }),
  ];

  it('counts events after the last export only', () => {
    const s = buildReviewSummary({ protocol, phaseId: 1, sessions, lastExportAt: day(2), now: NOW });
    expect(s.events).toEqual({ redFlagBlocks: 5, gaveWayPresses: 5, painAtPause: 2, swellingMore: 1 });
    expect(s.header.sessionsSinceExport).toBe(3);
  });

  it('counts all sessions when there was no export', () => {
    const s = buildReviewSummary({ protocol, phaseId: 1, sessions, lastExportAt: null, now: NOW });
    expect(s.events).toEqual({ redFlagBlocks: 6, gaveWayPresses: 7, painAtPause: 3, swellingMore: 2 });
    expect(s.header.sessionsSinceExport).toBe(4);
  });

  it('uses the safety floor of 7 when the protocol sets no pain threshold', () => {
    const s = buildReviewSummary({ protocol: protocolWith([]), phaseId: 1, sessions, lastExportAt: null, now: NOW });
    expect(s.events.painAtPause).toBe(1);
  });

  it('fills the header from the caller values', () => {
    const s = buildReviewSummary({ protocol, phaseId: 1, sessions: [], lastExportAt: null, now: NOW, pseudonymId: 'abc-123' });
    expect(s.header).toMatchObject({
      pseudonymId: 'abc-123', protocolId: 'p-1', phase: { id: 1, name: 'Protection' }, reviewDate: '2026-12-01',
      lastSessionDate: null, sessionsSinceExport: 0, generatedAt: NOW.toISOString(), banner: 'Patient file, unsigned, self-reported.',
    });
    expect(buildReviewSummary({ protocol, phaseId: 1, sessions, lastExportAt: null, now: NOW }).header.lastSessionDate).toBe(day(7));
  });

  it('lists the fixed clinician checks with empty answers and the evidence label', () => {
    const p = protocolWith([{ kind: 'clinicianCheck', key: 'quadStrength', evidence: 'borrowed' }]);
    const checks = buildReviewSummary({ protocol: p, phaseId: 1, sessions: [], lastExportAt: null, now: NOW }).clinicianChecks;
    expect(checks).toHaveLength(8);
    expect(checks.every((c) => c.answer === null)).toBe(true);
    expect(checks.find((c) => c.key === 'quadStrength')).toMatchObject({ text: 'Quadriceps strength. Needs a dynamometer.', evidenceLabel: 'Evidence: borrowed from another condition' });
    expect(checks.find((c) => c.key === 'gait')?.evidenceLabel).toBe('Evidence: not set');
  });

  it('gives a pain and swelling table by session for the phase, oldest first', () => {
    const table = buildReviewSummary({ protocol, phaseId: 1, sessions: [...sessions].reverse(), lastExportAt: null, now: NOW }).painSwellingTable;
    expect(table.map((r) => r.painText)).toEqual(['6 (0 to 10)', '5 (0 to 10)', '4 (0 to 10)']);
    expect(table.map((r) => r.swelling)).toEqual(['more', 'more', 'some']);
  });

  it('throws for a phase that is not in the protocol', () => {
    expect(() => buildReviewSummary({ protocol, phaseId: 7, sessions: [], lastExportAt: null, now: NOW })).toThrow(/Phase 7/);
  });

  it('does not read the clock', () => {
    const spy = vi.spyOn(Date, 'now');
    buildReviewSummary({ protocol, phaseId: 1, sessions, lastExportAt: day(2), now: NOW });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    const src = readFileSync('src/lib/reviewSummary.ts', 'utf8') + readFileSync('src/lib/progress.ts', 'utf8');
    expect(src).not.toMatch(/Date\.now\(|new Date\(\)/);
  });
});

describe('no verdict in the output', () => {
  const protocol = protocolWith([
    peakCriterion(),
    { kind: 'swelling', noneOrSomeOnly: true, lastSessions: 3, evidence: 'mpflr' },
    { kind: 'numeric', measure: 'painMax', op: 'atMost', limit: 3, lastSessions: 3, evidence: 'unvalidated' },
    { kind: 'clinicianCheck', key: 'gait', evidence: 'unvalidated' },
  ]);
  const summary = buildReviewSummary({ protocol, phaseId: 1, sessions: threeAt(125), lastExportAt: null, now: NOW });
  const BANNED_KEY = /total|count$|score|percent|colou?r|severity|status|verdict|grade|^met$|^passed$|success|overall/i;
  const BANNED_VALUE = /\d+ of \d+ criteria|%|\b(met|passed|success|successful|score|total)\b/i;

  it('has no total, score, percentage, colour or severity field', () => {
    const keys: string[] = [];
    const strings: string[] = [];
    const walk = (v: unknown, k: string | null): void => {
      if (k) keys.push(k);
      if (typeof v === 'string') strings.push(v);
      else if (Array.isArray(v)) v.forEach((x) => walk(x, null));
      else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => walk(x, kk));
    };
    walk(summary, null);
    expect(keys.length).toBeGreaterThan(20);
    expect(keys.filter((k) => BANNED_KEY.test(k))).toEqual([]);
    expect(strings.filter((s) => BANNED_VALUE.test(s))).toEqual([]);
  });

  it('has one row for each numeric or swelling criterion and no more', () => {
    expect(summary.rows).toHaveLength(3);
  });

  const BANNED_WORDS = ['correct', 'incorrect', 'good', 'bad', 'perfect', 'wrong', 'mistake', 'safe', 'dangerous', 'score', 'grade', 'pass', 'fail', 'goal', 'milestone', 'met', 'passed'];
  it.each(BANNED_WORDS)('no fixed text holds the word "%s"', (word) => {
    const hit = allSummaryTexts().filter((t) => new RegExp(`\\b${word}\\b`, 'i').test(t));
    expect(hit).toEqual([]);
  });

  it('keeps every sentence at 25 words or fewer', () => {
    for (const text of allSummaryTexts()) {
      for (const sentence of text.split(/(?<=[.!?])\s+/)) expect(sentence.split(/\s+/).length).toBeLessThanOrEqual(25);
    }
  });

  it('lists the five states', () => {
    expect(Object.values(STATE)).toEqual([
      'Above the limit by more than the margin',
      'Below the limit by more than the margin',
      'Cannot tell, the difference is smaller than the camera error',
      'Not enough data',
      'Equal to the limit',
    ]);
  });
});
