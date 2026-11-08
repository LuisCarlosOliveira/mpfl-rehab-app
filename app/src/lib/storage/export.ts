import { z } from 'zod';
import { version as APP_VERSION } from '../../../package.json';
import { MAX_FILE_BYTES, describeFirstIssue, overByteCap } from '../protocol/loader';
import { protocolIdSchema } from '../protocol/schema';
import { sessionSchema, type MpflDb, type SessionData } from './db';
import { getPseudonymId, storedPseudonymId } from './meta';

export const ANGLE_METHOD = '2D webcam estimate, not a goniometer measurement';
export const MAX_IMPORT_BYTES = MAX_FILE_BYTES;

// The export holds fixed fields only. It has no name, birth date or free text.
export const exportSchema = z.strictObject({
  schemaVersion: z.literal(1),
  appVersion: z.string().max(20),
  angleMethod: z.literal(ANGLE_METHOD),
  pseudonymId: z.uuid(),
  protocolId: protocolIdSchema.nullable(),
  exportedAt: z.iso.datetime().max(40),
  sessions: z.array(sessionSchema).max(5000),
});

export type ExportFile = z.infer<typeof exportSchema>;

export type ExportErrorCode = 'too-large' | 'invalid-json' | 'unknown-version' | 'schema' | 'duplicate' | 'other-person';
export type ParseResult = { ok: true; file: ExportFile } | { ok: false; error: { code: ExportErrorCode; message: string } };

const fail = (code: ExportErrorCode, message: string): { ok: false; error: { code: ExportErrorCode; message: string } } => ({
  ok: false,
  error: { code, message },
});

const SESSION_KEYS = Object.keys(sessionSchema.shape) as Array<keyof SessionData>;

async function buildExport(db: MpflDb): Promise<ExportFile> {
  const rows = await db.sessions.orderBy('date').toArray();
  const sessions = rows.map((row) => Object.fromEntries(SESSION_KEYS.map((k) => [k, row[k]])) as SessionData);
  return {
    schemaVersion: 1,
    appVersion: APP_VERSION,
    angleMethod: ANGLE_METHOD,
    pseudonymId: getPseudonymId(),
    protocolId: sessions.length > 0 ? (sessions[sessions.length - 1] as SessionData).protocolId : null,
    exportedAt: new Date().toISOString(),
    sessions,
  };
}

export async function exportJson(db: MpflDb): Promise<string> {
  return JSON.stringify(await buildExport(db), null, 2);
}

/** Read an export file into memory. This never writes to the database. */
export function parseExport(raw: string): ParseResult {
  if (overByteCap(raw)) return fail('too-large', 'The file is larger than 5 MB.');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail('invalid-json', 'The file is not valid JSON.');
  }
  if (typeof data === 'object' && data !== null && 'schemaVersion' in data && data.schemaVersion !== 1) {
    return fail('unknown-version', 'This file has a schema version that this app does not know.');
  }
  const parsed = exportSchema.safeParse(data);
  if (!parsed.success) {
    return fail('schema', describeFirstIssue(parsed.error, 'file'));
  }
  return { ok: true, file: parsed.data };
}

/** Import into the database. No merge: if any session is already stored, nothing is imported. */
export async function importSessions(
  db: MpflDb,
  raw: string,
): Promise<{ ok: true; imported: number } | { ok: false; error: { code: ExportErrorCode; message: string } }> {
  const parsed = parseExport(raw);
  if (!parsed.ok) return parsed;
  // PROPOSAL (audit A1-2): a clinician or the user has not confirmed this rule.
  // A file with another id never mixes into a database that already holds sessions.
  // Nothing is written before this check, and the check reads the id without writing it.
  if ((await db.sessions.count()) > 0 && parsed.file.pseudonymId !== storedPseudonymId()) {
    return fail('other-person', "This file belongs to another person's record. Nothing was imported. Erase this device first if you want to load it.");
  }
  const keyOf = (s: { date: string; exercise: string }) => `${s.date}|${s.exercise}`;
  const stored = new Set((await db.sessions.toArray()).map(keyOf));
  if (parsed.file.sessions.some((s) => stored.has(keyOf(s)))) {
    return fail('duplicate', 'Some of these sessions are already stored. Nothing was imported.');
  }
  await db.sessions.bulkAdd(parsed.file.sessions);
  return { ok: true, imported: parsed.file.sessions.length };
}

// ---- CSV ---------------------------------------------------------------------

const CSV_COLUMNS = [
  'pseudonymId', 'schemaVersion', 'appVersion', 'protocolId', 'date', 'exercise', 'side', 'view', 'phase',
  'reps', 'peakFlexion', 'holdSeconds', 'topFlexion', 'marginDeg', 'marginSource',
  'nearLimit', 'overLimit', 'tooFast', 'gaveWayPresses', 'redFlagBlocks', 'pain', 'swelling',
  'sets_prescribed', 'reps_prescribed', 'reps_per_set', 'leg_tracked', 'camera_side',
  'second_view', 'front_reps', 'front_change_deg', 'set_pain',
] as const;

// PROPOSAL: the per-set counts are numbers joined by a space. A number cannot start a formula,
// and a space keeps a spreadsheet from reading "10/10" as a date. The cell is quoted like any text.
const REPS_PER_SET_SEPARATOR = ' ';
// A skipped pain question is written as this word. A bare minus sign would be a formula sign.
const NO_ANSWER = 'no-answer';

// Text cells are always quoted. A cell that starts with = + - @ tab or carriage
// return, or with the wide form of one of the four signs, gets a leading single
// quote, so a spreadsheet does not run it as a formula.
function textCell(value: string): string {
  const safe = /^[=+\-@\t\r\uff1d\uff0b\uff0d\uff20]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

const numberCell = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

const cell = (value: string | number | null | undefined) => (typeof value === 'string' ? textCell(value) : numberCell(value));

type CsvColumn = (typeof CSV_COLUMNS)[number];

function valueOf(c: CsvColumn, s: SessionData, file: ExportFile): string | number | null | undefined {
  switch (c) {
    case 'pseudonymId': return file.pseudonymId;
    case 'appVersion': return file.appVersion;
    case 'sets_prescribed': return s.setsPrescribed;
    case 'reps_prescribed': return s.repsPrescribed;
    case 'reps_per_set': return s.repsPerSet?.join(REPS_PER_SET_SEPARATOR);
    case 'leg_tracked': return s.legTracked;
    case 'camera_side': return s.cameraSide;
    case 'second_view': return s.secondView;
    case 'front_reps': return s.frontReps;
    case 'front_change_deg': return s.frontChangeDeg;
    case 'set_pain': return s.setPain?.map((v) => v ?? NO_ANSWER).join(REPS_PER_SET_SEPARATOR);
    default: return s[c];
  }
}

/** CSV is export only. The first row holds the angle method. */
export async function exportCsv(db: MpflDb): Promise<string> {
  const file = await buildExport(db);
  const lines = [textCell(ANGLE_METHOD), CSV_COLUMNS.join(',')];
  for (const s of file.sessions) {
    lines.push(CSV_COLUMNS.map((c) => cell(valueOf(c, s, file))).join(','));
  }
  return lines.join('\n') + '\n';
}
