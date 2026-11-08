// The app mode and the banners. Without the build flag, the app is a prototype:
// every screen shows the prototype banner and the example protocol can load.
// With the flag, patient mode refuses the example and an unapproved protocol.
// Only a clinician review and an expert decision on the regulatory class allow the flag.

import type { Mode } from './protocol';

export const PROTOTYPE_BANNER = 'Prototype. Not for patient use.';
export const EXAMPLE_BANNER = 'EXAMPLE, NOT APPROVED';

/** `flag` is the value of VITE_PATIENT_USE_APPROVED. Only the exact text "true" turns on patient mode. */
export function appMode(flag: string | undefined): Mode {
  return flag === 'true' ? 'patient' : 'demo';
}

/** The banner texts that every screen shows. */
export function bannersFor(mode: Mode, protocolIsExample: boolean): string[] {
  const banners: string[] = [];
  if (mode === 'demo') banners.push(PROTOTYPE_BANNER);
  if (protocolIsExample) banners.push(EXAMPLE_BANNER);
  return banners;
}
