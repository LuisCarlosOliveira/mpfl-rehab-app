// The pure progress check (design docs/progression-evaluation-design.md, steps 1 and 2).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MARGIN_SOURCE, MARGIN_SOURCE_TEXT } from '../src/lib/margin';
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
const flat = (c: ProgressCheck) => [...c.notices, ...c.guidelines, ...c.events.map((e) => e.text), ...c.rows.flatMap((r) => [r.title, ...r.lines])];

describe('Time section', () => {
  it('shows week 6 and week 7 with their own text', () => {
    const w6 = checkProgress(input({ today: '2026-11-07' }));
    const w7 = checkProgress(input({ today: '2026-11-08' }));
    expect(w6.week).toBe(6);
    expect(w7.week).toBe(7);
    expect(w6.weekText).toBe('Week 6 (the seventh week after surgery)');
    expect(w7.weekText).toBe('Week 7 (the eighth week after surgery)');
    expect(w7.notices).toContain('You must report that your care team said you can start phase 2.');
    expect(w6.notices).not.toContain('You must report that your care team said you can start phase 2.');
    expect(w6.guidelines).toContain('Phase 1 covers weeks 0 to 6 (S1, P3).');
    expect(w6.guidelines.join(' ')).toContain('Week 7 is a boundary that the app sets. No guideline gives it.');
  });
  it('gives week 2 (the third week) for a surgery on 2026-10-29 and today 2026-11-18, and names the date used', () => {
    const c = checkProgress(input({ inputs: stored({ surgeryDate: '2026-10-29' }), today: '2026-11-18' }));
    expect(c.week).toBe(2); // two whole weeks are complete
    expect(c.weekText).toBe('Week 2 (the third week after surgery)');
    expect(c.surgeryDate).toBe('29 October 2026');
  });
  it('reads the phase as a property of the plan and never sets it', () => {
    expect(checkProgress(input()).phase).toBe('Phase 1 Protection');
  });
  it('says the app has no plan after week 11, and says so when the date is missing', () => {
    expect(checkProgress(input({ today: '2026-12-20' })).notices.join(' ')).toContain('The app has no plan after week 11.');
    const none = checkProgress(input({ inputs: null }));
    expect(none.week).toBeNull();
    expect(none.weekText).toBeNull();
    expect(none.surgeryDate).toBeNull();
    expect(none.notices.join(' ')).toContain('The app has no date of your surgery.');
  });
  it('quotes the week 4 check of P1 with its audit row, only in weeks 4 to 6', () => {
    expect(checkProgress(input({ today: '2026-10-20' })).guidelines.join(' ')).toContain('Contact surgeon if ROM not trending towards 90° by 4 weeks');
    expect(checkProgress(input({ today: '2026-10-05' })).guidelines.join(' ')).not.toContain('Contact surgeon');
  });
});

