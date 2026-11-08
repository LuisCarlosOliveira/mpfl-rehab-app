import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Summary as RunSummary } from '../../src/lib/exercises';
import { MARGIN_DEG } from '../../src/lib/margin';
import { MESSAGES } from '../../src/lib/redflags';
import { PAUSE_MESSAGE } from '../../src/lib/safety';
import { loadProtocol, type Protocol } from '../../src/lib/protocol';
import type { RunResult } from '../../src/ui/appState';
import { Summary } from '../../src/ui/Summary';
import { HEEL_SLIDE, freshDb, protocolText } from './helpers';

afterEach(cleanup);

const summary: RunSummary = {
  reps: 4,
  holds: null,
  peakFlexion: 62.34,
  topFlexion: null,
  topState: null,
  eventCounts: { nearLimit: 2, overLimit: 1, tooFast: 3 },
};

function protocolWith(over: Record<string, unknown> = {}): Protocol {
  const r = loadProtocol(protocolText(over), 'demo');
  if (!r.ok) throw new Error(r.error.message);
  return r.protocol;
}

function setup(opts: { run?: RunResult; protocol?: Protocol; redFlagBlocks?: number } = {}) {
  const db = freshDb();
  const onDone = vi.fn();
  render(
    <Summary
      run={opts.run ?? { reason: 'stop', summary }}
      exercise={HEEL_SLIDE}
      protocol={opts.protocol ?? protocolWith()}
      activePhase={1}
      redFlagBlocks={opts.redFlagBlocks ?? 0}
      db={db}
      now={() => new Date('2026-03-04T10:00:00.000Z')}
      onDone={onDone}
    />,
  );
  return { db, onDone };
}

