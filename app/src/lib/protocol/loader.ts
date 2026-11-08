import { protocolSchema, type Protocol, type SurgeonField } from './schema';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_MESSAGE_CHARS = 300;

/** True when the text is over the cap in UTF-8 bytes. The length check is cheap and runs first. */
export function overByteCap(raw: string): boolean {
  if (raw.length > MAX_FILE_BYTES) return true;
  // One UTF-16 unit is at most 3 bytes. Below a third of the cap the text cannot be over it.
  return raw.length * 3 > MAX_FILE_BYTES && new TextEncoder().encode(raw).length > MAX_FILE_BYTES;
}

/**
 * One plain sentence for the first problem of a file. The text is cut, because
 * a message can repeat a key name from the file and the key can be very long.
 */
export function describeFirstIssue(
  error: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> },
  subject: string,
): string {
  const first = error.issues[0];
  const where = first && first.path.length > 0 ? first.path.map(String).join('.') : 'file';
  const sentence = `The ${subject} is not valid at "${where}": ${first?.message ?? 'unknown problem'}`;
  const cut = sentence.length > MAX_MESSAGE_CHARS ? `${sentence.slice(0, MAX_MESSAGE_CHARS)}...` : sentence;
  return cut.endsWith('.') ? cut : `${cut}.`;
}

export type Mode = 'demo' | 'patient';

export type LoadErrorCode = 'too-large' | 'invalid-json' | 'schema' | 'example-in-patient-mode' | 'not-approved';

export type LoadResult =
  | { ok: true; protocol: Protocol }
  | { ok: false; error: { code: LoadErrorCode; message: string } };

const fail = (code: LoadErrorCode, message: string): LoadResult => ({ ok: false, error: { code, message } });

/** Parse and check a protocol file. The size check runs before JSON.parse. */
export function loadProtocol(raw: string, mode: Mode): LoadResult {
  if (overByteCap(raw)) return fail('too-large', 'The file is larger than 5 MB.');

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail('invalid-json', 'The file is not valid JSON.');
  }

  const parsed = protocolSchema.safeParse(data);
  if (!parsed.success) {
    return fail('schema', describeFirstIssue(parsed.error, 'protocol'));
  }

  const protocol = parsed.data;
  if (mode === 'patient') {
    if (protocol.example) return fail('example-in-patient-mode', 'The example protocol cannot be used in patient mode.');
    if (!protocol.approvedOn) return fail('not-approved', 'No clinician approval is recorded in this protocol.');
  }
  return { ok: true, protocol };
}

export type SurgeonValue = { set: true; value: string } | { set: false; text: 'Ask your surgeon' };

/** A missing surgeon field never gets a default. It shows "Ask your surgeon". */
export function surgeonField(protocol: Protocol, key: SurgeonField): SurgeonValue {
  const value = protocol.surgeon[key];
  return value === undefined ? { set: false, text: 'Ask your surgeon' } : { set: true, value };
}
