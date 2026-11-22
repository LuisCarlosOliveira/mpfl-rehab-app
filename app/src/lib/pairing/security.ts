export const SECRET_BYTES = 16; // 128 bits. ASVS 7.2.3 sets this size for tokens.
export const DEFAULT_TTL_MS = 120_000; // PROPOSAL: qr-pairing.md section 5 rule 3. No source sets the value.
export const MAX_OPEN_SECRETS = 4; // PROPOSAL: a patient can ask for a new code a few times.

export function newSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SECRET_BYTES));
}

export function secretsEqual(
  a: Uint8Array,
  b: Uint8Array,
  diff: (x: number, y: number) => number = (x, y) => x ^ y,
): boolean {
  let acc = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) acc |= diff(a[i] ?? 0, b[i] ?? 0);
  return acc === 0;
}

export function isFresh(createdAtMs: number, nowMs: number, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const age = nowMs - createdAtMs;
  return Number.isFinite(age) && age >= 0 && age < ttlMs;
}

export type ConsumeResult = 'ok' | 'bad-secret' | 'expired';

export class OneTimeSecrets {
  private open: { secret: Uint8Array; issuedAt: number }[] = [];
  private readonly ttlMs: number;
  private readonly max: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS, max: number = MAX_OPEN_SECRETS) {
    this.ttlMs = ttlMs;
    this.max = max;
  }

  get size(): number {
    return this.open.length;
  }

  issue(nowMs: number): Uint8Array {
    this.open = this.open.filter((e) => isFresh(e.issuedAt, nowMs, this.ttlMs));
    while (this.open.length >= this.max) this.open.shift();
    const secret = newSecret();
    this.open.push({ secret, issuedAt: nowMs });
    return secret.slice();
  }

  consume(secret: Uint8Array, nowMs: number): ConsumeResult {
    let hit = -1;
    this.open.forEach((e, i) => {
      if (secretsEqual(e.secret, secret)) hit = i;
    });
    const entry = this.open[hit];
    if (!entry) return 'bad-secret';
    this.open.splice(hit, 1);
    return isFresh(entry.issuedAt, nowMs, this.ttlMs) ? 'ok' : 'expired';
  }

  clear(): void {
    this.open = [];
  }
}
