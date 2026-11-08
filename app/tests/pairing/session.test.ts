// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  FALLBACK_TEXT, HELLO_TTL_MS, initialState, makeHello, OFFER_TTL_MS, pairingStep, parseMessage, newSecret,
} from '../../src/lib/pairing';
import type { PairingEvent, PairingState } from '../../src/lib/pairing';
import { seeded } from './helpers';

const S = Uint8Array.from({ length: 16 }, (_, i) => i + 1);
const OTHER = Uint8Array.from({ length: 16 }, (_, i) => 100 + i);
const parsed = (v: unknown) => ({ type: 'message-received', result: parseMessage(JSON.stringify(v)) }) as const;
const helloMsg = (secret: Uint8Array) => parsed(makeHello(secret));
const lmMsg = parsed({
  type: 'landmarks', tMs: 5, view: 'front', landmarks: Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5 })),
});
const byeMsg = parsed({ type: 'bye' });
const badMsg = { type: 'message-received', result: parseMessage('nope') } as const;

const run = (events: [PairingEvent, number][], from: PairingState = initialState) =>
  events.reduce((state, [e, t]) => pairingStep(state, e, t).state, from);
const offered = () => run([[{ type: 'issue-offer', secret: S }, 0]]);
const waiting = () => run([[{ type: 'issue-offer', secret: S }, 0], [{ type: 'answer-received', secret: S }, 1000]]);
const paired = () => pairingStep(waiting(), { type: 'hello-received', secret: S }, 2000).state;
const failedCode = (s: PairingState) => (s.kind === 'failed' ? s.code : s.kind);

describe('happy path', () => {
  it('goes idle, offer-issued, waiting-hello, paired', () => {
    expect(initialState.kind).toBe('idle');
    expect(offered().kind).toBe('offer-issued');
    expect(waiting().kind).toBe('waiting-hello');
    expect(paired()).toEqual({ kind: 'paired', pairedAt: 2000 });
  });
  it('accepts the hello as a channel message too', () => {
    expect(pairingStep(waiting(), helloMsg(S), 2000).state.kind).toBe('paired');
  });
  it('does not keep the one-time value once paired', () => {
    expect(JSON.stringify(paired())).not.toContain('secret');
  });
  it('delivers a landmarks message only when paired', () => {
    const step = pairingStep(paired(), lmMsg, 3000);
    expect(step.state.kind).toBe('paired');
    expect(step.landmarks?.type).toBe('landmarks');
  });
  it('closes on bye and on close from any open state', () => {
    expect(pairingStep(paired(), byeMsg, 3000).state.kind).toBe('closed');
    for (const s of [initialState, offered(), waiting(), paired()]) {
      expect(pairingStep(s, { type: 'close' }, 5).state.kind).toBe('closed');
    }
  });
  it('copies the value, so a later change by the caller has no effect', () => {
    const mine = S.slice();
    const state = pairingStep(initialState, { type: 'issue-offer', secret: mine }, 0).state;
    mine.fill(0);
    expect(pairingStep(state, { type: 'answer-received', secret: S }, 1).state.kind).toBe('waiting-hello');
  });
});

describe('secret rules', () => {
  it('a wrong value in the answer fails with bad-secret', () => {
    expect(failedCode(pairingStep(offered(), { type: 'answer-received', secret: OTHER }, 10).state)).toBe('bad-secret');
  });
  it('a value of the wrong length fails with bad-secret', () => {
    expect(failedCode(pairingStep(offered(), { type: 'answer-received', secret: S.subarray(0, 15) }, 10).state)).toBe('bad-secret');
    expect(failedCode(pairingStep(offered(), { type: 'answer-received', secret: new Uint8Array(0) }, 10).state)).toBe('bad-secret');
  });
  it('a wrong value in the hello fails with bad-secret, as an event and as a message', () => {
    expect(failedCode(pairingStep(waiting(), { type: 'hello-received', secret: OTHER }, 2000).state)).toBe('bad-secret');
    expect(failedCode(pairingStep(waiting(), helloMsg(OTHER), 2000).state)).toBe('bad-secret');
  });
  it('a hello value that is not base64url fails with bad-secret', () => {
    const raw = { type: 'message-received', result: { ok: true, value: { type: 'hello', v: 1, secret: '!!!' } } } as const;
    expect(failedCode(pairingStep(waiting(), raw, 2000).state)).toBe('bad-secret');
  });
  it('a second hello after pairing is a reuse and fails with bad-secret, even with the right value', () => {
    expect(failedCode(pairingStep(paired(), { type: 'hello-received', secret: S }, 3000).state)).toBe('bad-secret');
    expect(failedCode(pairingStep(paired(), helloMsg(S), 3000).state)).toBe('bad-secret');
  });
  it('a second answer is ignored (it cannot break a pairing that runs)', () => {
    const w = waiting();
    expect(pairingStep(w, { type: 'answer-received', secret: OTHER }, 1500).state).toEqual(w);
    const p = paired();
    expect(pairingStep(p, { type: 'answer-received', secret: S }, 3000).state).toEqual(p);
  });
});

