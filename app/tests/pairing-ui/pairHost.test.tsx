// The laptop screen of the pairing, with a fake peer connection and a fake camera.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeOffer, FALLBACK_TEXT, makeHello } from '../../src/lib/pairing';
import { createPairing, INVALID_CODE_TEXT } from '../../src/pairing/pairing';
import { PairHost, type HostDeps } from '../../src/ui/PairHost';
import { hasVerdictWord } from '../ui/verdict';
import { answerText, FakePeer, lastPeer, makePeer } from './fakeRtc';

const stream = {} as MediaStream;
let onScanText: (text: string) => void;
let peersWhenCameraStarted = -1;
let deps: { [K in keyof HostDeps]: ReturnType<typeof vi.fn> } & HostDeps;
const stopScan = vi.fn();

beforeEach(() => {
  FakePeer.reset();
  stopScan.mockReset();
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  deps = {
    startCamera: vi.fn(async () => {
      peersWhenCameraStarted = FakePeer.all.length;
      return { ok: true as const, stream };
    }),
    stopCamera: vi.fn(),
    startScan: vi.fn((_video: HTMLVideoElement, onText: (t: string) => void) => {
      onScanText = onText;
      return stopScan;
    }),
  } as typeof deps;
});
afterEach(cleanup);

function Harness({ onDone = vi.fn(), onSkip = vi.fn(), pairing }: { onDone?: () => void; onSkip?: () => void; pairing: ReturnType<typeof createPairing> }) {
  const view = useSyncExternalStore(pairing.subscribe, pairing.getView);
  return <PairHost pairing={pairing} view={view} onDone={onDone} onSkip={onSkip} deps={deps} />;
}
const setup = (extra: { onDone?: () => void; onSkip?: () => void } = {}) => {
  const pairing = createPairing({ createPeer: makePeer });
  const view = render(<Harness pairing={pairing} {...extra} />);
  return { pairing, ...view };
};
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const secretOfOffer = (pairing: ReturnType<typeof createPairing>) => {
  const r = decodeOffer(pairing.getView().offerText!);
  if (!r.ok) throw new Error('offer');
  return r.value.secret;
};
async function toOffer() {
  const s = setup();
  press('Start pairing');
  await screen.findByRole('img', { name: 'Pairing code of this laptop' });
  return s;
}

