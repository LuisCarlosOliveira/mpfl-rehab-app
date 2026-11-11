// Plain words for each kind of schema problem in a protocol file (FR29, A-10).
import { loadProtocol } from '../src/lib/protocol';
import example from '../src/lib/protocol/example-protocol.json';

const messageOf = (change: Record<string, unknown>): string => {
  const r = loadProtocol(JSON.stringify({ ...example, example: undefined, approvedOn: '2026-01-01', ...change }), 'demo');
  if (r.ok) throw new Error('expected a refusal');
  return r.error.message;
};
const RAW = /Invalid input|Invalid option|Unrecognized key|Too (small|big)|expected (string|number|object|array)|received/i;

describe('loader messages', () => {
  it('a missing field says it is missing', () => {
    const m = messageOf({ id: undefined });
    expect(m).toBe('The protocol is not valid at "id": the value is missing.');
  });
  it('a wrong type says so', () => {
    const m = messageOf({ activePhase: 'one' });
    expect(m).toContain('"activePhase"');
    expect(m).toMatch(/wrong type/);
    expect(m).not.toMatch(RAW);
  });
  it('a value that is not allowed says so', () => {
    const m = messageOf({ side: 'middle' });
    expect(m).toContain('"side"');
    expect(m).toMatch(/not one of the allowed values/);
    expect(m).not.toMatch(RAW);
  });
  it('an unknown key says so', () => {
    const m = messageOf({ extraKey: 1 });
    expect(m).toMatch(/key that the app does not know/);
    expect(m).not.toMatch(RAW);
  });
  it('a number out of range says so', () => {
    const m = messageOf({ painPauseThreshold: 99 });
    expect(m).not.toMatch(RAW);
  });
});
