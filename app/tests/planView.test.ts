import { describe, expect, it } from 'vitest';
import { generateProtocol, RULES, SOURCES, type GeneratorInputs } from '../src/lib/protocolGen';
import type { SessionRecord } from '../src/lib/storage';
import { describeChanges, describeNewPlan, draftOf, eventsSince, evidenceLabel, localIsoDate, movesForward, raisesLimit, reviewDue, sourceLine, weeksSince, whyView } from '../src/lib/planView';

const TODAY = '2026-11-08';
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const at = (week: number, over: Partial<GeneratorInputs> = {}): GeneratorInputs => ({
  writtenPlan: 'no',
  procedure: 'mpflr-only',
  ageBand: '18-plus',
  bothKnees: false,
  firstSurgery: 'yes',
  specialRules: 'no',
  surgeryDate: addDays(TODAY, -(7 * week + 3)),
  side: 'left',
  surgeonLimit: { kind: 'degrees', degrees: 60 },
  phaseClearance: 'no',
  redFlags: {},
  pain: 2,
  swelling: 'none',
  ...over,
});
const plan = (week: number, over: Partial<GeneratorInputs> = {}) => {
  const r = generateProtocol(at(week, over), TODAY);
  if (r.kind !== 'protocol') throw new Error(`expected a plan, got ${r.reason}`);
  return r;
};

describe('dates', () => {
  it('writes the local calendar date, not the date in UTC', () => {
    expect(localIsoDate(new Date(2026, 10, 8, 23, 30))).toBe('2026-11-08');
    expect(localIsoDate(new Date(2026, 0, 2, 0, 5))).toBe('2026-01-02');
  });

  it('counts whole weeks between two dates', () => {
    expect(weeksSince('2026-11-01', '2026-11-08')).toBe(1);
    expect(weeksSince('2026-11-02', '2026-11-08')).toBe(0);
    expect(weeksSince('2026-09-20', '2026-11-08')).toBe(7);
  });

  it('gives null for a date that is not real or is in the future', () => {
    expect(weeksSince('', TODAY)).toBeNull();
    expect(weeksSince('2026-02-31', TODAY)).toBeNull();
    expect(weeksSince('2026-11-09', TODAY)).toBeNull();
  });

  it('has the review due on the review date and after it, not before', () => {
    expect(reviewDue('2026-11-08', '2026-11-08')).toBe(true);
    expect(reviewDue('2026-11-07', '2026-11-08')).toBe(true);
    expect(reviewDue('2026-11-09', '2026-11-08')).toBe(false);
    expect(reviewDue(undefined, '2026-11-08')).toBe(false);
  });
});

describe('describeChanges', () => {
  it('gives no change for the same plan', () => {
    const a = plan(3).protocol;
    expect(describeChanges(a, plan(3).protocol)).toEqual([]);
  });

  it('names a lower limit with both numbers and the reason', () => {
    const before = plan(3).protocol;
    const after = plan(3, { surgeonLimit: { kind: 'degrees', degrees: 50 } });
    const lines = describeChanges(before, after.protocol);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Knee-bend limit');
    expect(lines[0]).toContain('60 degrees');
    expect(lines[0]).toContain('50 degrees');
    expect(lines[0]).toContain('Reason');
    expect(lines[0]).not.toMatch(/[A-Z]{3,}_[A-Z]{3,}/); // D5: no internal code in patient text
  });

  it('names a removed heel slide and the rule that gives the reason', () => {
    const before = plan(3).protocol;
    const after = plan(3, { surgeonLimit: { kind: 'unknown' } });
    const lines = describeChanges(before, after.protocol);
    expect(lines.join(' ')).toContain('Heel slide removed');
    expect(lines.join(' ')).toContain('HEEL');
  });

  it('names an added heel slide', () => {
    const before = plan(3, { surgeonLimit: { kind: 'unknown' } }).protocol;
    const after = plan(3);
    expect(describeChanges(before, after.protocol).join(' ')).toContain('Heel slide added');
  });

  it('names the phase change upward with the answer as the reason', () => {
    const before = plan(8).protocol;
    const after = plan(8, { phaseClearance: 'yes' });
    const lines = describeChanges(before, after.protocol);
    expect(lines[0]).toContain('Phase 1');
    expect(lines[0]).toContain('Phase 2');
    expect(lines[0]).toContain(RULES.PH2.id);
  });

  it('names the phase change downward when the answer is no', () => {
    const before = plan(8, { phaseClearance: 'yes' }).protocol;
    const after = plan(8);
    expect(describeChanges(before, after.protocol)[0]).toMatch(/Phase 2.*Phase 1/);
  });
});

