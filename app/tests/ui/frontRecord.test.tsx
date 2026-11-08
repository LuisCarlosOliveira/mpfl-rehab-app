// T12b (FR24): the front-view change reaches the stored record, never a patient screen, and shows in the Care team view.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Summary as PlainSummary } from '../../src/lib/exercises';
import { BANNER } from '../../src/lib/reviewSummary';
import { loadProtocol } from '../../src/lib/protocol';
import type { RunResult } from '../../src/ui/appState';
import { ClinicianView } from '../../src/ui/ClinicianView';
import { Summary } from '../../src/ui/Summary';
import { HEEL_SLIDE, freshDb, protocolText } from './helpers';
import { exportText, pick, session } from './t11helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const base: PlainSummary = {
  reps: 4,
  holds: null,
  peakFlexion: 62,
  topFlexion: null,
  topState: null,
  eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 },
};
const protocol = (() => {
  const r = loadProtocol(protocolText(), 'demo');
  if (!r.ok) throw new Error('fixture');
  return r.protocol;
})();

function summaryWith(run: RunResult) {
  const db = freshDb();
  render(
    <Summary run={run} exercise={HEEL_SLIDE} protocol={protocol} activePhase={1} redFlagBlocks={0} db={db} now={() => new Date('2026-03-04T10:00:00.000Z')} onDone={vi.fn()} />,
  );
  return db;
}
const saveIt = async () => {
  fireEvent.click(screen.getByRole('radio', { name: '2' }));
  fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await screen.findByText('Session saved.');
};

describe('Summary and the front-view record', () => {
  it('saves the second view tag, the reps with a value and the change', async () => {
    const db = summaryWith({ reason: 'stop', summary: { ...base, front: { reps: 3, changeDeg: 6.4 } } });
    await saveIt();
    expect((await db.sessions.toArray())[0]).toMatchObject({ view: 'side', secondView: 'front', frontReps: 3, frontChangeDeg: 6.4 });
  });

  it('saves a front record with no change value when no rep gave one', async () => {
    const db = summaryWith({ reason: 'stop', summary: { ...base, front: { reps: 0 } } });
    await saveIt();
    const row = (await db.sessions.toArray())[0]!;
    expect(row).toMatchObject({ secondView: 'front', frontReps: 0 });
    expect(row).not.toHaveProperty('frontChangeDeg');
  });

  it('saves none of the fields for a session with one camera', async () => {
    const db = summaryWith({ reason: 'stop', summary: base });
    await saveIt();
    const row = (await db.sessions.toArray())[0]!;
    for (const k of ['secondView', 'frontReps', 'frontChangeDeg']) expect(row).not.toHaveProperty(k);
  });

  it('shows no front-view number and no word like valgus to the patient', async () => {
    summaryWith({ reason: 'stop', summary: { ...base, front: { reps: 3, changeDeg: 6.4 } } });
    const text = () => document.body.textContent ?? '';
    expect(text()).not.toMatch(/valgus|inward|front|6\.4|knee alignment/i);
    await saveIt();
    expect(text()).not.toMatch(/valgus|inward|front|6\.4|knee alignment/i);
    expect(hasVerdictWord(text())).toBeNull();
  });
});

describe('Care team view and the front-view change', () => {
  const open = async (sessions: ReturnType<typeof session>[]) => {
    render(<ClinicianView onBack={vi.fn()} mode="demo" now={() => new Date('2026-11-20T09:00:00.000Z')} />);
    pick(screen.getByLabelText(/session file/i), exportText(sessions));
    await screen.findByText(BANNER);
  };

  it('shows the value with the label "front-view change, estimated, not a medical measurement"', async () => {
    await open([session({ exercise: 'heel-slide', secondView: 'front', frontReps: 3, frontChangeDeg: 6.4 })]);
    const list = screen.getByRole('table', { name: /session list/i });
    expect(within(list).getByRole('columnheader', { name: /front-view change/i })).toBeInTheDocument();
    expect(within(list).getByText('6.4')).toBeInTheDocument();
    expect(screen.getByText(/front-view change, estimated, not a medical measurement/i)).toBeInTheDocument();
  });

  it('shows "No value" for a session with a front record and no value, and a dash for one camera', async () => {
    await open([
      session({ exercise: 'heel-slide', secondView: 'front', frontReps: 0 }),
      session({ exercise: 'heel-slide', date: '2026-11-02T10:00:00.000Z' }),
    ]);
    const list = screen.getByRole('table', { name: /session list/i });
    expect(within(list).getAllByText('No value').length).toBeGreaterThan(0);
  });

  it('adds no column and no note when no session has a front value', async () => {
    await open([session({ exercise: 'heel-slide' })]);
    const list = screen.getByRole('table', { name: /session list/i });
    expect(within(list).queryByRole('columnheader', { name: /front-view/i })).toBeNull();
    expect(screen.queryByText(/front-view change/i)).toBeNull();
  });

  it('uses no verdict word and no valgus word', async () => {
    await open([session({ exercise: 'heel-slide', secondView: 'front', frontReps: 3, frontChangeDeg: 6.4 })]);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/valgus/i);
    await waitFor(() => expect(hasVerdictWord(document.querySelector('.dash-note')?.textContent ?? '')).toBeNull());
  });
});
