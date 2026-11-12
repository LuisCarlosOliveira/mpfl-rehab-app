import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { counterSetup, isLegRaised } from '../../src/lib/exercises';
import { cueFor } from '../../src/lib/cues';
import { guideFor } from '../../src/lib/guides';
import { MARGIN_DEG } from '../../src/lib/margin';
import { EXERCISE_KINDS, HOME_EXERCISE_KINDS, PLAN_EXERCISE_KINDS } from '../../src/lib/protocol/schema';
import { SOURCES } from '../../src/lib/protocolGen/sources';
import { CLINICIAN_FIELDS, REGISTRY, specFor, specTexts, validateRegistry, validateSpec } from '../../src/lib/monitor';
import type { ExerciseSpec } from '../../src/lib/monitor';

const FOUR = ['heel-slide', 'mini-squat', 'straight-leg-raise', 'seated-extension-hold'] as const;
const FIVE = ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'] as const;
const spec = (id: string): ExerciseSpec => {
  const s = specFor(id);
  if (s === undefined) throw new Error(`no spec ${id}`);
  return s;
};
const value = (id: string, name: string): number | null | undefined => spec(id).thresholds.find((t) => t.name === name)?.value;
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const constant = (file: string, name: string): number => {
  const m = new RegExp(`const ${name}\\s*=\\s*([0-9.]+)`).exec(read(file));
  if (m === null) throw new Error(`${name} not found in ${file}`);
  return Number(m[1]);
};
const EXERCISES_TS = '../../src/lib/exercises.ts';

describe('registry rules', () => {
  it('every spec is valid', () => {
    expect(validateRegistry(REGISTRY)).toEqual([]);
  });

  it('rule 1 and 2: no cue checks an engineering threshold, and every threshold has an origin', () => {
    for (const s of REGISTRY) {
      for (const t of s.thresholds) expect(t.origin, `${s.id} ${t.name}`).toMatch(/^(engineering|source:|clinician:)/);
      for (const c of s.cues) expect(s.thresholds.find((t) => t.name === c.threshold)?.origin, `${s.id} ${c.event}`).not.toBe('engineering');
    }
  });

  it('rule 3: every person-timer spec has no cue and no counting measure', () => {
    const timers = REGISTRY.filter((s) => s.mode === 'person-timer');
    expect(timers.map((s) => s.id).sort()).toEqual(['gluteal-set', 'quad-set']);
    for (const s of timers) {
      expect(s.cues).toEqual([]);
      expect(validateSpec(s)).toEqual([]);
    }
  });

  // Source of the lists: scripts/claims-check.sh, the variables `words` and `praise` (lines 83 and 84).
  const words = 'correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|grade|pass|fail|goal|milestone';
  const praise =
    'great|nice|well done|well-done|excellent|awesome|congratulations|success|successful|improve|improving|improved|worse|worsening|healing|recovered|recovery|proud|fantastic|amazing|brilliant|superb|impressive|keep it up|you did it|way to go|healed';
  it('rule 4: no text field holds a verdict or praise word', () => {
    const re = new RegExp(`\\b(${words}|${praise})\\b`, 'i');
    for (const s of REGISTRY) for (const text of specTexts(s)) expect(text, `${s.id}: ${text}`).not.toMatch(re);
  });

  it('rule 5: the ids are unique and the four existing ids equal EXERCISE_KINDS', () => {
    const ids = REGISTRY.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => (EXERCISE_KINDS as readonly string[]).includes(id)).sort()).toEqual([...EXERCISE_KINDS].sort());
    expect([...FOUR].sort()).toEqual([...EXERCISE_KINDS].sort());
  });

  it('rule 5: EXERCISE_KINDS stays the four kinds with numbers. The five new ids are in HOME_EXERCISE_KINDS and in PLAN_EXERCISE_KINDS', () => {
    for (const id of ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back']) {
      expect(EXERCISE_KINDS as readonly string[]).not.toContain(id);
      expect(HOME_EXERCISE_KINDS as readonly string[]).toContain(id);
      expect(PLAN_EXERCISE_KINDS as readonly string[]).toContain(id);
    }
  });

  // Step D1 retires the split of the types in a different way: the guards of monitored.ts follow the registry, and this test
  // keeps the two lists equal. A kind that a plan holds has a definition, so Home shows its Start button.
  it('rule 5: every kind that a plan can hold has a definition, and every definition is a plan kind', () => {
    expect(REGISTRY.map((s) => s.id).sort()).toEqual([...PLAN_EXERCISE_KINDS].sort());
  });

  it('traces every origin: source ids are in the sources table, clinician fields are in the protocol schema', () => {
    const schema = read('../../src/lib/protocol/schema.ts');
    for (const f of CLINICIAN_FIELDS) expect(schema, f).toMatch(new RegExp(`^\\s+${f}:`, 'm'));
    for (const s of REGISTRY) {
      for (const id of [...s.sourceIds, ...s.guide.basis.sourceIds]) expect(SOURCES, `${s.id} ${id}`).toHaveProperty(id);
      for (const t of s.thresholds) {
        if (t.origin.startsWith('source:')) expect(SOURCES, `${s.id} ${t.name}`).toHaveProperty(t.origin.slice(7));
        if (t.origin.startsWith('clinician:')) expect(CLINICIAN_FIELDS as readonly string[], `${s.id} ${t.name}`).toContain(t.origin.slice(10));
      }
    }
  });
});

