// The phone screen of the pairing, with a fake peer connection, a fake camera and a fake pose source.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { FALLBACK_TEXT, parseMessage } from '../../src/lib/pairing';
import { createHostLink } from '../../src/pairing/rtcLink';
import type { FrameHandler, LandmarkSource } from '../../src/pose/source';
import { COMPANION_TITLE, PairCompanion, type CompanionDeps } from '../../src/ui/PairCompanion';
import { hasVerdictWord } from '../ui/verdict';
import { FakeChannel, FakePeer, makePeer } from './fakeRtc';

const stream = {} as MediaStream;
let onScanText: (text: string) => void;
let emit: FrameHandler;
let source: LandmarkSource & { start: Mock<LandmarkSource['start']>; stop: Mock<LandmarkSource['stop']> };
let release: Mock<() => Promise<void>>;
let startCameraMock: Mock<CompanionDeps['startCamera']>;
let stopCameraMock: Mock<CompanionDeps['stopCamera']>;
let deps: CompanionDeps;
let wakeLockMock: Mock<CompanionDeps['wakeLock']>;
const stopScan = vi.fn();
let offerText = '';
let hostLink: ReturnType<typeof createHostLink>;

const pose = () => Array.from({ length: 33 }, (_, i) => ({ x: 0.5, y: 0.2 + i / 100, visibility: 0.95 }));

beforeEach(async () => {
  FakePeer.reset();
  vi.clearAllMocks();
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  hostLink = createHostLink({ createPeer: makePeer });
  const offer = await hostLink.createOffer();
  offerText = offer.ok ? offer.value : '';
  release = vi.fn(async () => undefined);
  wakeLockMock = vi.fn(async () => ({ release }));
  startCameraMock = vi.fn<CompanionDeps['startCamera']>(async () => ({ ok: true as const, stream }));
  stopCameraMock = vi.fn<CompanionDeps['stopCamera']>();
  source = {
    view: 'front',
    start: vi.fn<LandmarkSource['start']>(async (h: FrameHandler) => {
      emit = h;
      return { ok: true } as const;
    }),
    stop: vi.fn<LandmarkSource['stop']>(),
    aspect: () => 0.5625,
  };
  deps = {
    createLink: undefined as never,
    createSource: () => source,
    startCamera: startCameraMock,
    stopCamera: stopCameraMock,
    startScan: vi.fn((_v: HTMLVideoElement, onText: (t: string) => void) => {
      onScanText = onText;
      return stopScan;
    }),
    wakeLock: wakeLockMock,
    now: () => 0,
  };
  const { createCompanionLink } = await import('../../src/pairing/rtcLink');
  deps.createLink = () => createCompanionLink({ createPeer: makePeer });
});
afterEach(() => {
  hostLink.close();
  cleanup();
});

const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const show = (onExit = vi.fn()) => ({ onExit, ...render(<PairCompanion onExit={onExit} deps={deps} />) });

async function toAnswer() {
  const s = show();
  await act(async () => press('Scan the laptop code'));
  await act(async () => onScanText(offerText));
  return s;
}
const companionChannel = () => {
  const channel = new FakeChannel('mpfl');
  const peer = FakePeer.all[FakePeer.all.length - 1]!;
  peer.ondatachannel?.({ channel });
  return channel;
};
async function toRun() {
  const s = await toAnswer();
  const channel = companionChannel();
  await act(async () => channel.open());
  return { ...s, channel };
}
const sentMessages = (channel: FakeChannel) => channel.sent.map((t) => parseMessage(t)).flatMap((r) => (r.ok ? [r.value] : []));

