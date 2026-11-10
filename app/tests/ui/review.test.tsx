// Tests from the independent review of T10. Each one first failed on the defect it names.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import example from '../../src/lib/protocol/example-protocol.json';
import { RED_FLAGS } from '../../src/lib/redflags';
import { PAUSE_MESSAGE } from '../../src/lib/safety';
import { markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { appReducer, initialAppState } from '../../src/ui/appState';
import { Session } from '../../src/ui/Session';
import { HEEL_SLIDE, audioHarness, fileOf, freshDb, mockSource, playRep, protocolText, readyLegOf } from './helpers';

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

async function homeWithProtocol(mode: 'demo' | 'patient' = 'demo') {
  const db = freshDb();
  markPrivacyNoticeSeen();
  await saveProtocol(db, protocolText(), mode);
  const source = mockSource();
  render(<App db={db} mode={mode} source={source} />);
  await heading('Home');
  return { db, source };
}

describe('red-flag check before every start', () => {
  it('a check cleared before a cancelled setup does not clear the next start (reducer)', () => {
    let s = initialAppState({ seenPrivacy: true, hasProtocol: true });
    s = appReducer(s, { type: 'choose-exercise', exercise: 'heel-slide' });
    s = appReducer(s, { type: 'red-flags-clear' });
    expect(s.screen).toBe('setup');
    s = appReducer(s, { type: 'open', screen: 'home' });
    s = appReducer(s, { type: 'choose-exercise', exercise: 'heel-slide' });
    expect(s.screen).toBe('redflag');
    expect(s.redFlagCleared).toBe(false);
  });

  it('cancel in Setup, then a new start, shows the check again and stops the camera', async () => {
    const { source } = await homeWithProtocol();
    click('Start Heel slide');
    click(/none of these apply/i);
    await heading('Set up the camera');
    click('Next: set up the camera');
    click('Start camera');
    await screen.findByRole('button', { name: 'Start exercise' });
    click('Cancel');
    await heading('Home');
    expect(source.stop).toHaveBeenCalled();
    click('Start Heel slide');
    await heading('Check before you exercise');
  });
});

describe('FR12 through the whole app', () => {
  it('a block, a cleared check, a run and pain 7 save the right counters and show the pause message', async () => {
    const { db, source } = await homeWithProtocol();
    click('Start Heel slide');
    const flag = RED_FLAGS[0]!;
    fireEvent.click(screen.getByLabelText(flag.text));
    fireEvent.click(screen.getByLabelText(flag.text));
    fireEvent.click(screen.getByLabelText(flag.text));
    fireEvent.click(screen.getByLabelText(flag.text));
    // The block stays for the visit. Only Back to Home and a new start go on.
    expect(screen.getByRole('button', { name: /none of these apply/i })).toBeDisabled();
    click('Back to Home');
    await heading('Home');
    click('Start Heel slide');
    click(/none of these apply/i);
    await heading('Set up the camera');
    click('Next: set up the camera');
    click('Start camera');
    const start = await screen.findByRole('button', { name: 'Start exercise' });
    // The leg holds still, so Setup measures the resting angle that the rep counter needs (T17).
    for (let t = 0; t <= 3500; t += 100) act(() => source.emit(readyLegOf(example.side as 'left' | 'right', 0), t));
    fireEvent.click(start);
    await heading('Heel slide');
    playRep(source, example.side as 'left' | 'right', 60, 4000);
    click('Stop');
    await heading('Summary');
    fireEvent.click(screen.getByRole('radio', { name: '7' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    click('Save');
    expect(await screen.findByText(PAUSE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(/this is a rule of the app/i)).toBeInTheDocument();
    const rows = await db.sessions.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ pain: 7, swelling: 'none', gaveWayPresses: 0, redFlagBlocks: 1 });
    expect(rows[0]!.reps).toBeGreaterThanOrEqual(1);
  });
});

describe('Summary save', () => {
  async function toSummary() {
    const { db } = await homeWithProtocol();
    click('Start Heel slide');
    click(/none of these apply/i);
    click('Next: set up the camera');
    click('Start camera');
    fireEvent.click(await screen.findByRole('button', { name: 'Start exercise' }));
    await heading('Heel slide');
    click('Stop');
    await heading('Summary');
    return db;
  }

  it('two quick presses on Save write one record', async () => {
    const db = await toSummary();
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    const button = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByText('Session saved.');
    expect(await db.sessions.count()).toBe(1);
  });

  it('shows the pause message even when the save fails', async () => {
    const db = await toSummary();
    vi.spyOn(db.sessions, 'update').mockRejectedValueOnce(new Error('disk')); // the run was saved at its end, so Save updates
    fireEvent.click(screen.getByRole('radio', { name: '8' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    click('Save');
    await waitFor(() => expect(screen.getByText(/could not be saved/i)).toBeInTheDocument());
    expect(screen.getByText(PAUSE_MESSAGE)).toBeInTheDocument();
  });
});

describe('start-up and file errors', () => {
  it('a stored protocol that cannot be read ends the loading state with a message', async () => {
    markPrivacyNoticeSeen();
    const db = freshDb();
    vi.spyOn(db.protocol, 'get').mockRejectedValue(new Error('no storage'));
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Load protocol file');
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be read/i);
  });

  it('a file that cannot be stored shows an error as plain text', async () => {
    markPrivacyNoticeSeen();
    const db = freshDb();
    vi.spyOn(db.protocol, 'put').mockRejectedValue(new Error('quota'));
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Load protocol file');
    fireEvent.change(screen.getByLabelText('Choose a file from your care team'), { target: { files: [fileOf(protocolText())] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be read or saved/i);
  });
});

describe('Session status text', () => {
  it('the rep count sits in a polite live region', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
    try {
      render(<Session exercise={HEEL_SLIDE} side="left" source={mockSource()} sound={audioHarness().sound} onEnd={vi.fn()} />);
      act(() => void vi.advanceTimersByTime(250));
      const count = screen.getByText('reps').closest('[aria-live]');
      expect(count).not.toBeNull();
      expect(count!.getAttribute('aria-live')).toBe('polite');
    } finally {
      vi.useRealTimers();
    }
  });
});
