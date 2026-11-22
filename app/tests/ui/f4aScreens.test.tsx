import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Summary as PlainSummary } from '../../src/lib/exercises';
import { loadProtocol, type Exercise } from '../../src/lib/protocol';
import { BANNER } from '../../src/lib/reviewSummary';
import { PEAK_NO_VALUE_TEXT, PEAK_UNREADABLE_TEXT } from '../../src/lib/cues';
import { CAPTURE_TEXT, LEG_TEXT } from '../../src/ui/setupView';
import { ClinicianView } from '../../src/ui/ClinicianView';
import { Summary } from '../../src/ui/Summary';
import type { SessionRunSummary } from '../../src/ui/Session';
import { HEEL_SLIDE, freshDb, protocolText } from './helpers';
import { exportText, pick, session } from './t11helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const SLR: Exercise = { kind: 'straight-leg-raise', sets: 1, reps: 2, source: 'test' };
const protocol = (() => {
  const r = loadProtocol(protocolText(), 'demo');
  if (!r.ok) throw new Error('fixture');
  return r.protocol;
})();
const base: PlainSummary = { reps: 2, holds: null, peakFlexion: 12, topFlexion: 8, topState: null, eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 } };

function summaryOf(exercise: Exercise, summary: SessionRunSummary) {
  const db = freshDb();
  render(<Summary run={{ reason: 'stop', summary }} exercise={exercise} protocol={protocol} activePhase={1} redFlagBlocks={0} db={db} now={() => new Date('2026-03-04T10:00:00.000Z')} onDone={vi.fn()} />);
  return db;
}

describe('Summary: the leg raise peak (M8)', () => {
  it('shows the number as "Highest knee bend" when the peak is 30 degrees or less', () => {
    summaryOf(SLR, { ...base, peakFlexion: 30 });
    expect(screen.getByText('Highest knee bend')).toBeInTheDocument();
    expect(screen.queryByText(PEAK_UNREADABLE_TEXT)).toBeNull();
  });

  it('C-06: the highest knee bend line says "No value" and does not claim that the camera could not read', () => {
    summaryOf(SLR, { ...base, peakFlexion: 46.5, topFlexion: 3 });
    const stat = screen.getByText('Highest knee bend').closest('.v3-metric') as HTMLElement;
    expect(stat.textContent).toContain(PEAK_NO_VALUE_TEXT);
    expect(stat.textContent).not.toMatch(/camera could not read|46/);
    expect(screen.getByText(/Reps counted/)).toBeInTheDocument();
  });

  it('shows the plain sentence and no number when the peak is above 30 degrees', () => {
    summaryOf(SLR, { ...base, peakFlexion: 165 });
    expect(screen.getByText(PEAK_NO_VALUE_TEXT)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/165/);
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
  });

  it('keeps the stored value as it is', async () => {
    const db = summaryOf(SLR, { ...base, peakFlexion: 85 });
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Session saved.');
    expect((await db.sessions.toArray())[0]!.peakFlexion).toBe(85);
  });

  it('shows a high peak of a heel slide as before', () => {
    summaryOf(HEEL_SLIDE, { ...base, peakFlexion: 85 });
    expect(screen.getByText('Highest knee bend')).toBeInTheDocument();
    expect(screen.queryByText(PEAK_UNREADABLE_TEXT)).toBeNull();
  });
});

describe('Summary: the leg raise top angle (F5a)', () => {
  it('shows the number when the top angle is 30 degrees or less', () => {
    summaryOf(SLR, { ...base, topFlexion: 30 });
    expect(screen.getByText('Angle at the top').closest('.v3-metric')!.textContent).toMatch(/30\s*degrees/);
  });

  it('shows the plain sentence and no number when the top angle is above 30 degrees', () => {
    summaryOf(SLR, { ...base, topFlexion: 85 });
    expect(screen.getAllByText(PEAK_NO_VALUE_TEXT).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/at the top: 85/);
    expect(document.body.textContent).not.toMatch(/\b85\b/);
  });

  it('keeps the stored value as it is', async () => {
    const db = summaryOf(SLR, { ...base, topFlexion: 85 });
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Session saved.');
    expect((await db.sessions.toArray())[0]!.topFlexion).toBe(85);
  });
});

