import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import { LEGACY_MARGIN_SOURCES, MARGIN_SOURCE_IDS } from '../margin';
import { PLAN_EXERCISE_KINDS, protocolIdSchema } from '../protocol/schema';
import { loadProtocol, type LoadResult, type Mode } from '../protocol';
import { inputsSchema } from '../protocolGen/inputs';
import { requestPersistOnce } from './meta';

const counter = z.number().int().min(0).max(100000);

const marginSource = z.preprocess(
  (v) => (typeof v === 'string' && Object.hasOwn(LEGACY_MARGIN_SOURCES, v) ? LEGACY_MARGIN_SOURCES[v] : v),
  z.enum(MARGIN_SOURCE_IDS),
);

export const REPORT_KEYS = ['ankle-range', 'lift-angle', 'knee-angle-top'] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];

export const sessionSchema = z.strictObject({
  date: z.iso.datetime().max(40),
  exercise: z.enum(PLAN_EXERCISE_KINDS), // the four exercises of the engine and the five new ones (exercise monitoring)
  side: z.enum(['left', 'right']),
  reps: z.number().int().min(0).max(1000).nullable(),
  peakFlexion: z.number().min(0).max(180).nullable(),
  holdSeconds: z.number().min(0).max(3600).nullable(),
  topFlexion: z.number().min(0).max(180).nullable(), // estimated angle at the top of the leg raise
  marginDeg: z.number().min(0).max(45), // the camera error margin used for this session
  marginSource,
  view: z.enum(['side', 'front']),
  nearLimit: counter,
  overLimit: counter,
  tooFast: counter,
  gaveWayPresses: counter,
  redFlagBlocks: counter,
  // Optional, so an older file still reads. The schema version stays 1.
  pain: z.number().int().min(0).max(10).optional(),
  swelling: z.enum(['none', 'some', 'more']).optional(),
  protocolId: protocolIdSchema,
  phase: z.number().int().min(1).max(10),
  // Optional, so an older file still reads. The schema version stays 1.
  setsPrescribed: z.number().int().min(1).max(20).optional(),
  repsPrescribed: z.number().int().min(1).max(100).optional(),
  repsPerSet: z.array(z.number().int().min(0).max(1000)).max(20).optional(),
  // Optional, so an older file still reads.
  legTracked: z.enum(['left', 'right']).optional(),
  cameraSide: z.enum(['left', 'right']).optional(),
  baselineSource: z.enum(['still', 'lowest']).optional(),
  // Optional, so an older file still reads. `frontChangeDeg` is the median change per rep, inward positive. It is absent when too few reps gave a value.
  secondView: z.literal('front').optional(),
  frontReps: z.number().int().min(0).max(1000).optional(),
  frontChangeDeg: z.number().min(-90).max(90).optional(),
  // Pain answer (0 to 10) after each completed set. null means no answer. Optional, so an older file still reads.
  setPain: z.array(z.number().int().min(0).max(10).nullable()).max(20).optional(),
  // 'hand' when any rep came from the "Count this rep" button, 'camera' when all came from the pipeline. Optional, so an older file still reads.
  repsBy: z.enum(['camera', 'hand']).optional(),
  // Optional, so an older file still reads. `holdList`: whole seconds of each timed hold (quad set, gluteal set). The seated hold keeps `holdSeconds`.
  holdList: z.array(z.number().int().min(1).max(3600)).max(50).optional(),
  timedBy: z.enum(['person', 'camera']).optional(),
  reportKey: z.enum(REPORT_KEYS).optional(),
  reportValue: z.number().min(0).max(180).optional(),
  schemaVersion: z.literal(1),
}).superRefine((s, ctx) => {
  if ((s.reportKey === undefined) !== (s.reportValue === undefined)) {
    ctx.addIssue({ code: 'custom', path: ['reportKey'], message: 'reportKey and reportValue go together.' });
  }
  if (s.repsPerSet === undefined) return;
  if (s.repsPrescribed !== undefined && s.repsPerSet.some((r) => r > (s.repsPrescribed as number))) {
    ctx.addIssue({ code: 'custom', path: ['repsPerSet'], message: 'A set cannot hold more reps than repsPrescribed.' });
  }
  if (s.setsPrescribed !== undefined && s.repsPerSet.length > s.setsPrescribed) {
    ctx.addIssue({ code: 'custom', path: ['repsPerSet'], message: 'There cannot be more sets than setsPrescribed.' });
  }
});

export type SessionData = z.infer<typeof sessionSchema>;
export type SessionRecord = SessionData & { id: number };
export type SessionInput = Omit<SessionData, 'schemaVersion'>;

