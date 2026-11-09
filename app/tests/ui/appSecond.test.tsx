// T12b: the second camera inside the whole app. Home and Load offer the phone screen, Setup offers the laptop step,
// Session shows the chip and stores the front-view record for the clinician. The pairing stops on every way out.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeOffer, FALLBACK_TEXT, makeHello } from '../../src/lib/pairing';
import { markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import type { LinkDeps } from '../../src/pairing/rtcLink';
import { App } from '../../src/ui/App';
import { answerText, FakePeer, frontLandmarks, lastPeer, makePeer } from '../pairing-ui/fakeRtc';
import { exampleText, freshDb, mockSource, playRep, readyLeg, type MockSource } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => {
  localStorage.clear();
  FakePeer.reset();
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
});
afterEach(cleanup);

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const pairingDeps: LinkDeps = { createPeer: makePeer };
const PHONE_BUTTON = 'Use this phone as the second camera';

async function openHome(withProtocol = true) {
  const db = freshDb();
  markPrivacyNoticeSeen();
  if (withProtocol) await saveProtocol(db, exampleText(), 'demo');
  const source = mockSource();
  render(<App db={db} mode="demo" source={source} pairingDeps={pairingDeps} />);
  await heading(withProtocol ? 'Home' : 'Load protocol file');
  return { db, source };
}

async function toSetupGuide() {
  const ctx = await openHome();
  click('Start Heel slide');
  await heading('Check before you exercise');
  click(/none of these apply/i);
  await heading('Set up the camera');
  return ctx;
}

async function pairInSetup() {
  click('Add a second camera (optional)');
  await heading('Add a second camera');
  click('Start pairing');
  await screen.findByRole('img', { name: 'Pairing code of this laptop' });
  const offer = (screen.getByLabelText('Code as text') as HTMLTextAreaElement).value;
  const decoded = decodeOffer(offer);
  if (!decoded.ok) throw new Error('offer');
  const secret = decoded.value.secret;
  fireEvent.change(screen.getByLabelText('Or paste the phone code'), { target: { value: answerText(secret) } });
  await act(async () => click('Use this code'));
  act(() => lastPeer().channels[0]!.open());
  act(() => lastPeer().channels[0]!.receive(JSON.stringify(makeHello(secret))));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Connected'), { timeout: 4000 });
}

/** `measure` sends the still leg of Setup until the countdown ends. Session then has a resting angle, so reps can count. */
async function toSessionWithPhone(measure = false) {
  const ctx = await toSetupGuide();
  await pairInSetup();
  click('Continue');
  click('Start camera');
  const start = await screen.findByRole('button', { name: 'Start exercise' });
  if (measure) {
    for (let t = 0; t < 30_000 && screen.queryByRole('heading', { level: 1, name: 'Heel slide' }) === null; t += 100) {
      act(() => ctx.source.emit(readyLeg(), t));
    }
  } else {
    fireEvent.click(start);
  }
  await heading('Heel slide');
  return ctx;
}

