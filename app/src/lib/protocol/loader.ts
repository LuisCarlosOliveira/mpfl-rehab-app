import { protocolSchema, type Protocol, type SurgeonField } from './schema';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type Mode = 'demo' | 'patient';

export type LoadErrorCode = 'too-large' | 'invalid-json' | 'schema' | 'example-in-patient-mode' | 'not-approved';

export type LoadResult =
  | { ok: true; protocol: Protocol }
  | { ok: false; error: { code: LoadErrorCode; message: string } };

const fail = (code: LoadErrorCode, message: string): LoadResult => ({ ok: false, error: { code, message } });

/** Parse and check a protocol file. The size check runs before JSON.parse. */
export function loadProtocol(raw: string, mode: Mode): LoadResult {
  if (raw.length > MAX_FILE_BYTES) return fail('too-large', 'The file is larger than 5 MB.');

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail('invalid-json', 'The file is not valid JSON.');
  }

  const parsed = protocolSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first && first.path.length > 0 ? first.path.join('.') : 'file';
    return fail('schema', `The protocol is not valid at "${where}": ${first?.message ?? 'unknown problem'}`);
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