const answer = (pain: number, swelling: RegExp) => {
  fireEvent.click(screen.getByRole('radio', { name: String(pain) }));
  fireEvent.click(screen.getByRole('radio', { name: swelling }));
};
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('Summary screen', () => {
  it('pre-selects nothing and keeps Save off until both questions are answered', () => {
    setup();
    expect(screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: '3' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('asks pain from 0 to 10 and the three swelling answers', () => {
    setup();
    expect(screen.getAllByRole('radio', { name: /^(\d|10)$/ })).toHaveLength(11);
    expect(screen.getByRole('radio', { name: /no swelling/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /some swelling/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /more than before/i })).toBeInTheDocument();
  });

  it('shows the angle with its label next to the number', () => {
    setup();
    expect(screen.getByText(/estimated angle, not a medical measurement/)).toBeInTheDocument();
    expect(screen.getByText('62')).toBeInTheDocument();
  });

  it('pain 7 with no protocol threshold shows the pause message (safety floor)', async () => {
    setup();
    answer(7, /no swelling/i);
    save();
    expect(await screen.findByText(PAUSE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(/this is a rule of the app\. it is not a diagnosis/i)).toBeInTheDocument();
  });

  it('swelling "more than before" shows the pause message', async () => {
    setup();
    answer(0, /more than before/i);
    save();
    expect(await screen.findByText(PAUSE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(/swelling: more than before/i)).toBeInTheDocument();
  });

  it('pain 6 with some swelling does not pause', async () => {
    setup();
    answer(6, /some swelling/i);
    save();
    expect(await screen.findByText('Session saved.')).toBeInTheDocument();
    expect(screen.queryByText(PAUSE_MESSAGE)).toBeNull();
  });

  it('a protocol threshold of 5 pauses at pain 5', async () => {
    setup({ protocol: protocolWith({ painPauseThreshold: 5 }) });
    answer(5, /no swelling/i);
    save();
    expect(await screen.findByText(PAUSE_MESSAGE)).toBeInTheDocument();
  });

  it('saves the session with counters, topFlexion, margin fields and the side view', async () => {
    const { db } = setup({ redFlagBlocks: 2 });
    answer(4, /some swelling/i);
    save();
    await screen.findByText('Session saved.');
    const rows = await db.sessions.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: '2026-03-04T10:00:00.000Z',
      exercise: 'heel-slide',
      side: 'left',
      reps: 4,
      peakFlexion: 62.3,
      holdSeconds: null,
      topFlexion: null,
      marginDeg: MARGIN_DEG,
      view: 'side',
      nearLimit: 2,
      overLimit: 1,
      tooFast: 3,
      gaveWayPresses: 0,
      redFlagBlocks: 2,
      pain: 4,
      swelling: 'some',
      protocolId: 'example-001',
      phase: 1,
      schemaVersion: 1,
    });
    expect(rows[0]!.marginSource).toMatch(/UNVERIFIED/);
  });

  it('shows the care-team message after "knee gave way or hurts" and saves the press', async () => {
    const { db } = setup({ run: { reason: 'gave-way', summary } });
    expect(screen.getByRole('alert')).toHaveTextContent(MESSAGES['care-team']);
    answer(2, /no swelling/i);
    save();
    await screen.findByText('Session saved.');
    expect((await db.sessions.toArray())[0]).toMatchObject({ gaveWayPresses: 1 });
  });

  it('shows no care-team message after a plain Stop', () => {
    setup();
    expect(screen.queryByText(MESSAGES['care-team'])).toBeNull();
  });

  it('Done leaves the screen after the save', async () => {
    const { onDone } = setup();
    answer(1, /no swelling/i);
    save();
    fireEvent.click(await screen.findByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('keeps the form and shows an error when the save fails', async () => {
    const { db } = setup();
    vi.spyOn(db.sessions, 'add').mockRejectedValueOnce(new Error('disk'));
    answer(1, /no swelling/i);
    save();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/could not be saved/i));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});

describe('Summary, pause message apart from the save (finding S-01, FR12)', () => {
  const pick = (pain: number) => fireEvent.click(screen.getByRole('radio', { name: String(pain) }));
  const swell = (re: RegExp) => fireEvent.click(screen.getByRole('radio', { name: re }));
  // The number sits in its own span, so the match runs on the text of the paragraph.
  const reported = (n: number) =>
    screen.queryByText((_, el) => el?.tagName === 'P' && el.textContent === `You reported pain ${n} out of 10.`);

  it('pain 7 shows the pause message at once, with no press of Save', () => {
    setup();
    answer(7, /no swelling/i);
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText('Session saved.')).toBeNull();
  });

  it('swelling "more than before" shows the pause message at once, with no press of Save', () => {
    setup();
    answer(0, /more than before/i);
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
  });

  it('the message text is exactly PAUSE_MESSAGE and sits in an alert', () => {
    setup();
    answer(9, /some swelling/i);
    const title = screen.getByText(PAUSE_MESSAGE);
    expect(title.textContent).toBe(PAUSE_MESSAGE);
    expect(title.closest('[role="alert"]')).not.toBeNull();
  });

  it('shows no pause message while an answer is missing, or when the answers are low', () => {
    setup();
    pick(2);
    expect(screen.queryByText(PAUSE_MESSAGE)).toBeNull();
    swell(/no swelling/i);
    expect(screen.queryByText(PAUSE_MESSAGE)).toBeNull();
  });

  it('keeps the message when the save fails', async () => {
    const { db } = setup();
    vi.spyOn(db.sessions, 'add').mockRejectedValueOnce(new Error('disk'));
    answer(8, /no swelling/i);
    save();
    await waitFor(() => expect(screen.getByText(/could not be saved/i)).toBeInTheDocument());
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
  });

  it('keeps the message after a good save', async () => {
    setup();
    answer(8, /no swelling/i);
    save();
    await screen.findByText('Session saved.');
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
  });

  it('a changed answer updates the message at once, before and after a failed save', async () => {
    const { db } = setup();
    pick(9);
    swell(/no swelling/i);
    expect(reported(9)).toBeInTheDocument();
    pick(8);
    expect(reported(8)).toBeInTheDocument();
    expect(reported(9)).toBeNull();

    vi.spyOn(db.sessions, 'add').mockRejectedValueOnce(new Error('disk'));
    save();
    await waitFor(() => expect(screen.getByText(/could not be saved/i)).toBeInTheDocument());
    pick(7);
    expect(reported(7)).toBeInTheDocument();
    pick(3);
    expect(screen.queryByText(PAUSE_MESSAGE)).toBeNull();
    swell(/more than before/i);
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(/swelling: more than before/i)).toBeInTheDocument();
    expect(screen.queryByText(/out of 10/i)).toBeNull();
  });

  it('moves focus to the saved message after Save', async () => {
    setup();
    answer(1, /no swelling/i);
    save();
    const saved = await screen.findByText('Session saved.');
    await waitFor(() => expect(saved).toHaveFocus());
  });
});
