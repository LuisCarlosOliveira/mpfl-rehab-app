import { trustedFlag } from './trustedFlag';

const nativeType = Object.getOwnPropertyDescriptor(Event.prototype, 'type')?.get;

export function isTrustedClick(event: unknown): boolean {
  try {
    if (nativeType === undefined || nativeType.call(event) !== 'click') return false;
    return trustedFlag(event as Event);
  } catch {
    return false;
  }
}
