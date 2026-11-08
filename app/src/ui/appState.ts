// Navigation by state, not by URL. This reducer is pure.
// Rule (FR5): Setup and Session open only after a red-flag check was cleared in this run.
// A direct request for them goes to the red-flag screen.
// Rule (FR11): Stop and "knee gave way or hurts" both end the session and go to Summary.

import { initialScreen, type ScreenId } from '../lib/flow';
import type { Summary } from '../lib/exercises';
import type { Exercise } from '../lib/protocol';

export type ExerciseKind = Exercise['kind'];
export type EndReason = 'stop' | 'gave-way';

export interface RunResult {
  reason: EndReason;
  summary: Summary;
}

export interface AppState {
  screen: ScreenId;
  hasProtocol: boolean;
  redFlagCleared: boolean;
  redFlagBlocks: number; // blocks in this run. They go into the session record.
  exercise: ExerciseKind | null;
  run: RunResult | null;
}

export type Action =
  | { type: 'open'; screen: ScreenId }
  | { type: 'privacy-seen' }
  | { type: 'protocol-loaded' }
  | { type: 'choose-exercise'; exercise: ExerciseKind }
  | { type: 'red-flags-clear' }
  | { type: 'red-flags-blocked' }
  | { type: 'session-end'; reason: EndReason; summary: Summary }
  | { type: 'erased' }
  | { type: 'finish' };

export function initialAppState(flags: { seenPrivacy: boolean; hasProtocol: boolean }): AppState {
  return {
    screen: initialScreen(flags),
    hasProtocol: flags.hasProtocol,
    redFlagCleared: false,
    redFlagBlocks: 0,
    exercise: null,
    run: null,
  };
}

/** Where a request for `target` really goes. */
function resolve(state: AppState, target: ScreenId): ScreenId {
  if (target === 'privacy' || target === 'load') return target;
  if (!state.hasProtocol) return 'load';
  switch (target) {
    case 'home':
    case 'redflag':
    case 'dashboard':
    case 'data':
      return target;
    case 'clinician':
      // The care team view opens from My data only.
      return state.screen === 'data' || state.screen === 'clinician' ? target : 'home';
    case 'setup':
    case 'session':
      if (!state.redFlagCleared) return 'redflag';
      return state.exercise === null ? 'home' : target;
    case 'summary':
      return state.run === null ? 'home' : 'summary';
  }
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'open': {
      const screen = resolve(state, action.screen);
      // Leaving the flow drops the cleared check. The next start needs a new one (FR5).
      return { ...state, screen, redFlagCleared: screen === 'setup' || screen === 'session' ? state.redFlagCleared : false };
    }
    case 'privacy-seen':
      return { ...state, screen: initialScreen({ seenPrivacy: true, hasProtocol: state.hasProtocol }) };
    case 'protocol-loaded':
      return { ...state, hasProtocol: true, screen: 'home' };
    case 'choose-exercise': {
      // Every start goes through the check, even if an earlier check was cleared.
      const next = { ...state, exercise: action.exercise, redFlagCleared: false };
      return { ...next, screen: resolve(next, 'redflag') };
    }
    case 'red-flags-clear': {
      const next = { ...state, redFlagCleared: true };
      return { ...next, screen: resolve(next, 'setup') };
    }
    case 'red-flags-blocked':
      return { ...state, redFlagCleared: false, redFlagBlocks: state.redFlagBlocks + 1 };
    case 'session-end':
      if (state.screen !== 'session') return state;
      return {
        ...state,
        screen: 'summary',
        redFlagCleared: false, // the next session needs a new check
        run: { reason: action.reason, summary: action.summary },
      };
    case 'erased':
      // Erase clears the privacy flag and the protocol, so the next start is a first start (FR16, FR26).
      return initialAppState({ seenPrivacy: false, hasProtocol: false });
    case 'finish':
      return { ...state, screen: 'home', run: null, exercise: null, redFlagCleared: false, redFlagBlocks: 0 };
  }
}
