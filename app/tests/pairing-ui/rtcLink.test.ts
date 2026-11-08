// The link code with a fake peer connection: state flow, time limits, failure texts and cleanup.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeAnswer, decodeOffer, FALLBACK_TEXT, HELLO_TTL_MS, makeHello, OFFER_TTL_MS } from '../../src/lib/pairing';
import {
  CHANNEL_LABEL, createCompanionLink, createHostLink, GATHER_TIMEOUT_MS, SEND_BUFFER_LIMIT,
} from '../../src/pairing/rtcLink';
import { answerText, FakeChannel, FakePeer, frontLandmarks, lastPeer, makePeer, offerFrom } from './fakeRtc';

const deps = { createPeer: makePeer };
const secretOf = (offerText: string) => {
  const r = decodeOffer(offerText);
  if (!r.ok) throw new Error('bad offer');
  return r.value.secret;
};
const failedText = (s: { kind: string }) => (s.kind === 'failed' ? (s as unknown as { text: string }).text : null);

beforeEach(() => {
  FakePeer.reset();
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function offered() {
  const link = createHostLink(deps);
  const result = await link.createOffer();
  if (!result.ok) throw new Error(result.code);
  return { link, text: result.value, peer: lastPeer(), secret: secretOf(result.value) };
}
async function waitingHello() {
  const o = await offered();
  expect((await o.link.acceptAnswer(answerText(o.secret))).ok).toBe(true);
  return o;
}
async function paired() {
  const o = await waitingHello();
  o.peer.channels[0]!.receive(JSON.stringify(makeHello(o.secret)));
  return o;
}

describe('host: offer', () => {
  it('uses no ICE server and one ordered data channel with the agreed name', async () => {
    vi.stubGlobal('RTCPeerConnection', class extends FakePeer {});
    const link = createHostLink(); // the default factory
    await link.createOffer();
    const peer = lastPeer();
    expect(peer.config).toEqual({ iceServers: [] });
    expect(peer.channels).toHaveLength(1);
    expect(peer.channels[0]!.label).toBe(CHANNEL_LABEL);
    expect(peer.channels[0]!.options).toEqual({ ordered: true });
  });

  it('gives a compact MPFL1 text with the fields of the local description', async () => {
    const { text, peer } = await offered();
    expect(text).toMatch(/^MPFL1\.[A-Za-z0-9_-]+$/);
    expect(text.length).toBeLessThanOrEqual(600);
    expect(offerFrom(peer, secretOf(text))).toBe(text);
    expect(peer.calls).toEqual(['createDataChannel', 'createOffer', 'setLocalDescription']);
  });

  it('waits for ICE gathering before it reads the description', async () => {
    FakePeer.autoGather = false;
    const link = createHostLink(deps);
    let done = false;
    const pending = link.createOffer().then((r) => ((done = true), r));
    await vi.advanceTimersByTimeAsync(GATHER_TIMEOUT_MS - 1);
    expect(done).toBe(false);
    lastPeer().finishGathering();
    expect((await pending).ok).toBe(true);
  });

  it('stops waiting for gathering after the timeout and uses what it has', async () => {
    FakePeer.autoGather = false;
    const link = createHostLink(deps);
    const pending = link.createOffer();
    await vi.advanceTimersByTimeAsync(GATHER_TIMEOUT_MS);
    expect((await pending).ok).toBe(true);
  });

  it('ends with the fixed text and closes the peer when the description has no usable candidate', async () => {
    FakePeer.candidateHost = null;
    const link = createHostLink(deps);
    expect(await link.createOffer()).toEqual({ ok: false, code: 'no-candidate' });
    expect(failedText(link.state())).toBe(FALLBACK_TEXT);
    expect(lastPeer().closed).toBe(true);
  });

  it('ends with the fixed text when the browser throws', async () => {
    const link = createHostLink({
      createPeer: () => {
        const p = new FakePeer();
        p.createOffer = () => Promise.reject(new Error('boom'));
        return p as unknown as RTCPeerConnection;
      },
    });
    expect(await link.createOffer()).toEqual({ ok: false, code: 'peer-error' });
    expect(failedText(link.state())).toBe(FALLBACK_TEXT);
    expect(lastPeer().closed).toBe(true);
  });

  it('refuses a second offer from the same link', async () => {
    const { link } = await offered();
    expect(await link.createOffer()).toEqual({ ok: false, code: 'not-ready' });
    expect(FakePeer.all).toHaveLength(1);
  });
});

describe('host: answer', () => {
  it('gives the answer to the peer as a real description and waits for the hello', async () => {
    const { link, peer, secret } = await offered();
    expect(await link.acceptAnswer(answerText(secret))).toEqual({ ok: true, value: true });
    expect(peer.remote?.type).toBe('answer');
    expect(peer.remote?.sdp).toContain('a=setup:active');
    expect(peer.remote?.sdp).toContain('typ host');
    expect(link.state().kind).toBe('waiting-hello');
  });

  it('refuses an answer with the wrong secret, ends with the fixed text and closes the peer', async () => {
    const { link, peer } = await offered();
    const wrong = new Uint8Array(16).fill(9);
    await link.acceptAnswer(answerText(wrong));
    expect(failedText(link.state())).toBe(FALLBACK_TEXT);
    expect(peer.remote).toBeNull();
    expect(peer.closed).toBe(true);
  });

  it('does not end the pairing on a text that is not a pairing answer', async () => {
    const { link, peer } = await offered();
    expect(await link.acceptAnswer('hello')).toEqual({ ok: false, code: 'bad-prefix' });
    expect(link.state().kind).toBe('offer-issued');
    expect(peer.closed).toBe(false);
  });

  it('refuses an offer text where an answer is expected', async () => {
    const { link, text } = await offered();
    expect(await link.acceptAnswer(text)).toEqual({ ok: false, code: 'bad-role' });
  });

  it('ignores a second answer (a replay)', async () => {
    const { link, peer, secret } = await waitingHello();
    const again = await link.acceptAnswer(answerText(secret));
    expect(again.ok).toBe(false);
    expect(peer.calls.filter((c) => c === 'setRemoteDescription')).toHaveLength(1);
  });

  it('refuses an answer that arrives after the offer limit and closes the peer', async () => {
    const { link, peer, secret } = await offered();
    vi.setSystemTime(1_000_000 + OFFER_TTL_MS);
    expect(await link.acceptAnswer(answerText(secret))).toEqual({ ok: false, code: 'not-ready' });
    expect(failedText(link.state())).toBe(FALLBACK_TEXT);
    expect(peer.remote).toBeNull();
    expect(peer.closed).toBe(true);
  });

  it('accepts an answer just before the offer limit', async () => {
    const { link, secret } = await offered();
    vi.setSystemTime(1_000_000 + OFFER_TTL_MS - 1);
    expect((await link.acceptAnswer(answerText(secret))).ok).toBe(true);
  });

  it('ends with the fixed text when the browser refuses the description', async () => {
    const { link, secret, peer } = await offered();
    FakePeer.failRemote = true;
    expect(await link.acceptAnswer(answerText(secret))).toEqual({ ok: false, code: 'peer-error' });
    expect(failedText(link.state())).toBe(FALLBACK_TEXT);
    expect(peer.closed).toBe(true);
  });
});

describe('host: time limits and the hello', () => {
  it('ends the offer by itself after the offer limit', async () => {
    const { link, peer } = await offered();
    await vi.advanceTimersByTimeAsync(OFFER_TTL_MS + 1000);
    expect(failedText(link.state())).toBe(FALLBACK_TEXT);
    expect(peer.closed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ends the wait for the hello after the hello limit', async () => {
    const { link, peer } = await waitingHello();
    await vi.advanceTimersByTimeAsync(HELLO_TTL_MS + 1000);
    expect(failedText(link.state())).toBe(FALLBACK_TEXT);
    expect(peer.closed).toBe(true);
  });

  it('pairs on a hello with the right secret and then has no timer', async () => {
    const { link } = await paired();
    expect(link.state().kind).toBe('paired');
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10 * OFFER_TTL_MS);
    expect(link.state().kind).toBe('paired');
  });

  it('fails on a hello with the wrong secret', async () => {
    const { link, peer } = await waitingHello();
    peer.channels[0]!.receive(JSON.stringify(makeHello(new Uint8Array(16).fill(7))));
    expect(failedText(link.state())).toBe(FALLBACK_TEXT);
    expect(peer.closed).toBe(true);
  });

  it('fails when the first message is not a hello', async () => {
    const { link, peer } = await waitingHello();
    peer.channels[0]!.receive(JSON.stringify(frontLandmarks()));
    expect(link.state().kind).toBe('failed');
  });

  it('fails when the peer connection fails', async () => {
    const { link, peer } = await waitingHello();
    peer.setConnectionState('failed');
    expect(failedText(link.state())).toBe(FALLBACK_TEXT);
  });

  it('fails when the channel closes without a bye', async () => {
    const { link, peer } = await paired();
    peer.channels[0]!.drop();
    expect(failedText(link.state())).toBe(FALLBACK_TEXT);
  });
});

describe('host: landmarks', () => {
  it('gives a checked landmarks message to the listener', async () => {
    const { link, peer } = await paired();
    const seen = vi.fn();
    link.onLandmarks(seen);
    peer.channels[0]!.receive(JSON.stringify(frontLandmarks(5)));
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0]![0]).toMatchObject({ type: 'landmarks', tMs: 5, view: 'front' });
  });

  it.each([
    ['a message with a frame field', () => JSON.stringify({ ...frontLandmarks(), frame: 'AAAA' })],
    ['a message with 34 landmarks', () => JSON.stringify({ ...frontLandmarks(), landmarks: [...frontLandmarks().landmarks, { x: 0, y: 0 }] })],
    ['a message of more than 4096 bytes', () => JSON.stringify({ ...frontLandmarks(), pad: 'x'.repeat(5000) })],
    ['a binary message', () => new ArrayBuffer(8)],
    ['text that is not JSON', () => 'nope'],
  ])('fails closed on %s and shows nothing', async (_name, make) => {
    const { link, peer } = await paired();
    const seen = vi.fn();
    link.onLandmarks(seen);
    peer.channels[0]!.receive(make());
    expect(seen).not.toHaveBeenCalled();
    expect(link.state().kind).toBe('failed');
    expect(peer.closed).toBe(true);
  });

  it('stops giving messages after the listener is removed', async () => {
    const { link, peer } = await paired();
    const seen = vi.fn();
    link.onLandmarks(seen)();
    peer.channels[0]!.receive(JSON.stringify(frontLandmarks()));
    expect(seen).not.toHaveBeenCalled();
  });

  it('closes on a bye from the phone', async () => {
    const { link, peer } = await paired();
    peer.channels[0]!.receive(JSON.stringify({ type: 'bye' }));
    expect(link.state().kind).toBe('closed');
    expect(peer.closed).toBe(true);
  });
});

