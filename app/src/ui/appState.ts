// Navigation by state, not by URL. This reducer is pure.
// Rule (FR5): Setup and Session open only after a red-flag check was cleared in this run.
// A direct request for them goes to the red-flag screen.
// Rule (FR11): Stop and "knee gave way or hurts" both end the session and go to Summary.

import type { Side } from '../lib/angle';
import type { BaselineSource } from '../lib/baseline';
import { initialScreen, type ScreenId } from '../lib/flow';
import type { Summary } from '../lib/exercises';
import type { SetsState } from '../lib/sets';
import type { FrontRecord } from '../lib/views';
import type { Exercise, Mode } from '../lib/protocol';
import type { PlanDraft } from '../lib/planView';

export type { PlanDraft };
export type ExerciseKind = Exercise['kind'];
export type EndReason = 'stop' | 'gave-way';

/** The counter summary with the set data of the run. Session adds `sets`. Summary reads it. */
export interface RunSummary extends Summary {
  sets?: SetsState;
  /** T12b: the front-view record of the second camera. It goes to the clinician record only. Absent: one camera. */
  front?: FrontRecord;
  /** F1: where the resting angle came from. Absent when the exercise has no rep counter or no angle was set. */
  baselineSource?: BaselineSource;
}

export interface RunResult {
  reason: EndReason;
  summary: RunSummary;
}

export interface AppState {
  screen: ScreenId;
  hasProtocol: boolean;
  mode: Mode; // FR22a: in patient mode the care team view stays closed
  redFlagCleared: boolean;
  redFlagBlocks: number; // blocks in this run. They go into the session record.
  exercise: ExerciseKind | null;
  // T17: the answers of Setup. They last for one session. They never change the protocol side or the active phase.
  exerciseLeg: Side | null; // the leg that the person chose. The pipeline tracks exactly this leg.
  cameraSide: Side | null; // the side of the person that the camera is on
  baselineDeg: number | null; // resting flexion measured in Setup. null: none measured.
  run: RunResult | null;
  draft: PlanDraft | null;
}

export type Action =
  | { type: 'open'; screen: ScreenId }
  | { type: 'privacy-seen' }
  | { type: 'protocol-loaded' }
  | { type: 'choose-exercise'; exercise: ExerciseKind }
  | { type: 'red-flags-clear' }
  | { type: 'red-flags-blocked' }
  | { type: 'setup-done'; exerciseLeg: Side; cameraSide: Side; baselineDeg: number | null }
  | { type: 'session-end'; reason: EndReason; summary: RunSummary }
  | { type: 'draft'; draft: PlanDraft }
  | { type: 'plan-accepted' }
  | { type: 'plan-kept' }
  | { type: 'erased' }
  | { type: 'finish' };

export function initialAppState(flags: { seenPrivacy: boolean; hasProtocol: boolean; mode?: Mode }): AppState {
  return {
    screen: initialScreen(flags),
    hasProtocol: flags.hasProtocol,
    mode: flags.mode ?? 'demo',
    redFlagCleared: false,
    redFlagBlocks: 0,
    exercise: null,
    exerciseLeg: null,
    cameraSide: null,
    baselineDeg: null,
    run: null,
    draft: null,
  };
}

const PLAN_FLOW: readonly ScreenId[] = ['onboarding', 'plan', 'confirm', 'referral'];

/** Where a request for `target` really goes. */
function resolve(state: AppState, target: ScreenId): ScreenId {
  // The companion screen needs no protocol and no red-flag check. The phone only sends landmark numbers (T12b).
  if (target === 'privacy' || target === 'load' || target === 'companion') return target;
  const fallback: ScreenId = state.hasProtocol ? 'home' : 'load';
  // The plan flow needs no stored protocol. Patient mode has no flow: a plan that the app made cannot load there.
  switch (target) {
    case 'onboarding':
      return state.mode === 'patient' ? 'load' : target;
    case 'plan':
      return state.mode !== 'patient' && state.draft?.kind === 'plan' && state.draft.origin === 'create' ? target : fallback;
    case 'confirm':
      return state.mode !== 'patient' && state.draft?.kind === 'plan' ? target : fallback;
    case 'referral':
      return state.draft?.kind === 'referral' ? target : fallback;
  }
  if (!state.hasProtocol) return 'load';
  switch (target) {
    case 'update':
      return state.mode === 'patient' ? 'home' : target;
    case 'home':
    case 'redflag':
    case 'dashboard':
    case 'data':
      return target;
    case 'clinician':
      // The care team view opens from My data only, and never in patient mode (FR22a).
      if (state.mode === 'patient') return state.screen === 'data' ? 'data' : 'home';
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
      return {
        ...state,
        screen,
        redFlagCleared: screen === 'setup' || screen === 'session' ? state.redFlagCleared : false,
        draft: PLAN_FLOW.includes(screen) ? state.draft : null,
      };
    }
    case 'privacy-seen':
      return { ...state, screen: initialScreen({ seenPrivacy: true, hasProtocol: state.hasProtocol }) };
    case 'protocol-loaded':
      return { ...state, hasProtocol: true, screen: 'home', draft: null };
    case 'choose-exercise': {
      // Every start goes through the check, even if an earlier check was cleared.
      const next = { ...state, exercise: action.exercise, redFlagCleared: false, exerciseLeg: null, cameraSide: null, baselineDeg: null };
      return { ...next, screen: resolve(next, 'redflag') };
    }
    case 'red-flags-clear': {
      const next = { ...state, redFlagCleared: true };
      return { ...next, screen: resolve(next, 'setup') };
    }
    case 'setup-done': {
      if (state.screen !== 'setup') return state;
      const next = { ...state, exerciseLeg: action.exerciseLeg, cameraSide: action.cameraSide, baselineDeg: action.baselineDeg };
      return { ...next, screen: resolve(next, 'session') };
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
    case 'draft': {
      if (state.mode === 'patient') return state;
      const d = action.draft;
      return { ...state, draft: d, screen: d.kind === 'referral' ? 'referral' : d.origin === 'create' ? 'plan' : 'confirm' };
    }
    case 'plan-accepted':
      return { ...state, hasProtocol: true, draft: null, screen: 'home', redFlagCleared: false, run: null };
    case 'plan-kept':
      return { ...state, draft: null, screen: state.hasProtocol ? 'home' : 'load' };
    case 'erased':
      // Erase clears the privacy flag and the protocol, so the next start is a first start (FR16, FR26).
      return initialAppState({ seenPrivacy: false, hasProtocol: false, mode: state.mode });
    case 'finish':
      return {
        ...state,
        screen: 'home',
        run: null,
        exercise: null,
        redFlagCleared: false,
        redFlagBlocks: 0,
        exerciseLeg: null,
        cameraSide: null,
        baselineDeg: null,
      };
  }
}