describe('PairHost', () => {
  // L3-02: a second phone that takes the same offer can stop the first pairing. The transport cannot ignore it, so the screen says it.
  it('tells the person to use one phone only, next to the laptop code', async () => {
    await toOffer();
    expect(screen.getByText(/Use one phone only\./)).toBeInTheDocument();
  });

  it('starts with the heading in focus, two plain lines and two buttons', () => {
    setup();
    const h1 = screen.getByRole('heading', { level: 1, name: 'Add a second camera' });
    expect(h1).toHaveFocus();
    expect(screen.getByText(/never sends video or pictures/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start pairing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip, use one camera' })).toBeInTheDocument();
  });

  it('asks for the camera first, then shows the code and starts the scan', async () => {
    const { pairing } = await toOffer();
    expect(deps.startCamera).toHaveBeenCalledTimes(1);
    expect(deps.startScan).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for the phone');
    expect(screen.getByLabelText('Code as text')).toHaveValue(pairing.getView().offerText);
    expect(peersWhenCameraStarted).toBe(0); // the camera starts before the peer connection exists
  });

  it('pairs when the scan reads the code of the phone, then stops the scan and the camera', async () => {
    const { pairing } = await toOffer();
    const secret = secretOfOffer(pairing);
    await act(async () => onScanText(answerText(secret)));
    expect(screen.getByRole('status')).toHaveTextContent('Connecting to the phone');
    act(() => lastPeer().channels[0]!.receive(JSON.stringify(makeHello(secret))));
    expect(screen.getByRole('status')).toHaveTextContent('Connected');
    expect(stopScan).toHaveBeenCalled();
    expect(deps.stopCamera).toHaveBeenCalledTimes(1);
  });

  it('gives Continue only after the phone is connected, and Continue calls onDone', async () => {
    const onDone = vi.fn();
    const pairing = createPairing({ createPeer: makePeer });
    render(<Harness pairing={pairing} onDone={onDone} />);
    press('Start pairing');
    await screen.findByRole('img', { name: 'Pairing code of this laptop' });
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    const secret = secretOfOffer(pairing);
    await act(async () => onScanText(answerText(secret)));
    act(() => lastPeer().channels[0]!.receive(JSON.stringify(makeHello(secret))));
    press('Continue');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('takes the phone code from pasted text', async () => {
    const { pairing } = await toOffer();
    const box = screen.getByLabelText('Or paste the phone code');
    const use = screen.getByRole('button', { name: 'Use this code' });
    expect(use).toBeDisabled();
    fireEvent.change(box, { target: { value: answerText(secretOfOffer(pairing)) } });
    expect(use).toBeEnabled();
    await act(async () => fireEvent.click(use));
    expect(screen.getByRole('status')).toHaveTextContent('Connecting to the phone');
  });

  it('says that a code is not the phone code and keeps the offer', async () => {
    await toOffer();
    fireEvent.change(screen.getByLabelText('Or paste the phone code'), { target: { value: 'hello' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Use this code' })));
    expect(screen.getByRole('alert')).toHaveTextContent(INVALID_CODE_TEXT);
    expect(screen.getByRole('img', { name: 'Pairing code of this laptop' })).toBeInTheDocument();
  });

  it('shows the fixed text for a wrong secret and offers Try again and one camera', async () => {
    await toOffer();
    await act(async () => onScanText(answerText(new Uint8Array(16).fill(5))));
    expect(screen.getByRole('alert')).toHaveTextContent(FALLBACK_TEXT);
    expect(screen.queryByRole('img', { name: 'Pairing code of this laptop' })).toBeNull();
    expect(deps.stopCamera).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Continue with one camera' })).toBeInTheDocument();
  });

  it('starts again from the beginning on Try again', async () => {
    await toOffer();
    await act(async () => onScanText(answerText(new Uint8Array(16).fill(5))));
    press('Try again');
    expect(screen.getByRole('button', { name: 'Start pairing' })).toBeInTheDocument();
    press('Start pairing');
    await screen.findByRole('img', { name: 'Pairing code of this laptop' });
    expect(FakePeer.all).toHaveLength(2);
  });

  it('still shows the code when the camera is blocked, and says why', async () => {
    deps.startCamera.mockResolvedValue({ ok: false, error: { kind: 'permission-denied', message: 'Camera access was blocked.' } });
    setup();
    press('Start pairing');
    await screen.findByRole('img', { name: 'Pairing code of this laptop' });
    expect(screen.getByRole('alert')).toHaveTextContent('Camera access was blocked.');
    expect(deps.startScan).not.toHaveBeenCalled();
  });

  it('keeps one camera on Skip: stops everything and calls onSkip', async () => {
    const onSkip = vi.fn();
    const { pairing } = (() => {
      const p = createPairing({ createPeer: makePeer });
      render(<Harness pairing={p} onSkip={onSkip} />);
      return { pairing: p };
    })();
    press('Start pairing');
    await screen.findByRole('img', { name: 'Pairing code of this laptop' });
    press('Skip, use one camera');
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(pairing.getView().status).toBe('skipped');
    expect(stopScan).toHaveBeenCalled();
    expect(deps.stopCamera).toHaveBeenCalled();
    expect(lastPeer().closed).toBe(true);
  });

  it('skips from the first screen without a camera', () => {
    const onSkip = vi.fn();
    setup({ onSkip });
    press('Skip, use one camera');
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(deps.startCamera).not.toHaveBeenCalled();
    expect(deps.stopCamera).not.toHaveBeenCalled();
  });

  it('stops the scan and the camera when the screen goes away', async () => {
    const { unmount } = await toOffer();
    unmount();
    expect(stopScan).toHaveBeenCalled();
    expect(deps.stopCamera).toHaveBeenCalled();
  });

  it('moves the focus to the heading when the state changes', async () => {
    await toOffer();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('uses no verdict word, no inline style and labelled fields in every state', async () => {
    const { container, pairing } = await toOffer();
    const check = (where: string) => {
      const text = document.body.textContent ?? '';
      expect(hasVerdictWord(text), `${where}: ${text}`).toBeNull();
      expect(container.querySelectorAll('[style]'), where).toHaveLength(0);
      container.querySelectorAll('textarea').forEach((t) => expect(t.id && container.querySelector(`label[for="${t.id}"]`), where).toBeTruthy());
    };
    check('offer');
    await act(async () => onScanText(answerText(secretOfOffer(pairing))));
    check('connecting');
    act(() => lastPeer().channels[0]!.receive(JSON.stringify(makeHello(secretOfOffer(pairing) ?? new Uint8Array(16)))));
    check('after hello');
  });

  it('shows a video element for the scan only, with a label and no controls', async () => {
    const { container } = await toOffer();
    const videos = container.querySelectorAll('video');
    expect(videos).toHaveLength(1);
    expect(videos[0]!.getAttribute('aria-label')).toBe('Camera view for the phone code');
    await waitFor(() => expect(videos[0]!.muted).toBe(true));
  });

  it('shows the camera view in step 2 and scans from that same element, so the person can aim the phone screen', async () => {
    await toOffer();
    const view = screen.getByLabelText('Camera view for the phone code') as HTMLVideoElement;
    expect(view.srcObject).toBe(stream);
    expect(deps.startScan.mock.calls[0]![0]).toBe(view);
  });

  it('shows no camera view and starts no scan when the camera is blocked', async () => {
    deps.startCamera.mockResolvedValue({ ok: false, error: { kind: 'permission-denied', message: 'Camera access was blocked.' } });
    setup();
    press('Start pairing');
    await screen.findByRole('img', { name: 'Pairing code of this laptop' });
    expect((screen.getByLabelText('Camera view for the phone code') as HTMLVideoElement).srcObject ?? null).toBeNull(); // jsdom has no srcObject until it is set
    expect(deps.startScan).not.toHaveBeenCalled();
  });
});