describe('describeNewPlan', () => {
  it('lists the phase and every exercise of the plan', () => {
    const lines = describeNewPlan(plan(3).protocol);
    expect(lines[0]).toContain('Phase 1');
    expect(lines.join(' ')).toContain('Straight leg raise');
    expect(lines.join(' ')).toContain('Heel slide');
    expect(lines.join(' ')).toContain('60 degrees');
  });
});

describe('movesForward', () => {
  it('is false for the same plan and for a lower limit', () => {
    expect(movesForward(plan(3).protocol, plan(3).protocol)).toBe(false);
    expect(movesForward(plan(3).protocol, plan(3, { surgeonLimit: { kind: 'degrees', degrees: 50 } }).protocol)).toBe(false);
  });

  it('is true for a later phase', () => {
    expect(movesForward(plan(8).protocol, plan(8, { phaseClearance: 'yes' }).protocol)).toBe(true);
  });

  it('is false for an earlier phase', () => {
    expect(movesForward(plan(8, { phaseClearance: 'yes' }).protocol, plan(8).protocol)).toBe(false);
  });

  it('is true for a higher limit and for a limit that is removed', () => {
    expect(movesForward(plan(3).protocol, plan(3, { surgeonLimit: { kind: 'degrees', degrees: 80 } }).protocol)).toBe(true);
    expect(movesForward(plan(8, { phaseClearance: 'yes' }).protocol, plan(8, { phaseClearance: 'yes', surgeonLimit: { kind: 'none' } }).protocol)).toBe(true);
  });
});

describe('eventsSince', () => {
  const row = (over: Partial<SessionRecord>): SessionRecord =>
    ({ id: 1, date: '2026-11-05T10:00:00.000Z', gaveWayPresses: 0, redFlagBlocks: 0, pain: 2, swelling: 'none', ...over }) as SessionRecord;

  it('counts a session after the plan date with a gave-way press, a block, a pause or swelling', () => {
    expect(eventsSince([row({ gaveWayPresses: 1 })], '2026-11-01', undefined)).toBe(1);
    expect(eventsSince([row({ redFlagBlocks: 1 })], '2026-11-01', undefined)).toBe(1);
    expect(eventsSince([row({ pain: 8 })], '2026-11-01', undefined)).toBe(1);
    expect(eventsSince([row({ swelling: 'more' })], '2026-11-01', undefined)).toBe(1);
  });

  it('does not count a quiet session or a session before the plan date', () => {
    expect(eventsSince([row({})], '2026-11-01', undefined)).toBe(0);
    expect(eventsSince([row({ gaveWayPresses: 1, date: '2026-10-30T10:00:00.000Z' })], '2026-11-01', undefined)).toBe(0);
  });
});

describe('evidence labels', () => {
  it('names each level in plain words and keeps the code', () => {
    expect(evidenceLabel('OPINION')).toBe('Expert opinion (OPINION)');
    expect(evidenceLabel('ENGINEERING')).toContain('not a clinical value');
    expect(evidenceLabel('NONE')).toContain('No source');
  });

  it('shows a source with its id, authors and year', () => {
    expect(sourceLine('P2')).toContain('P2');
    expect(sourceLine('P2')).toContain(String(SOURCES.P2.year));
  });
});

describe('draftOf', () => {
  it('makes a plan draft with the answers that made it', () => {
    const made = plan(3);
    const draft = draftOf(made, 'create', at(3));
    expect(draft).toMatchObject({ kind: 'plan', origin: 'create', changes: [], hold: null });
  });

  it('makes a referral draft with no plan in it', () => {
    const r = generateProtocol(at(3, { procedure: 'combined' }), TODAY);
    const draft = draftOf(r, 'update', null);
    expect(draft).toMatchObject({ kind: 'referral', origin: 'update', reason: 'R2' });
    expect('protocol' in draft).toBe(false);
  });

  it('refuses a plan with no answers', () => {
    expect(() => draftOf(plan(3), 'create', null)).toThrow();
  });
});

