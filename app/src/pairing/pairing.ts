// The laptop side of the pairing, as one small object (T12b, FR25). The Setup screen calls createPairing().
// The second view reaches the Session screen as a LandmarkSource (src/pose/source.ts), tagged `front`.
import type { Landmark } from '../lib/angle';
import { FALLBACK_TEXT } from '../lib/pairing';
import type { PairingState } from '../lib/pairing';
import type { FrameHandler, LandmarkSource, StartResult } from '../pose/source';
import { createHostLink, type HostLink, type LinkDeps } from './rtcLink';

export type PairingStatus = 'idle' | 'starting' | 'offer' | 'connecting' | 'connected' | 'failed' | 'closed' | 'skipped';

export interface PairingView {
  status: PairingStatus;
  /** The text for the laptop QR code. Set while the status is `offer` or `connecting`. */
  offerText: string | null;
  /** The fixed fallback text after a failure, or the text for a code that was not read. */
  message: string | null;
}

export interface Pairing {
  /** The same object until something changes. It works with useSyncExternalStore. */
  getView(): PairingView;
  subscribe(listener: () => void): () => void;
  /** Makes the offer. The view then holds the text for the QR code. */
  begin(): Promise<void>;
  /** Takes the text of the code that the phone shows. */
  submitAnswer(text: string): Promise<void>;
  /** The patient chose one camera. It closes the link. */
  skip(): void;
  /** Starts again from idle after a failure. */
  reset(): void;
  /** Closes the link. Call it when the screen goes away. */
  close(): void;
  /** The second view. It gives frames only while the status is `connected`. */
  source(): LandmarkSource;
}

export const INVALID_CODE_TEXT = 'This is not the code of the phone. Scan the code on the phone screen again.';
const SOURCE_NOT_PAIRED = { kind: 'other', message: 'The phone is not connected.' } as const;
const PORTRAIT_ASPECT = 9 / 16; // a phone held upright, until the first message tells the real value

/** A LandmarkSource that gives the landmarks of the phone. It uses the time of this device, not the phone clock. */
export function remoteSource(getLink: () => HostLink): LandmarkSource {
  let detach: (() => void) | null = null;
  let aspect = PORTRAIT_ASPECT;
  return {
    view: 'front',
    async start(onFrame: FrameHandler): Promise<StartResult> {
      const link = getLink();
      if (link.state().kind !== 'paired') return { ok: false, error: SOURCE_NOT_PAIRED };
      detach?.();
      detach = link.onLandmarks((message) => {
        if (message.view !== 'front') return;
        if (message.aspect) aspect = message.aspect;
        onFrame(message.landmarks as Landmark[], performance.now());
      });
      return { ok: true };
    },
    stop() {
      detach?.();
      detach = null;
    },
    aspect: () => aspect,
  };
}

export function createPairing(deps: LinkDeps = {}): Pairing {
  let link = createHostLink(deps);
  let view: PairingView = { status: 'idle', offerText: null, message: null };
  let skipped = false;
  let unsubscribe: (() => void) | null = null;
  const listeners = new Set<() => void>();
  const sourceObject = remoteSource(() => link);

  const set = (next: PairingView) => {
    view = next;
    listeners.forEach((l) => l());
  };

  function statusOf(state: PairingState): Pick<PairingView, 'status' | 'message'> {
    switch (state.kind) {
      case 'idle':
        return { status: 'starting', message: null };
      case 'offer-issued':
        return { status: 'offer', message: null };
      case 'waiting-hello':
        return { status: 'connecting', message: null };
      case 'paired':
        return { status: 'connected', message: null };
      case 'failed':
        return { status: 'failed', message: state.text };
      case 'closed':
        return { status: skipped ? 'skipped' : 'closed', message: null };
    }
  }

  function watch() {
    unsubscribe?.();
    unsubscribe = link.subscribe((state) => {
      // The text arrives right after the first state of the offer. One change of the view then covers both.
      if (state.kind === 'offer-issued' && view.offerText === null) return;
      const final = state.kind === 'failed' || state.kind === 'closed';
      set({ ...statusOf(state), offerText: final ? null : view.offerText });
    });
  }
  watch();

  return {
    getView: () => view,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async begin() {
      set({ status: 'starting', offerText: null, message: null });
      const result = await link.createOffer();
      if (result.ok) set({ status: 'offer', offerText: result.value, message: null });
      else if (view.status === 'starting') set({ status: 'failed', offerText: null, message: FALLBACK_TEXT });
    },

    async submitAnswer(text) {
      const result = await link.acceptAnswer(text);
      if (!result.ok && view.status === 'offer' && result.code !== 'not-ready') {
        set({ ...view, message: INVALID_CODE_TEXT });
      }
    },

    skip() {
      skipped = true;
      link.close();
      if (view.status !== 'skipped') set({ status: 'skipped', offerText: null, message: null });
    },

    reset() {
      link.close();
      skipped = false;
      link = createHostLink(deps);
      watch();
      set({ status: 'idle', offerText: null, message: null });
    },

    close() {
      link.close();
    },

    source: () => sourceObject,
  };
}
