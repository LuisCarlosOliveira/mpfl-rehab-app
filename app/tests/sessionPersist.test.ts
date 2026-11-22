import { describe, expect, it } from 'vitest';
import { loadProtocol } from '../src/lib/protocol';
import { buildProgressSeries, toTableRows } from '../src/lib/progress';
import { createDb, exportCsv, exportJson, importSessions, parseExport, saveSession, sessionSchema, updateSessionAnswers } from '../src/lib/storage';
import { runToSessionInput } from '../src/ui/sessionRecord';
import { HEEL_SLIDE, protocolText, sessionInput } from './ui/helpers';
import { session } from './ui/t11helpers';

let n = 0;
const freshDb = () => createDb(`persist-${Date.now()}-${n++}`);
const unanswered = (({ pain, swelling, ...rest }) => (void pain, void swelling, rest))(sessionInput());

const protocol = (() => {
  const r = loadProtocol(protocolText(), 'demo');
  if (!r.ok) throw new Error(r.error.message);
  return r.protocol;
})();

const emptySummary = { reps: 0, holds: null, peakFlexion: null, topFlexion: null, topState: null, eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 } };

describe('a record without answers', () => {
  it('passes the schema', () => {
    expect(sessionSchema.safeParse({ ...unanswered, schemaVersion: 1 }).success).toBe(true);
  });

  it('is refused when an answer is out of range', () => {
    expect(sessionSchema.safeParse({ ...unanswered, pain: 11, schemaVersion: 1 }).success).toBe(false);
  });

  it('updateSessionAnswers adds the answers to the same record and changes no other field', async () => {
    const db = freshDb();
    const id = await saveSession(db, unanswered);
    const before = await db.sessions.get(id);
    await updateSessionAnswers(db, id, { pain: 4, swelling: 'some' });
    expect(await db.sessions.count()).toBe(1);
    expect(await db.sessions.get(id)).toEqual({ ...before, pain: 4, swelling: 'some' });
  });

  it('updateSessionAnswers throws when the record does not exist', async () => {
    await expect(updateSessionAnswers(freshDb(), 99, { pain: 1, swelling: 'none' })).rejects.toThrow();
  });

  it('the chart series and table skip the pain of a record with no answer', () => {
    const series = buildProgressSeries([session({ pain: undefined, swelling: undefined }), session({ pain: 3 })]);
    expect(series.pain.points).toHaveLength(1);
    expect(toTableRows(series).filter((r) => r.series === series.pain.title)).toHaveLength(1);
  });

  it('exports as JSON and CSV, and the JSON imports again', async () => {
    const db = freshDb();
    await saveSession(db, unanswered);
    const text = await exportJson(db);
    expect(parseExport(text).ok).toBe(true);
    expect(await exportCsv(db)).toContain(',,'); // empty pain and swelling cells
    const other = freshDb();
    expect(await importSessions(other, text)).toMatchObject({ ok: true, imported: 1 });
    expect(await other.sessions.count()).toBe(1);
  });
});

describe('runToSessionInput', () => {
  const args = { exercise: HEEL_SLIDE, protocol, phase: 1, redFlagBlocks: 2, now: () => new Date('2026-03-04T10:00:00.000Z') };

  it('turns a run with 0 reps and no data into a record that shows the numbers', () => {
    const input = runToSessionInput({ ...args, run: { reason: 'stop', summary: emptySummary } });
    expect(input).toMatchObject({ reps: 0, peakFlexion: null, redFlagBlocks: 2, gaveWayPresses: 0, date: '2026-03-04T10:00:00.000Z' });
    expect(sessionSchema.safeParse({ ...input, schemaVersion: 1 }).success).toBe(true);
    expect('pain' in input).toBe(false);
  });

  it('counts the gave-way press and carries the optional fields', () => {
    const input = runToSessionInput({
      ...args,
      legTracked: 'left',
      cameraSide: 'right',
      run: { reason: 'gave-way', summary: { ...emptySummary, reps: 3, baselineSource: 'still', setPain: [4, null], repsBy: 'hand' } as never },
    });
    expect(input).toMatchObject({ gaveWayPresses: 1, legTracked: 'left', cameraSide: 'right', baselineSource: 'still', setPain: [4, null], repsBy: 'hand' });
  });

  it('holds no image or frame field', () => {
    const input = runToSessionInput({ ...args, run: { reason: 'stop', summary: emptySummary } });
    expect(Object.keys(input).join(' ')).not.toMatch(/image|frame|video|blob/i);
  });
});
