// The clinician template (docs/clinician-template.json, guide docs/clinician-template.md).
// Every value that a clinician owns is a placeholder that the schema refuses: the text "SET BY CLINICIAN" or null.
// The values in FILL are SYNTHETIC. They test the schema only. They are not clinical values.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadProtocol, protocolSchema } from '../src/lib/protocol';

const raw = readFileSync(resolve(__dirname, '../../docs/clinician-template.json'), 'utf8');
const PLACEHOLDER = 'SET BY CLINICIAN';

type Json = unknown;
const isPlaceholder = (v: Json) => v === PLACEHOLDER || v === null;

/** Paths of every placeholder leaf, as in a Zod issue path. */
function placeholderPaths(v: Json, path: (string | number)[] = []): string[] {
  if (isPlaceholder(v)) return [path.join('.')];
  if (Array.isArray(v)) return v.flatMap((x, i) => placeholderPaths(x, [...path, i]));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => placeholderPaths(x, [...path, k]));
  return [];
}

// SYNTHETIC values, test only.
const SYNTHETIC = {
  id: 'synthetic-001',
  side: 'left',
  approvedOn: '2026-01-01',
  activePhase: 1,
  painPauseThreshold: 3,
};

/** Replace each placeholder with a synthetic value that the schema accepts, chosen by the field name. */
function fill(v: Json, key = ''): Json {
  if (isPlaceholder(v)) {
    if (key in SYNTHETIC) return SYNTHETIC[key as keyof typeof SYNTHETIC];
    const table: Record<string, Json> = {
      name: 'synthetic phase',
      reviewDate: '2026-02-01',
      sets: 2,
      reps: 5,
      targetFlexion: 40,
      maxFlexion: 80,
      returnWithinDeg: 15,
      minRepSeconds: 2,
      maxTopFlexion: 20,
      holdSeconds: 5,
      minFlexion: 30,
      source: 'synthetic test value',
      measure: 'peakFlexionDeg',
      op: 'atLeast',
      limit: 50,
      lastSessions: 3,
      evidence: 'unvalidated',
      authoredBy: 'synthetic clinic',
      brace: 'synthetic',
      weightBearing: 'synthetic',
      depthLimit: 'synthetic',
      phaseClearance: 'synthetic',
      concurrentProcedures: 'synthetic',
      key: 'gait',
    };
    return table[key];
  }
  if (Array.isArray(v)) return v.map((x) => fill(x, key));
  if (v && typeof v === 'object') {
    const o = v as Record<string, Json>;
    const out = Object.fromEntries(Object.entries(o).map(([k, x]) => [k, fill(x, k)]));
    // A phase id and the active phase must match: the phases take 1 and 2.
    return out;
  }
  return v;
}

describe('clinician template', () => {
  it('is valid JSON and has every clinician field of the schema', () => {
    const t = JSON.parse(raw);
    expect(Object.keys(t).sort()).toEqual(['activePhase', 'approvedOn', 'authoredBy', 'id', 'painPauseThreshold', 'phases', 'schemaVersion', 'side', 'surgeon']);
    expect(Object.keys(t.surgeon).sort()).toEqual(['brace', 'concurrentProcedures', 'depthLimit', 'phaseClearance', 'weightBearing']);
    expect(t.phases.flatMap((p: { exercises: { kind: string }[] }) => p.exercises.map((e) => e.kind)).sort()).toEqual(
      ['heel-slide', 'mini-squat', 'seated-extension-hold', 'straight-leg-raise'],
    );
  });

  it('is refused as it is, in demo mode and in patient mode', () => {
    expect(loadProtocol(raw, 'demo').ok).toBe(false);
    expect(loadProtocol(raw, 'patient').ok).toBe(false);
  });

  it('refuses every placeholder: the schema flags each one, so none passes in silence', () => {
    const result = protocolSchema.safeParse(JSON.parse(raw));
    expect(result.success).toBe(false);
    const flagged = new Set(result.error!.issues.map((i) => i.path.join('.')));
    const missed = placeholderPaths(JSON.parse(raw)).filter((p) => !flagged.has(p));
    expect(missed).toEqual([]);
  });

  it('has no default clinical value: no number outside the fixed fields', () => {
    const numbers: string[] = [];
    const walk = (v: Json, path: string[]) => {
      if (typeof v === 'number') numbers.push(path.join('.'));
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, String(i)]));
      else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, [...path, k]));
    };
    walk(JSON.parse(raw), []);
    expect(numbers).toEqual(['schemaVersion']);
  });

  it('is accepted after a test fills the placeholders with SYNTHETIC values', () => {
    const t = JSON.parse(raw);
    const filled = fill(t) as { phases: { id: number }[] };
    filled.phases.forEach((p, i) => (p.id = i + 1));
    const result = loadProtocol(JSON.stringify(filled), 'patient');
    expect(result).toMatchObject({ ok: true });
  });

  it('is refused again when one placeholder stays in the filled file', () => {
    const t = JSON.parse(raw);
    const filled = fill(t) as { phases: { id: number }[]; approvedOn: string };
    filled.phases.forEach((p, i) => (p.id = i + 1));
    filled.approvedOn = PLACEHOLDER;
    expect(loadProtocol(JSON.stringify(filled), 'patient').ok).toBe(false);
  });
});
