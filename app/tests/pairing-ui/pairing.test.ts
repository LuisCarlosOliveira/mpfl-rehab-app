// The host side facade (createPairing) and the second view as a landmark source (remoteSource).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FALLBACK_TEXT, makeHello } from '../../src/lib/pairing';
import { createPairing, INVALID_CODE_TEXT, remoteSource } from '../../src/pairing/pairing';
import { createHostLink } from '../../src/pairing/rtcLink';
import { answerText, FakePeer, frontLandmarks, lastPeer, makePeer } from './fakeRtc';

beforeEach(() => {
  FakePeer.reset();
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});
afterEach(() => vi.useRealTimers());

const make = () => createPairing({ createPeer: makePeer });
const secretFromView = (offer: string) => {
  // the secret is inside the offer text: read it with the same decoder as the phone
  return import('../../src/lib/pairing').then(({ decodeOffer }) => {
    const r = decodeOffer(offer);
    if (!r.ok) throw new Error('offer');
    return r.value.secret;
  });
};

describe('createPairing', () => {
  it('starts idle with no text', () => {
    expect(make().getView()).toEqual({ status: 'idle', offerText: null, message: null });
  });

  it('shows the offer text after begin', async () => {
    const pairing = make();
    await pairing.begin();
    const view = pairing.getView();
    expect(view.status).toBe('offer');
    expect(view.offerText).toMatch(/^MPFL1\./);
  });

  it('goes offer, connecting, connected and tells the listener each time', async () => {
    const pairing = make();
    const seen: string[] = [];
    pairing.subscribe(() => seen.push(pairing.getView().status));
    await pairing.begin();
    const secret = await secretFromView(pairing.getView().offerText!);
    await pairing.submitAnswer(answerText(secret));
    lastPeer().channels[0]!.receive(JSON.stringify(makeHello(secret)));
    expect(seen).toEqual(['starting', 'offer', 'connecting', 'connected']);
  });

  it('keeps the offer when the scan is not a phone code and says so', async () => {
    const pairing = make();
    await pairing.begin();
    await pairing.submitAnswer('hello');
    expect(pairing.getView()).toMatchObject({ status: 'offer', message: INVALID_CODE_TEXT });
  });

  it('ends with the fixed text for a wrong secret', async () => {
    const pairing = make();
    await pairing.begin();
    await pairing.submitAnswer(answerText(new Uint8Array(16).fill(1)));
    expect(pairing.getView()).toMatchObject({ status: 'failed', message: FALLBACK_TEXT });
  });

  it('ends with the fixed text when the offer cannot be made', async () => {
    FakePeer.candidateHost = null;
    const pairing = make();
    await pairing.begin();
    expect(pairing.getView()).toMatchObject({ status: 'failed', message: FALLBACK_TEXT, offerText: null });
  });

  it('ends with the fixed text when the offer is too old', async () => {
    const pairing = make();
    await pairing.begin();
    await vi.advanceTimersByTimeAsync(121_000);
    expect(pairing.getView()).toMatchObject({ status: 'failed', message: FALLBACK_TEXT });
  });

  it('skip closes the peer and keeps one camera', async () => {
    const pairing = make();
    await pairing.begin();
    pairing.skip();
    expect(pairing.getView().status).toBe('skipped');
    expect(lastPeer().closed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reset gives a fresh link after a failure', async () => {
    const pairing = make();
    await pairing.begin();
    await pairing.submitAnswer(answerText(new Uint8Array(16).fill(1)));
    pairing.reset();
    expect(pairing.getView()).toEqual({ status: 'idle', offerText: null, message: null });
    await pairing.begin();
    expect(pairing.getView().status).toBe('offer');
    expect(FakePeer.all).toHaveLength(2);
  });

  it('close ends the link and the status is closed', async () => {
    const pairing = make();
    await pairing.begin();
    pairing.close();
    expect(pairing.getView().status).toBe('closed');
    expect(lastPeer().closed).toBe(true);
  });

  it('gives the same source object on each call, tagged as the front view', () => {
    const pairing = make();
    expect(pairing.source()).toBe(pairing.source());
    expect(pairing.source().view).toBe('front');
  });
});

describe('remoteSource', () => {
  async function pairedHost() {
    const link = createHostLink({ createPeer: makePeer });
    const offer = await link.createOffer();
    if (!offer.ok) throw new Error('offer');
    const secret = await secretFromView(offer.value);
    await link.acceptAnswer(answerText(secret));
    const channel = lastPeer().channels[0]!;
    channel.receive(JSON.stringify(makeHello(secret)));
    return { link, channel };
  }

  it('does not start while the link is not paired', async () => {
    const link = createHostLink({ createPeer: makePeer });
    const result = await remoteSource(() => link).start(vi.fn());
    expect(result).toMatchObject({ ok: false, error: { kind: 'other' } });
  });

  it('gives each landmarks message to the handler with the host time', async () => {
    const { link, channel } = await pairedHost();
    const source = remoteSource(() => link);
    const onFrame = vi.fn();
    expect(await source.start(onFrame)).toEqual({ ok: true });
    vi.setSystemTime(1_000_500);
    channel.receive(JSON.stringify(frontLandmarks(99_999)));
    expect(onFrame).toHaveBeenCalledTimes(1);
    const [landmarks, timeMs] = onFrame.mock.calls[0]!;
    expect(landmarks).toHaveLength(33);
    expect(landmarks[0]).toEqual({ x: 0.1234, y: 0.5, visibility: 0.99 });
    expect(timeMs).not.toBe(99_999); // the phone clock is not used
  });

  it('ignores a message with the side tag, because this source is the front view', async () => {
    const { link, channel } = await pairedHost();
    const source = remoteSource(() => link);
    const onFrame = vi.fn();
    await source.start(onFrame);
    channel.receive(JSON.stringify({ ...frontLandmarks(), view: 'side' }));
    expect(onFrame).not.toHaveBeenCalled();
  });

  it('stop detaches the handler and leaves the link open', async () => {
    const { link, channel } = await pairedHost();
    const source = remoteSource(() => link);
    const onFrame = vi.fn();
    await source.start(onFrame);
    source.stop();
    channel.receive(JSON.stringify(frontLandmarks()));
    expect(onFrame).not.toHaveBeenCalled();
    expect(link.state().kind).toBe('paired');
  });

  it('a second start replaces the handler', async () => {
    const { link, channel } = await pairedHost();
    const source = remoteSource(() => link);
    const first = vi.fn();
    const second = vi.fn();
    await source.start(first);
    await source.start(second);
    channel.receive(JSON.stringify(frontLandmarks()));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('reports the aspect of the phone image, or a portrait default', async () => {
    const { link, channel } = await pairedHost();
    const source = remoteSource(() => link);
    expect(source.aspect()).toBeCloseTo(9 / 16);
    await source.start(vi.fn());
    channel.receive(JSON.stringify({ ...frontLandmarks(), aspect: 4 / 3 }));
    expect(source.aspect()).toBeCloseTo(4 / 3);
  });
});
