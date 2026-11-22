import { describe, expect, it } from 'vitest';
import { loadProtocol, type PlanExercise } from '../src/lib/protocol';
import { createDb, exportCsv, exportJson, importSessions, parseExport, saveSession, sessionSchema } from '../src/lib/storage';
import type { RunSummary } from '../src/ui/appState';
import { runToSessionInput } from '../src/ui/sessionRecord';
import { protocolText } from './ui/helpers';

const protocol = (() => {
  const r = loadProtocol(protocolText(), 'demo');
  if (!r.ok) throw new Error(r.error.message);
  return r.protocol;
})();
const base: RunSummary = { reps: null, holds: null, peakFlexion: null, topFlexion: null, topState: null, eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 } };
const args = { protocol, phase: 1, redFlagBlocks: 0, now: () => new Date('2026-03-04T10:00:00.000Z') };
const ex = (kind: PlanExercise['kind'], over: Partial<PlanExercise> = {}): PlanExercise => ({ kind, sets: 1, reps: 3, source: 'test', ...over });
const record = (exercise: PlanExercise, summary: RunSummary) => runToSessionInput({ ...args, exercise, run: { reason: 'stop', summary } });
const valid = (input: object) => sessionSchema.safeParse({ ...input, schemaVersion: 1 });

describe('a timer session', () => {
  const input = record(ex('quad-set', { holdSeconds: 10 }), { ...base, holds: 2, engine: { holdList: [5, 8], timedBy: 'person' } });

  it('saves holdList in whole seconds and timedBy person, with no report value, and validates', () => {
    expect(input).toMatchObject({ exercise: 'quad-set', holdList: [5, 8], timedBy: 'person', reps: null });
    expect(input.holdList!.every(Number.isInteger)).toBe(true);
    expect(valid(input).success).toBe(true);
  });

  it('does not multiply the hold count by the protocol hold time', () => {
    expect(input.holdSeconds).toBeNull();
  });

  it('exports as JSON and CSV and the JSON imports again', async () => {
    const db = createDb(`d2-timer-${Date.now()}`);
    await saveSession(db, input);
    const text = await exportJson(db);
    expect(parseExport(text).ok).toBe(true);
    expect(await exportCsv(db)).toContain('5 8');
    const other = createDb(`d2-timer2-${Date.now()}`);
    expect(await importSessions(other, text)).toMatchObject({ ok: true, imported: 1 });
  });

  it('a gluteal session with no knee report has no reportKey', () => {
    const g = record(ex('gluteal-set'), { ...base, holds: 1, engine: { holdList: [3], timedBy: 'person' } });
    expect(g).toMatchObject({ holdList: [3], timedBy: 'person' });
    expect('reportKey' in g).toBe(false);
    expect(valid(g).success).toBe(true);
  });
});

describe('a camera session of a new kind', () => {
  it.each([
    ['ankle-pump', 'ankle-range', 61.234],
    ['leg-raise-side', 'lift-angle', 33.3],
    ['leg-raise-back', 'lift-angle', 25.5],
  ] as const)('%s saves reportKey and reportValue and no timer data', (kind, reportKey, reportValue) => {
    const input = record(ex(kind), { ...base, reps: 4, engine: { reportKey, reportValue } });
    expect(input).toMatchObject({ exercise: kind, reps: 4, reportKey, reportValue });
    expect('holdList' in input).toBe(false);
    expect('timedBy' in input).toBe(false);
    expect(valid(input).success).toBe(true);
  });

  it('a run with no value saves neither reportKey nor reportValue', () => {
    const input = record(ex('ankle-pump'), { ...base, reps: 0, engine: {} });
    expect('reportKey' in input).toBe(false);
    expect('reportValue' in input).toBe(false);
    expect(valid(input).success).toBe(true);
  });

  it('an old exercise saves no engine field', () => {
    const input = record(ex('heel-slide'), { ...base, reps: 2 });
    expect(Object.keys(input)).not.toEqual(expect.arrayContaining(['holdList']));
    expect('reportKey' in input).toBe(false);
  });
});
