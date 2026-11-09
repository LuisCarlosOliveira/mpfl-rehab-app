// Small local values: pseudonymous id, last export date, "persistent storage asked" flag.
// All of them live in localStorage, so eraseAll() clears them.
// localStorage can throw (private mode or blocked storage). No function here throws to the caller.

import { z } from 'zod';

const PSEUDO_KEY = 'mpfl.pseudoId';
const EXPORT_KEY = 'mpfl.lastExport';
const PERSIST_KEY = 'mpfl.persistAsked';
const PRIVACY_KEY = 'mpfl.privacySeen';
const CONTACT_KEY = 'mpfl.contactDismissed';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_DAYS = 7;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** False when the value was not stored. The caller works without it. */
function write(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// crypto.randomUUID exists only in a secure context. getRandomValues works on any origin.
function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Kept for this page load only when storage is blocked, so the id stays the same.
let memoryId: string | null = null;

/** The id stored on this device, or null. This never writes. */
export function storedPseudonymId(): string | null {
  const stored = read(PSEUDO_KEY);
  return stored && z.uuid().safeParse(stored).success ? stored : null;
}

/** A random id. It is not linked to a person. A new one is made after erase. */
export function getPseudonymId(): string {
  const stored = storedPseudonymId();
  if (stored) return stored;
  const id = memoryId ?? newId();
  memoryId = write(PSEUDO_KEY, id) ? null : id;
  return id;
}

/**
 * The device takes the id of an imported file. Call it only after the sessions of the file are stored on a device
 * that held none. A later import of the same file then counts as the same person, and a re-export keeps the id.
 */
export function adoptPseudonymId(id: string): void {
  memoryId = write(PSEUDO_KEY, id) ? null : id;
}

export function getLastExport(): string | null {
  return read(EXPORT_KEY);
}

export function markExported(when: Date): void {
  write(EXPORT_KEY, when.toISOString());
}

/** True when there are sessions and the last export is missing or 7 days old or more. */
export function exportReminderDue(lastExportIso: string | null, now: Date, hasSessions: boolean): boolean {
  if (!hasSessions) return false;
  if (!lastExportIso) return true;
  const age = now.getTime() - new Date(lastExportIso).getTime();
  // A stored value that is not a date counts as no export.
  return Number.isNaN(age) || age >= REMINDER_DAYS * DAY_MS;
}

/** Ask the browser to keep the data. Safari can delete site data after about 7 days. Asked once. */
export async function requestPersistOnce(): Promise<void> {
  if (read(PERSIST_KEY)) return;
  write(PERSIST_KEY, '1');
  try {
    await navigator.storage?.persist?.();
  } catch {
    // The browser can refuse. The export reminder is the fallback.
  }
}

/** The privacy notice shows on the first launch. This flag records that the patient saw it. */
export function hasSeenPrivacyNotice(): boolean {
  return read(PRIVACY_KEY) === '1';
}

export function markPrivacyNoticeSeen(): void {
  write(PRIVACY_KEY, '1');
}

/** The id of the session whose "Contact your care team" card the person dismissed, or null. */
export function getContactDismissed(): number | null {
  const n = Number(read(CONTACT_KEY));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Hides the card of this session. The next saved session has a new id, so its card can show again. */
export function dismissContact(sessionId: number): void {
  write(CONTACT_KEY, String(sessionId));
}
