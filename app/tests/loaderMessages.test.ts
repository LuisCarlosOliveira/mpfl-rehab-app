// Plain words for each kind of schema problem in a protocol file (FR29, A-10).
import { loadProtocol } from '../src/lib/protocol';
import example from '../src/lib/protocol/example-protocol.json';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

  it('an unknown key at the top level names the key and says "in the file"', () => {
    const m = messageOf({ extraKey: 1 });
    expect(m).toBe('The protocol is not valid in the file: the file has a key that the app does not know: "extraKey".');
    expect(m).not.toContain('at "file"');
  });
  it('an unknown key inside a block keeps its path', () => {
    const m = messageOf({ surgeon: { ...example.surgeon, oddKey: 1 } });
    expect(m).toContain('at "surgeon"');
    expect(m).toContain('"oddKey"');
  });
  it('an unknown key name is plain text: no control character, cut at 40 characters', () => {
    const m = messageOf({ ['bad\u0007\nkey<b>' + 'x'.repeat(100)]: 1 });
    expect(m).not.toMatch(/[\u0000-\u001f\u007f]/);
    expect(m).toContain('"badkey<b>');
    expect(m).toContain('...');
    expect(m.length).toBeLessThan(250);
  });
  it('several unknown keys name the first and count the rest', () => {
    const m = messageOf({ aaa: 1, bbb: 2, ccc: 3 });
    expect(m).toContain('"aaa"');
    expect(m).toContain('2 more');
  });
  it('a wrong date format gives the expected form', () => {
    const m = messageOf({ approvedOn: '1 Jan 2026' });
    expect(m).toContain('"approvedOn"');
    expect(m).toContain('use the form YYYY-MM-DD');
    expect(m).not.toMatch(RAW);
  });
});

describe('loader messages for the clinician template', () => {
  const template = readFileSync(resolve(__dirname, '../../docs/clinician-template.json'), 'utf8');
  const refusal = (raw: string): string => {
    const r = loadProtocol(raw, 'demo');
    if (r.ok) throw new Error('expected a refusal');
    return r.error.message;
  };
  const count = (v: unknown): number => (v === 'SET BY CLINICIAN' || v === null ? 1 : Array.isArray(v) ? v.reduce<number>((n, x) => n + count(x), 0) : v && typeof v === 'object' ? Object.values(v).reduce<number>((n, x) => n + count(x), 0) : 0);

  it('the unfilled template names the first field and counts the others', () => {
    const total = count(JSON.parse(template));
    expect(total).toBeGreaterThan(10);
    const m = refusal(template);
    expect(m).toContain(`${total - 1} more fields still have placeholder text.`);
  });
  it('two placeholders left say "One more field"', () => {
    const m = messageOf({ id: 'SET BY CLINICIAN', side: 'SET BY CLINICIAN' });
    expect(m).toContain('One more field still has placeholder text.');
  });
  it('one placeholder left adds no count', () => {
    expect(messageOf({ id: 'SET BY CLINICIAN' })).not.toContain('more field');
  });
  it('a file with no placeholder adds no count', () => {
    expect(messageOf({ id: undefined })).not.toContain('placeholder');
  });
});
