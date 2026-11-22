import { stripHidden } from '../plainText';
import { NEW_EXERCISE_KINDS, protocolSchema, type Protocol, type SurgeonField } from './schema';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_MESSAGE_CHARS = 300;

/** True when the text is over the cap in UTF-8 bytes. The length check is cheap and runs first. */
export function overByteCap(raw: string): boolean {
  if (raw.length > MAX_FILE_BYTES) return true;
  // One UTF-16 unit is at most 3 bytes. Below a third of the cap the text cannot be over it.
  return raw.length * 3 > MAX_FILE_BYTES && new TextEncoder().encode(raw).length > MAX_FILE_BYTES;
}

type Issue = { path: ReadonlyArray<PropertyKey>; message: string; code?: string; origin?: string; format?: string; keys?: ReadonlyArray<string>; minimum?: unknown; maximum?: unknown };

const MAX_KEY_CHARS = 40;

/** A key name from the file as plain text: control, zero-width and direction characters out, cut at 40 characters. React escapes it when it shows. */
function plainKey(key: string): string {
  const clean = stripHidden(key);
  return clean.length > MAX_KEY_CHARS ? `${clean.slice(0, MAX_KEY_CHARS)}...` : clean;
}

// A message that Zod wrote starts with one of these words. A message that the schema wrote is already plain.
const ZOD_DEFAULT = /^(Invalid |Too |Unrecognized |Input )/;

const UNKNOWN_EXERCISE = 'This file names an exercise that the app does not know. Ask your care team to use an exercise from the list.';

/** Plain words for one issue of the schema. The key path stays in the sentence. */
export function plainIssue(issue: Issue | undefined): string {
  if (!issue) return 'unknown problem';
  if (!ZOD_DEFAULT.test(issue.message)) return issue.message;
  // An exercise id that the app does not know. The path is phases.N.exercises.N.kind.
  if (issue.code === 'invalid_value' && issue.path.length >= 2 && issue.path.at(-1) === 'kind' && issue.path.at(-3) === 'exercises') return UNKNOWN_EXERCISE;
  const kind = issue.origin === 'string' ? 'text' : issue.origin === 'array' || issue.origin === 'set' ? 'list' : 'number';
  switch (issue.code) {
    case 'invalid_type':
      return /received undefined/.test(issue.message) ? 'the value is missing' : 'the value has the wrong type';
    case 'invalid_value':
      return 'the value is not one of the allowed values';
    case 'unrecognized_keys':
      return issue.keys && issue.keys.length > 0
        ? `the file has a key that the app does not know: "${plainKey(issue.keys[0] ?? '')}"${issue.keys.length > 1 ? ` and ${issue.keys.length - 1} more` : ''}`
        : 'the file has a key that the app does not know';
    case 'too_small':
      return kind === 'number' ? `the number is too small (at least ${String(issue.minimum)})` : kind === 'text' ? `the text is too short (at least ${String(issue.minimum)} characters)` : `the list has too few items (at least ${String(issue.minimum)})`;
    case 'too_big':
      return kind === 'number' ? `the number is too large (at most ${String(issue.maximum)})` : kind === 'text' ? `the text is too long (at most ${String(issue.maximum)} characters)` : `the list has too many items (at most ${String(issue.maximum)})`;
    case 'invalid_format':
      return issue.format === 'date' ? 'the text does not have the required format, use the form YYYY-MM-DD' : 'the text does not have the required format';
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
  const at = first && first.path.length > 0 ? `at "${first.path.map(String).join('.')}"` : 'in the file';
  const sentence = `The ${subject} is not valid ${at}: ${plainIssue(first)}`;
  const cut = sentence.length > MAX_MESSAGE_CHARS ? `${sentence.slice(0, MAX_MESSAGE_CHARS)}...` : sentence;
  return cut.endsWith('.') ? cut : `${cut}.`;
}

const PLACEHOLDER_TEXT = 'SET BY CLINICIAN';

const PLACEHOLDER_SCAN_LIMIT = 20000;

/** How many values of the clinician template are still unset: the text "SET BY CLINICIAN" or null.
 * The file is untrusted. The walk uses a list and not recursion, so a deeply nested file cannot overflow the stack.
 * It stops after PLACEHOLDER_SCAN_LIMIT values (ENGINEERING value, no source). */
function countPlaceholders(root: unknown): number {
  let count = 0;
  let seen = 0;
  const todo: unknown[] = [root];
  while (todo.length > 0 && seen < PLACEHOLDER_SCAN_LIMIT) {
    const v = todo.pop();
    seen += 1;
    if (v === PLACEHOLDER_TEXT || v === null) count += 1;
    else if (Array.isArray(v)) for (const x of v) todo.push(x);
    else if (v && typeof v === 'object') for (const x of Object.values(v)) todo.push(x);
  }
  return count;
}

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

const omitKey = <T extends object, K extends keyof T>(source: T, key: K): Omit<T, K> => Object.fromEntries(Object.entries(source).filter(([name]) => name !== key)) as Omit<T, K>;

/**
 * LEGACY input. A file from before exercise monitoring lists quad-set, gluteal-set, ankle-pump, leg-raise-side and leg-raise-back
 * in `homeExercises`. They are camera exercises now, so each one moves into `exercises` with its sets, reps and source.
 * A kind that `exercises` already holds stays as it is there. Any other item stays in `homeExercises`, and the schema refuses it.
 * It returns a copy. The file data is not changed.
 */
export function normalizeLegacy(data: unknown): unknown {
  if (!isRecord(data) || !Array.isArray(data.phases)) return data;
  const phases = data.phases.map((phase: unknown) => {
    if (!isRecord(phase) || !Array.isArray(phase.homeExercises) || !Array.isArray(phase.exercises)) return phase;
    const moves = (x: unknown) => isRecord(x) && (NEW_EXERCISE_KINDS as readonly string[]).includes(String(x.kind));
    const held = new Set(phase.exercises.filter(isRecord).map((e) => e.kind));
    const moved = phase.homeExercises.filter((x) => moves(x) && !held.has((x as Record<string, unknown>).kind));
    const left = phase.homeExercises.filter((x) => !moves(x));
    const rest = omitKey(phase, 'homeExercises');
    return left.length > 0 ? { ...rest, exercises: [...phase.exercises, ...moved], homeExercises: left } : { ...rest, exercises: [...phase.exercises, ...moved] };
  });
  return { ...data, phases };
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

  const parsed = protocolSchema.safeParse(normalizeLegacy(data));
  if (!parsed.success) {
    // The first problem only, one at a time. A file with more placeholders left says how many.
    const left = countPlaceholders(data) - 1;
    const more = left > 0 ? ` ${left === 1 ? 'One more field still has' : `${left} more fields still have`} placeholder text.` : '';
    return fail('schema', `${describeFirstIssue(parsed.error, 'protocol')}${more}`);
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
