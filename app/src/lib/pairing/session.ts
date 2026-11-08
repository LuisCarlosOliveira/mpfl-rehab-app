// The pairing state machine (T12b, FR25). It is a pure function: the caller passes `now` and gets a new state.
// A state of `failed` or `closed` is final. To try again, start from `initialState`.
import { fromBase64Url } from './payload';
import { DEFAULT_TTL_MS, isFresh, secretsEqual } from './security';
import type { LandmarksMessage } from './messages';
import type { ParseError } from './messages';
import type { Message } from './messages';
import type { Result } from './result';

export const OFFER_TTL_MS = DEFAULT_TTL_MS; // from the display of the offer to the answer
export const HELLO_TTL_MS = 15_000; // PROPOSAL: from the answer to the first channel message. qr-pairing.md section 5 rule 3.
export const FALLBACK_TEXT = 'Could not pair. The app continues with one camera.';

export type FailCode = 'bad-secret' | 'timeout' | 'no-hello' | 'bad-message';

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
  | { type: 'close' };

export interface PairingStep {
  state: PairingState;
  /** Set only when the state is `paired` and a valid landmarks message came in. */
  landmarks: LandmarksMessage | null;
}

export const initialState: PairingState = { kind: 'idle' };

const to = (state: PairingState): PairingStep => ({ state, landmarks: null });
const failed = (code: FailCode): PairingStep => to({ kind: 'failed', code, text: FALLBACK_TEXT });

function checkHello(state: PairingState & { kind: 'waiting-hello' }, secret: Uint8Array, now: number): PairingStep {
  return secretsEqual(state.secret, secret) ? to({ kind: 'paired', pairedAt: now }) : failed('bad-secret');
}

/** Turns an event into a hello secret, or returns null when the event is not a hello. */
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

  if (state.kind === 'offer-issued' && !isFresh(state.issuedAt, now, OFFER_TTL_MS)) return failed('timeout');
  if (state.kind === 'waiting-hello' && !isFresh(state.answeredAt, now, HELLO_TTL_MS)) return failed('timeout');

  const isRemote = event.type === 'answer-received' || event.type === 'hello-received' || event.type === 'message-received';
  switch (state.kind) {
    case 'idle':
      // Nothing was issued, so a message from a peer has nothing to attack. Ignore it.
      return event.type === 'issue-offer'
        ? to({ kind: 'offer-issued', secret: event.secret.slice(), issuedAt: now })
        : to(state);
    case 'offer-issued':
      if (event.type === 'answer-received') {
        return secretsEqual(state.secret, event.secret)
          ? to({ kind: 'waiting-hello', secret: state.secret, answeredAt: now })
          : failed('bad-secret');
      }
      // The channel cannot be open before the answer. Data now means a stranger or a bug. Fail closed.
      return isRemote ? failed('no-hello') : to(state);
    case 'waiting-hello': {
      const secret = helloSecret(event);
      if (secret) return checkHello(state, secret, now);
      // A second answer is ignored (qr-pairing.md rule 4). The first channel message must be a hello.
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