// Rule 6. The registry data of the four existing exercises equals what exercises.ts, counters.ts and cues.ts use today.
// Compared: margin (9), enter fraction (0.8), min state time (300 ms), min target (10 degrees), raise height (0.05),
// settle time (500 ms), lift end time (300 ms), the reps config and the hold config of counterSetup, the cue events and
// the guide text of guides.ts. The private constants of exercises.ts are read from its text.
describe('registry equals the code of the four existing exercises', () => {
  it('constants of exercises.ts', () => {
    expect(value('heel-slide', 'enter-fraction')).toBe(constant(EXERCISES_TS, 'ENTER_FRACTION'));
    expect(value('mini-squat', 'enter-fraction')).toBe(constant(EXERCISES_TS, 'ENTER_FRACTION'));
    for (const id of ['heel-slide', 'mini-squat']) {
      expect(value(id, 'min-state-ms')).toBe(constant(EXERCISES_TS, 'MIN_STATE_MS'));
      expect(value(id, 'min-target')).toBe(constant(EXERCISES_TS, 'MIN_TARGET'));
    }
    expect(value('straight-leg-raise', 'raise-min-height')).toBe(constant(EXERCISES_TS, 'RAISE_MIN_HEIGHT'));
    expect(value('straight-leg-raise', 'raise-settle-ms')).toBe(constant(EXERCISES_TS, 'RAISE_SETTLE_MS'));
    expect(value('straight-leg-raise', 'lift-end-ms')).toBe(constant(EXERCISES_TS, 'LIFT_END_MS'));
    expect([500, 300, 0.05]).toEqual([
      value('straight-leg-raise', 'raise-settle-ms'),
      value('straight-leg-raise', 'lift-end-ms'),
      value('straight-leg-raise', 'raise-min-height'),
    ]);
  });

  it('margin equals MARGIN_DEG in every spec that has one', () => {
    for (const id of ['heel-slide', 'mini-squat', 'seated-extension-hold']) expect(value(id, 'margin')).toBe(MARGIN_DEG);
  });

  it('the raise height is the boundary of isLegRaised', () => {
    const h = value('straight-leg-raise', 'raise-min-height') as number;
    const hip = { x: 0.5, y: 0.5 };
    expect(isLegRaised(hip, { x: 0.3, y: 0.5 - h - 0.001 })).toBe(true);
    expect(isLegRaised(hip, { x: 0.3, y: 0.5 - h + 0.001 })).toBe(false);
  });

  it('reps config of counterSetup: enter, minStateMs and margin', () => {
    for (const kind of ['heel-slide', 'mini-squat'] as const) {
      const r = counterSetup({ kind, targetFlexion: 100, maxFlexion: 130, returnWithinDeg: 5, source: 'test' });
      if (!r.ok || r.kind !== 'reps') throw new Error('expected reps');
      expect(r.config.enter).toBe(100 * (value(kind, 'enter-fraction') as number));
      expect(r.config.minStateMs).toBe(value(kind, 'min-state-ms'));
      expect(r.config.margin).toBe(value(kind, 'margin'));
      expect(counterSetup({ kind, targetFlexion: (value(kind, 'min-target') as number) - 1, source: 'test' }).ok).toBe(false);
      expect(counterSetup({ kind, targetFlexion: value(kind, 'min-target') as number, source: 'test' }).ok).toBe(true);
    }
  });

  it('hold config of counterSetup: band is target plus margin, arc end uses the margin', () => {
    const r = counterSetup({ kind: 'seated-extension-hold', targetFlexion: 70, minFlexion: 40, holdSeconds: 5, source: 'test' });
    if (!r.ok || r.kind !== 'hold') throw new Error('expected hold');
    expect(r.config.threshold).toBe(70 + (value('seated-extension-hold', 'margin') as number));
    expect(r.config.arcEnd?.margin).toBe(value('seated-extension-hold', 'margin'));
    expect(r.config.minHoldMs).toBe(5000);
    expect(spec('seated-extension-hold').mode).toBe('timed-hold');
    expect(spec('straight-leg-raise').mode).toBe('lift');
    expect(spec('heel-slide').mode).toBe('reps-peak');
    expect(spec('mini-squat').mode).toBe('reps-peak');
  });

  it('cue events of the registry have a text in cues.ts', () => {
    const ctx = { repMs: 1000, minRepMs: 2000 };
    for (const id of FOUR) for (const c of spec(id).cues) expect(cueFor(c.event, ctx), `${id} ${c.event}`).not.toBeNull();
    expect(spec('heel-slide').cues.map((c) => c.event)).toEqual(['near-limit', 'over-limit', 'shallow', 'too-fast']);
    expect(spec('seated-extension-hold').cues.map((c) => c.event)).toEqual(['near-limit', 'over-limit', 'hold-restart']);
    expect(spec('straight-leg-raise').cues).toEqual([]);
  });

  it('clinician fields of the registry are the protocol fields that counterSetup reads', () => {
    const fields = (id: string) => spec(id).thresholds.filter((t) => t.origin.startsWith('clinician:')).map((t) => t.origin.slice(10)).sort();
    expect(fields('heel-slide')).toEqual(['maxFlexion', 'minRepSeconds', 'returnWithinDeg', 'targetFlexion']);
    expect(fields('mini-squat')).toEqual(fields('heel-slide'));
    expect(fields('seated-extension-hold')).toEqual(['holdSeconds', 'minFlexion', 'targetFlexion']);
    expect(fields('straight-leg-raise')).toEqual(['maxTopFlexion']);
  });

  it('guide text equals guides.ts', () => {
    for (const id of FOUR) {
      const g = guideFor(id);
      const r = spec(id).guide;
      expect({ ...r, bodyMapPoints: undefined, basis: undefined }).toEqual({ ...g, bodyMapPoints: undefined, basis: undefined });
      expect(r.basis.kind).toBe('existing');
    }
  });
});

