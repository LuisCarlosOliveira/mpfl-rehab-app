import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import { EXERCISE_KINDS, protocolIdSchema } from '../protocol/schema';
import { loadProtocol, type LoadResult, type Mode } from '../protocol';
import { inputsSchema } from '../protocolGen/inputs';
import { requestPersistOnce } from './meta';

const counter = z.number().int().min(0).max(100000);

export const sessionSchema = z.strictObject({
  date: z.iso.datetime().max(40),
  exercise: z.enum(EXERCISE_KINDS),
  side: z.enum(['left', 'right']),
  reps: z.number().int().min(0).max(1000).nullable(),
  peakFlexion: z.number().min(0).max(180).nullable(),
  holdSeconds: z.number().min(0).max(3600).nullable(),
  topFlexion: z.number().min(0).max(180).nullable(), // estimated angle at the top of the leg raise
  marginDeg: z.number().min(0).max(45), // the camera error margin used for this session
  marginSource: z.string().max(200), // where that margin comes from, so old sessions stay readable
  view: z.enum(['side', 'front']),
  nearLimit: counter,
  overLimit: counter,
  tooFast: counter,
  gaveWayPresses: counter,
  redFlagBlocks: counter,
  pain: z.number().int().min(0).max(10),
  swelling: z.enum(['none', 'some', 'more']),
  protocolId: protocolIdSchema,
  phase: z.number().int().min(1).max(10),
  // Set data. All three fields are optional, so a session from an older file still reads (T16).
  // The schema version stays 1 because no field was removed or changed.
  setsPrescribed: z.number().int().min(1).max(20).optional(),
  repsPrescribed: z.number().int().min(1).max(100).optional(),
  // One entry for each started set. With no prescription it holds one entry, the plain count.
  repsPerSet: z.array(z.number().int().min(0).max(1000)).max(20).optional(),
  // T17: the leg that the pipeline tracked and the side of the person that the camera was on.
  // Both are optional, so a session from an older file still reads. No index. The schema version stays 1.
  legTracked: z.enum(['left', 'right']).optional(),
  cameraSide: z.enum(['left', 'right']).optional(),
  // F1: where the resting angle of the rep counter came from. 'still' is a still window (the rule of Setup).
  // 'lowest' is the lowest steady angle that the person chose to use. Optional, no index, the schema version stays 1.
  baselineSource: z.enum(['still', 'lowest']).optional(),
  // T12b (FR24): a second camera (the phone) was used, and the front-view knee change. For the clinician only.
  // `frontReps` counts the reps that gave a value. `frontChangeDeg` is the median change per rep, inward positive. It is absent when too few reps gave a value.
  // All three are optional, so a session from an older file still reads. No index. The schema version stays 1.
  secondView: z.literal('front').optional(),
  frontReps: z.number().int().min(0).max(1000).optional(),
  frontChangeDeg: z.number().min(-90).max(90).optional(),
  // The pain answer (0 to 10) at the end of each completed set. null means no answer. Optional, so an older file still reads.
  // It never stops the session by itself. Only a clinician `painPauseThreshold` does (adaptation design 4.3, L2).
  setPain: z.array(z.number().int().min(0).max(10).nullable()).max(20).optional(),
  schemaVersion: z.literal(1),
}).superRefine((s, ctx) => {
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

// The answers of the person for the plan generator, I1 to I9. They stay on the device. The red flags, the pain and the
// swelling are answers of one moment, so the app never stores them. The clearance answer is asked again at each update.
export const storedInputsSchema = inputsSchema.omit({ phaseClearance: true, redFlags: true, pain: true, swelling: true });
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
  // Version 3 adds the answers for the plan generator. No index and no change to the other tables.
  db.version(3).stores({ sessions: '++id, date, exercise', protocol: 'key', generatorInputs: 'key' });
  return db;
}

/** Save one session. The first save asks the browser for persistent storage. */
export async function saveSession(db: MpflDb, input: SessionInput): Promise<number> {
  await requestPersistOnce();
  return db.sessions.add({ ...input, schemaVersion: 1 } as SessionRecord);
}

/** The session with the latest date, or undefined when none is stored. */
export async function lastSession(db: MpflDb): Promise<SessionRecord | undefined> {
  return db.sessions.orderBy('date').last();
}

/** Check a protocol file and keep it, so the patient loads it once. A new one replaces the old one. */
export async function saveProtocol(db: MpflDb, raw: string, mode: Mode): Promise<LoadResult> {
  const result = loadProtocol(raw, mode);
  if (result.ok) await db.protocol.put({ key: 'current', raw, savedAt: new Date().toISOString() });
  return result;
}

/** The stored protocol, checked again. null when none is stored. A changed file gives an error result. */
export async function loadStoredProtocol(db: MpflDb, mode: Mode): Promise<LoadResult | null> {
  const stored = await db.protocol.get('current');
  return stored ? loadProtocol(stored.raw, mode) : null;
}

/** Keep the answers I1 to I9 of the plan that the person confirmed. Only the fixed fields are kept. */
export async function saveGeneratorInputs(db: MpflDb, inputs: StoredInputs): Promise<void> {
  const keys = Object.keys(storedInputsSchema.shape) as Array<keyof StoredInputs>;
  const clean = storedInputsSchema.parse(Object.fromEntries(keys.map((k) => [k, inputs[k]])));
  await db.generatorInputs.put({ key: 'current', inputs: clean, savedAt: new Date().toISOString() });
}

/** The stored answers, checked again. null when none are stored or when the row does not pass the schema. */
export async function loadGeneratorInputs(db: MpflDb): Promise<StoredInputs | null> {
  const row = await db.generatorInputs.get('current');
  const parsed = storedInputsSchema.safeParse(row?.inputs);
  return parsed.success ? parsed.data : null;
}

export async function clearProtocol(db: MpflDb): Promise<void> {
  await db.protocol.clear();
}

/** Erase everything this app keeps: IndexedDB, the mpfl. keys of localStorage, Cache storage and service workers. */
export async function eraseAll(db: MpflDb): Promise<void> {
  await db.delete();
  await db.open();
  // Other apps can share this origin, so only the keys of this app go.
  for (const key of Object.keys(localStorage)) if (key.startsWith('mpfl.')) localStorage.removeItem(key);
  if (typeof caches !== 'undefined') {
    for (const key of await caches.keys()) await caches.delete(key);
  }
  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
  }
}
