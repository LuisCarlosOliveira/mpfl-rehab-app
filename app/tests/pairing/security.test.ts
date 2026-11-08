// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TTL_MS, isFresh, newSecret, OneTimeSecrets, secretsEqual } from '../../src/lib/pairing';

afterEach(() => vi.restoreAllMocks());

describe('newSecret', () => {
  it('gives 16 bytes', () => {
    expect(newSecret()).toHaveLength(16);
  });
  it('uses crypto.getRandomValues and never Math.random', () => {
    const rnd = vi.spyOn(Math, 'random');
    const spy = vi.spyOn(crypto, 'getRandomValues');
    newSecret();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(rnd).not.toHaveBeenCalled();
  });
  it('gives a different value each time', () => {
    const seen = new Set(Array.from({ length: 50 }, () => Array.from(newSecret()).join(',')));
    expect(seen.size).toBe(50);
  });
});

describe('secretsEqual', () => {
  const a = Uint8Array.from([1, 2, 3, 4]);
  it('is true for equal bytes and false for one different byte at any place', () => {
    expect(secretsEqual(a, a.slice())).toBe(true);
    for (let i = 0; i < 4; i++) {
      const b = a.slice();
      b[i] = b[i]! ^ 1;
      expect(secretsEqual(a, b)).toBe(false);
    }
  });
  it('is false for a different length, also when one is the start of the other', () => {
    expect(secretsEqual(a, a.subarray(0, 3))).toBe(false);
    expect(secretsEqual(a.subarray(0, 3), a)).toBe(false);
    expect(secretsEqual(new Uint8Array(0), new Uint8Array(0))).toBe(true);
    expect(secretsEqual(new Uint8Array(0), Uint8Array.from([0]))).toBe(false);
  });
  it('does not return early: it compares every byte for a match and for a first-byte mismatch', () => {
    const calls = { n: 0 };
    const counting = (x: number, y: number) => (calls.n++, x ^ y);
    secretsEqual(a, a.slice(), counting);
    expect(calls.n).toBe(4);
    calls.n = 0;
    secretsEqual(a, Uint8Array.from([9, 2, 3, 4]), counting);
    expect(calls.n).toBe(4);
    calls.n = 0;
    secretsEqual(a, Uint8Array.from([9, 9, 9, 9]), counting);
    expect(calls.n).toBe(4);
  });
  it('compares the longer length when the lengths differ', () => {
    const calls = { n: 0 };
    secretsEqual(a, a.subarray(0, 1), (x, y) => (calls.n++, x ^ y));
    expect(calls.n).toBe(4);
  });
});

describe('isFresh', () => {
  const t0 = 1_000_000;
  it('uses 120 seconds by default', () => {
    expect(DEFAULT_TTL_MS).toBe(120_000);
  });
  it('is fresh one ms before the ttl, and expired at exactly the ttl and one ms after', () => {
    expect(isFresh(t0, t0 + 119_999)).toBe(true);
    expect(isFresh(t0, t0 + 120_000)).toBe(false);
    expect(isFresh(t0, t0 + 120_001)).toBe(false);
  });
  it('is fresh at age 0', () => {
    expect(isFresh(t0, t0)).toBe(true);
  });
  it('is not fresh when the clock moved back or a value is not a number', () => {
    expect(isFresh(t0, t0 - 1)).toBe(false);
    expect(isFresh(NaN, t0)).toBe(false);
    expect(isFresh(t0, Infinity)).toBe(false);
  });
  it('takes the ttl from the argument', () => {
    expect(isFresh(0, 14_999, 15_000)).toBe(true);
    expect(isFresh(0, 15_000, 15_000)).toBe(false);
  });
});

describe('OneTimeSecrets', () => {
  it('accepts a value once and then refuses it (replay)', () => {
    const s = new OneTimeSecrets();
    const value = s.issue(0);
    expect(s.consume(value, 10)).toBe('ok');
    expect(s.consume(value, 11)).toBe('bad-secret');
    expect(s.size).toBe(0);
  });
  it('refuses a value that was never issued and keeps the real one', () => {
    const s = new OneTimeSecrets();
    s.issue(0);
    expect(s.consume(newSecret(), 1)).toBe('bad-secret');
    expect(s.size).toBe(1);
  });
  it('refuses an expired value at exactly the ttl and removes it', () => {
    const s = new OneTimeSecrets();
    const value = s.issue(0);
    expect(s.consume(value, 120_000)).toBe('expired');
    expect(s.consume(value, 120_001)).toBe('bad-secret');
  });
  it('accepts a value one ms before the ttl', () => {
    const s = new OneTimeSecrets();
    expect(s.consume(s.issue(0), 119_999)).toBe('ok');
  });
  it('keeps a limit on open values and drops the oldest', () => {
    const s = new OneTimeSecrets();
    const all = Array.from({ length: 6 }, (_, i) => s.issue(i));
    expect(s.size).toBe(4);
    expect(s.consume(all[0]!, 10)).toBe('bad-secret');
    expect(s.consume(all[1]!, 10)).toBe('bad-secret');
    expect(s.consume(all[5]!, 10)).toBe('ok');
  });
  it('drops expired values before it drops a fresh one', () => {
    const s = new OneTimeSecrets(100, 2);
    const old = s.issue(0);
    const mid = s.issue(60);
    const late = s.issue(150); // old has expired, so mid stays
    expect(s.consume(old, 151)).toBe('bad-secret');
    expect(s.consume(mid, 151)).toBe('ok');
    expect(s.consume(late, 151)).toBe('ok');
  });
  it('hands out a copy, so a change by the caller does not change the stored value', () => {
    const s = new OneTimeSecrets();
    const value = s.issue(0);
    const copy = value.slice();
    value.fill(0);
    expect(s.consume(copy, 1)).toBe('ok');
  });
  it('clear removes everything', () => {
    const s = new OneTimeSecrets();
    const value = s.issue(0);
    s.clear();
    expect(s.consume(value, 1)).toBe('bad-secret');
  });
});
