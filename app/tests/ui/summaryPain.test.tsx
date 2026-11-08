// The pain answers between sets reach the saved record (adaptation design 5.2).
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Summary as PlainSummary } from '../../src/lib/exercises';
import { loadProtocol } from '../../src/lib/protocol';
import { Summary } from '../../src/ui/Summary';
import type { SessionRunSummary } from '../../src/ui/Session';
import { HEEL_SLIDE, freshDb, protocolText } from './helpers';

afterEach(cleanup);

const base: PlainSummary = {
  reps: 4, holds: null, peakFlexion: 62, topFlexion: null, topState: null, eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 },
};

async function saveWith(summary: SessionRunSummary) {
  const r = loadProtocol(protocolText(), 'demo');
  if (!r.ok) throw new Error('fixture');
  const db = freshDb();
  render(
    <Summary run={{ reason: 'stop', summary }} exercise={HEEL_SLIDE} protocol={r.protocol} activePhase={1} redFlagBlocks={0} db={db}
      now={() => new Date('2026-03-04T10:00:00.000Z')} onDone={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole('radio', { name: '2' }));
  fireEvent.click(screen.getByRole('radio', { name: /No swelling/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.getByText('Session saved.')).toBeInTheDocument());
  return (await db.sessions.toArray())[0]!;
}

describe('Summary and setPain', () => {
  it('saves the answers between sets next to the end answers', async () => {
    const row = await saveWith({ ...base, setPain: [3, null] });
    expect(row.setPain).toEqual([3, null]);
    expect(row.pain).toBe(2);
  });

  it('saves no setPain key when Session sent none', async () => {
    const row = await saveWith(base);
    expect('setPain' in row).toBe(false);
  });

  it('asks the end question with the same legend and 11 answers', () => {
    const r = loadProtocol(protocolText(), 'demo');
    if (!r.ok) throw new Error('fixture');
    render(<Summary run={{ reason: 'stop', summary: base }} exercise={HEEL_SLIDE} protocol={r.protocol} activePhase={1} redFlagBlocks={0}
      db={freshDb()} now={() => new Date()} onDone={vi.fn()} />);
    expect(screen.getByRole('group', { name: /How much pain do you have now\?/ })).toBeInTheDocument();
    expect(screen.getAllByRole('radio').filter((x) => (x as HTMLInputElement).name === 'pain')).toHaveLength(11);
  });
});