describe('the phone screen (companion)', () => {
  it('opens from Home without a red-flag check, shows its own h1, and goes back to Home', async () => {
    await openHome();
    click(PHONE_BUTTON);
    const h1 = await heading(PHONE_BUTTON);
    await waitFor(() => expect(h1).toHaveFocus());
    expect(screen.queryByRole('heading', { name: 'Check before you exercise' })).toBeNull();
    expect(screen.getByText(/body points only/i)).toBeInTheDocument();
    expect(screen.getByText(/never sends video or pictures/i)).toBeInTheDocument();
    click('Back');
    await heading('Home');
  });

  it('opens on a device with no stored protocol, from the Load screen, and goes back to the Load screen', async () => {
    await openHome(false);
    click(PHONE_BUTTON);
    await heading(PHONE_BUTTON);
    click('Back');
    await heading('Load protocol file');
  });

  it('still shows the privacy notice first on a first launch, and offers no phone button there', async () => {
    render(<App db={freshDb()} mode="demo" source={mockSource()} pairingDeps={pairingDeps} />);
    await heading('Privacy');
    expect(screen.queryByRole('button', { name: PHONE_BUTTON })).toBeNull();
    click('I understand');
    await heading('Load protocol file');
    expect(screen.getByRole('button', { name: PHONE_BUTTON })).toBeInTheDocument();
  });

  it('never runs an exercise: no Stop button, no count, no angle', async () => {
    await openHome();
    click(PHONE_BUTTON);
    await heading(PHONE_BUTTON);
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
    expect(screen.queryByRole('button', { name: /knee gave way/i })).toBeNull();
    expect(screen.queryByText(/degrees/i)).toBeNull();
  });

  it('a start from Home after the companion screen still needs the red-flag check', async () => {
    await openHome();
    click(PHONE_BUTTON);
    await heading(PHONE_BUTTON);
    click('Back');
    await heading('Home');
    click('Start Heel slide');
    await heading('Check before you exercise');
  });

  it('leaves the active phase as the protocol sets it', async () => {
    await openHome();
    const phaseText = () => screen.getByText('Active phase').nextElementSibling?.textContent;
    const before = phaseText();
    expect(before).toBe('1, Protection');
    click(PHONE_BUTTON);
    await heading(PHONE_BUTTON);
    click('Back');
    await heading('Home');
    expect(phaseText()).toBe(before);
  });

  it('the phone button is a secondary action: Home still has the Start buttons and no verdict word', async () => {
    await openHome();
    expect(screen.getByRole('button', { name: 'Start Heel slide' })).toBeEnabled();
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
    expect(screen.getByRole('button', { name: PHONE_BUTTON }).className).not.toMatch(/primary/);
  });
});

describe('the laptop step in Setup', () => {
  it('offers the step and keeps the single camera flow with Skip', async () => {
    const { source } = await toSetupGuide();
    click('Add a second camera (optional)');
    await heading('Add a second camera');
    click('Skip, use one camera');
    click('Start camera');
    fireEvent.click(await screen.findByRole('button', { name: 'Start exercise' }));
    await heading('Heel slide');
    expect(source.start).toHaveBeenCalledTimes(2); // Setup starts it, then Session takes it over, as with one camera
    expect(screen.queryByText('Second camera connected')).toBeNull();
    expect(FakePeer.all).toHaveLength(0);
  });

  it('Cancel closes the pairing and goes Home', async () => {
    await toSetupGuide();
    click('Add a second camera (optional)');
    await heading('Add a second camera');
    click('Start pairing');
    await screen.findByRole('img', { name: 'Pairing code of this laptop' });
    click('Cancel');
    await heading('Home');
    expect(lastPeer().closed).toBe(true);
  });

  it('Cancel after a connected phone closes the link', async () => {
    await toSetupGuide();
    await pairInSetup();
    click('Cancel');
    await heading('Home');
    expect(lastPeer().closed).toBe(true);
  });

  it('Cancel from the camera step with a connected phone closes the link', async () => {
    await toSetupGuide();
    await pairInSetup();
    click('Continue');
    expect(lastPeer().closed).toBe(false);
    click('Cancel');
    await heading('Home');
    expect(lastPeer().closed).toBe(true);
  });
});