describe('PairCompanion', () => {
  it('starts with the heading in focus and two plain lines', () => {
    show();
    expect(screen.getByRole('heading', { level: 1, name: COMPANION_TITLE })).toHaveFocus();
    expect(screen.getByText(/sends body points only/)).toBeInTheDocument();
    expect(screen.queryByText(/The screen stays on/)).toBeNull(); // no promise before the lock is granted
  });

  it('does not start the camera before the button press', () => {
    show();
    expect(startCameraMock).not.toHaveBeenCalled();
  });

  it('scans with the rear camera and shows the answer code after the laptop code is read', async () => {
    await toAnswer();
    expect(startCameraMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('img', { name: 'Pairing code of this phone' })).toBeInTheDocument();
    expect((screen.getByLabelText('Code as text') as HTMLTextAreaElement).value).toMatch(/^MPFL1\./);
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for the laptop');
    expect(stopCameraMock).toHaveBeenCalledTimes(1); // the scan camera ends after the answer exists
    expect(stopScan).toHaveBeenCalled();
  });

  it('takes the laptop code from pasted text too', async () => {
    show();
    await act(async () => press('Scan the laptop code'));
    const use = screen.getByRole('button', { name: 'Use this code' });
    expect(use).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Or paste the laptop code'), { target: { value: offerText } });
    await act(async () => fireEvent.click(use));
    expect(screen.getByRole('img', { name: 'Pairing code of this phone' })).toBeInTheDocument();
  });

  it('says that a code is not the laptop code and scans again', async () => {
    show();
    await act(async () => press('Scan the laptop code'));
    await act(async () => onScanText('hello'));
    expect(screen.getByRole('alert')).toHaveTextContent('This is not the code of the laptop');
    expect(deps.startScan).toHaveBeenCalledTimes(2);
  });

  it('shows why when the camera is blocked', async () => {
    startCameraMock.mockResolvedValue({ ok: false, error: { kind: 'permission-denied', message: 'Camera access was blocked.' } });
    show();
    await act(async () => press('Scan the laptop code'));
    expect(screen.getByRole('alert')).toHaveTextContent('Camera access was blocked.');
    expect(screen.getByLabelText('Or paste the laptop code')).toBeInTheDocument();
  });

  it('runs the pose pipeline when the channel opens, with a hidden video and a wake lock', async () => {
    const { container } = await toRun();
    expect(screen.getByRole('status')).toHaveTextContent('Connected');
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(wakeLockMock).toHaveBeenCalledTimes(1);
    const hidden = container.querySelector('video.pair-offscreen');
    expect(hidden).not.toBeNull();
    expect(source.start.mock.calls[0]![1]).toBe(hidden);
  });

  it('shows no video of the person: no visible video element in the run step', async () => {
    const { container } = await toRun();
    expect(container.querySelectorAll('video:not(.pair-offscreen)')).toHaveLength(0);
    expect(container.querySelector('video.pair-offscreen')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText(/shows no video and sends none/)).toBeInTheDocument();
  });

  it('sends landmarks only, with the front tag, and shows Sending after the first message', async () => {
    const { channel } = await toRun();
    await act(async () => emit(pose(), 1000));
    expect(screen.getByRole('status')).toHaveTextContent('Sending');
    const [hello, first] = sentMessages(channel);
    expect(hello?.type).toBe('hello');
    expect(first).toMatchObject({ type: 'landmarks', view: 'front', tMs: 1000, aspect: 0.5625 });
    const lm = (first as { landmarks: { x: number; visibility: number }[] }).landmarks;
    expect(lm.filter((l) => l.visibility > 0)).toHaveLength(6); // hips, knees and ankles
    expect(channel.sent.every((t) => !/frame|image|data:|blob/.test(t))).toBe(true);
  });

  it('sends at most 15 messages in one second from a 60 Hz camera', async () => {
    const { channel } = await toRun();
    await act(async () => {
      for (let t = 0; t < 1000; t += 1000 / 60) emit(pose(), t);
    });
    const landmarks = sentMessages(channel).filter((m) => m.type === 'landmarks');
    expect(landmarks.length).toBeLessThanOrEqual(15);
    expect(landmarks.length).toBeGreaterThanOrEqual(14);
  });

  it('sends nothing for a frame without a pose', async () => {
    const { channel } = await toRun();
    await act(async () => emit(null, 1000));
    expect(sentMessages(channel).filter((m) => m.type === 'landmarks')).toHaveLength(0);
  });

  it('Stop ends the pipeline, the link and the wake lock, and says Stopped', async () => {
    const { channel } = await toRun();
    await act(async () => press('Stop'));
    expect(source.stop).toHaveBeenCalled();
    expect(release).toHaveBeenCalled();
    expect(channel.sent).toContain(JSON.stringify({ type: 'bye' }));
    expect(channel.closed).toBe(true);
    expect(FakePeer.all[FakePeer.all.length - 1]!.closed).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('Stopped');
  });

  it('has a Stop button that is large', async () => {
    await toRun();
    expect(screen.getByRole('button', { name: 'Stop' })).toHaveClass('pair-btn-stop');
  });

  it('stops everything when the laptop sends a bye', async () => {
    const { channel } = await toRun();
    await act(async () => channel.receive(JSON.stringify({ type: 'bye' })));
    expect(source.stop).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Stopped');
  });

  it('shows the fixed text when the channel drops', async () => {
    const { channel } = await toRun();
    await act(async () => channel.drop());
    expect(screen.getByRole('alert')).toHaveTextContent(FALLBACK_TEXT);
    expect(source.stop).toHaveBeenCalled();
  });

  it('shows the message of the camera when the pose source cannot start', async () => {
    source.start.mockResolvedValue({ ok: false, error: { kind: 'other', message: 'The camera could not start.' } });
    await toRun();
    expect(screen.getByRole('alert')).toHaveTextContent('The camera could not start.');
  });

  it('works when the wake lock is not available', async () => {
    deps = { ...deps, wakeLock: async () => null };
    await toRun();
    expect(screen.getAllByRole('status').map((n) => n.textContent)).toContain('Connected');
  });

  it('stops everything when the screen goes away', async () => {
    const { unmount, channel } = await toRun();
    unmount();
    expect(source.stop).toHaveBeenCalled();
    expect(release).toHaveBeenCalled();
    expect(channel.closed).toBe(true);
  });

  it('Back on the first screen calls onExit and starts nothing', () => {
    const { onExit } = show();
    press('Back');
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(startCameraMock).not.toHaveBeenCalled();
  });

  it('uses no verdict word and no inline style in any step', async () => {
    const { container } = await toRun();
    const where = ['run'];
    for (const w of where) {
      const text = document.body.textContent ?? '';
      expect(hasVerdictWord(text), `${w}: ${text}`).toBeNull();
      expect(container.querySelectorAll('[style]')).toHaveLength(0);
    }
  });
});

