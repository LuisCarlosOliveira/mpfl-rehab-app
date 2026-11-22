import example from '../src/lib/protocol/example-protocol.json';
import { loadProtocol, surgeonField } from '../src/lib/protocol';
import { MARGIN_DEG, MARGIN_SOURCE, MARGIN_SOURCE_TEXT } from '../src/lib/margin';

const base = {
  schemaVersion: 1,
  id: 'p-002',
  side: 'left',
  authoredBy: 'Clinic A',
  approvedOn: '2026-11-01',
  activePhase: 1,
  surgeon: {},
};

const heel = { kind: 'heel-slide', sets: 3, reps: 10, targetFlexion: 60, maxFlexion: 90, source: 'PROPOSAL' };
const phase = (over: Record<string, unknown> = {}, exercise: Record<string, unknown> = heel) => ({
  id: 1,
  name: 'Protection',
  exercises: [exercise],
  ...over,
});
const make = (over: Record<string, unknown> = {}) => ({ ...base, phases: [phase()], ...over });
const load = (o: unknown) => loadProtocol(JSON.stringify(o), 'demo');

const numeric = { kind: 'numeric', measure: 'peakFlexionDeg', exerciseId: 'heel-slide', op: 'atLeast', limit: 110, lastSessions: 3, evidence: 'borrowed' };
const swelling = { kind: 'swelling', noneOrSomeOnly: true, lastSessions: 3, evidence: 'unvalidated' };
const check = { kind: 'clinicianCheck', key: 'quadStrength', evidence: 'borrowed' };

describe('margin constant', () => {
  it('is 9 degrees and names its source and status', () => {
    expect(MARGIN_DEG).toBe(9);
    expect(MARGIN_SOURCE_TEXT[MARGIN_SOURCE]).toMatch(/UNVERIFIED/);
    expect(MARGIN_SOURCE_TEXT[MARGIN_SOURCE]).toMatch(/lite/);
  });
});

