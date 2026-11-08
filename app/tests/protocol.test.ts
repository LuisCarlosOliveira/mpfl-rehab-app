import example from '../src/lib/protocol/example-protocol.json';
import { createProtocolStore, loadProtocol, surgeonField } from '../src/lib/protocol';

const approved = {
  schemaVersion: 1,
  id: 'p-001',
  side: 'left',
  authoredBy: 'Clinic A',
  approvedOn: '2026-11-01',
  activePhase: 1,
  phases: [
    {
      id: 1,
      name: 'Protection',
      exercises: [{ kind: 'heel-slide', sets: 3, reps: 10, targetFlexion: 60, maxFlexion: 90, source: 'PROPOSAL' }],
    },
  ],
  surgeon: {},
};

const text = (o: unknown) => JSON.stringify(o);
const withChange = (change: Record<string, unknown>) => ({ ...approved, ...change });

describe('loadProtocol: valid files', () => {
  it('loads an approved protocol in patient mode', () => {
    const r = loadProtocol(text(approved), 'patient');
    expect(r.ok).toBe(true);
  });

  it('loads the example in demo mode', () => {
    const r = loadProtocol(text(example), 'demo');
    expect(r.ok).toBe(true);
  });
});

describe('loadProtocol: refusals', () => {
  it('refuses the example in patient mode', () => {
    const r = loadProtocol(text(example), 'patient');
    expect(r).toMatchObject({ ok: false, error: { code: 'example-in-patient-mode' } });
  });

  it('refuses a protocol with no approvedOn in patient mode', () => {
    const { approvedOn: _a, ...rest } = approved; // eslint-disable-line @typescript-eslint/no-unused-vars
    const r = loadProtocol(text(rest), 'patient');
    expect(r).toMatchObject({ ok: false, error: { code: 'not-approved' } });
  });

  it('accepts a protocol with no approvedOn in demo mode', () => {
    const { approvedOn: _a, ...rest } = approved; // eslint-disable-line @typescript-eslint/no-unused-vars
    expect(loadProtocol(text(rest), 'demo').ok).toBe(true);
  });
});

describe('loadProtocol: five named invalid fixtures', () => {
  const cases: Array<[string, string, string]> = [
    ['bad JSON', '{not json', 'invalid-json'],
    ['wrong schemaVersion', text(withChange({ schemaVersion: 2 })), 'schema'],
    ['side is not left or right', text(withChange({ side: 'both' })), 'schema'],
    ['activePhase out of range', text(withChange({ activePhase: 99 })), 'schema'],
    ['flexion above 180', text(withChange({ phases: [{ id: 1, name: 'x', exercises: [{ kind: 'heel-slide', targetFlexion: 400, source: 's' }] }] })), 'schema'],
  ];
  it.each(cases)('%s', (_name, input, code) => {
    const r = loadProtocol(input, 'demo');
    expect(r).toMatchObject({ ok: false, error: { code } });
    if (!r.ok) expect(r.error.message.length).toBeGreaterThan(0);
  });
});

describe('loadProtocol: untrusted input limits', () => {
  it('rejects a file over 5 MB before parsing', () => {
    const big = 'x'.repeat(5 * 1024 * 1024 + 1);
    expect(loadProtocol(big, 'demo')).toMatchObject({ ok: false, error: { code: 'too-large' } });
  });

  it('rejects an unknown key', () => {
    expect(loadProtocol(text(withChange({ extra: 1 })), 'demo')).toMatchObject({ ok: false, error: { code: 'schema' } });
  });

  it('rejects a __proto__ key', () => {
    const raw = text(approved).replace('{', '{"__proto__":{"admin":true},');
    expect(loadProtocol(raw, 'demo').ok).toBe(false);
  });

  it('rejects a string that is too long', () => {
    expect(loadProtocol(text(withChange({ authoredBy: 'a'.repeat(1000) })), 'demo').ok).toBe(false);
  });

  it('keeps a script string as plain text and does not run it', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const r = loadProtocol(text(withChange({ authoredBy: evil })), 'demo');
    expect(r.ok && r.protocol.authoredBy).toBe(evil);
  });
});

describe('surgeon fields', () => {
  it('shows "Ask your surgeon" when a field is missing, with no default value', () => {
    const r = loadProtocol(text(approved), 'patient');
    if (!r.ok) throw new Error('expected ok');
    expect(surgeonField(r.protocol, 'brace')).toEqual({ set: false, text: 'Ask your surgeon' });
    expect(surgeonField(r.protocol, 'weightBearing').set).toBe(false);
  });

  it('returns the value when the surgeon set it', () => {
    const r = loadProtocol(text(withChange({ surgeon: { brace: 'Open hinge brace until week 4' } })), 'patient');
    if (!r.ok) throw new Error('expected ok');
    expect(surgeonField(r.protocol, 'brace')).toEqual({ set: true, value: 'Open hinge brace until week 4' });
  });
});

describe('read-only store', () => {
  it('exposes the active phase from the file', () => {
    const r = loadProtocol(text(approved), 'patient');
    if (!r.ok) throw new Error('expected ok');
    expect(createProtocolStore(r.protocol).activePhase).toBe(1);
  });

  it('has no setter and the protocol is frozen', () => {
    const r = loadProtocol(text(approved), 'patient');
    if (!r.ok) throw new Error('expected ok');
    const store = createProtocolStore(r.protocol);
    // @ts-expect-error activePhase is read-only
    expect(() => { store.activePhase = 2; }).toThrow(TypeError);
    // @ts-expect-error protocol is deeply read-only
    expect(() => { store.protocol.activePhase = 2; }).toThrow(TypeError);
    // @ts-expect-error nested values are read-only too
    expect(() => { store.protocol.phases[0].name = 'x'; }).toThrow(TypeError);
    expect(store.activePhase).toBe(1);
  });
});

describe('example protocol', () => {
  it('has a non-empty source on every exercise', () => {
    for (const phase of example.phases) {
      for (const ex of phase.exercises) expect(ex.source.trim().length).toBeGreaterThan(0);
    }
  });

  it('is marked as an example and carries no approval', () => {
    expect(example.example).toBe(true);
    expect('approvedOn' in example).toBe(false);
  });

  it('leaves every surgeon field empty', () => {
    expect(Object.keys(example.surgeon)).toHaveLength(0);
  });
});
