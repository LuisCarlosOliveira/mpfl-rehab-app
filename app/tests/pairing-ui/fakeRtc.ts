import { vi } from 'vitest';
import { buildSdp, encodeAnswer, encodeOffer, extractFields, type PairingFields } from '../../src/lib/pairing';

export class FakeChannel {
  readyState: RTCDataChannelState = 'connecting';
  bufferedAmount = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(readonly label: string, readonly options?: RTCDataChannelInit) {}
  send = vi.fn((text: string) => void this.sent.push(text));
  close = vi.fn(() => {
    this.closed = true;
    this.readyState = 'closed';
  });
  open() {
    this.readyState = 'open';
    this.onopen?.();
  }
  receive(data: unknown) {
    this.onmessage?.({ data });
  }
  drop() {
    this.readyState = 'closed';
    this.onclose?.();
  }
}

let counter = 0;
export const CANDIDATE_HOST = '192.168.1.20'; // secrets-check:allow private-range test value

export class FakePeer extends EventTarget {
  static all: FakePeer[] = [];
  static autoGather = true;
  static candidateHost: string | null = CANDIDATE_HOST;
  static failRemote = false;
  iceGatheringState: RTCIceGatheringState = 'new';
  connectionState: RTCPeerConnectionState = 'new';
  localDescription: { type: string; sdp: string } | null = null;
  remote: { type: string; sdp: string } | null = null;
  channels: FakeChannel[] = [];
  calls: string[] = [];
  closed = false;
  ondatachannel: ((e: { channel: unknown }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  onicegatheringstatechange: (() => void) | null = null;
  private readonly n = ++counter;

  constructor(readonly config?: RTCConfiguration) {
    super();
    FakePeer.all.push(this);
  }
  static reset() {
    FakePeer.all = [];
    FakePeer.autoGather = true;
    FakePeer.candidateHost = CANDIDATE_HOST;
    FakePeer.failRemote = false;
  }
  private sdp(role: 'offer' | 'answer') {
    const candidates = FakePeer.candidateHost ? [{ host: FakePeer.candidateHost, port: 40000 + this.n, protocol: 'udp' as const }] : [];
    const base = buildSdp(
      {
        ufrag: `uf${this.n}ab`,
        pwd: 'p'.repeat(22) + String(this.n % 10) + 'x',
        fingerprint: Uint8Array.from({ length: 32 }, (_, i) => (i * 5 + this.n) % 256),
        candidates: candidates.length ? candidates : [{ host: '10.0.0.1', port: 1, protocol: 'udp' }], // secrets-check:allow private-range test value
      },
      role,
    );
    return candidates.length ? base : base.replace(/a=candidate:.*\r\n/, '');
  }
  createDataChannel(label: string, options?: RTCDataChannelInit) {
    this.calls.push('createDataChannel');
    const channel = new FakeChannel(label, options);
    this.channels.push(channel);
    return channel;
  }
  async createOffer() {
    this.calls.push('createOffer');
    return { type: 'offer', sdp: this.sdp('offer') };
  }
  async createAnswer() {
    this.calls.push('createAnswer');
    return { type: 'answer', sdp: this.sdp('answer') };
  }
  async setLocalDescription(description: { type: string; sdp: string }) {
    this.calls.push('setLocalDescription');
    this.localDescription = description;
    this.iceGatheringState = 'gathering';
    if (FakePeer.autoGather) this.finishGathering();
  }
  async setRemoteDescription(description: { type: string; sdp: string }) {
    this.calls.push('setRemoteDescription');
    if (FakePeer.failRemote) throw new Error('bad description');
    this.remote = description;
  }
  finishGathering() {
    this.iceGatheringState = 'complete';
    this.dispatchEvent(new Event('icegatheringstatechange'));
  }
  setConnectionState(state: RTCPeerConnectionState) {
    this.connectionState = state;
    this.onconnectionstatechange?.();
  }
  close() {
    this.calls.push('close');
    this.closed = true;
    this.connectionState = 'closed';
  }
}

export const makePeer = () => new FakePeer({ iceServers: [] }) as unknown as RTCPeerConnection;
export const lastPeer = () => FakePeer.all[FakePeer.all.length - 1]!;

/** The offer text that a host would show, and its secret. */
export function offerFrom(host: FakePeer, secret: Uint8Array): string {
  const f = extractFields(host.localDescription!.sdp);
  if (!f.ok) throw new Error('no fields');
  return encodeOffer({ ...f.value, secret });
}

/** The answer text that a phone would show, for a given secret. */
export function answerText(secret: Uint8Array, over: Partial<PairingFields> = {}): string {
  const peer = new FakePeer();
  const sdp = (peer as unknown as { sdp(r: 'answer'): string }).sdp('answer');
  const f = extractFields(sdp);
  if (!f.ok) throw new Error('no fields');
  FakePeer.all.pop();
  return encodeAnswer({ ...f.value, secret, ...over });
}

export const frontLandmarks = (tMs = 1) => ({
  type: 'landmarks' as const,
  tMs,
  view: 'front' as const,
  landmarks: Array.from({ length: 33 }, (_, i) => ({ x: 0.1234, y: 0.5 + i / 100, visibility: 0.99 })),
});
