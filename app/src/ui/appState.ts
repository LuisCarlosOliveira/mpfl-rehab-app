// Navigation by state, not by URL. This reducer is pure.
// Rule (FR5): Setup and Session open only after a red-flag check was cleared in this run.
// A direct request for them goes to the red-flag screen.
// Rule (FR11): Stop and "knee gave way or hurts" both end the session and go to Summary.

import type { Side } from '../lib/angle';
import type { BaselineSource } from '../lib/baseline';
import { initialScreen, type ScreenId } from '../lib/flow';
import type { Summary } from '../lib/exercises';
import type { SetsState } from '../lib/sets';
import type { EngineData } from '../lib/monitor/modes';
import type { FrontRecord } from '../lib/views';
import type { Mode, PlanExercise } from '../lib/protocol';
import type { PlanDraft } from '../lib/planView';

export type { PlanDraft };
/** Every kind that a plan can start: the four with numbers and the five new ones. */
export type ExerciseKind = PlanExercise['kind'];
export type EndReason = 'stop' | 'gave-way';

/** The counter summary with the set data of the run. Session adds `sets`. Summary reads it. */
export interface RunSummary extends Summary {
  sets?: SetsState;
  /** T12b: the front-view record of the second camera. It goes to the clinician record only. Absent: one camera. */
  front?: FrontRecord;
  /** F1: where the resting angle came from. Absent when the exercise has no rep counter or no angle was set. */
  baselineSource?: BaselineSource;
  /** The five new kinds: holdList, timedBy, reportKey, reportValue from pipeline.engineData(). Absent for the four old kinds. */
  engine?: EngineData;
}

export interface RunResult {
  reason: EndReason;
  summary: RunSummary;
  /** The write of the record at the end of the run. It gives the id of the record, or rejects when the write fails. Absent: no write was tried. */
  record?: Promise<number>;
}

/** Today's session. `kinds` is the list in plan order. `entries` holds one entry for each exercise that is past: its run, or null when the person skipped it. */
export interface PlanEntry {
  kind: ExerciseKind;
  run: RunResult | null;
}
export interface PlanRun {
  kinds: readonly ExerciseKind[];
  index: number;
  entries: readonly PlanEntry[];
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
  /** Today's session. null: a single exercise or no session. While it is set, the cleared check stays for the screens of the session. */
  plan: PlanRun | null;
  draft: PlanDraft | null;
  /** Set when the privacy notice opens from My data. "I understand" then returns there. */
  privacyFrom?: 'data';
}

export type Action =
  | { type: 'open'; screen: ScreenId }
  | { type: 'privacy-seen' }
  | { type: 'protocol-loaded' }
  | { type: 'choose-exercise'; exercise: ExerciseKind }
  | { type: 'start-session'; kinds: ExerciseKind[] }
  | { type: 'plan-continue' } // Done step: the run is kept, the next exercise opens
  | { type: 'plan-skip' } // Next card: the exercise is passed over
  | { type: 'plan-stop' } // Next card or Done step: the session ends here
  | { type: 'red-flags-clear' }
  | { type: 'red-flags-blocked' }
  | { type: 'setup-done'; exerciseLeg: Side; cameraSide: Side; baselineDeg: number | null }
  | { type: 'session-end'; reason: EndReason; summary: RunSummary; record?: Promise<number> }
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
    plan: null,
    draft: null,
  };
}

/** The screens where a cleared check stays while today's session runs. */
const SESSION_SCREENS: readonly ScreenId[] = ['setup', 'session', 'summary', 'next'];

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
    case 'progress':
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
    case 'next':
    case 'overview':
      return state.plan === null ? 'home' : target;
  }
}

