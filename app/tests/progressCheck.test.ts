// The pure progress check (design docs/progression-evaluation-design.md, steps 1 and 2).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MARGIN_SOURCE } from '../src/lib/margin';
import { protocolSchema, type Protocol } from '../src/lib/protocol/schema';
import { allProgressTexts, checkProgress, localDayOf, sessionsSince, type ProgressCheck, type ProgressInput } from '../src/lib/progressCheck';
import { STATE } from '../src/lib/reviewSummary';
import type { SessionRecord, StoredInputs } from '../src/lib/storage';

let nextId = 1;
function session(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: nextId++, date: '2026-11-05T10:00:00.000Z', exercise: 'heel-slide', side: 'left', reps: 10, peakFlexion: 84, holdSeconds: null,
    topFlexion: null, marginDeg: 9, marginSource: MARGIN_SOURCE, view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0,
    redFlagBlocks: 0, pain: 2, swelling: 'none', protocolId: 'p-1', phase: 1, schemaVersion: 1, ...over,
  };
}

function plan(maxFlexion: number | null = 90, extra: Record<string, unknown> = {}): Protocol {
  return protocolSchema.parse({
    schemaVersion: 1, id: 'p-1', side: 'left', activePhase: 1, surgeon: {}, generated: { on: '2026-11-01', rules: [] }, ...extra,
    phases: [{ id: 1, name: 'Protection', exercises: [
      { kind: 'heel-slide', sets: 2, reps: 10, ...(maxFlexion === null ? {} : { maxFlexion }), source: 'PROPOSAL' },
      { kind: 'straight-leg-raise', sets: 2, reps: 10, source: 'PROPOSAL' },
    ] }],
  });
}

const stored = (over: Partial<StoredInputs> = {}): StoredInputs => ({
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-09-20', side: 'left', surgeonLimit: { kind: 'none' }, ...over,
}) as StoredInputs;

// 2026-09-20 plus 6 weeks is 2026-11-01. Week 6 = 2026-11-01..07, week 7 = 2026-11-08..14.
const input = (over: Partial<ProgressInput> = {}): ProgressInput => ({
  sessions: [session()], inputs: stored(), protocol: plan(), today: '2026-11-08', ...over,
});
const text = (c: ProgressCheck) => JSON.stringify(c);
const row = (c: ProgressCheck, id: string) => c.rows.find((r) => r.id === id)!;
const flat = (c: ProgressCheck) => [...c.time, ...c.events.map((e) => e.text), ...c.rows.flatMap((r) => [r.title, ...r.lines])];

describe('Time section', () => {
  it('shows week 6 and week 7 with their own text', () => {
    const w6 = checkProgress(input({ today: '2026-11-07' }));
    const w7 = checkProgress(input({ today: '2026-11-08' }));
    expect(w6.week).toBe(6);
    expect(w7.week).toBe(7);
    expect(w6.time[0]).toBe('You are in week 6 after your surgery.');
    expect(w7.time[0]).toBe('You are in week 7 after your surgery.');
    expect(w7.time.join(' ')).toContain('You must report that your care team said you can start phase 2.');
    expect(w6.time.join(' ')).toContain('Phase 1 covers weeks 0 to 6 (S1, P3).');
    expect(w6.time.join(' ')).toContain('Week 7 is a boundary that the app sets. No guideline gives it.');
  });
  it('reads the phase as a property of the plan and never sets it', () => {
    expect(checkProgress(input()).time.join(' ')).toContain('Your plan is in phase 1.');
  });
  it('says the app has no plan after week 11, and says so when the date is missing', () => {
    expect(checkProgress(input({ today: '2026-12-20' })).time.join(' ')).toContain('The app has no plan after week 11.');
    const none = checkProgress(input({ inputs: null }));
    expect(none.week).toBeNull();
    expect(none.time.join(' ')).toContain('The app has no date of your surgery.');
  });
  it('quotes the week 4 check of P1 with its audit row, only in weeks 4 to 6', () => {
    expect(checkProgress(input({ today: '2026-10-20' })).time.join(' ')).toContain('Contact surgeon if ROM not trending towards 90° by 4 weeks');
    expect(checkProgress(input({ today: '2026-10-05' })).time.join(' ')).not.toContain('Contact surgeon');
  });
});

