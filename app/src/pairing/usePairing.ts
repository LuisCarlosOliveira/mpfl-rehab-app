// The hook for the laptop screens. One Pairing object lives as long as the component that calls the hook.
// The owner calls pairing.close() when it leaves without a connected phone. The hook does not close it,
// because React can run an effect twice in development and a closed link cannot open again.
import { useState, useSyncExternalStore } from 'react';
import { createPairing, type Pairing, type PairingView } from './pairing';

export function usePairing(): { pairing: Pairing; view: PairingView } {
  const [pairing] = useState(() => createPairing());
  const view = useSyncExternalStore(pairing.subscribe, pairing.getView);
  return { pairing, view };
}
