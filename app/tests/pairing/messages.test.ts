// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LANDMARK_COUNT, makeHello, MAX_MESSAGE_BYTES, parseMessage, toBase64Url } from '../../src/lib/pairing';
import { messageSchema } from '../../src/lib/pairing/messages';
import { seeded } from './helpers';

const point = (i = 0) => ({ x: 0.1 + i / 100, y: 0.5, visibility: 0.9 });
const landmarks = (over: Record<string, unknown> = {}) => ({
  type: 'landmarks',
  tMs: 1234,
  view: 'side',
  landmarks: Array.from({ length: 33 }, (_, i) => point(i)),
  ...over,
});
const text = (v: unknown) => JSON.stringify(v);
const HELLO_SECRET = toBase64Url(new Uint8Array(16));

describe('hello', () => {
  it('accepts a hello with the version and a 22 character value', () => {
    const r = parseMessage(text({ type: 'hello', v: 1, secret: HELLO_SECRET }));
    expect(r).toEqual({ ok: true, value: { type: 'hello', v: 1, secret: HELLO_SECRET } });
  });
  it('makeHello builds a message that parses', () => {
    const r = parseMessage(text(makeHello(Uint8Array.from({ length: 16 }, (_, i) => i))));
    expect(r.ok).toBe(true);
  });
  it.each([
    ['another version', { type: 'hello', v: 2, secret: HELLO_SECRET }],
    ['no version', { type: 'hello', secret: HELLO_SECRET }],
    ['a short value', { type: 'hello', v: 1, secret: HELLO_SECRET.slice(1) }],
    ['a long value', { type: 'hello', v: 1, secret: HELLO_SECRET + 'A' }],
    ['a bad character in the value', { type: 'hello', v: 1, secret: HELLO_SECRET.slice(1) + '=' }],
    ['an extra field', { type: 'hello', v: 1, secret: HELLO_SECRET, extra: 1 }],
  ])('refuses %s', (_n, msg) => {
    expect(parseMessage(text(msg))).toEqual({ ok: false, code: 'bad-schema' });
  });
});

