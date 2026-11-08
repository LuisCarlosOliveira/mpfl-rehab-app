import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import { EXERCISE_KINDS } from '../protocol/schema';
import { requestPersistOnce } from './meta';

export const sessionSchema = z.strictObject({
  date: z.iso.datetime(),
  exercise: z.enum(EXERCISE_KINDS),
  side: z.enum(['left', 'right']),
  reps: z.number().int().min(0).max(1000).nullable(),
  peakFlexion: z.number().min(0).max(180).nullable(),
  holdSeconds: z.number().min(0).max(3600).nullable(),
  extensionLag: z.number().min(0).max(180).nullable(),
  pain: z.number().int().min(0).max(10),
  swelling: z.enum(['none', 'some', 'more']),
  protocolId: z.string().max(64),
  phase: z.number().int().min(1).max(10),
  schemaVersion: z.literal(1),
});

export type SessionData = z.infer<typeof sessionSchema>;
export type SessionRecord = SessionData & { id: number };
export type SessionInput = Omit<SessionData, 'schemaVersion'>;

export type MpflDb = Dexie & { sessions: EntityTable<SessionRecord, 'id'> };

export function createDb(name = 'mpfl-rehab'): MpflDb {
  const db = new Dexie(name) as MpflDb;
  db.version(1).stores({ sessions: '++id, date, exercise' });
  return db;
}

/** Save one session. The first save asks the browser for persistent storage. */
export async function saveSession(db: MpflDb, input: SessionInput): Promise<number> {
  await requestPersistOnce();
  return db.sessions.add({ ...input, schemaVersion: 1 } as SessionRecord);
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
