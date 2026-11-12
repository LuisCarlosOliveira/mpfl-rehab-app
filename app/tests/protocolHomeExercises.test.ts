// LEGACY input: the optional array `homeExercises` of a phase. The loader moves each item into `exercises` (see protocolFiveKinds.test.ts).
import { loadProtocol } from '../src/lib/protocol';

const base = { schemaVersion: 1, id: 'p-home', side: 'left', activePhase: 1, surgeon: {} };
const item = { kind: 'quad-set', sets: 2, reps: 10, source: 'PROPOSAL' };
const make = (homeExercises: unknown) => ({
  ...base,
  phases: [{ id: 1, name: 'Protection', exercises: [{ kind: 'straight-leg-raise', source: 'PROPOSAL' }], homeExercises }],
});
const load = (o: unknown) => loadProtocol(JSON.stringify(o), 'demo');

describe('schema: home exercises', () => {
  it('accepts a phase with home exercises and moves them into exercises', () => {
    const kinds = ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'];
    const r = load(make(kinds.map((kind) => ({ kind, source: 'PROPOSAL' }))));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.protocol.phases[0]!.homeExercises).toBeUndefined();
      expect(r.protocol.phases[0]!.exercises).toHaveLength(6);
    }
  });

  it('rejects an unknown home exercise kind', () => {
    expect(load(make([{ ...item, kind: 'mini-squat' }])).ok).toBe(false);
  });

  it('rejects an angle field on a home exercise', () => {
    for (const key of ['targetFlexion', 'maxFlexion', 'minFlexion']) {
      expect(load(make([{ ...item, [key]: 30 }])).ok, key).toBe(false);
    }
  });

  it('rejects more than 10 home exercises', () => {
    expect(load(make(Array.from({ length: 11 }, () => item))).ok).toBe(false);
  });

  it('rejects the same kind twice', () => {
    expect(load(make([item, item])).ok).toBe(false);
  });

  it('rejects a dose out of range and a missing source', () => {
    expect(load(make([{ ...item, sets: 0 }])).ok).toBe(false);
    expect(load(make([{ ...item, reps: 101 }])).ok).toBe(false);
    expect(load(make([{ kind: 'quad-set' }])).ok).toBe(false);
  });

  it('keeps a loaded file without home exercises valid', () => {
    const o = make(undefined);
    delete (o.phases[0] as Record<string, unknown>).homeExercises;
    const r = load(o);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.protocol.phases[0]!.homeExercises).toBeUndefined();
  });
});