describe('landmarks', () => {
  it('accepts 33 landmarks, with and without visibility', () => {
    expect(parseMessage(text(landmarks())).ok).toBe(true);
    const noVis = landmarks({ landmarks: Array.from({ length: 33 }, () => ({ x: 0, y: 0 })) });
    expect(parseMessage(text(noVis)).ok).toBe(true);
  });
  it('accepts the view front and refuses other views', () => {
    expect(parseMessage(text(landmarks({ view: 'front' }))).ok).toBe(true);
    expect(parseMessage(text(landmarks({ view: 'top' }))).ok).toBe(false);
  });
  it('refuses 32 and 34 landmarks', () => {
    for (const n of [0, 32, 34]) {
      const msg = landmarks({ landmarks: Array.from({ length: n }, (_, i) => point(i)) });
      expect(parseMessage(text(msg))).toEqual({ ok: false, code: 'bad-schema' });
    }
    expect(LANDMARK_COUNT).toBe(33);
  });

  describe('number bounds', () => {
    const withPoint = (p: Record<string, unknown>) =>
      landmarks({ landmarks: [p, ...Array.from({ length: 32 }, (_, i) => point(i))] });
    it.each([
      [{ x: -1, y: -1, visibility: 0 }, true],
      [{ x: 2, y: 2, visibility: 1 }, true],
      [{ x: -1.0001, y: 0 }, false],
      [{ x: 2.0001, y: 0 }, false],
      [{ x: 0, y: -1.0001 }, false],
      [{ x: 0, y: 2.0001 }, false],
      [{ x: 0, y: 0, visibility: -0.0001 }, false],
      [{ x: 0, y: 0, visibility: 1.0001 }, false],
      [{ x: '0', y: 0 }, false],
      [{ x: null, y: 0 }, false],
      [{ x: 0 }, false],
      [{ x: 0, y: 0, z: 0 }, false],
    ])('point %j gives %s', (p, expected) => {
      expect(parseMessage(text(withPoint(p))).ok).toBe(expected);
    });
    it('refuses a time below 0 and a time above the safe integer', () => {
      expect(parseMessage(text(landmarks({ tMs: -1 }))).ok).toBe(false);
      expect(parseMessage(text(landmarks({ tMs: 0 }))).ok).toBe(true);
      expect(parseMessage(text(landmarks({ tMs: 2 ** 53 }))).ok).toBe(false);
    });
    it('refuses NaN and Infinity, as text and as an overflowing number', () => {
      const raw = text(landmarks());
      expect(parseMessage(raw.replace('1234', 'NaN'))).toEqual({ ok: false, code: 'not-json' });
      expect(parseMessage(raw.replace('1234', 'Infinity'))).toEqual({ ok: false, code: 'not-json' });
      expect(parseMessage(raw.replace('1234', '-Infinity'))).toEqual({ ok: false, code: 'not-json' });
      expect(parseMessage(raw.replace('"x":0.1,', '"x":1e999,'))).toEqual({ ok: false, code: 'bad-schema' });
    });
    it('also refuses NaN and Infinity in the schema itself', () => {
      for (const bad of [NaN, Infinity, -Infinity]) {
        expect(messageSchema.safeParse(landmarks({ tMs: bad })).success).toBe(false);
        expect(messageSchema.safeParse(withPoint({ x: bad, y: 0 })).success).toBe(false);
      }
    });
  });

  describe('no image, frame or pixel data', () => {
    const huge = 'A'.repeat(1_000_000);
    it('has no field that accepts a large string, tested on the schema without the size cap', () => {
      const cases = [
        { type: 'hello', v: 1, secret: huge },
        { type: 'hello', v: 1, secret: HELLO_SECRET, image: huge },
        landmarks({ view: huge }),
        landmarks({ type: huge }),
        landmarks({ frame: huge }),
        landmarks({ image: huge }),
        landmarks({ pixels: new Array(100_000).fill(0) }),
        landmarks({ landmarks: [{ x: 0, y: 0, data: huge }, ...Array.from({ length: 32 }, () => point())] }),
        landmarks({ tMs: huge }),
        { type: 'bye', image: huge },
      ];
      for (const c of cases) expect(messageSchema.safeParse(c).success).toBe(false);
    });
    it('has no field that accepts an array beyond the 33 landmarks', () => {
      const big = Array.from({ length: 1000 }, (_, i) => point(i));
      expect(messageSchema.safeParse(landmarks({ landmarks: big })).success).toBe(false);
      expect(messageSchema.safeParse(landmarks({ landmarks: Array.from({ length: 33 }, () => ({ ...point(), pixels: [1] })) })).success).toBe(false);
    });
    it('refuses a binary message and a typed array', () => {
      expect(parseMessage(new ArrayBuffer(10))).toEqual({ ok: false, code: 'not-text' });
      expect(parseMessage(new Uint8Array(10))).toEqual({ ok: false, code: 'not-text' });
    });
  });
});

describe('bye', () => {
  it('accepts bye and refuses extra fields', () => {
    expect(parseMessage('{"type":"bye"}')).toEqual({ ok: true, value: { type: 'bye' } });
    expect(parseMessage('{"type":"bye","x":1}')).toEqual({ ok: false, code: 'bad-schema' });
  });
});

describe('size cap in bytes', () => {
  it('is 4096', () => {
    expect(MAX_MESSAGE_BYTES).toBe(4096);
  });
  // A bye with a padding field gives a message of exact size. The padding is refused later, not by the size check.
  const pad = (bytes: number, ch = 'a') => `{"type":"bye","p":"${ch.repeat(bytes)}"}`;
  it('passes the size check at exactly 4096 bytes and refuses 4097', () => {
    const base = new TextEncoder().encode(pad(0)).length;
    const at = pad(4096 - base);
    expect(new TextEncoder().encode(at).length).toBe(4096);
    expect(parseMessage(at)).toEqual({ ok: false, code: 'bad-schema' });
    expect(parseMessage(pad(4097 - base))).toEqual({ ok: false, code: 'too-large' });
  });
  it('counts bytes, not characters: 2000 euro signs are 6000 bytes', () => {
    const m = pad(2000, '€');
    expect(m.length).toBeLessThan(MAX_MESSAGE_BYTES);
    expect(parseMessage(m)).toEqual({ ok: false, code: 'too-large' });
  });
  it('fits a worst case landmarks message with 17 digit numbers', () => {
    const p = { x: -0.12345678901234567, y: 1.2345678901234567, visibility: 0.12345678901234567 };
    const msg = text(landmarks({ tMs: Number.MAX_SAFE_INTEGER, landmarks: Array.from({ length: 33 }, () => p) }));
    expect(new TextEncoder().encode(msg).length).toBeLessThanOrEqual(MAX_MESSAGE_BYTES);
    expect(parseMessage(msg).ok).toBe(true);
  });
  it('refuses a very long text without a crash', () => {
    expect(parseMessage('x'.repeat(10_000_000))).toEqual({ ok: false, code: 'too-large' });
  });
});

