import type { PairingFields } from '../../src/lib/pairing';

export const MDNS = '3f2504e0-4f89-41d3-9a0c-0305e82c3301.local';

export function fields(over: Partial<PairingFields> = {}): PairingFields {
  return {
    ufrag: 'aB3x',
    pwd: 'abcdefghijklmnopqrstuvwx',
    fingerprint: Uint8Array.from({ length: 32 }, (_, i) => i * 7),
    secret: Uint8Array.from({ length: 16 }, (_, i) => 200 - i),
    candidates: [{ host: MDNS, port: 53988, protocol: 'udp' }],
    ...over,
  };
}

/** A small seeded random generator, so that the fuzz tests give the same result on each run. */
export function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
