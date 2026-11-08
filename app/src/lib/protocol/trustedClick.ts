// The check that a value is a real click from a person.

import { trustedFlag } from './trustedFlag';

// The native getter of `type` only works on a real event. A plain object, a copy of the prototype and a Proxy all throw.
// So `trustedFlag` reads the isTrusted field only from a real event, where the browser makes the field read-only.
const nativeType = Object.getOwnPropertyDescriptor(Event.prototype, 'type')?.get;

export function isTrustedClick(event: unknown): boolean {
  try {
    if (nativeType === undefined || nativeType.call(event) !== 'click') return false;
    return trustedFlag(event as Event);
  } catch {
    return false;
  }
}
