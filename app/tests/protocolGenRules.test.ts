import { GRADES, SOURCES } from '../src/lib/protocolGen/sources';
import { RULES, RULE_IDS, type Rule } from '../src/lib/protocolGen/rules';

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

  // Guardrail: the generator never puts a number from a published source into a plan. Every clinical number is a clinician or surgeon field.
  it('has no rule for a dose, a mini squat depth or a seated hold arc, and no rule that carries such a number', () => {
    for (const id of ['DOSE', 'SQUAT_DEPTH', 'HOLD_P2', 'ENG_HOLD']) expect(Object.keys(RULES), id).not.toContain(id);
    const generated = rules.filter((r) => r.kind === 'generated');
    for (const r of generated) {
      for (const key of ['sets', 'reps', 'maxFlexion', 'minFlexion', 'arcStart', 'holdSeconds']) expect(Object.keys(r.values), `${r.id} ${key}`).not.toContain(key);
    }
  });

  it('says that the app sets no dose for any exercise', () => {
    expect(RULES.DOSE_NONE.kind).toBe('none');
    expect(RULES.DOSE_NONE.values).toEqual({});
    expect(RULES.DOSE_NONE.text).toMatch(/no dose for any exercise/);
    expect(RULES.DOSE_NONE.text).toMatch(/Ask your care team/);
  });

  it('says that the app adds no seated hold and no mini squat depth', () => {
    expect(RULES.HOLD.text).toMatch(/adds no seated knee hold/);
    expect(RULES.SQUAT_P2.text).toMatch(/no depth limit/);
    expect(RULES.SQUAT_P2.text).toMatch(/Ask your surgeon/);
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
