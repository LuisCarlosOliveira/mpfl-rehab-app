// S-07 and S-09: storage that fails, an insecure origin, and an erase that stays inside this app.
import { vi } from 'vitest';
import { ANGLE_METHOD, createDb, eraseAll, parseExport, sessionSchema } from '../src/lib/storage';
import {
  exportReminderDue,
  getLastExport,
  getPseudonymId,
  hasSeenPrivacyNotice,
  markExported,
  markPrivacyNoticeSeen,
  requestPersistOnce,
} from '../src/lib/storage/meta';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function blockStorage() {
  const boom = () => {
    throw new DOMException('blocked', 'SecurityError');
  };
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
}

describe('meta with a storage that throws (S-07)', () => {
  it('never throws, and gives a valid id that stays the same in one page load', () => {
    blockStorage();
    const id = getPseudonymId();
    expect(id).toMatch(UUID);
    expect(getPseudonymId()).toBe(id);
  });

  it('reads and writes the small values without throwing', async () => {
    blockStorage();
    expect(getLastExport()).toBeNull();
    expect(() => markExported(new Date())).not.toThrow();
    expect(hasSeenPrivacyNotice()).toBe(false);
    expect(() => markPrivacyNoticeSeen()).not.toThrow();
    await expect(requestPersistOnce()).resolves.toBeUndefined();
    expect(exportReminderDue(getLastExport(), new Date(), true)).toBe(true);
  });
});

describe('meta without crypto.randomUUID (S-07)', () => {
  it('builds a version 4 id from getRandomValues and keeps it', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    const id = getPseudonymId();
    expect(id).toMatch(UUID);
    expect(getPseudonymId()).toBe(id);
    expect(localStorage.getItem('mpfl.pseudoId')).toBe(id);
  });

  it('makes a different id each time storage is empty', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    const a = getPseudonymId();
    localStorage.clear();
    expect(getPseudonymId()).not.toBe(a);
  });
});

describe('eraseAll keeps keys of other apps (S-09)', () => {
  it('removes only the keys that start with mpfl.', async () => {
    localStorage.setItem('mpfl.pseudoId', 'x');
    localStorage.setItem('mpfl.privacySeen', '1');
    localStorage.setItem('mpfl.future', 'y');
    localStorage.setItem('other.app', 'keep');
    localStorage.setItem('mpflx', 'keep too');
    await eraseAll(createDb(`erase-${Math.random()}`));
    expect(Object.keys(localStorage).sort()).toEqual(['mpflx', 'other.app']);
  });
});

describe('limits (S-08)', () => {
  const longDate = `2026-11-01T10:00:00.${'0'.repeat(60)}Z`;
  const base = {
    date: '2026-11-01T10:00:00.000Z', exercise: 'mini-squat', side: 'left', reps: 5, peakFlexion: 40, holdSeconds: null,
    topFlexion: null, marginDeg: 5, marginSource: 'x', view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0,
    gaveWayPresses: 0, redFlagBlocks: 0, pain: 1, swelling: 'none', protocolId: 'p-001', phase: 1, schemaVersion: 1,
  };

  it('rejects an export date and a session date that are longer than 40 characters', () => {
    expect(sessionSchema.safeParse(base).success).toBe(true);
    expect(sessionSchema.safeParse({ ...base, date: longDate }).success).toBe(false);
    const file = {
      schemaVersion: 1, appVersion: '0.1.0', angleMethod: ANGLE_METHOD,
      pseudonymId: '123e4567-e89b-42d3-a456-426614174000', protocolId: 'p-001',
      exportedAt: '2026-11-08T10:00:00.000Z', sessions: [],
    };
    expect(parseExport(JSON.stringify(file)).ok).toBe(true);
    expect(parseExport(JSON.stringify({ ...file, exportedAt: longDate })).ok).toBe(false);
  });

  it('accepts 5000 sessions and rejects 5001', () => {
    const file = (count: number) => JSON.stringify({
      schemaVersion: 1, appVersion: '0.1.0', angleMethod: ANGLE_METHOD,
      pseudonymId: '123e4567-e89b-42d3-a456-426614174000', protocolId: 'p-001',
      exportedAt: '2026-11-08T10:00:00.000Z', sessions: Array.from({ length: count }, () => base),
    });
    expect(parseExport(file(5000)).ok).toBe(true);
    expect(parseExport(file(5001)).ok).toBe(false);
  });
});
