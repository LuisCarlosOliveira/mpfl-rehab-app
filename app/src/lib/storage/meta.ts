// Small local values: pseudonymous id, last export date, "persistent storage asked" flag.
// All of them live in localStorage, so eraseAll() clears them.

import { z } from 'zod';

const PSEUDO_KEY = 'mpfl.pseudoId';
const EXPORT_KEY = 'mpfl.lastExport';
const PERSIST_KEY = 'mpfl.persistAsked';
const PRIVACY_KEY = 'mpfl.privacySeen';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_DAYS = 7;

/** A random id. It is not linked to a person. A new one is made after erase. */
export function getPseudonymId(): string {
  let id = localStorage.getItem(PSEUDO_KEY);
  if (!id || !z.uuid().safeParse(id).success) {
    id = crypto.randomUUID();
    localStorage.setItem(PSEUDO_KEY, id);
  }
  return id;
}

export function getLastExport(): string | null {
  return localStorage.getItem(EXPORT_KEY);
}

export function markExported(when: Date): void {
  localStorage.setItem(EXPORT_KEY, when.toISOString());
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
  if (localStorage.getItem(PERSIST_KEY)) return;
  localStorage.setItem(PERSIST_KEY, '1');
  try {
    await navigator.storage?.persist?.();
  } catch {
    // The browser can refuse. The export reminder is the fallback.
  }
}

/** The privacy notice shows on the first launch. This flag records that the patient saw it. */
export function hasSeenPrivacyNotice(): boolean {
  return localStorage.getItem(PRIVACY_KEY) === '1';
}

export function markPrivacyNoticeSeen(): void {
  localStorage.setItem(PRIVACY_KEY, '1');
}