export interface StoredProtocol {
  key: 'current';
  raw: string; // the file text. It is checked again on every load.
  savedAt: string;
}

export const storedInputsSchema = inputsSchema.omit({ phaseClearance: true, walksWithoutCrutches: true, legRaiseStraight: true, seatedHoldCleared: true, kneeGaveWay: true, redFlags: true, pain: true, swelling: true });
export type StoredInputs = z.infer<typeof storedInputsSchema>;

export interface StoredInputsRow {
  key: 'current';
  inputs: StoredInputs;
  savedAt: string;
}

export type MpflDb = Dexie & {
  sessions: EntityTable<SessionRecord, 'id'>;
  protocol: EntityTable<StoredProtocol, 'key'>;
  generatorInputs: EntityTable<StoredInputsRow, 'key'>;
};

export function createDb(name = 'mpfl-rehab'): MpflDb {
  const db = new Dexie(name) as MpflDb;
  db.version(1).stores({ sessions: '++id, date, exercise' });
  db.version(2).stores({ sessions: '++id, date, exercise', protocol: 'key' });
  db.version(3).stores({ sessions: '++id, date, exercise', protocol: 'key', generatorInputs: 'key' });
  return db;
}

export function readValidRows(rows: readonly unknown[]): { rows: SessionRecord[]; skipped: number } {
  const valid: SessionRecord[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue;
    const { id, ...data } = row as Record<string, unknown>;
    const parsed = sessionSchema.safeParse(data);
    if (parsed.success && typeof id === 'number' && Number.isFinite(id)) valid.push({ ...parsed.data, id });
  }
  return { rows: valid, skipped: rows.length - valid.length };
}

export async function saveSession(db: MpflDb, input: SessionInput): Promise<number> {
  await requestPersistOnce();
  return db.sessions.add({ ...input, schemaVersion: 1 } as SessionRecord);
}

export async function updateSessionAnswers(db: MpflDb, id: number, answers: Pick<SessionData, 'pain' | 'swelling'>): Promise<void> {
  const { pain, swelling } = answers;
  if ((await db.sessions.update(id, { pain, swelling })) === 0) throw new Error(`No session record ${id}.`);
}

export async function lastSession(db: MpflDb): Promise<SessionRecord | undefined> {
  const { rows } = readValidRows(await db.sessions.toArray());
  return rows.reduce<SessionRecord | undefined>((best, row) => (best === undefined || row.date >= best.date ? row : best), undefined);
}

export async function saveProtocol(db: MpflDb, raw: string, mode: Mode): Promise<LoadResult> {
  const result = loadProtocol(raw, mode);
  if (result.ok) await db.protocol.put({ key: 'current', raw, savedAt: new Date().toISOString() });
  return result;
}

export async function loadStoredProtocol(db: MpflDb, mode: Mode): Promise<LoadResult | null> {
  const stored = await db.protocol.get('current');
  return stored ? loadProtocol(stored.raw, mode) : null;
}

export async function saveGeneratorInputs(db: MpflDb, inputs: StoredInputs): Promise<void> {
  const keys = Object.keys(storedInputsSchema.shape) as Array<keyof StoredInputs>;
  const clean = storedInputsSchema.parse(Object.fromEntries(keys.map((k) => [k, inputs[k]])));
  await db.generatorInputs.put({ key: 'current', inputs: clean, savedAt: new Date().toISOString() });
}

export async function loadGeneratorInputs(db: MpflDb): Promise<StoredInputs | null> {
  const row = await db.generatorInputs.get('current');
  const parsed = storedInputsSchema.safeParse(row?.inputs);
  return parsed.success ? parsed.data : null;
}

export async function clearProtocol(db: MpflDb): Promise<void> {
  await db.protocol.clear();
}

export async function eraseAll(db: MpflDb): Promise<void> {
  let onBlocked: (() => void) | undefined;
  const blocked = new Promise<never>((_, reject) => {
    onBlocked = () => reject(new Error('The erase is blocked: close the other tabs of this app and try again.'));
    db.on('blocked', onBlocked);
  });
  try {
    await Promise.race([db.delete(), blocked]);
    await db.open();
  } catch (err) {
    db.open().catch(() => {});
    throw err;
  } finally {
    db.on('blocked').unsubscribe(onBlocked!);
  }
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('mpfl.')) localStorage.removeItem(key);
  } catch {
  }
  if (typeof caches !== 'undefined') {
    for (const key of await caches.keys()) await caches.delete(key);
  }
  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
  }
}