// U4: the Summary shows the angle at the top that the sets showed, as its own line. A high peak shows no value in its own line only.
describe('Summary: the angle at the top is its own line (U4)', () => {
  it('shows the angle at the top of 14 degrees next to a peak of 156 that shows no value', () => {
    summaryOf(SLR, { ...base, topFlexion: 14.4, peakFlexion: 156 });
    const top = screen.getByText('Angle at the top').closest('.v3-metric')!;
    expect(top.textContent).toContain('14');
    expect(top.textContent).toContain('estimated angle, not a medical measurement');
    const peak = screen.getByText('Highest knee bend').closest('.v3-metric')!;
    expect(peak.textContent).toContain(PEAK_NO_VALUE_TEXT);
    expect(peak.textContent).not.toMatch(/\b156\b/);
  });

  it('shows no line when the session has no top angle', () => {
    summaryOf(SLR, { ...base, topFlexion: null, peakFlexion: 12 });
    expect(screen.queryByText('Angle at the top')).toBeNull();
  });
});

describe('Summary: repsBy reaches the record (M3)', () => {
  it('saves hand, and no repsBy key when Session sent none', async () => {
    const db = summaryOf(SLR, { ...base, repsBy: 'hand' });
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Session saved.');
    expect((await db.sessions.toArray())[0]).toMatchObject({ repsBy: 'hand' });
    cleanup();
    const db2 = summaryOf(SLR, base);
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Session saved.');
    expect((await db2.sessions.toArray())[0]).not.toHaveProperty('repsBy');
  });

  it('shows no new text to the patient', () => {
    summaryOf(SLR, { ...base, repsBy: 'hand' });
    expect(document.body.textContent).not.toMatch(/by hand/i);
  });
});

describe('Care team view', () => {
  const open = async (sessions: ReturnType<typeof session>[]) => {
    render(<ClinicianView onBack={vi.fn()} mode="demo" now={() => new Date('2026-11-20T09:00:00.000Z')} />);
    pick(screen.getByLabelText(/session file/i), exportText(sessions));
    await screen.findByText(BANNER);
    return screen.getByRole('table', { name: /session list/i });
  };

  it('shows "counted by hand" next to the reps of a hand count', async () => {
    const list = await open([session({ exercise: 'straight-leg-raise', reps: 10, peakFlexion: 12, repsBy: 'hand' })]);
    expect(within(list).getByText('10 (counted by hand)')).toBeInTheDocument();
  });

  it('shows the plain number for a camera count and for an old file', async () => {
    const list = await open([
      session({ exercise: 'heel-slide', reps: 7, peakFlexion: 60, repsBy: 'camera' }),
      session({ exercise: 'heel-slide', reps: 8, peakFlexion: 60, date: '2026-11-02T10:00:00.000Z' }),
    ]);
    expect(within(list).getByText('7')).toBeInTheDocument();
    expect(within(list).getByText('8')).toBeInTheDocument();
    expect(list.textContent).not.toMatch(/by hand/);
  });

  it('shows the sentence in place of a leg raise peak above 30 degrees, and the number for a lower one', async () => {
    const list = await open([
      session({ exercise: 'straight-leg-raise', reps: 3, peakFlexion: 165, holdSeconds: null }),
      session({ exercise: 'straight-leg-raise', reps: 4, peakFlexion: 25.5, date: '2026-11-02T10:00:00.000Z' }),
      session({ exercise: 'heel-slide', reps: 5, peakFlexion: 130, date: '2026-11-03T10:00:00.000Z' }),
    ]);
    expect(within(list).getByText(PEAK_UNREADABLE_TEXT)).toBeInTheDocument();
    expect(list.textContent).not.toContain('165');
    expect(within(list).getByText('26')).toBeInTheDocument();
    expect(within(list).getByText('130')).toBeInTheDocument();
  });

  it('shows the sentence in place of a leg raise top angle above 30 degrees, and the number for a lower one (F5a)', async () => {
    const list = await open([
      session({ exercise: 'straight-leg-raise', reps: 3, peakFlexion: 12, topFlexion: 143.5 }),
      session({ exercise: 'straight-leg-raise', reps: 4, peakFlexion: 12, topFlexion: 21.5, date: '2026-11-02T10:00:00.000Z' }),
    ]);
    expect(within(list).getByText(PEAK_UNREADABLE_TEXT)).toBeInTheDocument();
    expect(list.textContent).not.toContain('143.5');
    expect(within(list).getByText('22')).toBeInTheDocument();
  });
});

describe('plural of degrees (L8)', () => {
  it('writes degree for 1 and degrees for another number', () => {
    expect(LEG_TEXT.resting(1)).toBe('Resting angle: 1 degree. Estimated angle, not a medical measurement.');
    expect(LEG_TEXT.resting(0)).toContain('0 degrees');
    expect(LEG_TEXT.resting(12)).toContain('12 degrees');
    expect(CAPTURE_TEXT.startingAngle(1)).toBe('Starting angle: 1 degree (estimated)');
    expect(CAPTURE_TEXT.startingAngle(15)).toBe('Starting angle: 15 degrees (estimated)');
  });
});
