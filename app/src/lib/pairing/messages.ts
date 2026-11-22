import { z } from 'zod';
import { fail, type Result } from './result';
import { SECRET_BYTES } from './security';
import { toBase64Url } from './payload';

export const MAX_MESSAGE_BYTES = 4096; // PROPOSAL: qr-pairing.md section 5 rule 5. Counted in bytes, not characters.
export const PROTOCOL_VERSION = 1;
export const LANDMARK_COUNT = 33;

const secretText = z.string().regex(new RegExp(`^[A-Za-z0-9_-]{${Math.ceil((SECRET_BYTES * 4) / 3)}}$`));

const landmark = z.strictObject({
  x: z.number().min(-1).max(2),
  y: z.number().min(-1).max(2),
  visibility: z.number().min(0).max(1).optional(),
});

export const helloSchema = z.strictObject({
  type: z.literal('hello'),
  v: z.literal(PROTOCOL_VERSION),
  secret: secretText,
});
export const landmarksSchema = z.strictObject({
  type: z.literal('landmarks'),
  tMs: z.number().min(0).max(Number.MAX_SAFE_INTEGER),
  view: z.enum(['side', 'front']),
  /** Width divided by height of the phone image. The angle function needs it. PROPOSAL range, a camera is not wider than 5 to 1. */
  aspect: z.number().min(0.2).max(5).optional(),
  landmarks: z.array(landmark).length(LANDMARK_COUNT),
});
export const byeSchema = z.strictObject({ type: z.literal('bye') });

export const readySchema = z.strictObject({ type: z.literal('ready') });

export const messageSchema = z.discriminatedUnion('type', [helloSchema, landmarksSchema, byeSchema, readySchema]);

export type HelloMessage = z.infer<typeof helloSchema>;
export type LandmarksMessage = z.infer<typeof landmarksSchema>;
export type Message = z.infer<typeof messageSchema>;

export const makeHello = (secret: Uint8Array): HelloMessage => ({
  type: 'hello',
  v: PROTOCOL_VERSION,
  secret: toBase64Url(secret),
});

export type ParseError = 'not-text' | 'too-large' | 'not-json' | 'duplicate-key' | 'forbidden-key' | 'bad-schema';

function badKey(text: string): 'duplicate-key' | 'forbidden-key' | null {
  const stack: ({ keys: Set<string>; expectKey: boolean } | null)[] = []; // null stands for an array
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const top = stack[stack.length - 1];
    if (ch === '"') {
      let end = i + 1;
      while (text[end] !== '"') end += text[end] === '\\' ? 2 : 1;
      if (top?.expectKey) {
        const key = JSON.parse(text.slice(i, end + 1)) as string;
        if (key === '__proto__') return 'forbidden-key';
        if (top.keys.has(key)) return 'duplicate-key';
        top.keys.add(key);
        top.expectKey = false;
      }
      i = end;
    } else if (ch === '{') {
      stack.push({ keys: new Set(), expectKey: true });
    } else if (ch === '[') {
      stack.push(null);
    } else if (ch === '}' || ch === ']') {
      stack.pop();
    } else if (ch === ',' && top) {
      top.expectKey = true;
    }
  }
  return null;
}

export function parseMessage(data: unknown): Result<Message, ParseError> {
  if (typeof data !== 'string') return fail('not-text');
  if (data.length > MAX_MESSAGE_BYTES || new TextEncoder().encode(data).length > MAX_MESSAGE_BYTES) {
    return fail('too-large');
  }
  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch {
    return fail('not-json');
  }
  const key = badKey(data);
  if (key) return fail(key);
  const parsed = messageSchema.safeParse(json);
  return parsed.success ? { ok: true, value: parsed.data } : fail('bad-schema');
}
