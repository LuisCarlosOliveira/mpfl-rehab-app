import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RULE_IDS, RULES } from '../src/lib/protocolGen';

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
});