describe('hostile JSON', () => {
  it('refuses a repeated key at the top level', () => {
    expect(parseMessage('{"type":"bye","type":"bye"}')).toEqual({ ok: false, code: 'duplicate-key' });
  });
  it('refuses a repeated key inside a landmark', () => {
    const raw = text(landmarks()).replace('{"x":0.1,', '{"x":0.1,"x":0.2,');
    expect(parseMessage(raw)).toEqual({ ok: false, code: 'duplicate-key' });
  });
  it('refuses a repeated key that uses an escape', () => {
    expect(parseMessage('{"type":"bye","\\u0074ype":"hello"}')).toEqual({ ok: false, code: 'duplicate-key' });
  });
  it('accepts the same key in two different objects', () => {
    expect(parseMessage(text(landmarks())).ok).toBe(true); // every landmark has x and y
  });
  it('is not confused by a key text inside a string value', () => {
    expect(parseMessage('{"type":"bye","a":"\\",\\"type\\":"}')).toEqual({ ok: false, code: 'bad-schema' });
  });
  it.each([
    ['__proto__', '{"__proto__":{"x":1},"type":"bye"}'],
    ['__proto__ with an escape', '{"\\u005f_proto__":{"x":1},"type":"bye"}'],
    ['__proto__ inside a landmark', text(landmarks()).replace('{"x":0.1,', '{"__proto__":1,"x":0.1,')],
  ])('refuses %s', (_n, raw) => {
    expect(parseMessage(raw)).toEqual({ ok: false, code: 'forbidden-key' });
  });
  it('does not change Object.prototype', () => {
    parseMessage('{"__proto__":{"polluted":true},"type":"bye"}');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it('refuses constructor and prototype keys through the strict schema', () => {
    expect(parseMessage('{"type":"bye","constructor":{}}').ok).toBe(false);
    expect(parseMessage('{"type":"bye","prototype":{}}').ok).toBe(false);
  });
  it.each(['', 'null', '1', '"bye"', '[]', '[{"type":"bye"}]', '{', '{"type":"bye"', 'undefined', "{'type':'bye'}", '{"type":"bye"}x'])(
    'refuses %j without a throw',
    (raw) => {
      expect(parseMessage(raw).ok).toBe(false);
    },
  );
  it('refuses an unknown type', () => {
    expect(parseMessage('{"type":"offer"}')).toEqual({ ok: false, code: 'bad-schema' });
  });
  it('refuses deep nesting without a throw', () => {
    expect(parseMessage('['.repeat(2000) + ']'.repeat(2000)).ok).toBe(false);
    expect(parseMessage('{"a":'.repeat(800) + '1' + '}'.repeat(800)).ok).toBe(false);
  });
  it('never throws on 200 random strings and 200 mutated messages', () => {
    const rnd = seeded(5);
    const chars = '{}[]":,.-+eE0123456789abtypeNaInfu\\ \né';
    for (let i = 0; i < 200; i++) {
      const s = Array.from({ length: Math.floor(rnd() * 150) }, () => chars[Math.floor(rnd() * chars.length)]).join('');
      expect(() => parseMessage(s)).not.toThrow();
    }
    const base = text(landmarks());
    for (let i = 0; i < 200; i++) {
      const at = Math.floor(rnd() * base.length);
      const mutated = base.slice(0, at) + chars[Math.floor(rnd() * chars.length)] + base.slice(at + 1);
      expect(() => parseMessage(mutated)).not.toThrow();
    }
  });
  it('never throws on values that are not text', () => {
    for (const v of [undefined, null, 1, {}, [], Symbol('x'), () => 1, new Blob(['x'])]) {
      expect(parseMessage(v)).toEqual({ ok: false, code: 'not-text' });
    }
  });
});
