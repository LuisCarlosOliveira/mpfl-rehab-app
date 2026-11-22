import example from '../src/lib/protocol/example-protocol.json';
import { loadProtocol } from '../src/lib/protocol';
import { counterSetup } from '../src/lib/exercises';
import type { Exercise } from '../src/lib/protocol';

const base = {
  schemaVersion: 1,
  id: 'p-return',
  side: 'left',
  activePhase: 1,
  surgeon: {},
};
const heel = { kind: 'heel-slide', targetFlexion: 60, maxFlexion: 90, source: 'PROPOSAL' };
const make = (exercise: Record<string, unknown>) => ({ ...base, phases: [{ id: 1, name: 'Protection', exercises: [exercise] }] });
const load = (o: unknown) => loadProtocol(JSON.stringify(o), 'demo');

describe('schema: returnWithinDeg', () => {
  it('loads a heel slide with a return value', () => {
    expect(load(make({ ...heel, returnWithinDeg: 20 })).ok).toBe(true);
  });

  it('loads a heel slide with no return value, because the field is optional', () => {
    expect(load(make(heel)).ok).toBe(true);
  });

  it.each([0, -5, 91, Number.NaN])('rejects the value %s', (v) => {
    expect(load(make({ ...heel, returnWithinDeg: v })).ok).toBe(false);
  });

  it('rejects a text value', () => {
    expect(load(make({ ...heel, returnWithinDeg: '20' })).ok).toBe(false);
  });

  it('rejects the field on an exercise that has no rep counter and names the field', () => {
    const slr = { kind: 'straight-leg-raise', returnWithinDeg: 10, source: 'PROPOSAL' };
    const r = load(make(slr));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/returnWithinDeg/);
  });

  it('rejects the field on the seated hold', () => {
    const hold = { kind: 'seated-extension-hold', holdSeconds: 5, returnWithinDeg: 10, source: 'PROPOSAL' };
    expect(load(make(hold)).ok).toBe(false);
  });
});

describe('example protocol: returnWithinDeg', () => {
  const exercises = (example.phases as Array<{ exercises: Array<Record<string, unknown>> }>).flatMap((p) => p.exercises);

  it('sets a value for each rep counting exercise and marks it as PROPOSAL', () => {
    for (const e of exercises.filter((x) => x.kind === 'heel-slide' || x.kind === 'mini-squat')) {
      expect(typeof e.returnWithinDeg).toBe('number');
      expect(e.source).toMatch(/returnWithinDeg[^.]*PROPOSAL/);
    }
  });

  it('sets no value for an exercise that has no rep counter', () => {
    for (const e of exercises.filter((x) => x.kind !== 'heel-slide' && x.kind !== 'mini-squat')) {
      expect(e.returnWithinDeg).toBeUndefined();
    }
  });

  it('keeps every source under 200 characters', () => {
    for (const e of exercises) expect((e.source as string).length).toBeLessThan(200);
  });
});

describe('counterSetup: returnWithinDeg', () => {
  const ex = (over: Partial<Exercise>): Exercise => ({ kind: 'heel-slide', targetFlexion: 60, maxFlexion: 90, source: 'PROPOSAL', ...over });

  it('passes the protocol value to the counter and removes the old exit fraction', () => {
    const r = counterSetup(ex({ returnWithinDeg: 20 }));
    expect(r).toMatchObject({ ok: true, kind: 'reps', config: { returnWithin: 20 } });
    if (r.ok && r.kind === 'reps') expect('exit' in r.config).toBe(false);
  });

  it('sets no default when the protocol has no value', () => {
    const r = counterSetup(ex({}));
    expect(r).toMatchObject({ ok: true, kind: 'reps' });
    if (r.ok && r.kind === 'reps') expect(r.config.returnWithin).toBeUndefined();
  });
});