describe('rows', () => {
  it('returns E1 to E12 in order with the three types', () => {
    const c = checkProgress(input());
    expect(c.rows.map((r) => r.id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12']);
    const types = Object.fromEntries(c.rows.map((r) => [r.id, r.type]));
    expect(types).toEqual({
      E1: 'measured', E2: 'cannot-measure', E3: 'reported', E4: 'reported', E5: 'reported', E6: 'reported', E7: 'reported',
      E8: 'measured', E9: 'measured', E10: 'cannot-measure', E11: 'measured', E12: 'cannot-measure',
    });
  });
  it('shows "Not enough data" with no session, and no state', () => {
    const c = checkProgress(input({ sessions: [] }));
    expect(c.noSessions).toBe(true);
    for (const id of ['E1', 'E5', 'E7', 'E8', 'E9', 'E11']) expect(row(c, id).lines[0]).toBe(STATE.notEnough);
    expect(c.rows.every((r) => r.state === null)).toBe(true);
    expect(c.events).toEqual([]);
  });
  it('shows the three margin states for the plan limit (E11), at the edges of the margin', () => {
    const at = (peak: number) => row(checkProgress(input({ sessions: [session({ peakFlexion: peak })] })), 'E11');
    expect(at(80).state).toBe('below'); // 90 - 80 = 10 > 9
    expect(at(81).state).toBe('cannot-tell'); // 9 is not more than the margin
    expect(at(90).state).toBe('cannot-tell');
    expect(at(99).state).toBe('cannot-tell');
    expect(at(100).state).toBe('above'); // 10 > 9
    expect(at(80).lines).toContain(STATE.below);
    expect(at(100).lines).toContain(STATE.above);
    expect(at(90).lines).toContain(STATE.cannotTell);
  });
  it('shows no state where no limit exists (E11 without a plan limit)', () => {
    const r = row(checkProgress(input({ protocol: plan(null) })), 'E11');
    expect(r.state).toBeNull();
    expect(r.lines.join(' ')).toContain('Your plan has no knee limit for this exercise.');
  });
  it('compares E1 with 110 degrees and uses the margin of the session', () => {
    const e1 = (peak: number, marginDeg = 9) => row(checkProgress(input({ sessions: [session({ peakFlexion: peak, marginDeg })] })), 'E1');
    expect(e1(84).state).toBe('below');
    expect(e1(105).state).toBe('cannot-tell');
    expect(e1(105, 3).state).toBe('below');
    expect(e1(125).state).toBe('above');
    expect(e1(84).lines.join(' ')).toContain('S1, audit row V100 (EXACT)');
    expect(e1(84).lines.join(' ')).toContain('estimated angle, not a medical measurement');
    expect(e1(84).lines.join(' ')).toContain(MARGIN_SOURCE);
  });
  it('says when the surgeon limit is lower than 110', () => {
    const c = checkProgress(input({ inputs: stored({ surgeonLimit: { kind: 'degrees', degrees: 90 } }) }));
    expect(row(c, 'E1').lines.join(' ')).toContain('Your surgeon limit is 90 degrees. This is lower than 110 degrees.');
    expect(row(checkProgress(input()), 'E1').lines.join(' ')).not.toContain('surgeon limit');
  });
  it('gives E3 and E4 as reported answers, and does not invent one', () => {
    expect(row(checkProgress(input()), 'E4').lines[0]).toContain('The app does not keep this answer.');
    const c = checkProgress(input({ answers: { walksWithoutCrutches: 'yes', legRaiseStraight: 'no' } }));
    expect(row(c, 'E4').lines[0]).toBe('Your answer in Update my plan: yes.');
    expect(row(c, 'E3').lines[0]).toBe('Your answer in Update my plan: no.');
  });
  it('lists pain and swelling answers since the plan date, oldest first, with no total', () => {
    const sessions = [
      session({ date: '2026-11-06T10:00:00.000Z', pain: 3, swelling: 'some' }),
      session({ date: '2026-11-05T10:00:00.000Z', pain: 2, swelling: 'none' }),
      session({ date: '2026-10-20T10:00:00.000Z', pain: 9, swelling: 'more' }), // before the plan date
    ];
    const c = checkProgress(input({ sessions }));
    expect(row(c, 'E5').lines[0]).toBe('Pain after each session since your plan date: 2, 3 (0 to 10).');
    expect(row(c, 'E7').lines[0]).toBe('Swelling since your plan date: none 1 time, some 1 time, more than before 0 times.');
  });
  it('writes time for one and times for any other count of a swelling answer', () => {
    const sessions = [
      session({ date: '2026-11-06T10:00:00.000Z', swelling: 'some' }),
      session({ date: '2026-11-05T10:00:00.000Z', swelling: 'some' }),
      session({ date: '2026-11-04T10:00:00.000Z', swelling: 'none' }),
    ];
    expect(row(checkProgress(input({ sessions })), 'E7').lines[0]).toBe('Swelling since your plan date: none 1 time, some 2 times, more than before 0 times.');
  });
  it('gives no number where the guideline has none (E5, E7, E9, E10)', () => {
    const c = checkProgress(input());
    for (const id of ['E5', 'E7', 'E9', 'E10']) expect(row(c, id).lines.join(' ')).toContain('No number in the guideline');
    expect(row(c, 'E10').lines.join(' ')).toContain('V39');
    expect(row(c, 'E6').lines.join(' ')).toContain('V52');
    expect(row(c, 'E9').lines.join(' ')).toContain('V49');
    expect(row(c, 'E2').lines.join(' ')).toContain('V19');
    expect(row(c, 'E8').lines.join(' ')).toContain('V55');
  });
  it('shows reps of the last session next to the plan dose (E9)', () => {
    const c = checkProgress(input({ sessions: [session({ exercise: 'straight-leg-raise', peakFlexion: null, repsPerSet: [8, 8] })] }));
    expect(row(c, 'E9').lines[0]).toBe('Reps for each set, straight leg raise, last session: 8, 8.');
    expect(row(c, 'E9').lines.join(' ')).toContain('Your plan: 2 sets of 10.');
  });
  it('shows the pause value and where it comes from (E8)', () => {
    expect(row(checkProgress(input()), 'E8').lines.join(' ')).toContain('Pain pause value: 7 out of 10. Source: app rule FR12, not a guideline value.');
    expect(row(checkProgress(input({ protocol: plan(90, { painPauseThreshold: 5 }) })), 'E8').lines.join(' ')).toContain('Pain pause value: 5 out of 10. Source: the limit of your clinician.');
  });
});

describe('safety events', () => {
  const events = [
    session({ date: '2026-11-03T10:00:00.000Z', gaveWayPresses: 1 }),
    session({ date: '2026-11-04T10:00:00.000Z', pain: 8 }),
    session({ date: '2026-11-05T10:00:00.000Z', swelling: 'more' }),
    session({ date: '2026-11-06T10:00:00.000Z', redFlagBlocks: 1 }),
    session({ date: '2026-10-30T10:00:00.000Z', gaveWayPresses: 1 }), // before the plan date
  ];
  it('lists each event with its date, oldest first, and puts them before the rows in the output', () => {
    const c = checkProgress(input({ sessions: events }));
    expect(c.events.map((e) => e.kind)).toEqual(['gave-way', 'pain', 'swelling', 'red-flag']);
    expect(c.events[0]?.text).toBe('On 2026-11-03 you pressed "Knee gave way or hurts".');
    expect(c.events[1]?.text).toBe('On 2026-11-04 you reported pain 8 out of 10.');
    expect(Object.keys(c).indexOf('events')).toBeLessThan(Object.keys(c).indexOf('time'));
    expect(Object.keys(c).indexOf('time')).toBeLessThan(Object.keys(c).indexOf('rows'));
  });
  it('uses the clinician pain limit when it is lower than 7', () => {
    const c = checkProgress(input({ sessions: [session({ pain: 5 })], protocol: plan(90, { painPauseThreshold: 5 }) }));
    expect(c.events.map((e) => e.kind)).toEqual(['pain']);
  });
  it('has no event for a calm session', () => {
    expect(checkProgress(input()).events).toEqual([]);
  });
});

describe('local date versus UTC day (the bug of eventsSince)', () => {
  const saved = process.env.TZ;
  afterEach(() => {
    if (saved === undefined) delete process.env.TZ;
    else process.env.TZ = saved;
  });
  it('maps a timestamp to the local calendar day', () => {
    process.env.TZ = 'America/Los_Angeles'; // UTC minus 8 in November
    expect(new Date(2026, 10, 10).getTimezoneOffset()).toBe(480);
    expect(localDayOf('2026-11-10T03:00:00.000Z')).toBe('2026-11-09');
    process.env.TZ = 'Pacific/Auckland'; // UTC plus 13 in November
    expect(localDayOf('2026-11-09T20:00:00.000Z')).toBe('2026-11-10');
  });
  it('keeps a session before midnight out of the window, and one after midnight in it (west of UTC)', () => {
    process.env.TZ = 'America/Los_Angeles';
    // Local 2026-11-09 19:00 is UTC 2026-11-10. The plan date is 2026-11-10 (local), so the session is before it.
    const before = session({ date: '2026-11-10T03:00:00.000Z', gaveWayPresses: 1 });
    expect(sessionsSince([before], '2026-11-10')).toEqual([]);
    expect(checkProgress(input({ sessions: [before], protocol: plan(90, { generated: { on: '2026-11-10', rules: [] } }), today: '2026-11-12' })).events).toEqual([]);
  });
  it('keeps a session of the plan day in the window (east of UTC)', () => {
    process.env.TZ = 'Pacific/Auckland';
    // UTC 2026-11-09 20:00 is local 2026-11-10 09:00. That is the plan day, so it counts.
    const onDay = session({ date: '2026-11-09T20:00:00.000Z', gaveWayPresses: 1 });
    expect(sessionsSince([onDay], '2026-11-10')).toHaveLength(1);
    expect(checkProgress(input({ sessions: [onDay], protocol: plan(90, { generated: { on: '2026-11-10', rules: [] } }), today: '2026-11-12' })).events).toHaveLength(1);
  });
});

describe('wording rules', () => {
  const rich = checkProgress(input({
    sessions: [session({ pain: 8, gaveWayPresses: 1, repsPerSet: [8, 8] }), session({ exercise: 'straight-leg-raise', peakFlexion: null, date: '2026-11-06T10:00:00.000Z' })],
    inputs: stored({ surgeonLimit: { kind: 'degrees', degrees: 90 } }),
    answers: { walksWithoutCrutches: 'yes', legRaiseStraight: 'unknown' },
  }));
  const empty = checkProgress(input({ sessions: [], inputs: null }));
  const BANNED = /\b(correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|grade|pass|fail|goal|milestones?|met|reached|total|should|would|could|may|might)\b|;/i;

  it('has the line "Not approved by a clinician"', () => {
    expect(rich.notApproved).toBe('Not approved by a clinician.');
    expect(empty.notApproved).toBe('Not approved by a clinician.');
  });
  it('has no verdict word, no total, no "n of N", no window size, no minimum count', () => {
    for (const line of [...flat(rich), ...flat(empty), ...allProgressTexts()]) {
      expect(line, line).not.toMatch(BANNED);
      expect(line, line).not.toMatch(/\b\d+ of \d+\b/);
      expect(line, line).not.toMatch(/\blast \d+ sessions?\b|\bat least \d+ sessions?\b|\bminimum (number of )?sessions?\b/i);
    }
    for (const c of [rich, empty]) {
      expect(Object.keys(c)).not.toEqual(expect.arrayContaining(['total']));
      expect(text(c)).not.toMatch(/"(total|score|percent|count|passed|met)"/i);
    }
  });
  it('has no colour, class or verdict field in a row', () => {
    for (const r of rich.rows) expect(Object.keys(r).sort()).toEqual(['id', 'lines', 'state', 'title', 'type']);
  });
  it('writes every sentence in allProgressTexts (digits and lists aside)', () => {
    const norm = (s: string) => s.replace(/\d+(?:\.\d+)?(?: times?)?(?:, \d+)*/g, '#');
    const known = new Set(allProgressTexts().map(norm));
    for (const line of [...flat(rich), ...flat(empty)]) expect(known.has(norm(line)), line).toBe(true);
  });
  it('is pure: the same input gives the same output and the input is not changed', () => {
    const i = input();
    const copy = JSON.stringify(i);
    expect(checkProgress(i)).toEqual(checkProgress(i));
    expect(JSON.stringify(i)).toBe(copy);
  });
});

describe('module boundary', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/lib/progressCheck.ts'), 'utf8');
  it('imports no storage function and no React, and has no save call', () => {
    for (const m of src.matchAll(/^import (?!type)[^;]*from '([^']+)'/gm)) {
      expect(m[1], m[0]).not.toMatch(/storage|react|accept|trustedClick/);
    }
    expect(src).not.toMatch(/\b(saveProtocol|saveSession|saveGeneratorInputs|acceptProposal|confirmByPerson|\.put\(|\.add\(|Date\.now|new Date\(\))/);
  });
});
