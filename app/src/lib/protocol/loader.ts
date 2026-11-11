import { protocolSchema, type Protocol, type SurgeonField } from './schema';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_MESSAGE_CHARS = 300;

/** True when the text is over the cap in UTF-8 bytes. The length check is cheap and runs first. */
export function overByteCap(raw: string): boolean {
  if (raw.length > MAX_FILE_BYTES) return true;
  // One UTF-16 unit is at most 3 bytes. Below a third of the cap the text cannot be over it.
  return raw.length * 3 > MAX_FILE_BYTES && new TextEncoder().encode(raw).length > MAX_FILE_BYTES;
}

type Issue = { path: ReadonlyArray<PropertyKey>; message: string; code?: string; origin?: string; minimum?: unknown; maximum?: unknown };

// A message that Zod wrote starts with one of these words. A message that the schema wrote is already plain.
const ZOD_DEFAULT = /^(Invalid |Too |Unrecognized |Input )/;

/** Plain words for one issue of the schema. The key path stays in the sentence. */
export function plainIssue(issue: Issue | undefined): string {
  if (!issue) return 'unknown problem';
  if (!ZOD_DEFAULT.test(issue.message)) return issue.message;
  const kind = issue.origin === 'string' ? 'text' : issue.origin === 'array' || issue.origin === 'set' ? 'list' : 'number';
  switch (issue.code) {
    case 'invalid_type':
      return /received undefined/.test(issue.message) ? 'the value is missing' : 'the value has the wrong type';
    case 'invalid_value':
      return 'the value is not one of the allowed values';
    case 'unrecognized_keys':
      return 'the file has a key that the app does not know';
    case 'too_small':
      return kind === 'number' ? `the number is too small (at least ${String(issue.minimum)})` : kind === 'text' ? `the text is too short (at least ${String(issue.minimum)} characters)` : `the list has too few items (at least ${String(issue.minimum)})`;
    case 'too_big':
      return kind === 'number' ? `the number is too large (at most ${String(issue.maximum)})` : kind === 'text' ? `the text is too long (at most ${String(issue.maximum)} characters)` : `the list has too many items (at most ${String(issue.maximum)})`;
    case 'invalid_format':
      return 'the text does not have the required format';
    case 'invalid_union':
      return 'the value does not match any allowed form';
    default:
      return 'the value is not valid';
  }
}

/**
 * One plain sentence for the first problem of a file. The text is cut, because
 * a message can repeat a key name from the file and the key can be very long.
 */
export function describeFirstIssue(
  error: { issues: ReadonlyArray<Issue> },
  subject: string,
): string {
  const first = error.issues[0];
  const where = first && first.path.length > 0 ? first.path.map(String).join('.') : 'file';
  const sentence = `The ${subject} is not valid at "${where}": ${plainIssue(first)}`;
  const cut = sentence.length > MAX_MESSAGE_CHARS ? `${sentence.slice(0, MAX_MESSAGE_CHARS)}...` : sentence;
  return cut.endsWith('.') ? cut : `${cut}.`;
}

export type Mode = 'demo' | 'patient';

export type LoadErrorCode = 'too-large' | 'invalid-json' | 'schema' | 'example-in-patient-mode' | 'not-approved' | 'generated-not-approved';

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
    // A plan that the app made has no clinician approval. Patient mode refuses it by its own rule, not as a side effect.
    if (protocol.generated !== undefined && !protocol.approvedOn) {
      return fail('generated-not-approved', 'A plan that the app made has no clinician approval. It cannot be used in patient mode.');
    }
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