describe('the Session with a phone', () => {
  it('shows the chip, keeps the link, and closes everything on Stop', async () => {
    const { source } = await toSessionWithPhone();
    expect(screen.getByText('Second camera connected')).toBeInTheDocument();
    expect(lastPeer().closed).toBe(false);
    click('Stop');
    await heading('Summary');
    expect(lastPeer().closed).toBe(true);
    expect(source.stop).toHaveBeenCalled();
    expect(lastPeer().channels[0]!.sent.some((m) => m.includes('"bye"'))).toBe(true);
  });

  it('"Knee gave way or hurts" also closes the link', async () => {
    await toSessionWithPhone();
    click('Knee gave way or hurts');
    await heading('Summary');
    expect(lastPeer().closed).toBe(true);
  });

  it('records that a second view was used and the front-view change, and shows no number to the patient', async () => {
    const { db, source } = await toSessionWithPhone(true);
    const channel = lastPeer().channels[0]!;
    // The phone sends front frames. The knee alignment of the chosen (left) leg changes after 3 seconds.
    // The laptop clock stamps each front frame on arrival (remoteSource). The test sets that clock to the time of the frame.
    let clock = 0;
    const now = vi.spyOn(performance, 'now').mockImplementation(() => clock);
    for (let t = 0; t <= 24_500; t += 100) {
      clock = t;
      const deg = t % 8000 < 3000 ? 0 : Math.min(10, ((t % 8000) - 3000) / 200); // 8 s cycles, one for each rep
      const message = frontLandmarks(t);
      const tilt = (deg / 2) * (Math.PI / 180);
      const aspect = 9 / 16;
      const lm = message.landmarks.map(() => ({ x: 0, y: 0, visibility: 0 }));
      lm[23] = { x: 0.5, y: 0.3, visibility: 1 };
      lm[25] = { x: 0.5 - (0.2 * Math.sin(tilt)) / aspect, y: 0.3 + 0.2 * Math.cos(tilt), visibility: 1 };
      lm[27] = { x: lm[25]!.x + (0.2 * Math.sin(tilt)) / aspect, y: lm[25]!.y + 0.2 * Math.cos(tilt), visibility: 1 };
      act(() => channel.receive(JSON.stringify({ ...message, aspect, landmarks: lm })));
    }
    now.mockRestore();
    expect(source.start).toHaveBeenCalled();
    let at = 0;
    for (let i = 0; i < 3; i++) at = playRep(source as MockSource, 'left', 60, at); // 3 reps: the minimum for a front-view value
    click('Stop');
    await heading('Summary');
    const text = () => document.body.textContent ?? '';
    expect(text()).not.toMatch(/valgus|inward|front|knee alignment/i);
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    click('Save');
    await screen.findByText('Session saved.');
    const row = (await db.sessions.toArray())[0]!;
    expect(row).toMatchObject({ view: 'side', secondView: 'front', frontReps: 3 });
    expect(row.frontChangeDeg).toBeGreaterThan(5);
    expect(text()).not.toContain(String(row.frontChangeDeg));
  });

  it('a hidden tab closes the link, and the session goes on with one camera', async () => {
    await toSessionWithPhone();
    const state = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    state.mockRestore();
    expect(lastPeer().closed).toBe(true);
    await waitFor(() => expect(screen.queryByText('Second camera connected')).toBeNull());
    expect(screen.getByText(/second camera stopped/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  });

  it('pagehide closes the link', async () => {
    await toSessionWithPhone();
    act(() => void window.dispatchEvent(new Event('pagehide')));
    expect(lastPeer().closed).toBe(true);
  });

  it('a lost connection shows the fixed text once and the session goes on', async () => {
    await toSessionWithPhone();
    act(() => lastPeer().setConnectionState('failed'));
    await waitFor(() => expect(screen.getAllByText(FALLBACK_TEXT)).toHaveLength(1));
    expect(screen.queryByText('Second camera connected')).toBeNull();
  });

  it('the next session starts one camera with no stale chip', async () => {
    await toSessionWithPhone();
    click('Stop');
    await heading('Summary');
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    click('Save');
    fireEvent.click(await screen.findByRole('button', { name: 'Done' }));
    await heading('Home');
    click('Start Heel slide');
    click(/none of these apply/i);
    await heading('Set up the camera');
    click('Next: set up the camera');
    click('Start camera');
    fireEvent.click(await screen.findByRole('button', { name: 'Start exercise' }));
    await heading('Heel slide');
    expect(screen.queryByText('Second camera connected')).toBeNull();
  });
});
