import type { Phase, Protocol } from './schema';

type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

export interface ProtocolStore {
  readonly protocol: DeepReadonly<Protocol>;
  readonly activePhase: Phase;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

export function createProtocolStore(protocol: Protocol): ProtocolStore {
  const frozen = deepFreeze(structuredClone(protocol));
  return Object.freeze({
    protocol: frozen as DeepReadonly<Protocol>,
    activePhase: frozen.activePhase,
  });
}
