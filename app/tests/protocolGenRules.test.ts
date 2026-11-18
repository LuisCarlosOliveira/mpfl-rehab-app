import { GRADES, SOURCES } from '../src/lib/protocolGen/sources';
import { NO_NUMBER, RANGE_REFERENCE, RULES, RULE_IDS, type Rule } from '../src/lib/protocolGen/rules';

const rules = RULE_IDS.map((id) => RULES[id] as Rule);
const words = (s: string) => s.trim().split(/\s+/).length;
const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).filter(Boolean);

describe('rules data', () => {
  it('gives every rule a non-empty list of source ids', () => {
    for (const r of rules) expect(r.sourceIds.length, r.id).toBeGreaterThan(0);
  });

  it('has a sources table entry for every source id', () => {
    for (const r of rules) for (const id of r.sourceIds) expect(SOURCES[id], `${r.id} uses ${id}`).toBeDefined();
  });

  it('gives every rule a grade, a population note, a title and a text', () => {
    for (const r of rules) {
      expect(GRADES, r.id).toContain(r.grade);
      expect(r.population.length, r.id).toBeGreaterThan(0);
      expect(r.title.length, r.id).toBeGreaterThan(0);
      expect(r.text.length, r.id).toBeGreaterThan(0);
    }
  });

  it('lets a number rest only on a rule with a verified source', () => {
    for (const r of rules.filter((x) => Object.keys(x.values).length > 0)) {
      const verified = r.sourceIds.filter((id) => SOURCES[id].verified);
      expect(verified.length, `${r.id} has numbers but no verified source`).toBeGreaterThan(0);
    }
  });

  it('gives a number rule a grade other than NONE, except an engineering value that says so', () => {
    for (const r of rules.filter((x) => Object.keys(x.values).length > 0)) {
      expect(r.grade, r.id).not.toBe('NONE');
      if (r.kind === 'engineering') {
        expect(r.grade).toBe('ENGINEERING');
        expect(r.flag).toBe('clinical-review-needed');
        expect((r.reason ?? '').length).toBeGreaterThan(0);
      }
    }
  });

  it('gives a refusal rule no number and a reason', () => {
    const none = rules.filter((r) => r.kind === 'none');
    expect(none.length).toBeGreaterThanOrEqual(8);
    for (const r of none) {
      expect(Object.keys(r.values), r.id).toEqual([]);
      expect((r.reason ?? '').length, r.id).toBeGreaterThan(0);
      expect(r.grade, r.id).toBe('NONE');
    }
  });

  it('keeps the values that the knowledge base leaves as NONE', () => {
    for (const id of [
      'NONE_WB_BRACE',
      'NONE_FREQ',
      'NONE_TEMPO',
      'NONE_HOLDTIME',
      'NONE_PAIN_STOP',
      'NONE_VALGUS',
      'NONE_REVISION',
      'NONE_GRAFT',
      'RANGE_NONE',
      'DOSE_NONE',
    ] as const) {
      expect(RULES[id].kind, id).toBe('none');
    }
  });

  it('has a referral text for each referral rule and the ten cases', () => {
    const referral = rules.filter((r) => r.kind === 'referral');
    for (const id of ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'RX']) {
      expect(RULES[id as keyof typeof RULES].kind).toBe('referral');
    }
    for (const r of referral) expect((r.referralText ?? '').length, r.id).toBeGreaterThan(0);
  });

  it('writes the texts in short sentences with no semicolon and no banned modal', () => {
    for (const r of rules) {
      for (const text of [r.text, r.referralText ?? '', r.conservative ?? '', r.reason ?? '', r.population]) {
        expect(text, r.id).not.toContain(';');
        expect(text, r.id).not.toMatch(/\b(should|would|could|may|might)\b/i);
        expect(text, r.id).not.toMatch(/\b(correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|pass|fail|goal|milestone)\b/i);
        for (const s of sentences(text)) expect(words(s), `${r.id}: ${s}`).toBeLessThanOrEqual(25);
      }
    }
  });

  // User decision 2026-11-11: the app proposes the plan from the guidelines. A number needs a real source and an EXACT audit row.
  it('gives the dose rule the whole range of P2, its population and the audit row V49', () => {
    expect(RULES.DOSE.values).toEqual({ sets: 2, reps: 10 });
    expect(RULES.DOSE.grade).toBe('OPINION');
    expect(RULES.DOSE.sourceIds).toEqual(['P2']);
    expect(RULES.DOSE.population).toMatch(/8 to 25/);
    expect(RULES.DOSE.population).toMatch(/Not studied in adults/);
    expect(RULES.DOSE.text).toMatch(/2 sets of 10 to 15, then 3 sets as tolerated/);
    expect(RULES.DOSE.text).toMatch(/P2 is for ages 8 to 25\. No study gives a dose for adults/);
    expect(RULES.DOSE.conservative).toMatch(/start of the range/);
    expect(RULES.DOSE.auditRows).toEqual(['V49']);
  });

  it('keeps the dose of the heel slide and the ankle pump as NONE', () => {
    expect(RULES.DOSE_NONE.kind).toBe('none');
    expect(RULES.DOSE_NONE.values).toEqual({});
    expect(RULES.DOSE_NONE.text).toMatch(/heel slide/);
    expect(RULES.DOSE_NONE.text).toMatch(/ankle pump/);
    expect(RULES.DOSE_NONE.text).toMatch(/Ask your care team/);
  });

  it('gives the depth rule the depth 50, its sources, the audit rows V95, V116, V119 and V117, and the source that disagrees', () => {
    expect(RULES.SQUAT_DEPTH.values).toEqual({ maxFlexion: 50 });
    expect(RULES.SQUAT_DEPTH.personEntered).toEqual(['maxFlexion']);
    expect(RULES.SQUAT_DEPTH.sourceIds).toEqual(['N3', 'S16', 'P2']);
    expect(RULES.SQUAT_DEPTH.grade).toBe('OPINION');
    expect(RULES.SQUAT_DEPTH.auditRows).toEqual(['V95', 'V116', 'V119', 'V117']);
    expect(RULES.SQUAT_DEPTH.text).toMatch(/A limit from your surgeon can only lower it/);
    expect(RULES.SQUAT_DEPTH.conservative).toMatch(/disagree/);
  });

  it('gives the one reference line for the knee bend by week from S1, as typical practice and not an order', () => {
    expect(RANGE_REFERENCE).toBe(
      'Knee bend limit by week: no number in the guideline. Typical practice: start at 0 to 30 degrees in the first or second week and progress by 20 to 30 degrees per week. This is not a limit and not your plan. Your surgeon sets your limit.',
    );
    expect(RANGE_REFERENCE).not.toMatch(/\badd\b/);
    expect(RULES.RANGE_NONE.display?.value).toBe(RANGE_REFERENCE);
    expect(NO_NUMBER).toBe('No number in the guideline.');
    expect(RULES.RANGE_NONE.kind).toBe('none');
    expect(RULES.RANGE_NONE.values).toEqual({});
    expect(RULES.RANGE_NONE.sourceIds).toContain('S1');
  });

  it('keeps the camera values labelled ENGINEERING', () => {
    expect(RULES.ENG_TARGET.grade).toBe('ENGINEERING');
    expect(RULES.ENG_RETURN.grade).toBe('ENGINEERING');
    expect(RULES.ENG_TARGET.values.targetFlexion).toBe(18);
    expect(RULES.ENG_RETURN.values.returnWithinDeg).toBe(9);
  });

  it('flags the pain floor value as an app rule with no source value', () => {
    expect(RULES.PAIN.kind).toBe('appRule');
    expect(RULES.PAIN.flag).toBe('clinical-review-needed');
    expect(Object.keys(RULES.PAIN.values)).toEqual([]);
  });

  it('sets the phase window from week 0 to week 11 and phase 2 from week 7', () => {
    expect(RULES.W1.values).toEqual({ firstWeek: 0, lastWeek: 11 });
    expect(RULES.PH1.values).toEqual({ firstWeek: 0, lastWeek: 6 });
    expect(RULES.PH2.values).toEqual({ firstWeek: 7 });
    expect(RULES.PH2.conservative).toBeTruthy();
  });

  it('records why a range ceiling is not generated', () => {
    expect(RULES.RANGE_NONE.reason).toMatch(/passive/i);
    expect(RULES.RANGE_NONE.sourceIds).toContain('P2');
  });
});
