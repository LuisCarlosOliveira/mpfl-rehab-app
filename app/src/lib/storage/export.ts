import { z } from 'zod';
import { version as APP_VERSION } from '../../../package.json';
import { sessionSchema, type MpflDb, type SessionData } from './db';
import { getPseudonymId } from './meta';

export const ANGLE_METHOD = '2D webcam estimate, not a goniometer measurement';
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

// The export holds fixed fields only. It has no name, birth date or free text.
export const exportSchema = z.strictObject({
  schemaVersion: z.literal(1),
  appVersion: z.string().max(20),
  angleMethod: z.literal(ANGLE_METHOD),
  pseudonymId: z.uuid(),
  protocolId: z.string().max(64).nullable(),
  exportedAt: z.iso.datetime(),
  sessions: z.array(sessionSchema).max(20000),
});

export type ExportFile = z.infer<typeof exportSchema>;

export type ExportErrorCode = 'too-large' | 'invalid-json' | 'unknown-version' | 'schema' | 'duplicate';
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
  if (raw.length > MAX_IMPORT_BYTES) return fail('too-large', 'The file is larger than 5 MB.');
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
    const first = parsed.error.issues[0];
    const where = first && first.path.length > 0 ? first.path.join('.') : 'file';
    return fail('schema', `The file is not valid at "${where}": ${first?.message ?? 'unknown problem'}`);
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
  const keyOf = (s: { date: string; exercise: string }) => `${s.date}|${s.exercise}`;
  const stored = new Set((await db.sessions.toArray()).map(keyOf));
  if (parsed.file.sessions.some((s) => stored.has(keyOf(s)))) {
    return fail('duplicate', 'Some of these sessions are already stored. Nothing was imported.');
  }
  await db.sessions.bulkAdd(parsed.file.sessions as never[]);
  return { ok: true, imported: parsed.file.sessions.length };
}

// ---- CSV ---------------------------------------------------------------------

const CSV_COLUMNS = [
  'pseudonymId', 'schemaVersion', 'appVersion', 'protocolId', 'date', 'exercise', 'side', 'phase',
  'reps', 'peakFlexion', 'holdSeconds', 'extensionLag', 'pain', 'swelling',
] as const;

// Text cells are always quoted. A cell that starts with = + - @ tab or carriage
// return gets a leading single quote, so a spreadsheet does not run it as a formula.
function textCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

const numberCell = (value: number | null) => (value === null ? '' : String(value));

/** CSV is export only. The first row holds the angle method. */
export async function exportCsv(db: MpflDb): Promise<string> {
  const file = await buildExport(db);
  const lines = [textCell(ANGLE_METHOD), CSV_COLUMNS.join(',')];
  for (const s of file.sessions) {
    lines.push(
      [
        textCell(file.pseudonymId),
        numberCell(s.schemaVersion),
        textCell(file.appVersion),
        textCell(s.protocolId),
        textCell(s.date),
        textCell(s.exercise),
        textCell(s.side),
        numberCell(s.phase),
        numberCell(s.reps),
        numberCell(s.peakFlexion),
        numberCell(s.holdSeconds),
        numberCell(s.extensionLag),
        numberCell(s.pain),
        textCell(s.swelling),
      ].join(','),
    );
  }
  return lines.join('\n') + '\n';
}
