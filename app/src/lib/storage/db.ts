import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import { EXERCISE_KINDS, protocolIdSchema } from '../protocol/schema';
import { loadProtocol, type LoadResult, type Mode } from '../protocol';
import { requestPersistOnce } from './meta';

const counter = z.number().int().min(0).max(100000);

export const sessionSchema = z.strictObject({
  date: z.iso.datetime(),
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
  schemaVersion: z.literal(1),
});

export type SessionData = z.infer<typeof sessionSchema>;
export type SessionRecord = SessionData & { id: number };
export type SessionInput = Omit<SessionData, 'schemaVersion'>;

export interface StoredProtocol {
  key: 'current';
  raw: string; // the file text. It is checked again on every load.
  savedAt: string;
}

export type MpflDb = Dexie & {
  sessions: EntityTable<SessionRecord, 'id'>;
  protocol: EntityTable<StoredProtocol, 'key'>;
};

export function createDb(name = 'mpfl-rehab'): MpflDb {
  const db = new Dexie(name) as MpflDb;
  db.version(1).stores({ sessions: '++id, date, exercise' });
  db.version(2).stores({ sessions: '++id, date, exercise', protocol: 'key' });
  return db;
}

/** Save one session. The first save asks the browser for persistent storage. */
export async function saveSession(db: MpflDb, input: SessionInput): Promise<number> {
  await requestPersistOnce();
  return db.sessions.add({ ...input, schemaVersion: 1 } as SessionRecord);
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

export async function clearProtocol(db: MpflDb): Promise<void> {
  await db.protocol.clear();
}

/** Erase everything this app keeps: IndexedDB, localStorage, Cache storage and service workers. */
export async function eraseAll(db: MpflDb): Promise<void> {
  await db.delete();
  await db.open();
  localStorage.clear();
  if (typeof caches !== 'undefined') {
    for (const key of await caches.keys()) await caches.delete(key);
  }
  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
  }
}
