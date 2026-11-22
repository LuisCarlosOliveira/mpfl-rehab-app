import { fromBase64Url } from './payload';
import { DEFAULT_TTL_MS, isFresh, secretsEqual } from './security';
import type { LandmarksMessage } from './messages';
import type { ParseError } from './messages';
import type { Message } from './messages';
import type { Result } from './result';

export const OFFER_TTL_MS = DEFAULT_TTL_MS; // from the display of the offer to the answer
export const HELLO_TTL_MS = 15_000; // PROPOSAL: from the answer to the first channel message. qr-pairing.md section 5 rule 3.
export const FALLBACK_TEXT = 'Could not pair. The app continues with one camera.';

export type FailCode = 'bad-secret' | 'timeout' | 'no-hello' | 'bad-message' | 'connection';

export type PairingState =
  | { kind: 'idle' }
  | { kind: 'offer-issued'; secret: Uint8Array; issuedAt: number }
  | { kind: 'waiting-hello'; secret: Uint8Array; answeredAt: number }
  | { kind: 'paired'; pairedAt: number }
  | { kind: 'failed'; code: FailCode; text: string }
  | { kind: 'closed' };

export type PairingEvent =
  | { type: 'issue-offer'; secret: Uint8Array }
  | { type: 'answer-received'; secret: Uint8Array }
  | { type: 'hello-received'; secret: Uint8Array }
  | { type: 'message-received'; result: Result<Message, ParseError> }
  | { type: 'tick' }
  | { type: 'connection-error' } // the browser reports that the peer connection or the channel failed
  | { type: 'close' };

export interface PairingStep {
  state: PairingState;
  landmarks: LandmarksMessage | null;
}

export const initialState: PairingState = { kind: 'idle' };

const to = (state: PairingState): PairingStep => ({ state, landmarks: null });
const failed = (code: FailCode): PairingStep => to({ kind: 'failed', code, text: FALLBACK_TEXT });

function checkHello(state: PairingState & { kind: 'waiting-hello' }, secret: Uint8Array, now: number): PairingStep {
  return secretsEqual(state.secret, secret) ? to({ kind: 'paired', pairedAt: now }) : failed('bad-secret');
}

function helloSecret(event: PairingEvent): Uint8Array | null {
  if (event.type === 'hello-received') return event.secret;
  if (event.type === 'message-received' && event.result.ok && event.result.value.type === 'hello') {
    return fromBase64Url(event.result.value.secret) ?? new Uint8Array(0);
  }
  return null;
}

export function pairingStep(state: PairingState, event: PairingEvent, now: number): PairingStep {
  if (state.kind === 'failed' || state.kind === 'closed') return to(state);
  if (event.type === 'close') return to({ kind: 'closed' });
  if (event.type === 'connection-error') return failed('connection');

  if (state.kind === 'offer-issued' && !isFresh(state.issuedAt, now, OFFER_TTL_MS)) return failed('timeout');
  if (state.kind === 'waiting-hello' && !isFresh(state.answeredAt, now, HELLO_TTL_MS)) return failed('timeout');

  const isRemote = event.type === 'answer-received' || event.type === 'hello-received' || event.type === 'message-received';
  switch (state.kind) {
    case 'idle':
      return event.type === 'issue-offer'
        ? to({ kind: 'offer-issued', secret: event.secret.slice(), issuedAt: now })
        : to(state);
    case 'offer-issued':
      if (event.type === 'answer-received') {
        return secretsEqual(state.secret, event.secret)
          ? to({ kind: 'waiting-hello', secret: state.secret, answeredAt: now })
          : failed('bad-secret');
      }
      return isRemote ? failed('no-hello') : to(state);
    case 'waiting-hello': {
      const secret = helloSecret(event);
      if (secret) return checkHello(state, secret, now);
      return event.type === 'message-received' ? failed('no-hello') : to(state);
    }
    case 'paired': {
      if (helloSecret(event)) return failed('bad-secret'); // the secret is spent, so a second hello is a replay
      if (event.type !== 'message-received') return to(state);
      if (!event.result.ok) return failed('bad-message');
      if (event.result.value.type === 'bye') return to({ kind: 'closed' });
      return { state, landmarks: event.result.value.type === 'landmarks' ? event.result.value : null };
    }
  }
}
