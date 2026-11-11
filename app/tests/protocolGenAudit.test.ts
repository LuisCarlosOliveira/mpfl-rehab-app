import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, vi } from 'vitest';
import { RULE_IDS, RULES } from '../src/lib/protocolGen';

afterEach(() => vi.unstubAllEnvs());

// The audit file is the only place that says whether a quote is EXACT. The test reads it from the repo root.
const audit = readFileSync(resolve(__dirname, '../../research/citation-audit.md'), 'utf8');
const rowOf = (id: string) => audit.split('\n').find((l) => l.startsWith(`| ${id} |`));

// User decision 2026-11-11: the app proposes the plan from the guidelines. Every number needs a real source and an EXACT audit row.
describe('every number of a rule rests on an EXACT row of the citation audit', () => {
  const withNumbers = RULE_IDS.map((id) => RULES[id]).filter((r) => Object.keys(r.values).length > 0 && (r.kind === 'generated' || r.kind === 'structure'));

  it('lists an audit row for each generated rule that carries a number', () => {
    const generated = withNumbers.filter((r) => r.kind === 'generated').map((r) => r.id);
    expect(generated).toEqual(expect.arrayContaining(['DOSE', 'SQUAT_DEPTH', 'HOLD_P2']));
    for (const id of generated) expect(RULES[id as keyof typeof RULES].auditRows?.length ?? 0, id).toBeGreaterThan(0);
  });

  it('finds each listed row in the audit and the verdict of the row is EXACT', () => {
    for (const id of RULE_IDS) {
      for (const row of RULES[id].auditRows ?? []) {
        expect(rowOf(row), `${id} ${row}`).toMatch(/\| EXACT \|/);
      }
    }
  });

  it('shows the source, the evidence and the whole value for a rule with a display', () => {
    for (const id of RULE_IDS) {
      const d = RULES[id].display;
      if (d === undefined) continue;
      expect(d.cite.length, id).toBeGreaterThan(0);
      expect(d.evidence, id).toMatch(/^OPINION/);
      expect(RULES[id].auditRows?.length ?? 0, id).toBeGreaterThan(0);
    }
  });

  // FAIL-1 of the audit of 2026-11-11: a number on a screen needs an EXACT row, or the rule says that the number is the app's own.
  // The ids of sources and phases (P1, S16, phase 2) are names and not numbers.
  const strip = (t: string) => t.replace(/\b[A-Z]{1,3}\d+\b/g, '').replace(/\b[Pp]hase \d\b/g, '');
  const digits = (r: (typeof RULES)[keyof typeof RULES]) => {
    const d = r.display;
    const parts = [r.text, r.textRefused ?? '', r.conservative ?? '', r.reason ?? '', d?.value ?? '', d?.cite ?? '', d?.evidence ?? '', d?.disagree ?? ''];
    return parts.some((t) => /\d/.test(strip(t))) || Object.keys(r.values).length > 0;
  };

  it.each([undefined, 'true', 'false'])('lists an audit row for every rule with a number, with the flag %s', (flag) => {
    vi.stubEnv('VITE_GENERATOR_EXTENDED', flag as string);
    const missing = RULE_IDS.map((id) => RULES[id])
      .filter((r) => digits(r) && r.kind !== 'engineering' && r.appOwn !== true)
      .filter((r) => (r.auditRows?.length ?? 0) === 0)
      .map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it('lists an audit row for every rule whose text, caveat, display or values hold a number, unless the rule is engineering or the number is the own number of the app', () => {
    const missing = RULE_IDS.map((id) => RULES[id])
      .filter((r) => digits(r) && r.kind !== 'engineering' && r.appOwn !== true)
      .filter((r) => (r.auditRows?.length ?? 0) === 0)
      .map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it('says in the text of a rule with an own number of the app that the number is the own boundary or value of the app', () => {
    const own = RULE_IDS.map((id) => RULES[id]).filter((r) => r.appOwn === true);
    expect(own.map((r) => r.id).sort()).toEqual(['PAIN', 'PH2']);
    for (const r of own) expect(`${r.text} ${r.conservative ?? ''} ${r.reason ?? ''}`, r.id).toMatch(/own boundary of the app|app rule/i);
  });

  it('says in the text of an engineering rule that the value is an engineering value of the app', () => {
    for (const id of RULE_IDS) {
      const r = RULES[id];
      if (r.kind !== 'engineering') continue;
      expect(r.grade, id).toBe('ENGINEERING');
      expect(`${r.text} ${r.reason ?? ''}`, id).toMatch(/engineering value|not a range|not a clinical value|app's own/i);
    }
  });

  it('shows the same evidence level for the dose, the depth and the arc, and a source note for the knee bend by week', () => {
    for (const id of ['DOSE', 'SQUAT_DEPTH', 'HOLD_P2'] as const) expect(RULES[id].display?.evidence, id).toBe('OPINION (level 5)');
    const d = RULES.RANGE_NONE.display;
    expect(d?.evidence).toBe('OPINION (level 5, clinical commentary)');
    expect(d?.population).toMatch(/no age limit stated/);
    expect(d?.value).toMatch(/^Knee bend limit by week: no number in the guideline. Typical practice:/);
    expect(d?.value).not.toMatch(/\badd\b/);
    expect(RULES.RANGE_NONE.auditRows).toEqual(expect.arrayContaining(['V10', 'V11', 'V12']));
  });

  it('lists the rows of the disagreeing sources of the depth and the arc', () => {
    expect(RULES.SQUAT_DEPTH.auditRows).toEqual(expect.arrayContaining(['V95', 'V116', 'V119', 'V117']));
    expect(RULES.HOLD_P2.auditRows).toEqual(expect.arrayContaining(['V105', 'V114']));
    expect(RULES.PT_VISITS.auditRows).toContain('V111');
    expect(RULES.ROM_CHECK.auditRows).toContain('V12');
  });

  it('puts no number from a WRONG row in a text: the heel slide for an unknown limit names no knee angle', () => {
    expect(strip(RULES.HEEL_P2_UNKNOWN.text)).not.toMatch(/\d/);
  });

  // A3-04: the caveat, the display and the guideline words are checked for numbers too (the digits helper above reads them).
  it('reads the caveat, the disagreeing source and the reason of a rule with no value for numbers', () => {
    const withNumbers = RULE_IDS.map((id) => RULES[id]).filter((r) => r.kind !== 'engineering' && r.kind !== 'referral' && r.appOwn !== true && digits(r));
    expect(withNumbers.length).toBeGreaterThan(10);
    for (const r of withNumbers) expect(r.auditRows?.length ?? 0, r.id).toBeGreaterThan(0);
    expect(withNumbers.map((r) => r.id)).toEqual(expect.arrayContaining(['HOLD_P2', 'SQUAT_DEPTH', 'RANGE_NONE', 'NONE_HOLDTIME']));
  });

  it('puts no number of an unaudited source on a screen', () => {
    const all = RULE_IDS.map((id) => RULES[id]).flatMap((r) => [r.text, r.conservative ?? '', r.display?.disagree ?? '', r.population]).join(' ');
    expect(all).not.toMatch(/Sanford/);
    expect(all).not.toMatch(/above 125 degrees/);
    expect(all).not.toMatch(/20 healthy adults/);
    expect(RULES.ENG_TARGET.population + RULES.ENG_RETURN.population + RULES.ENG_HOLD.population).not.toMatch(/\b20\b/);
  });
});