// Rule 7. A guide exists for each exercise. The five new ones are a PROPOSAL.
// research/technique-sources.md covers the four camera exercises only. The new guides name only the sources that the sources table holds.
describe('guides', () => {
  const FIELDS = ['startPosition', 'legFacingCamera', 'handsAndSupport', 'range', 'speed', 'cameraMustSee'] as const;
  it('every exercise has a guide with all six texts', () => {
    for (const s of REGISTRY) for (const f of FIELDS) expect(s.guide[f].length, `${s.id} ${f}`).toBeGreaterThan(10);
  });
  it('the five new guides are marked PROPOSAL', () => {
    for (const id of FIVE) expect(spec(id).guide.basis.kind, id).toBe('proposal');
  });
  it('the sources of a new guide are in the sources table (technique-sources.md covers the four camera exercises only)', () => {
    for (const id of FIVE) for (const sid of spec(id).guide.basis.sourceIds) expect(SOURCES[sid as keyof typeof SOURCES]?.id).toBe(sid);
  });
  it('each guide sentence has 25 words at most', () => {
    for (const s of REGISTRY) for (const f of FIELDS) for (const sentence of s.guide[f].split(/(?<=[.!?])\s+/)) expect(sentence.split(/\s+/).length, `${s.id}: ${sentence}`).toBeLessThanOrEqual(25);
  });
});

describe('R-01: the leg raise to the side is side-lying only', () => {
  it('lists no standing posture', () => {
    expect(spec('leg-raise-side').posture).toEqual(['side-lying']);
  });
});
