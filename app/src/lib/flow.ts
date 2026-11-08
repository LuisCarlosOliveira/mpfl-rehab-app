// The screens of the app and which one shows first. Navigation is by state, not by URL.

export const SCREEN_IDS = [
  'privacy',
  'load',
  'home',
  'redflag',
  'setup',
  'session',
  'summary',
  'dashboard',
  'data',
  'clinician',
] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

/**
 * The first launch shows the privacy notice, whatever else is stored.
 * Then the app asks for the protocol file if none is stored, or shows Home.
 */
export function initialScreen(state: { seenPrivacy: boolean; hasProtocol: boolean }): ScreenId {
  if (!state.seenPrivacy) return 'privacy';
  return state.hasProtocol ? 'home' : 'load';
}
