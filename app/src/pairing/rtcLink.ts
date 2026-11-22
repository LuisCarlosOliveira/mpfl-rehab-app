// One ordered data channel. No STUN server, no relay (`iceServers: []`). Landmark numbers only.
import {
  buildSdp, decodeAnswer, decodeOffer, encodeAnswer, encodeOffer, extractFields, FALLBACK_TEXT,
  makeHello, newSecret, OFFER_TTL_MS, pairingStep, parseMessage,
} from '../lib/pairing';
import type {
  DecodeError, LandmarksMessage, PairingEvent, PairingState, Result, SdpError,
} from '../lib/pairing';

export const CHANNEL_LABEL = 'mpfl';
export const GATHER_TIMEOUT_MS = 3000; // PROPOSAL: a data channel only offer gathers host candidates in well under 1 s.
export const SEND_BUFFER_LIMIT = 16_384; // PROPOSAL, bytes. The phone drops a frame while more than this waits to be sent.
const TICK_MS = 1000;

export interface LinkDeps {
  createPeer?: () => RTCPeerConnection;
  now?: () => number;
  gatherTimeoutMs?: number;
}

type LinkError = DecodeError | SdpError | 'not-ready' | 'peer-error';

// The time limits use a clock that never steps. Date.now() can step back or forward when the device syncs its time,
// and the state machine then ends a good pairing (a negative age is not fresh).
const monotonicNow = () => performance.now();

const defaultPeer = () => new RTCPeerConnection({ iceServers: [] });

