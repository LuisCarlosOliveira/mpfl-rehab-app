import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RULES } from '../src/lib/protocolGen/rules';
import { AUDIT_DATE, GRADES, isPublished, SOURCES, type Source } from '../src/lib/protocolGen/sources';

// The two research files are the only place where a quote can come from.
const research = (name: string) => readFileSync(resolve(__dirname, '../../research', name), 'utf8');
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
