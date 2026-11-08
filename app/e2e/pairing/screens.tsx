// Test-only page. It mounts the two real pairing screens. It is never shipped.
// ?role=host mounts PairHost with the real WebRTC link. ?role=companion mounts PairCompanion.
// The companion gets a synthetic pose source, because the fake camera shows no person. All other code is the real code.
import '../../src/zodConfig'; // the first import, as in main.tsx
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import * as pairingLib from '../../src/lib/pairing';
import type { Landmark } from '../../src/lib/angle';
import { usePairing } from '../../src/pairing/usePairing';
import type { LandmarkSource } from '../../src/pose/source';
import { PairCompanion } from '../../src/ui/PairCompanion';
import { PairHost } from '../../src/ui/PairHost';
import '../../src/ui/styles.css';

const w = window as unknown as Record<string, unknown>;
w.lab = { pairing: pairingLib };

function syntheticSource(): LandmarkSource {
  let timer: ReturnType<typeof setInterval> | undefined;
  return {
    view: 'front',
    async start(onFrame) {
      let n = 0;
      timer = setInterval(() => {
        const pose: Landmark[] = Array.from({ length: 33 }, (_, i) => ({ x: 0.3 + (i % 5) / 20, y: 0.1 + i / 40, visibility: 0.9 }));
        onFrame(pose, performance.now() + n++ * 0);
      }, 16); // about 60 frames each second, so that the send cap shows
      return { ok: true };
    },
    stop() {
      clearInterval(timer);
      (w.__sourceStopped as number) = ((w.__sourceStopped as number) ?? 0) + 1;
    },
    aspect: () => 0.5625,
  };
}

function Host() {
  const { pairing, view } = usePairing();
  w.__pairing = pairing;
  const received: { count: number; t: number }[] = ((w.__received as typeof received) ??= []);
  useEffect(() => {
    if (view.status !== 'connected') return;
    void pairing.source().start((landmarks, t) => received.push({ count: landmarks?.length ?? 0, t }));
    return () => pairing.source().stop();
  }, [view.status, pairing, received]);
  return (
    <main className="app">
      <PairHost pairing={pairing} view={view} onDone={() => (w.__done = true)} onSkip={() => (w.__skipped = true)} />
    </main>
  );
}

const role = new URLSearchParams(location.search).get('role');
createRoot(document.getElementById('root')!).render(
  role === 'host' ? (
    <Host />
  ) : (
    <main className="app">
      <PairCompanion onExit={() => (w.__exited = true)} deps={{ createSource: syntheticSource }} />
    </main>
  ),
);