/** Resolves when ICE gathering is complete, or after the timeout. The description then holds the host candidates. */
function gathered(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const done = () => {
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') done();
    };
    const timer = setTimeout(done, timeoutMs);
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

/** Stops every handler first, so that a close of our own does not look like an error. Then closes the channel and the peer. */
function teardown(pc: RTCPeerConnection | null, channel: RTCDataChannel | null, bye: boolean) {
  if (channel) {
    if (bye && channel.readyState === 'open') {
      try {
        channel.send(JSON.stringify({ type: 'bye' }));
      } catch {
        /* the channel is already gone */
      }
    }
    channel.onopen = channel.onmessage = channel.onclose = channel.onerror = null;
    channel.close();
  }
  if (pc) {
    pc.onconnectionstatechange = pc.ondatachannel = pc.onicegatheringstatechange = null;
    pc.close();
  }
}

/** Calls `leave` when the page goes away or to the background. It returns the function that removes the listeners. */
function onLeave(leave: () => void): () => void {
  const hidden = () => {
    if (document.visibilityState === 'hidden') leave();
  };
  window.addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', hidden);
  return () => {
    window.removeEventListener('pagehide', leave);
    document.removeEventListener('visibilitychange', hidden);
  };
}


export interface HostLink {
  state(): PairingState;
  subscribe(listener: (state: PairingState) => void): () => void;
  onLandmarks(listener: (message: LandmarksMessage) => void): () => void;
  /** Makes the offer text for the QR code. */
  createOffer(): Promise<Result<string, LinkError>>;
  /** Takes the answer text that the phone shows. */
  acceptAnswer(text: string): Promise<Result<true, LinkError>>;
  close(): void;
}

export function createHostLink(deps: LinkDeps = {}): HostLink {
  const { createPeer = defaultPeer, now = monotonicNow, gatherTimeoutMs = GATHER_TIMEOUT_MS } = deps;
  let state: PairingState = { kind: 'idle' };
  let pc: RTCPeerConnection | null = null;
  let channel: RTCDataChannel | null = null;
  let ticker: ReturnType<typeof setInterval> | undefined;
  let removeLeave: (() => void) | undefined;
  let busy = false; // one createOffer at a time
  const stateListeners = new Set<(s: PairingState) => void>();
  const landmarkListeners = new Set<(m: LandmarksMessage) => void>();

  const release = (bye: boolean) => {
    clearInterval(ticker);
    removeLeave?.();
    removeLeave = undefined;
    const [oldPc, oldChannel] = [pc, channel];
    pc = channel = null;
    teardown(oldPc, oldChannel, bye);
  };

  function apply(event: PairingEvent) {
    const step = pairingStep(state, event, now());
    if (step.state !== state) {
      state = step.state;
      if (state.kind === 'failed' || state.kind === 'closed') release(state.kind === 'closed');
      else if (state.kind === 'paired') clearInterval(ticker); // no time limit after pairing
      stateListeners.forEach((l) => l(state));
    }
    const { landmarks } = step;
    if (landmarks) landmarkListeners.forEach((l) => l(landmarks));
  }

  return {
    state: () => state,
    subscribe(listener) {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    onLandmarks(listener) {
      landmarkListeners.add(listener);
      return () => landmarkListeners.delete(listener);
    },

    async createOffer() {
      if (state.kind !== 'idle' || busy) return { ok: false, code: 'not-ready' };
      busy = true;
      try {
        const mine = createPeer();
        pc = mine;
        removeLeave = onLeave(() => apply({ type: 'close' }));
        const dc = mine.createDataChannel(CHANNEL_LABEL, { ordered: true });
        channel = dc;
        dc.onmessage = (e) => apply({ type: 'message-received', result: parseMessage(e.data) });
        dc.onclose = dc.onerror = () => apply({ type: 'connection-error' });
        // The phone can open its end of the channel before this end is open. A message that it sends then can be lost.
        // So the phone waits for this message. The loss was seen in 6 of 100 runs with a busy CPU.
        dc.onopen = () => dc.send(JSON.stringify({ type: 'ready' }));
        mine.onconnectionstatechange = () => {
          if (mine.connectionState === 'failed') apply({ type: 'connection-error' });
        };
        await mine.setLocalDescription(await mine.createOffer());
        await gathered(mine, gatherTimeoutMs);
        if (pc !== mine) return { ok: false, code: 'not-ready' }; // closed while we waited
        const fields = extractFields(mine.localDescription?.sdp ?? '');
        if (!fields.ok) {
          apply({ type: 'connection-error' });
          return fields;
        }
        const secret = newSecret();
        const text = encodeOffer({ ...fields.value, secret });
        apply({ type: 'issue-offer', secret });
        ticker = setInterval(() => apply({ type: 'tick' }), TICK_MS);
        return { ok: true, value: text };
      } catch {
        apply({ type: 'connection-error' });
        return { ok: false, code: 'peer-error' };
      } finally {
        busy = false;
      }
    },

    async acceptAnswer(text) {
      apply({ type: 'tick' }); // an offer older than the limit ends here, before the text is read
      if (state.kind !== 'offer-issued' || !pc) return { ok: false, code: 'not-ready' };
      const answer = decodeAnswer(text);
      if (!answer.ok) return answer; // a wrong scan is not fatal: the patient scans again
      const secret = answer.value.secret;
      apply({ type: 'answer-received', secret });
      if ((state as PairingState).kind !== 'waiting-hello' || !pc) return { ok: false, code: 'not-ready' };
      try {
        await pc.setRemoteDescription({ type: 'answer', sdp: buildSdp(answer.value, 'answer') });
      } catch {
        apply({ type: 'connection-error' });
        return { ok: false, code: 'peer-error' };
      }
      return { ok: true, value: true };
    },

    close: () => apply({ type: 'close' }),
  };
}


type CompanionState =
  | { kind: 'idle' }
  | { kind: 'answered' }
  | { kind: 'connected' }
  | { kind: 'failed'; text: string }
  | { kind: 'closed' };

export interface CompanionLink {
  state(): CompanionState;
  subscribe(listener: (state: CompanionState) => void): () => void;
  /** Takes the offer text from the laptop QR code and gives the answer text for the phone QR code. */
  acceptOffer(text: string): Promise<Result<string, LinkError>>;
  /** Sends one landmarks message. It returns false when it drops the message. */
  send(message: LandmarksMessage): boolean;
  close(): void;
}

export function createCompanionLink(deps: LinkDeps = {}): CompanionLink {
  const { createPeer = defaultPeer, now = monotonicNow, gatherTimeoutMs = GATHER_TIMEOUT_MS } = deps;
  let state: CompanionState = { kind: 'idle' };
  let pc: RTCPeerConnection | null = null;
  let channel: RTCDataChannel | null = null;
  let secret: Uint8Array | null = null;
  let answeredAt = 0;
  let ticker: ReturnType<typeof setInterval> | undefined;
  let removeLeave: (() => void) | undefined;
  const listeners = new Set<(s: CompanionState) => void>();

  const finish = (next: CompanionState) => {
    if (state.kind === 'failed' || state.kind === 'closed') return;
    const bye = next.kind === 'closed';
    state = next;
    clearInterval(ticker);
    removeLeave?.();
    removeLeave = undefined;
    secret = null;
    const [oldPc, oldChannel] = [pc, channel];
    pc = channel = null;
    teardown(oldPc, oldChannel, bye);
    listeners.forEach((l) => l(state));
  };
  const fail = () => finish({ kind: 'failed', text: FALLBACK_TEXT });

  function adopt(dc: RTCDataChannel) {
    if (channel || dc.label !== CHANNEL_LABEL) return dc.close(); // one channel only, with the agreed name
    channel = dc;
    dc.onmessage = (e) => {
      const message = parseMessage(e.data);
      if (!message.ok) return fail();
      if (message.value.type === 'bye') return finish({ kind: 'closed' });
      if (message.value.type !== 'ready' || !secret || state.kind !== 'answered') return;
      dc.send(JSON.stringify(makeHello(secret))); // the laptop end is open now, so the hello arrives
      state = { kind: 'connected' };
      clearInterval(ticker); // no time limit after pairing
      listeners.forEach((l) => l(state));
    };
    dc.onclose = dc.onerror = fail;
  }

  return {
    state: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async acceptOffer(text) {
      if (state.kind !== 'idle' || pc) return { ok: false, code: 'not-ready' }; // each link takes one offer
      const offer = decodeOffer(text);
      if (!offer.ok) return offer;
      try {
        const mine = createPeer();
        pc = mine;
        secret = offer.value.secret;
        removeLeave = onLeave(() => finish({ kind: 'closed' }));
        mine.ondatachannel = (e) => adopt(e.channel);
        mine.onconnectionstatechange = () => {
          if (mine.connectionState === 'failed') fail();
        };
        await mine.setRemoteDescription({ type: 'offer', sdp: buildSdp(offer.value, 'offer') });
        await mine.setLocalDescription(await mine.createAnswer());
        await gathered(mine, gatherTimeoutMs);
        if (pc !== mine) return { ok: false, code: 'not-ready' }; // closed while we waited
        const fields = extractFields(mine.localDescription?.sdp ?? '');
        if (!fields.ok) {
          fail();
          return fields;
        }
        const answerText = encodeAnswer({ ...fields.value, secret: offer.value.secret });
        state = { kind: 'answered' };
        answeredAt = now();
        ticker = setInterval(() => {
          if (now() - answeredAt >= OFFER_TTL_MS) fail();
        }, TICK_MS);
        listeners.forEach((l) => l(state));
        return { ok: true, value: answerText };
      } catch {
        fail();
        return { ok: false, code: 'peer-error' };
      }
    },

    send(message) {
      if (state.kind !== 'connected' || channel?.readyState !== 'open' || channel.bufferedAmount > SEND_BUFFER_LIMIT) {
        return false;
      }
      const text = JSON.stringify(message);
      if (!parseMessage(text).ok) return false; // the same schema and size cap as the host
      channel.send(text);
      return true;
    },

    close: () => finish({ kind: 'closed' }),
  };
}