describe('timeouts', () => {
  const offer = (t: number) => pairingStep(offered(), { type: 'tick' }, t).state;
  it('keeps the offer one ms before the ttl and fails at exactly the ttl and one ms after', () => {
    expect(offer(OFFER_TTL_MS - 1).kind).toBe('offer-issued');
    expect(failedCode(offer(OFFER_TTL_MS))).toBe('timeout');
    expect(failedCode(offer(OFFER_TTL_MS + 1))).toBe('timeout');
  });
  it('fails an answer that arrives at the ttl, even with the right value', () => {
    expect(failedCode(pairingStep(offered(), { type: 'answer-received', secret: S }, OFFER_TTL_MS).state)).toBe('timeout');
    expect(pairingStep(offered(), { type: 'answer-received', secret: S }, OFFER_TTL_MS - 1).state.kind).toBe('waiting-hello');
  });
  const wait = (dt: number) => pairingStep(waiting(), { type: 'tick' }, 1000 + dt).state;
  it('waits for the hello 15 seconds: ok at 14999 ms, timeout at 15000 and 15001', () => {
    expect(HELLO_TTL_MS).toBe(15_000);
    expect(wait(HELLO_TTL_MS - 1).kind).toBe('waiting-hello');
    expect(failedCode(wait(HELLO_TTL_MS))).toBe('timeout');
    expect(failedCode(wait(HELLO_TTL_MS + 1))).toBe('timeout');
  });
  it('fails a hello that arrives at the hello ttl', () => {
    expect(failedCode(pairingStep(waiting(), { type: 'hello-received', secret: S }, 1000 + HELLO_TTL_MS).state)).toBe('timeout');
    expect(pairingStep(waiting(), { type: 'hello-received', secret: S }, 1000 + HELLO_TTL_MS - 1).state.kind).toBe('paired');
  });
  it('times out before it judges the secret', () => {
    expect(failedCode(pairingStep(offered(), { type: 'answer-received', secret: OTHER }, OFFER_TTL_MS).state)).toBe('timeout');
  });
  it('a clock that moves back fails closed', () => {
    expect(failedCode(pairingStep(offered(), { type: 'tick' }, -5).state)).toBe('timeout');
  });
  it('idle and paired have no timeout', () => {
    expect(pairingStep(initialState, { type: 'tick' }, 1e12).state.kind).toBe('idle');
    expect(pairingStep(paired(), { type: 'tick' }, 1e12).state.kind).toBe('paired');
  });
  it('close still wins after the ttl', () => {
    expect(pairingStep(offered(), { type: 'close' }, OFFER_TTL_MS + 1).state.kind).toBe('closed');
  });
});

describe('first message must be hello', () => {
  it.each([
    ['landmarks', lmMsg],
    ['bye', byeMsg],
    ['a message that failed to parse', badMsg],
  ])('%s as first message fails with no-hello and gives no data', (_n, event) => {
    const step = pairingStep(waiting(), event, 2000);
    expect(failedCode(step.state)).toBe('no-hello');
    expect(step.landmarks).toBeNull();
  });
  it('data before the answer fails with no-hello', () => {
    for (const e of [lmMsg, helloMsg(S), { type: 'hello-received', secret: S } as const]) {
      const step = pairingStep(offered(), e, 5);
      expect(failedCode(step.state)).toBe('no-hello');
      expect(step.landmarks).toBeNull();
    }
  });
  it('data before an offer is ignored and gives no data', () => {
    for (const e of [lmMsg, helloMsg(S), { type: 'answer-received', secret: S } as const]) {
      const step = pairingStep(initialState, e, 5);
      expect(step.state).toEqual(initialState);
      expect(step.landmarks).toBeNull();
    }
  });
  it('a landmarks message is never delivered before paired', () => {
    for (const s of [initialState, offered(), waiting()]) expect(pairingStep(s, lmMsg, 5).landmarks).toBeNull();
  });
});

describe('after pairing', () => {
  it('a message that fails to parse fails with bad-message', () => {
    expect(failedCode(pairingStep(paired(), badMsg, 3000).state)).toBe('bad-message');
  });
  it('issue-offer and tick change nothing', () => {
    const p = paired();
    expect(pairingStep(p, { type: 'issue-offer', secret: OTHER }, 3000).state).toEqual(p);
  });
  it('a landmarks event delivers the same message that was sent', () => {
    const step = pairingStep(paired(), lmMsg, 3000);
    expect(step.landmarks).toEqual(lmMsg.result.ok ? lmMsg.result.value : null);
  });
});

