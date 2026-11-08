// Helpers for the dashboard, clinician view and data screen tests (T11, T11b).
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ANGLE_METHOD, type ExportFile, type SessionRecord } from '../../src/lib/storage';

let nextId = 1;

/** One session record with plain values. Pass `over` to change a field. */
export function session(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: nextId++, date: '2026-11-01T10:00:00.000Z', exercise: 'mini-squat', side: 'left', reps: 10, peakFlexion: 100,
    holdSeconds: null, topFlexion: null, marginDeg: 9, marginSource: 'start value', view: 'side', nearLimit: 0, overLimit: 0,
    tooFast: 0, gaveWayPresses: 0, redFlagBlocks: 0, pain: 2, swelling: 'none', protocolId: 'p-1', phase: 1, schemaVersion: 1, ...over,
  };
}

export const day = (n: number, hour = 10) => `2026-11-${String(n).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`;

/** Three mini-squat sessions with the same peak, on three days. */
export const threeSquats = (peak: number) => [1, 2, 3].map((n) => session({ date: day(n), peakFlexion: peak }));

export const PSEUDONYM = '11111111-2222-4333-8444-555555555555';

/** The text of a valid export file. */
export function exportText(sessions: readonly SessionRecord[], over: Record<string, unknown> = {}): string {
  const file: ExportFile = {
    schemaVersion: 1,
    appVersion: '0.1.0',
    angleMethod: ANGLE_METHOD,
    pseudonymId: PSEUDONYM,
    protocolId: 'p-1',
    exportedAt: '2026-11-20T09:00:00.000Z',
    sessions: sessions.map((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'id')) as ExportFile['sessions'][number]),
  };
  return JSON.stringify({ ...file, ...over });
}

/** The text of a protocol file with one phase and the given review criteria. */
export function protocolFileText(reviewCriteria: unknown[], over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: 1, id: 'p-1', example: true, side: 'left', activePhase: 1, surgeon: {},
    phases: [{ id: 1, name: 'Protection', reviewDate: '2026-12-01', exercises: [{ kind: 'mini-squat', source: 'PROPOSAL' }], reviewCriteria }],
    ...over,
  });
}

export const peakCriterion = (over: Record<string, unknown> = {}) => ({
  kind: 'numeric', measure: 'peakFlexionDeg', exerciseId: 'mini-squat', op: 'atLeast', limit: 110, lastSessions: 3, evidence: 'borrowed', ...over,
});

/** Pick a file in a file input. */
export function pick(input: HTMLElement, text: string, name = 'file.json') {
  fireEvent.change(input, { target: { files: [new File([text], name, { type: 'application/json' })] } });
}

/** A file whose size is over the limit, without a huge string in memory. */
export function bigFile(): File {
  const file = new File(['{}'], 'big.json', { type: 'application/json' });
  Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 + 1 });
  return file;
}

/** jsdom has no showModal. This stub follows the native steps: open, then `close` and `cancel` events. */
export function installDialogStub() {
  const proto = HTMLDialogElement.prototype;
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

/** Stub the Blob URL functions and the anchor click, and record what the screen did. */
export function stubDownload() {
  const created: Blob[] = [];
  const revoked: string[] = [];
  const clicked: { href: string; download: string }[] = [];
  URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
    created.push(blob as Blob);
    return `blob:test/${created.length}`;
  });
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ href: this.href, download: this.download });
  });
  return { created, revoked, clicked, restore: () => click.mockRestore() };
}

export const databaseNames = async () => (await indexedDB.databases()).map((d) => d.name).sort();
