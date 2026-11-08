// T28: the optional field minFlexion of the seated knee extension hold. It is the straightest knee angle
// that the clinician allows. It has no default. The hold runs between minFlexion and targetFlexion.
import example from '../src/lib/protocol/example-protocol.json';
import { loadProtocol } from '../src/lib/protocol';
import { MARGIN_DEG } from '../src/lib/margin';

const base = { schemaVersion: 1, id: 'p-hold', side: 'left', activePhase: 1, surgeon: {} };
const hold = { kind: 'seated-extension-hold', holdSeconds: 5, targetFlexion: 60, minFlexion: 40, source: 'PROPOSAL' };
const make = (exercise: Record<string, unknown>) => ({ ...base, phases: [{ id: 1, name: 'Strengthening', exercises: [exercise] }] });
const load = (o: unknown) => loadProtocol(JSON.stringify(o), 'demo');

describe('schema: minFlexion of the seated hold', () => {
  it('loads a hold with both angles', () => {
    expect(load(make(hold)).ok).toBe(true);
  });

  it('keeps the field optional and gives it no default', () => {
    const without: Record<string, unknown> = { ...hold };
    delete without.minFlexion;
    const r = load(make(without));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.protocol.phases[0]!.exercises[0]!.minFlexion).toBeUndefined();
  });

  it.each([-1, 181, Number.NaN])('rejects the value %s', (v) => {
    expect(load(make({ ...hold, minFlexion: v })).ok).toBe(false);
  });

  it('rejects a text value', () => {
    expect(load(make({ ...hold, minFlexion: '40' })).ok).toBe(false);
  });

  it.each(['heel-slide', 'mini-squat', 'straight-leg-raise'])('rejects the field on %s and names it', (kind) => {
    const r = load(make({ kind, targetFlexion: 60, minFlexion: 40, source: 'PROPOSAL' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/minFlexion/);
  });

  it('rejects a hold angle that is not more than minFlexion plus the margin, and names both fields', () => {
    const r = load(make({ ...hold, minFlexion: 40, targetFlexion: 40 + MARGIN_DEG }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/targetFlexion[\s\S]*minFlexion|minFlexion[\s\S]*targetFlexion/);
    expect(load(make({ ...hold, minFlexion: 40, targetFlexion: 40 + MARGIN_DEG + 1 })).ok).toBe(true);
  });

  it('allows minFlexion 0, which lets the clinician allow full extension', () => {
    expect(load(make({ ...hold, minFlexion: 0, targetFlexion: 0 })).ok).toBe(true);
  });

  it('rejects an unknown key next to it', () => {
    expect(load(make({ ...hold, minFlex: 40 })).ok).toBe(false);
  });
});

describe('example protocol: the seated hold', () => {
  const phases = example.phases as Array<{ id: number; exercises: Array<Record<string, unknown>> }>;
  const holdIn = (id: number) => phases.find((p) => p.id === id)!.exercises.find((e) => e.kind === 'seated-extension-hold');

  it('has no seated hold in phase 1', () => {
    expect(holdIn(1)).toBeUndefined();
  });

  it('has the hold in phase 2 with both angles and 2 sets of 10 as example values', () => {
    expect(holdIn(2)).toMatchObject({ minFlexion: 40, targetFlexion: 60, sets: 2, reps: 10 });
  });

  it('marks the hold values as example values with the source P1 and PROPOSAL', () => {
    const source = String(holdIn(2)!.source);
    expect(source).toMatch(/PROPOSAL/);
    expect(source).toMatch(/P1/);
    expect(source).toMatch(/OPINION/);
    expect(source.length).toBeLessThanOrEqual(200);
  });

  it('keeps the active phase from the file, which is phase 1', () => {
    expect(example.activePhase).toBe(1);
  });

  it('still loads', () => {
    expect(load(example).ok).toBe(true);
  });
});