describe('exercise: minRepSeconds and maxTopFlexion', () => {
  it('loads a protocol that sets both', () => {
    const slr = { kind: 'straight-leg-raise', sets: 3, reps: 10, minRepSeconds: 2, maxTopFlexion: 20, source: 'PROPOSAL' };
    expect(load(make({ phases: [phase({}, slr)] })).ok).toBe(true);
  });

  it('rejects a maxTopFlexion smaller than the margin and names the margin', () => {
    const slr = { kind: 'straight-leg-raise', maxTopFlexion: MARGIN_DEG - 1, source: 'PROPOSAL' };
    const r = load(make({ phases: [phase({}, slr)] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(new RegExp(`${MARGIN_DEG}`));
  });

  it('accepts a maxTopFlexion equal to the margin', () => {
    const slr = { kind: 'straight-leg-raise', maxTopFlexion: MARGIN_DEG, source: 'PROPOSAL' };
    expect(load(make({ phases: [phase({}, slr)] })).ok).toBe(true);
  });

  it.each([0.4, 31, -1])('rejects minRepSeconds %s', (v) => {
    expect(load(make({ phases: [phase({}, { ...heel, minRepSeconds: v })] })).ok).toBe(false);
  });

  it('rejects a maxFlexion smaller than the targetFlexion', () => {
    const r = load(make({ phases: [phase({}, { ...heel, targetFlexion: 80, maxFlexion: 70 })] }));
    expect(r.ok).toBe(false);
  });

  it('rejects a maxFlexion equal to the targetFlexion and names the exercise, the margin and the fix', () => {
    const r = load(make({ phases: [phase({}, { ...heel, targetFlexion: 70, maxFlexion: 70 })] }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.message).toMatch(/heel-slide/);
      expect(r.error.message).toMatch(new RegExp(`margin of ${MARGIN_DEG} degrees`));
      expect(r.error.message).toMatch(/raise maxFlexion or lower targetFlexion/i);
    }
  });

  it('rejects a maxFlexion at the target plus the margin, and accepts one degree more', () => {
    const at = { ...heel, targetFlexion: 30, maxFlexion: 30 + MARGIN_DEG };
    expect(load(make({ phases: [phase({}, at)] })).ok).toBe(false);
    expect(load(make({ phases: [phase({}, { ...at, maxFlexion: 30 + MARGIN_DEG + 1 })] })).ok).toBe(true);
  });

  it('applies the rule to a mini squat in a second phase', () => {
    const squat = { kind: 'mini-squat', targetFlexion: 40, maxFlexion: 45, source: 'PROPOSAL' };
    expect(load(make({ phases: [phase(), phase({ id: 2 }, squat)] })).ok).toBe(false);
  });

  it('does not apply the rule when only one of the two values is set', () => {
    expect(load(make({ phases: [phase({}, { ...heel, targetFlexion: undefined })] })).ok).toBe(true);
    expect(load(make({ phases: [phase({}, { ...heel, maxFlexion: undefined })] })).ok).toBe(true);
  });

  it('keeps a hold exercise with minFlexion 0 and a target of 0 valid, because the clinician allows full extension', () => {
    const hold = { kind: 'seated-extension-hold', holdSeconds: 5, minFlexion: 0, targetFlexion: 0, source: 'PROPOSAL' };
    expect(load(make({ phases: [phase({}, hold)] })).ok).toBe(true);
  });
});

describe('phase: reviewCriteria and reviewDate', () => {
  it('loads numeric, swelling and clinician-check rows and a review date', () => {
    const r = load(make({ phases: [phase({ reviewCriteria: [numeric, swelling, check], reviewDate: '2026-12-01' })] }));
    expect(r.ok).toBe(true);
  });

  it('allows a phase with no criteria and no review date', () => {
    expect(load(make()).ok).toBe(true);
  });

  it('rejects more than 12 rows', () => {
    const rows = Array.from({ length: 13 }, () => check);
    expect(load(make({ phases: [phase({ reviewCriteria: rows })] })).ok).toBe(false);
  });

  it('accepts exactly 12 rows', () => {
    const rows = Array.from({ length: 12 }, () => check);
    expect(load(make({ phases: [phase({ reviewCriteria: rows })] })).ok).toBe(true);
  });

  it('rejects an unknown key in a row', () => {
    expect(load(make({ phases: [phase({ reviewCriteria: [{ ...numeric, note: 'free text' }] })] })).ok).toBe(false);
  });

  it('rejects a free-text clinician check key', () => {
    expect(load(make({ phases: [phase({ reviewCriteria: [{ ...check, key: 'looks good to me' }] })] })).ok).toBe(false);
  });

  it('rejects an unknown measure', () => {
    expect(load(make({ phases: [phase({ reviewCriteria: [{ ...numeric, measure: 'formScore' }] })] })).ok).toBe(false);
  });

  it('rejects a numeric row with no limit (no default)', () => {
    const { limit: _l, ...noLimit } = numeric; // eslint-disable-line @typescript-eslint/no-unused-vars
    expect(load(make({ phases: [phase({ reviewCriteria: [noLimit] })] })).ok).toBe(false);
  });

  it.each([2, 11])('rejects lastSessions %s', (n) => {
    expect(load(make({ phases: [phase({ reviewCriteria: [{ ...numeric, lastSessions: n }] })] })).ok).toBe(false);
  });

  it('rejects a swelling row that allows "more than before"', () => {
    expect(load(make({ phases: [phase({ reviewCriteria: [{ ...swelling, noneOrSomeOnly: false }] })] })).ok).toBe(false);
  });

  it('rejects an unknown evidence label', () => {
    expect(load(make({ phases: [phase({ reviewCriteria: [{ ...numeric, evidence: 'validated' }] })] })).ok).toBe(false);
  });

  it('rejects a bad review date', () => {
    expect(load(make({ phases: [phase({ reviewDate: 'next week' })] })).ok).toBe(false);
  });
});

describe('surgeon.concurrentProcedures', () => {
  it('shows "Ask your surgeon" when it is missing', () => {
    const r = load(make());
    if (!r.ok) throw new Error('expected ok');
    expect(surgeonField(r.protocol, 'concurrentProcedures')).toEqual({ set: false, text: 'Ask your surgeon' });
  });

  it('returns the value when the surgeon set it', () => {
    const r = load(make({ surgeon: { concurrentProcedures: 'Tibial tubercle osteotomy' } }));
    if (!r.ok) throw new Error('expected ok');
    expect(surgeonField(r.protocol, 'concurrentProcedures')).toEqual({ set: true, value: 'Tibial tubercle osteotomy' });
  });
});

describe('example protocol still loads', () => {
  it('loads in demo mode', () => {
    expect(load(example).ok).toBe(true);
  });
});