describe('final states', () => {
  const failedState = () => pairingStep(offered(), { type: 'answer-received', secret: OTHER }, 10).state;
  const closedState = () => pairingStep(paired(), byeMsg, 3000).state;
  const events: PairingEvent[] = [
    { type: 'issue-offer', secret: S }, { type: 'answer-received', secret: S }, { type: 'hello-received', secret: S },
    helloMsg(S), lmMsg, byeMsg, badMsg, { type: 'tick' }, { type: 'close' },
  ];
  it.each(events.map((e) => [e.type, e] as const))('failed ignores %s', (_n, e) => {
    const f = failedState();
    const step = pairingStep(f, e, 20);
    expect(step.state).toEqual(f);
    expect(step.landmarks).toBeNull();
  });
  it.each(events.map((e) => [e.type, e] as const))('closed ignores %s', (_n, e) => {
    const c = closedState();
    expect(pairingStep(c, e, 20)).toEqual({ state: { kind: 'closed' }, landmarks: null });
  });
  it('failed never moves to paired, for any event and any time', () => {
    for (const code of ['bad-secret', 'timeout', 'no-hello', 'bad-message'] as const) {
      const f: PairingState = { kind: 'failed', code, text: FALLBACK_TEXT };
      for (const e of events) expect(pairingStep(f, e, 1).state.kind).toBe('failed');
    }
  });
  it('failed always carries the text for the screen', () => {
    for (const s of [
      pairingStep(offered(), { type: 'answer-received', secret: OTHER }, 10).state,
      pairingStep(offered(), { type: 'tick' }, OFFER_TTL_MS).state,
      pairingStep(waiting(), lmMsg, 2000).state,
      pairingStep(paired(), badMsg, 3000).state,
    ]) {
      expect(s).toMatchObject({ kind: 'failed', text: 'Could not pair. The app continues with one camera.' });
    }
  });
});

describe('every event in every state', () => {
  const states = [initialState, offered(), waiting(), paired(), failedStateOf(), { kind: 'closed' } as PairingState];
  function failedStateOf(): PairingState {
    return { kind: 'failed', code: 'timeout', text: FALLBACK_TEXT };
  }
  const events: PairingEvent[] = [
    { type: 'issue-offer', secret: S }, { type: 'answer-received', secret: OTHER }, { type: 'hello-received', secret: S },
    helloMsg(S), lmMsg, byeMsg, badMsg, { type: 'tick' }, { type: 'close' },
  ];
  it('never throws and always gives a known state', () => {
    for (const s of states) {
      for (const e of events) {
        for (const t of [-1, 0, 999, 15_000, 16_001, OFFER_TTL_MS, 1e15, NaN]) {
          const step = pairingStep(s, e, t);
          expect(['idle', 'offer-issued', 'waiting-hello', 'paired', 'failed', 'closed']).toContain(step.state.kind);
        }
      }
    }
  });
  it('never gives data unless the state before and after is paired', () => {
    const rnd = seeded(9);
    for (let run = 0; run < 300; run++) {
      let s: PairingState = initialState;
      let now = 0;
      for (let i = 0; i < 12; i++) {
        now += Math.floor(rnd() * 9000);
        const e = events[Math.floor(rnd() * events.length)]!;
        const e2 = e.type === 'answer-received' && rnd() < 0.7 ? { type: 'answer-received', secret: S } as const : e;
        const before = s;
        const step = pairingStep(s, e2, now);
        if (step.landmarks) {
          expect(before.kind).toBe('paired');
          expect(step.state.kind).toBe('paired');
        }
        if (before.kind === 'failed') expect(step.state.kind).toBe('failed');
        if (before.kind !== 'waiting-hello' && step.state.kind === 'paired') expect(before.kind).toBe('paired');
        s = step.state;
      }
    }
  });
  it('works with a real random value from newSecret', () => {
    const secret = newSecret();
    const s = run([
      [{ type: 'issue-offer', secret }, 0], [{ type: 'answer-received', secret }, 1], [{ type: 'hello-received', secret }, 2],
    ]);
    expect(s.kind).toBe('paired');
  });
});

describe('connection error', () => {
  it.each([
    ['an issued offer', offered],
    ['a waiting hello', waiting],
    ['a paired link', paired],
  ])('fails with the fixed text for %s', (_name, make) => {
    const state = pairingStep(make(), { type: 'connection-error' }, 3000).state;
    expect(failedCode(state)).toBe('connection');
    expect(state).toMatchObject({ text: FALLBACK_TEXT });
  });
  it('fails an idle link too, and keeps a closed link closed', () => {
    expect(failedCode(pairingStep(initialState, { type: 'connection-error' }, 1).state)).toBe('connection');
    const closed = pairingStep(paired(), { type: 'close' }, 5).state;
    expect(pairingStep(closed, { type: 'connection-error' }, 6).state.kind).toBe('closed');
  });
});