describe('PairCompanion and the screen wake lock (L3-04)', () => {
  const ON = 'The screen stays on while the phone works.';
  const OFF = /Your screen could turn off\. Turn off the screen timeout in your phone settings while the phone works as the second camera\./;

  /** A sentinel like the browser one. `drop()` is the release that the browser does when the page is hidden. */
  function sentinel() {
    const listeners: Array<() => void> = [];
    const lock = {
      release: vi.fn(async () => undefined),
      addEventListener: (_type: 'release', l: () => void) => void listeners.push(l),
      drop: () => listeners.forEach((l) => l()),
    };
    return lock;
  }
  const setVisibility = (state: 'visible' | 'hidden') => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  afterEach(() => void Reflect.deleteProperty(document, 'visibilityState'));

  it('asks for the lock when the link starts, at the button press and not before', async () => {
    show();
    expect(wakeLockMock).not.toHaveBeenCalled();
    await act(async () => press('Scan the laptop code'));
    expect(wakeLockMock).toHaveBeenCalledTimes(1);
  });

  it('says that the screen stays on only after the lock was granted', async () => {
    const lock = sentinel();
    deps = { ...deps, wakeLock: vi.fn(async () => lock) };
    await toRun();
    expect(screen.getByText(ON)).toBeInTheDocument();
    expect(screen.queryByText(OFF)).toBeNull();
  });

  it('shows a plain notice and no promise when the lock was refused', async () => {
    deps = { ...deps, wakeLock: vi.fn(async () => null) };
    await toRun();
    expect(screen.getByText(OFF)).toBeInTheDocument();
    expect(screen.queryByText(ON)).toBeNull();
  });

  /** The real default of the screen: it reads `navigator.wakeLock`. The test gives the other dependencies only. */
  const withBrowserLock = () => {
    const rest: Partial<CompanionDeps> = { ...deps };
    delete rest.wakeLock;
    return render(<PairCompanion onExit={vi.fn()} deps={rest} />);
  };

  it('shows the same notice when the browser has no wake lock API', async () => {
    Reflect.deleteProperty(navigator, 'wakeLock');
    expect(navigator.wakeLock).toBeUndefined();
    withBrowserLock();
    await act(async () => press('Scan the laptop code'));
    expect(screen.getByText(OFF)).toBeInTheDocument();
  });

  it('shows the notice when the request throws', async () => {
    const request = vi.fn(async () => {
      throw new DOMException('no', 'NotAllowedError');
    });
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    withBrowserLock();
    await act(async () => press('Scan the laptop code'));
    expect(request).toHaveBeenCalledWith('screen');
    expect(screen.getByText(OFF)).toBeInTheDocument();
    Reflect.deleteProperty(navigator, 'wakeLock');
  });

  it('shows the notice when the browser releases the lock, and asks again when the page is visible', async () => {
    const first = sentinel();
    const second = sentinel();
    const ask = vi.fn<CompanionDeps['wakeLock']>().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    deps = { ...deps, wakeLock: ask };
    await toRun();
    expect(screen.getByText(ON)).toBeInTheDocument();

    await act(async () => first.drop());
    expect(screen.getByText(OFF)).toBeInTheDocument();
    expect(screen.queryByText(ON)).toBeNull();

    await act(async () => setVisibility('visible'));
    expect(ask).toHaveBeenCalledTimes(2);
    expect(screen.getByText(ON)).toBeInTheDocument();
    expect(screen.queryByText(OFF)).toBeNull();
  });

  it('asks again after a hidden page is visible again, in the scan step', async () => {
    const first = sentinel();
    const ask = vi.fn<CompanionDeps['wakeLock']>().mockResolvedValueOnce(first).mockResolvedValueOnce(sentinel());
    deps = { ...deps, wakeLock: ask };
    show();
    await act(async () => press('Scan the laptop code'));
    await act(async () => first.drop());
    await act(async () => setVisibility('hidden'));
    expect(ask).toHaveBeenCalledTimes(1); // a hidden page does not ask
    await act(async () => setVisibility('visible'));
    expect(ask).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(OFF)).toBeNull();
  });

  it('does not ask again while a lock is held', async () => {
    const ask = vi.fn(async () => sentinel());
    deps = { ...deps, wakeLock: ask };
    await toRun();
    await act(async () => setVisibility('visible'));
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('releases the lock on Stop and does not ask again afterwards', async () => {
    const lock = sentinel();
    const ask = vi.fn(async () => lock);
    deps = { ...deps, wakeLock: ask };
    await toRun();
    await act(async () => press('Stop'));
    expect(lock.release).toHaveBeenCalledTimes(1);
    await act(async () => setVisibility('visible'));
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('releases a lock that the browser grants after the person has left', async () => {
    const lock = sentinel();
    let grant: (l: typeof lock) => void = () => undefined;
    deps = { ...deps, wakeLock: () => new Promise((resolve) => (grant = resolve)) };
    const { unmount } = show();
    await act(async () => press('Scan the laptop code'));
    unmount();
    await act(async () => grant(lock));
    expect(lock.release).toHaveBeenCalledTimes(1);
  });
});