describe('whyView, the lines of "Values in your plan" (L2-08, L2-01, L2-09)', () => {
  const allEntries = (week: number, over: Partial<GeneratorInputs> = {}) => plan(week, over).why;

  it('never repeats a line, also in a phase 2 plan, and names the phase', () => {
    const entries = allEntries(8, { phaseClearance: 'yes' });
    for (const e of entries) {
      const lines = whyView(e).applied;
      expect(new Set(lines).size, `${e.ruleId}: ${lines.join(' | ')}`).toBe(lines.length);
    }
    const dose = whyView(entries.find((e) => e.ruleId === 'DOSE')!).applied;
    expect(dose).toContain('Phase 1, Straight leg raise, sets, start of the range: 2');
    expect(dose).toContain('Phase 2, Straight leg raise, sets, start of the range: 2');
    // A surgeon number still shows, with the phase.
    const surgeon = allEntries(8, { phaseClearance: 'yes', surgeonLimit: { kind: 'degrees', degrees: 90 } }).find((e) => e.ruleId === 'RANGE_SURGEON')!;
    const lines = whyView(surgeon).applied;
    expect(lines).toContain('Phase 1, Heel slide, knee-bend limit: 90 degrees (as entered by you)');
    expect(lines).toContain('Phase 2, Heel slide, knee-bend limit: 90 degrees (as entered by you)');
  });

  it('shows the count value as a value of the app and never as a target', () => {
    const e = allEntries(3).find((x) => x.ruleId === 'ENG_TARGET')!;
    const lines = whyView(e).applied;
    expect(lines).toEqual(['Phase 1, Heel slide, the app starts counting a rep at 18 degrees (set by the app, not by a clinician)']);
    expect(whyView(e).title).not.toMatch(/target/i);
    expect(whyView(e).text).not.toMatch(/target/i);
    const r = allEntries(3).find((x) => x.ruleId === 'ENG_RETURN')!;
    expect(whyView(r).applied).toEqual(['Phase 1, Heel slide, the app ends a rep when the knee is back within 9 degrees of rest (set by the app, not by a clinician)']);
  });

  it('keeps "as entered by you" for the limit of the person', () => {
    const e = allEntries(3).find((x) => x.ruleId === 'RANGE_SURGEON')!;
    expect(whyView(e).applied).toEqual(['Phase 1, Heel slide, knee-bend limit: 60 degrees (as entered by you)']);
  });

  it('labels the project file honestly and not as a published source', () => {
    expect(sourceLine('RR')).toBe('RR: Project knowledge base summary (not a published source)');
    expect(sourceLine('DESIGN')).toContain('(not a published source)');
    expect(sourceLine('P2')).not.toContain('not a published source');
    const refused = allEntries(3).find((x) => x.ruleId === 'NONE_FREQ')!;
    expect(whyView(refused).sources.join(' ')).not.toContain('Project knowledge base, 2026');
  });
});

describe('raisesLimit', () => {
  it('is true for a higher or removed limit and false for a lower limit and a later phase only', () => {
    expect(raisesLimit(plan(3).protocol, plan(3, { surgeonLimit: { kind: 'degrees', degrees: 95 } }).protocol)).toBe(true);
    expect(raisesLimit(plan(3).protocol, plan(3, { surgeonLimit: { kind: 'degrees', degrees: 50 } }).protocol)).toBe(false);
    expect(raisesLimit(plan(3).protocol, plan(3).protocol)).toBe(false);
  });
});

describe('one movesForward rule (R-03)', () => {
  const ex = (o: object) => ({ kind: 'heel-slide', targetFlexion: 40, returnWithinDeg: 10, ...o });
  const base = (o: object, e: object) => ({ schemaVersion: 1, id: 'x', side: 'left', activePhase: 1, phases: [{ id: 1, name: 'P', exercises: [ex(e)] }], ...o }) as never;

  it('sees a removed or higher pain threshold as forward, as the save step does', () => {
    const current = base({ painPauseThreshold: 3 }, { maxFlexion: 80 });
    expect(movesForward(current, base({}, { maxFlexion: 60 }))).toBe(true);
    expect(movesForward(current, base({ painPauseThreshold: 5 }, { maxFlexion: 60 }))).toBe(true);
    expect(movesForward(current, base({ painPauseThreshold: 3 }, { maxFlexion: 60 }))).toBe(false);
  });

  it('sees a higher maxTopFlexion and a lower minFlexion as forward', () => {
    expect(movesForward(base({}, { maxTopFlexion: 60 }), base({}, { maxTopFlexion: 70 }))).toBe(true);
    expect(movesForward(base({}, { minFlexion: 10 }), base({}, { minFlexion: 5 }))).toBe(true);
    expect(raisesLimit(base({ painPauseThreshold: 3 }, {}), base({}, {}))).toBe(true);
  });
});

describe('whyView for a value that no guideline gives', () => {
  it('holds the words of the guideline for a rule of kind none and nothing for the other rules', () => {
    const entries = plan(4).why;
    const none = entries.filter((e) => RULES[e.ruleId].kind === 'none');
    expect(none.length).toBeGreaterThan(5);
    for (const e of none) expect(whyView(e).noNumber, e.ruleId).toEqual({ words: RULES[e.ruleId].reason });
    for (const e of entries.filter((x) => RULES[x.ruleId].kind !== 'none')) expect(whyView(e).noNumber, e.ruleId).toBeNull();
  });
});