describe('host: cleanup', () => {
  it('on close: sends a bye, closes the channel and the peer, clears the timer and the listeners', async () => {
    const { link, peer } = await paired();
    const channel = peer.channels[0]!;
    channel.readyState = 'open';
    link.close();
    expect(channel.sent).toContain(JSON.stringify({ type: 'bye' }));
    expect(channel.close).toHaveBeenCalled();
    expect(channel.onmessage).toBeNull();
    expect(peer.closed).toBe(true);
    expect(link.state().kind).toBe('closed');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('closes an offer that nobody answered', async () => {
    const { link, peer } = await offered();
    link.close();
    expect(peer.closed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('closes on pagehide', async () => {
    const { link, peer } = await waitingHello();
    window.dispatchEvent(new Event('pagehide'));
    expect(link.state().kind).toBe('closed');
    expect(peer.closed).toBe(true);
  });

  it('closes when the tab becomes hidden', async () => {
    const { link, peer } = await waitingHello();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    expect(link.state().kind).toBe('closed');
    expect(peer.closed).toBe(true);
  });

  it('removes the page listeners after the end', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { link } = await offered();
    link.close();
    const pagehide = (spy: typeof add) => spy.mock.calls.filter((c) => c[0] === 'pagehide').length;
    expect(pagehide(add)).toBe(1);
    expect(pagehide(remove)).toBe(1);
    add.mockRestore();
    remove.mockRestore();
  });

  it('tells the listener about each change of state', async () => {
    const link = createHostLink(deps);
    const kinds: string[] = [];
    link.subscribe((s) => kinds.push(s.kind));
    const r = await link.createOffer();
    if (!r.ok) throw new Error('offer');
    await link.acceptAnswer(answerText(secretOf(r.value)));
    lastPeer().channels[0]!.receive(JSON.stringify(makeHello(secretOf(r.value))));
    link.close();
    expect(kinds).toEqual(['offer-issued', 'waiting-hello', 'paired', 'closed']);
  });
});

describe('companion', () => {
  async function answeredLink() {
    const host = await offered();
    const link = createCompanionLink({ createPeer: makePeer });
    const result = await link.acceptOffer(host.text);
    if (!result.ok) throw new Error(result.code);
    return { host, link, peer: lastPeer(), answer: result.value };
  }
  const open = (peer: FakePeer, label = CHANNEL_LABEL) => {
    const channel = new FakeChannel(label);
    peer.ondatachannel?.({ channel });
    return channel;
  };

  it('gives the offer to the peer and returns an answer text with the secret of the offer', async () => {
    const { host, peer, answer } = await answeredLink();
    expect(peer.remote?.type).toBe('offer');
    expect(peer.remote?.sdp).toContain('a=setup:actpass');
    const decoded = decodeAnswer(answer);
    expect(decoded.ok && Array.from(decoded.value.secret)).toEqual(Array.from(host.secret));
    expect(peer.calls).toEqual(['setRemoteDescription', 'createAnswer', 'setLocalDescription']);
  });

  it('refuses a text that is not an offer and creates no peer', async () => {
    const link = createCompanionLink({ createPeer: makePeer });
    expect(await link.acceptOffer('MPFL1.abc')).toMatchObject({ ok: false });
    expect(FakePeer.all).toHaveLength(0);
    expect(link.state().kind).toBe('idle');
  });

  it('takes one offer only (a replayed offer is refused)', async () => {
    const { host, link } = await answeredLink();
    expect(await link.acceptOffer(host.text)).toEqual({ ok: false, code: 'not-ready' });
    expect(FakePeer.all).toHaveLength(2); // the host peer and the first companion peer
  });

  it('sends the hello with the secret when the channel opens, and is connected', async () => {
    const { host, link } = await answeredLink();
    const channel = open(lastPeer());
    channel.open();
    expect(channel.sent).toEqual([JSON.stringify(makeHello(host.secret))]);
    expect(link.state().kind).toBe('connected');
    host.link.close(); // the host has its own timer
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sends a landmarks message only when connected', async () => {
    const { link, peer } = await answeredLink();
    expect(link.send(frontLandmarks())).toBe(false);
    const channel = open(peer);
    channel.open();
    expect(link.send(frontLandmarks(3))).toBe(true);
    expect(JSON.parse(channel.sent[1]!)).toMatchObject({ type: 'landmarks', tMs: 3, view: 'front' });
  });

  it('keeps a full message below the cap of 4096 bytes', async () => {
    expect(new TextEncoder().encode(JSON.stringify(frontLandmarks(1_234_567_890))).length).toBeLessThan(2500);
  });

  it('drops a message while too much data waits in the channel', async () => {
    const { link, peer } = await answeredLink();
    const channel = open(peer);
    channel.open();
    channel.bufferedAmount = SEND_BUFFER_LIMIT + 1;
    expect(link.send(frontLandmarks())).toBe(false);
    channel.bufferedAmount = SEND_BUFFER_LIMIT;
    expect(link.send(frontLandmarks())).toBe(true);
  });

  it('drops a message that the schema refuses', async () => {
    const { link, peer } = await answeredLink();
    const channel = open(peer);
    channel.open();
    const sentBefore = channel.sent.length;
    expect(link.send({ ...frontLandmarks(), frame: 'AAAA' } as never)).toBe(false);
    expect(link.send({ ...frontLandmarks(), landmarks: [] } as never)).toBe(false);
    expect(channel.sent).toHaveLength(sentBefore);
  });

  it('ignores a channel with another name and a second channel', async () => {
    const { peer } = await answeredLink();
    const other = open(peer, 'other');
    expect(other.closed).toBe(true);
    const first = open(peer);
    const second = open(peer);
    expect(first.closed).toBe(false);
    expect(second.closed).toBe(true);
  });

  it('ends with the fixed text when no channel opens within the limit', async () => {
    const { link, peer } = await answeredLink();
    await vi.advanceTimersByTimeAsync(OFFER_TTL_MS + 1000);
    expect(failedText(link.state())).toBe(FALLBACK_TEXT);
    expect(peer.closed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('closes on a bye and ends with the fixed text when the channel drops', async () => {
    const a = await answeredLink();
    const channel = open(a.peer);
    channel.open();
    channel.receive(JSON.stringify({ type: 'bye' }));
    expect(a.link.state().kind).toBe('closed');
    FakePeer.reset();
    const b = await answeredLink();
    const channelB = open(b.peer);
    channelB.open();
    channelB.drop();
    expect(failedText(b.link.state())).toBe(FALLBACK_TEXT);
  });

  it('on close: sends a bye, closes the channel and the peer and clears the timer', async () => {
    const { host, link, peer } = await answeredLink();
    host.link.close(); // the host has its own timer
    const channel = open(peer);
    channel.open();
    link.close();
    expect(channel.sent).toContain(JSON.stringify({ type: 'bye' }));
    expect(channel.closed).toBe(true);
    expect(peer.closed).toBe(true);
    expect(link.send(frontLandmarks())).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('closes on pagehide', async () => {
    const { link, peer } = await answeredLink();
    window.dispatchEvent(new Event('pagehide'));
    expect(link.state().kind).toBe('closed');
    expect(peer.closed).toBe(true);
  });
});

describe('the source of rtcLink', () => {
  const source = readFileSync('src/pairing/rtcLink.ts', 'utf8');
  it.each(['addTrack', 'addTransceiver', 'getUserMedia', 'captureStream', 'getDisplayMedia', 'toBlob', 'toDataURL', 'MediaRecorder', 'iceServers: [{'])(
    'has no %s',
    (word) => expect(source).not.toContain(word),
  );
  it('uses an empty list of ICE servers', () => expect(source).toContain('iceServers: []'));
});
