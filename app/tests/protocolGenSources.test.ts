import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RULES } from '../src/lib/protocolGen/rules';
import { AUDIT_DATE, GRADES, isPublished, SOURCES, type Source } from '../src/lib/protocolGen/sources';

// The two files in docs/ are the only place where a quote can come from.
const research = (name: string) => readFileSync(resolve(__dirname, '../../docs', name), 'utf8');
const KNOWLEDGE = [research('citation-audit.md'), research('rehab-rules.md')];

const entries = Object.entries(SOURCES) as [string, Source][];

describe('sources table', () => {
  it('has one entry for each source id and the id matches the key', () => {
    expect(entries.length).toBeGreaterThanOrEqual(10);
    for (const [key, s] of entries) expect(s.id).toBe(key);
  });

  it('gives every entry a full reference, a claim, a grade and the check date', () => {
    for (const [, s] of entries) {
      for (const field of ['authors', 'title', 'venue', 'url', 'studyType', 'population', 'claim'] as const) {
        expect(s[field].trim().length, `${s.id}.${field}`).toBeGreaterThan(0);
      }
      expect(s.year).toBeGreaterThan(2000);
      expect(GRADES).toContain(s.grade);
      expect(s.checked).toBe(AUDIT_DATE);
      expect(s.checked).toBe('2026-11-08');
    }
  });

  it('finds every quote in the citation audit or in the rehab rules file', () => {
    for (const [, s] of entries) {
      for (const q of s.quotes) {
        const found = KNOWLEDGE.some((text) => text.includes(q));
        expect(found, `${s.id}: quote not found: ${q}`).toBe(true);
      }
    }
  });

  it('marks an entry verified only when the audit verdict is EXACT', () => {
    for (const [, s] of entries) expect(s.verified, s.id).toBe(s.audit === 'EXACT');
  });

  it('gives a verified entry at least one quote', () => {
    for (const [, s] of entries.filter(([, e]) => e.verified)) expect(s.quotes.length, s.id).toBeGreaterThan(0);
  });

  // The Opus final audit read the PDF of P1 again. The text is "Follow more conservative guideline".
  // Only the audit row can hold the quote, because the rehab rules file still has the old text. The row is PARAPHRASED.
  it('quotes the combined-surgery line of P1 with the true word and finds it in the audit row V34', () => {
    expect(SOURCES.P1.quotes).toContain('Follow more conservative guideline');
    expect(SOURCES.P1.quotes).not.toContain('Follow most conservative guideline');
    const row = research('citation-audit.md').split('\n').find((l) => l.startsWith('| V34 |'))!;
    expect(row).toContain('"Follow more conservative guideline"');
    expect(row).toContain('PARAPHRASED');
    expect(row).not.toContain('EXACT');
    expect(row).toContain('corrected by the Opus final audit, 2026-11-09');
  });

  it('keeps the rule text for combined surgery in step with the true quote', () => {
    expect(RULES.R2.text).toContain('more conservative guideline');
    expect(RULES.R2.text).not.toContain('most conservative');
  });

  it('keeps the paraphrased HSS guideline unverified, as the audit says', () => {
    expect(SOURCES.P1.audit).toBe('PARAPHRASED');
    expect(SOURCES.P1.verified).toBe(false);
  });

  it('never grades the guideline sources above OPINION', () => {
    for (const id of ['S1', 'P1', 'P2', 'P3'] as const) expect(SOURCES[id].grade).toBe('OPINION');
  });
});

describe('published sources and project files (L2-09)', () => {
  it('marks the project files as not published and the literature as published', () => {
    expect(isPublished(SOURCES.RR)).toBe(false);
    expect(isPublished(SOURCES.DESIGN)).toBe(false);
    for (const [, s] of entries) if (s.id !== 'RR' && s.id !== 'DESIGN') expect(isPublished(s), s.id).toBe(true);
  });

  it('gives every rule that carries a number at least one published source', () => {
    for (const r of Object.values(RULES)) {
      if (Object.keys(r.values).length === 0) continue;
      expect(r.sourceIds.some((id) => isPublished(SOURCES[id])), `${r.id} rests only on a project file`).toBe(true);
    }
  });
});

describe('sources of generator version 2 (audit section 9 of 2026-11-09)', () => {
  const audit = research('citation-audit.md');
  const rowOf = (id: string) => audit.split('\n').find((l) => l.startsWith(`| ${id} |`));

  it('verifies N3 and S16 only through audit rows that say EXACT', () => {
    for (const id of ['N3', 'S16'] as const) {
      expect(SOURCES[id].audit, id).toBe('EXACT');
      expect(SOURCES[id].verified, id).toBe(true);
    }
    for (const id of ['V95', 'V96', 'V97', 'V98', 'V116']) {
      expect(rowOf(id), id).toMatch(/\| EXACT \|/);
    }
  });

  it('lists an audit row for every source that carries a quote of version 2', () => {
    for (const id of ['N3', 'S16', 'P2', 'P3', 'S1'] as const) {
      for (const row of SOURCES[id].auditRows) expect(rowOf(row), `${id} ${row}`).toBeDefined();
    }
  });

  it('keeps S16 labelled as a study of healthy people', () => {
    expect(SOURCES.S16.population).toMatch(/healthy/i);
    expect(SOURCES.S16.quotes).toContain('a smaller knee angle range between 0 degrees and 50 degrees');
  });

  it('keeps the arc quote of P1 for the seated hold and the quote that disagrees with an early squat', () => {
    expect(SOURCES.P1.quotes).toContain('Follow surgeon preference and patient tolerance for open chain strengthening in a limited arc of motion (90-40 degrees)');
    expect(SOURCES.P1.quotes).toContain('Squat progression: chair squats to free squats');
  });
});