describe('last sessions', () => {
  it('lists the newest first with the date, the exercise and the measured number, with the angle label only for a camera angle', () => {
    const c = checkProgress(input({ sessions: [
      session({ date: '2026-11-04T10:00:00.000Z', exercise: 'heel-slide', peakFlexion: 84 }),
      session({ date: '2026-11-05T10:00:00.000Z', exercise: 'straight-leg-raise', peakFlexion: null, reps: 10 }),
    ] }));
    expect(c.recent).toEqual([
      { day: '2026-11-05', name: 'straight leg raise', measure: '10 reps', angle: false },
      { day: '2026-11-04', name: 'heel slide', measure: 'peak knee bend 84 degrees', angle: true },
    ]);
  });
  it('lists the last 5 sessions and no more, and is empty with no session', () => {
    const many = Array.from({ length: 8 }, (_, i) => session({ date: `2026-11-0${i + 1}T10:00:00.000Z` }));
    expect(checkProgress(input({ sessions: many })).recent.map((r) => r.day)).toEqual(['2026-11-08', '2026-11-07', '2026-11-06', '2026-11-05', '2026-11-04']);
    expect(checkProgress(input({ sessions: [] })).recent).toEqual([]);
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
    for (const id of ['E5', 'E7', 'E8', 'E9', 'E11']) expect(row(c, id).lines[0]).toBe(STATE.notEnough);
    expect(row(c, 'E1').lines[0]).toBe('No heel slide done yet');
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
  });
  // Changed on purpose (v3 forms): the screen shows plain numbers against the limit and no sentence that sorts the value. The state field stays for the callers that read it.
  it('writes no sorting sentence next to the limit lines (E1 and E11)', () => {
    for (const peak of [80, 90, 100]) {
      const c = checkProgress(input({ sessions: [session({ peakFlexion: peak })] }));
      for (const id of ['E1', 'E11']) {
        const lines = row(c, id).lines.join(' ');
        expect(lines).not.toMatch(/by more than the margin|Cannot tell/);
        for (const s of [STATE.above, STATE.below, STATE.cannotTell]) expect(row(c, id).lines).not.toContain(s);
      }
    }
  });
  it('gives the measured numbers for the screen: last peak, limit of the plan, camera error and the S1 value', () => {
    const c = checkProgress(input({ sessions: [session({ peakFlexion: 84.4, marginDeg: 9 })] }));
    const byId = Object.fromEntries(c.numbers.map((n) => [n.id, n]));
    expect(byId.peak).toMatchObject({ value: 84, unit: 'degrees', label: 'Last peak knee bend, heel slide' });
    expect(byId.limit).toMatchObject({ value: 90, unit: 'degrees', label: 'Limit in your plan' });
    expect(byId.margin).toMatchObject({ value: 9, unit: 'degrees' });
    expect(byId.s1).toMatchObject({ value: 110, unit: 'degrees' });
    expect(byId.margin?.note).toContain(MARGIN_SOURCE_TEXT[MARGIN_SOURCE]);
    expect(checkProgress(input({ sessions: [] })).numbers).toEqual([]);
    expect(checkProgress(input({ protocol: plan(null) })).numbers.map((n) => n.id)).not.toContain('limit');
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
    expect(e1(84).lines.join(' ')).toContain(MARGIN_SOURCE_TEXT[MARGIN_SOURCE]);
  });
  it('says "No heel slide done yet" when other sessions exist but no heel slide, and "Not enough data" for a heel slide with no angle', () => {
    const other = checkProgress(input({ sessions: [session({ exercise: 'straight-leg-raise', peakFlexion: null })] }));
    expect(row(other, 'E1').lines[0]).toBe('No heel slide done yet');
    const noAngle = checkProgress(input({ sessions: [session({ exercise: 'heel-slide', peakFlexion: null })] }));
    expect(row(noAngle, 'E1').lines[0]).toBe(STATE.notEnough);
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
  it('lists the last pain answers with the date and the exercise of each, oldest first, with no total', () => {
    const sessions = [
      session({ date: '2026-11-06T10:00:00.000Z', exercise: 'straight-leg-raise', peakFlexion: null, pain: 3, swelling: 'some' }),
      session({ date: '2026-11-05T10:00:00.000Z', pain: 2, swelling: 'none' }),
      session({ date: '2026-10-20T10:00:00.000Z', pain: 9, swelling: 'more' }), // before the plan date
    ];
    const c = checkProgress(input({ sessions }));
    expect(row(c, 'E5').lines.slice(0, 2)).toEqual([
      '2026-11-05, heel slide: pain 2 out of 10 after the session.',
      '2026-11-06, straight leg raise: pain 3 out of 10 after the session.',
    ]);
    expect(row(c, 'E5').lines.join(' ')).not.toContain('9 out of 10');
    expect(row(c, 'E7').lines[0]).toBe('Swelling since your plan date: none 1 time, some 1 time, more than before 0 times.');
  });
  it('lists at most the last 5 pain answers', () => {
    const sessions = Array.from({ length: 7 }, (_, i) => session({ date: `2026-11-0${i + 1}T10:00:00.000Z`, pain: i }));
    const lines = row(checkProgress(input({ sessions })), 'E5').lines.filter((l) => /^\d{4}-/.test(l));
    expect(lines.map((l) => l.slice(0, 10))).toEqual(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']);
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
    expect(Object.keys(c).indexOf('events')).toBeLessThan(Object.keys(c).indexOf('week'));
    expect(Object.keys(c).indexOf('week')).toBeLessThan(Object.keys(c).indexOf('rows'));
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
