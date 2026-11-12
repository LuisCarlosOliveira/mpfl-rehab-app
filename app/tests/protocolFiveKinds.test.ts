// Step A of exercise monitoring: the five exercises are camera exercises. An old file with `homeExercises` still loads.
import { loadProtocol, EXERCISE_KINDS } from '../src/lib/protocol';
import { PLAN_EXERCISE_KINDS } from '../src/lib/protocol/schema';

const FIVE = ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'];
const base = { schemaVersion: 1, id: 'p-five', side: 'left', activePhase: 1, surgeon: {} };
const slr = { kind: 'straight-leg-raise', source: 'PROPOSAL' };
const make = (phase: Record<string, unknown>) => ({ ...base, phases: [{ id: 1, name: 'Protection', ...phase }] });
const load = (o: unknown) => loadProtocol(JSON.stringify(o), 'demo');
const UNKNOWN = 'This file names an exercise that the app does not know. Ask your care team to use an exercise from the list.';

describe('the five exercises as camera exercises', () => {
  it('lists the nine kinds for a plan, and keeps the four engine kinds apart until Step B', () => {
    for (const k of FIVE) expect(PLAN_EXERCISE_KINDS as readonly string[]).toContain(k);
    expect(PLAN_EXERCISE_KINDS).toHaveLength(9);
    expect(EXERCISE_KINDS).toHaveLength(4);
  });

  it('loads a new file with the five in exercises', () => {
    const r = load(make({ exercises: [slr, ...FIVE.map((kind) => ({ kind, sets: 2, reps: 10, source: 'PROPOSAL' }))] }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.protocol.phases[0]!.exercises.map((e) => e.kind)).toEqual(['straight-leg-raise', ...FIVE]);
  });

  it('keeps the schema strict: an angle field is refused on the five, a hold time only on the two timers', () => {
    for (const kind of FIVE) {
      for (const key of ['targetFlexion', 'maxFlexion', 'minFlexion', 'returnWithinDeg', 'maxTopFlexion', 'minRepSeconds']) {
        expect(load(make({ exercises: [{ kind, [key]: 30, source: 'x' }] })).ok, `${kind} ${key}`).toBe(false);
      }
    }
    for (const kind of ['quad-set', 'gluteal-set']) expect(load(make({ exercises: [{ kind, holdSeconds: 5, source: 'x' }] })).ok).toBe(true);
    for (const kind of ['ankle-pump', 'leg-raise-side', 'leg-raise-back']) expect(load(make({ exercises: [{ kind, holdSeconds: 5, source: 'x' }] })).ok).toBe(false);
  });

  it('refuses an unknown exercise id with the plain text', () => {
    const r = load(make({ exercises: [slr, { kind: 'lunge', source: 'x' }] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain(UNKNOWN);
  });

  it('keeps the generic text for another invalid value', () => {
    const r = load({ ...make({ exercises: [slr] }), side: 'middle' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('not one of the allowed values');
  });
});

describe('legacy homeExercises', () => {
  const home = FIVE.map((kind) => ({ kind, sets: 2, reps: 10, source: 'Old source (HOME)' }));

  it('converts an old file into exercises of the new kinds and keeps sets, reps and source', () => {
    const r = load(make({ exercises: [slr], homeExercises: home }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ph = r.protocol.phases[0]!;
    expect(ph.exercises.map((e) => e.kind)).toEqual(['straight-leg-raise', ...FIVE]);
    expect(ph.exercises[1]).toMatchObject({ kind: 'quad-set', sets: 2, reps: 10, source: 'Old source (HOME)' });
    expect(ph.homeExercises).toBeUndefined();
  });

  it('does not repeat a kind that the file already holds in exercises', () => {
    const r = load(make({ exercises: [slr, { kind: 'quad-set', source: 'new' }], homeExercises: home }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const kinds = r.protocol.phases[0]!.exercises.map((e) => e.kind);
      expect(kinds.filter((k) => k === 'quad-set')).toHaveLength(1);
      expect(r.protocol.phases[0]!.exercises.find((e) => e.kind === 'quad-set')!.source).toBe('new');
    }
  });

  it('still refuses a bad legacy item with a plain message', () => {
    expect(load(make({ exercises: [slr], homeExercises: [{ kind: 'mini-squat', source: 'x' }] })).ok).toBe(false);
    expect(load(make({ exercises: [slr], homeExercises: 'no' })).ok).toBe(false);
  });
});
