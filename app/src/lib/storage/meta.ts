import { z } from 'zod';
import type { Side } from '../angle';
import { PLAN_EXERCISE_KINDS, type PlanExercise } from '../protocol/schema';

const PSEUDO_KEY = 'mpfl.pseudoId';
const EXPORT_KEY = 'mpfl.lastExport';
const PERSIST_KEY = 'mpfl.persistAsked';
const PRIVACY_KEY = 'mpfl.privacySeen';
const CONTACT_KEY = 'mpfl.contactDismissed';
const LEG_KEY = 'mpfl.leg';
const CAMERA_SIDE_KEY = 'mpfl.cameraSide';
const GUIDE_SEEN_KEY = 'mpfl.guideSeen';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_DAYS = 7;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let memoryId: string | null = null;

export function storedPseudonymId(): string | null {
  const stored = read(PSEUDO_KEY);
  return stored && z.uuid().safeParse(stored).success ? stored : null;
}

export function getPseudonymId(): string {
  const stored = storedPseudonymId();
  if (stored) return stored;
  const id = memoryId ?? newId();
  memoryId = write(PSEUDO_KEY, id) ? null : id;
  return id;
}

export function adoptPseudonymId(id: string): void {
  memoryId = write(PSEUDO_KEY, id) ? null : id;
}

export function getLastExport(): string | null {
  return read(EXPORT_KEY);
}

export function markExported(when: Date): void {
  write(EXPORT_KEY, when.toISOString());
}

export function exportReminderDue(lastExportIso: string | null, now: Date, hasSessions: boolean): boolean {
  if (!hasSessions) return false;
  if (!lastExportIso) return true;
  const age = now.getTime() - new Date(lastExportIso).getTime();
  return Number.isNaN(age) || age >= REMINDER_DAYS * DAY_MS;
}

/** Ask the browser to keep the data. Safari can delete site data after about 7 days. Asked once. */
export async function requestPersistOnce(): Promise<void> {
  if (read(PERSIST_KEY)) return;
  write(PERSIST_KEY, '1');
  try {
    await navigator.storage?.persist?.();
  } catch {
  }
}

export function hasSeenPrivacyNotice(): boolean {
  return read(PRIVACY_KEY) === '1';
}

export function markPrivacyNoticeSeen(): void {
  write(PRIVACY_KEY, '1');
}

export function getContactDismissed(): number | null {
  const n = Number(read(CONTACT_KEY));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function dismissContact(sessionId: number): void {
  write(CONTACT_KEY, String(sessionId));
}

const asSide = (v: string | null): Side | undefined => (v === 'left' || v === 'right' ? v : undefined);

export function getLegPrefs(): { leg?: Side; cameraSide?: Side } {
  const leg = asSide(read(LEG_KEY));
  const cameraSide = asSide(read(CAMERA_SIDE_KEY));
  return { ...(leg === undefined ? {} : { leg }), ...(cameraSide === undefined ? {} : { cameraSide }) };
}

export function setLegPrefs(leg: Side, cameraSide: Side): void {
  write(LEG_KEY, leg);
  write(CAMERA_SIDE_KEY, cameraSide);
}

export function getGuideSeen(): PlanExercise['kind'][] {
  try {
    const list: unknown = JSON.parse(read(GUIDE_SEEN_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((k): k is PlanExercise['kind'] => (PLAN_EXERCISE_KINDS as readonly unknown[]).includes(k)) : [];
  } catch {
    return [];
  }
}

export function markGuideSeen(kind: PlanExercise['kind']): void {
  const seen = getGuideSeen();
  if (!seen.includes(kind)) write(GUIDE_SEEN_KEY, JSON.stringify([...seen, kind]));
}
