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
  'companion', // the phone as the second camera. It has no protocol and no exercise.
  'onboarding', // the questions of "Create my plan", one for each screen, then a summary
  'plan', // the plan that the app made, with "Why this plan". Nothing is saved yet.
  'referral', // the refusal: no plan, contact your care team
  'confirm', // the one step that saves a plan that the app made: Confirm or Keep my plan
  'progress', // "Check my progress": a read-only page. It saves nothing. It leads to "Update my plan".
  'next', // today's session: the card between two exercises. It opens the next one by itself after 5 seconds.
  'overview', // today's session: the list of the exercises with their numbers
  'update', // "Update my plan": the app checks the plan again and proposes. The person confirms or keeps.
] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

export function initialScreen(state: { seenPrivacy: boolean; hasProtocol: boolean }): ScreenId {
  if (!state.seenPrivacy) return 'privacy';
  return state.hasProtocol ? 'home' : 'load';
}