/** The exercise after `entry` goes in the list. The next card opens, or the summary when none is left or `stop` is set. */
function advance(state: AppState, entry: PlanEntry | null, stop: boolean): AppState {
  const plan = state.plan;
  if (plan === null) return state;
  const entries = entry === null ? plan.entries : [...plan.entries, entry];
  const index = plan.index + 1;
  const next = plan.kinds[index];
  if (stop || next === undefined) return { ...state, plan: { ...plan, entries }, run: null, redFlagCleared: false, screen: 'overview' };
  return { ...state, plan: { ...plan, index, entries }, exercise: next, run: null, baselineDeg: null, screen: 'next' };
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'open': {
      const screen = resolve(state, action.screen);
      // Leaving the flow drops the cleared check. The next start needs a new one (FR5).
      // Today's session keeps it on its own screens only. Any other screen ends the session.
      const keep = screen === 'setup' || screen === 'session' || (state.plan !== null && SESSION_SCREENS.includes(screen));
      const inSession = state.plan !== null && (SESSION_SCREENS.includes(screen) || screen === 'overview');
      return {
        ...state,
        screen,
        privacyFrom: screen === 'privacy' && state.screen === 'data' ? 'data' : undefined,
        redFlagCleared: keep ? state.redFlagCleared : false,
        plan: inSession ? state.plan : null,
        draft: PLAN_FLOW.includes(screen) ? state.draft : null,
      };
    }
    case 'privacy-seen':
      return { ...state, privacyFrom: undefined, screen: state.privacyFrom ?? initialScreen({ seenPrivacy: true, hasProtocol: state.hasProtocol }) };
    case 'protocol-loaded':
      return { ...state, hasProtocol: true, screen: 'home', draft: null };
    case 'choose-exercise': {
      // Every start goes through the check, even if an earlier check was cleared.
      const next = { ...state, plan: null, exercise: action.exercise, redFlagCleared: false, exerciseLeg: null, cameraSide: null, baselineDeg: null };
      return { ...next, screen: resolve(next, 'redflag') };
    }
    case 'start-session': {
      const first = action.kinds[0];
      if (first === undefined) return state;
      // One check for the whole session. The plan keeps the leg and the camera side from exercise to exercise.
      const next = { ...state, plan: { kinds: action.kinds, index: 0, entries: [] }, exercise: first, redFlagCleared: false, exerciseLeg: null, cameraSide: null, baselineDeg: null, run: null };
      return { ...next, screen: resolve(next, 'redflag') };
    }
    case 'plan-continue':
      return state.screen === 'summary' && state.run !== null && state.plan !== null
        ? advance(state, { kind: state.plan.kinds[state.plan.index]!, run: state.run }, state.run.reason === 'gave-way')
        : state;
    case 'plan-skip':
      return state.screen === 'next' && state.plan !== null ? advance(state, { kind: state.plan.kinds[state.plan.index]!, run: null }, false) : state;
    case 'plan-stop':
      if (state.plan === null) return state;
      if (state.screen === 'summary' && state.run !== null) return advance(state, { kind: state.plan.kinds[state.plan.index]!, run: state.run }, true);
      return state.screen === 'next' ? advance(state, null, true) : state;
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
        redFlagCleared: state.plan !== null, // a single exercise needs a new check. Today's session asks once.
        run: { reason: action.reason, summary: action.summary, record: action.record },
      };
    case 'draft': {
      if (state.mode === 'patient') return state;
      const d = action.draft;
      return { ...state, draft: d, screen: d.kind === 'referral' ? 'referral' : d.origin === 'create' ? 'plan' : 'confirm' };
    }
    case 'plan-accepted':
      return { ...state, hasProtocol: true, draft: null, screen: 'home', redFlagCleared: false, run: null, plan: null };
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
        plan: null,
        exercise: null,
        redFlagCleared: false,
        redFlagBlocks: 0,
        exerciseLeg: null,
        cameraSide: null,
        baselineDeg: null,
      };
  }
}

/** What the Back button of the browser does. A reducer action, or one of two words: the Session stops, or nothing happens. null: no screen is behind. */
export type BackStep = Action | 'stop-session' | 'stay' | null;

const HOME: Action = { type: 'open', screen: 'home' };

/**
 * F3: the Back button of the browser acts like the Back, Cancel or Stop button of the screen. It never opens a new path.
 * So it never opens Setup, Session or the red-flag screen (FR5). The app keeps no data in the history.
 * The Summary stays: a Back press must not drop a session that the person has not saved yet.
 */
export function backStep(state: AppState): BackStep {
  switch (state.screen) {
    case 'home':
      return null;
    case 'load':
    case 'privacy':
      return state.hasProtocol ? (state.screen === 'load' ? HOME : { type: 'privacy-seen' }) : null;
    case 'session':
      return 'stop-session';
    case 'summary':
      return 'stay';
    case 'next':
      return { type: 'plan-stop' };
    case 'overview':
      return { type: 'finish' };
    case 'clinician':
      return { type: 'open', screen: 'data' };
    case 'plan':
      return { type: 'open', screen: 'onboarding' };
    case 'confirm':
      return { type: 'plan-kept' };
    case 'onboarding':
    case 'referral':
      return state.hasProtocol ? HOME : { type: 'open', screen: 'load' };
    default:
      return HOME; // redflag, setup, dashboard, data, companion, update
  }
}
