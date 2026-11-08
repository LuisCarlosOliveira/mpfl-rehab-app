import { describe, expect, it } from 'vitest';
import { appReducer, initialAppState, type AppState, type PlanDraft, type RunResult } from '../src/ui/appState';
import { generateProtocol, type GeneratorInputs } from '../src/lib/protocolGen';
import { startSets } from '../src/lib/sets';
import type { Summary } from '../src/lib/exercises';

const summary: Summary = {
  reps: 3,
  holds: null,
  peakFlexion: 50,
  topFlexion: null,
  topState: null,
  eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 },
};

const home = (): AppState => initialAppState({ seenPrivacy: true, hasProtocol: true });

describe('initial state', () => {
  it('starts with the privacy notice on the first launch', () => {
    expect(initialAppState({ seenPrivacy: false, hasProtocol: true }).screen).toBe('privacy');
  });
  it('asks for the file when none is stored, and shows Home otherwise', () => {
    expect(initialAppState({ seenPrivacy: true, hasProtocol: false }).screen).toBe('load');
    expect(home().screen).toBe('home');
  });
});

describe('red-flag gate', () => {
  it('sends a direct request for Session to the red-flag screen', () => {
    expect(appReducer(home(), { type: 'open', screen: 'session' }).screen).toBe('redflag');
  });
  it('sends a direct request for Setup to the red-flag screen', () => {
    expect(appReducer(home(), { type: 'open', screen: 'setup' }).screen).toBe('redflag');
  });
  it('picking an exercise goes to the red-flag check first', () => {
    const s = appReducer(home(), { type: 'choose-exercise', exercise: 'heel-slide' });
    expect(s.screen).toBe('redflag');
    expect(s.exercise).toBe('heel-slide');
  });
  it('a cleared check opens Setup, then Session', () => {
    let s = appReducer(home(), { type: 'choose-exercise', exercise: 'heel-slide' });
    s = appReducer(s, { type: 'red-flags-clear' });
    expect(s.screen).toBe('setup');
    s = appReducer(s, { type: 'open', screen: 'session' });
    expect(s.screen).toBe('session');
  });
  it('a block keeps the session closed and counts the block', () => {
    let s = appReducer(home(), { type: 'choose-exercise', exercise: 'heel-slide' });
    s = appReducer(s, { type: 'red-flags-blocked' });
    expect(s.redFlagCleared).toBe(false);
    expect(s.redFlagBlocks).toBe(1);
    expect(appReducer(s, { type: 'open', screen: 'session' }).screen).toBe('redflag');
  });
  it('a cleared check without an exercise returns to Home and does not carry to the next start', () => {
    const s = appReducer(home(), { type: 'red-flags-clear' });
    expect(s.screen).toBe('home');
    expect(appReducer(s, { type: 'choose-exercise', exercise: 'mini-squat' }).screen).toBe('redflag');
  });
  it('a check is needed again after a session ends', () => {
    let s = appReducer(home(), { type: 'choose-exercise', exercise: 'heel-slide' });
    s = appReducer(s, { type: 'red-flags-clear' });
    s = appReducer(s, { type: 'open', screen: 'session' });
    s = appReducer(s, { type: 'session-end', reason: 'stop', summary });
    expect(s.redFlagCleared).toBe(false);
    expect(appReducer(s, { type: 'open', screen: 'session' }).screen).toBe('redflag');
  });
});

describe('ending a session', () => {
  const running = (): AppState => {
    let s = appReducer(home(), { type: 'choose-exercise', exercise: 'heel-slide' });
    s = appReducer(s, { type: 'red-flags-clear' });
    return appReducer(s, { type: 'open', screen: 'session' });
  };

  it('Stop goes to Summary', () => {
    const s = appReducer(running(), { type: 'session-end', reason: 'stop', summary });
    expect(s.screen).toBe('summary');
    expect(s.run).toEqual({ reason: 'stop', summary });
  });
  it('"Knee gave way or hurts" goes to Summary with that reason', () => {
    const s = appReducer(running(), { type: 'session-end', reason: 'gave-way', summary });
    expect(s.screen).toBe('summary');
    expect(s.run?.reason).toBe('gave-way');
  });
  it('ignores an end event when no session runs', () => {
    const s = home();
    expect(appReducer(s, { type: 'session-end', reason: 'stop', summary })).toBe(s);
  });
  it('Summary cannot open without a finished run', () => {
    expect(appReducer(home(), { type: 'open', screen: 'summary' }).screen).toBe('home');
  });
  it('finish returns to Home and clears the run', () => {
    let s = appReducer(running(), { type: 'session-end', reason: 'stop', summary });
    s = appReducer(s, { type: 'finish' });
    expect(s).toMatchObject({ screen: 'home', run: null, exercise: null, redFlagCleared: false, redFlagBlocks: 0 });
  });
});

describe('protocol and privacy', () => {
  it('every screen except Privacy and Load needs a protocol', () => {
    const s = initialAppState({ seenPrivacy: true, hasProtocol: false });
    expect(appReducer(s, { type: 'open', screen: 'home' }).screen).toBe('load');
    expect(appReducer(s, { type: 'open', screen: 'session' }).screen).toBe('load');
    expect(appReducer(s, { type: 'open', screen: 'privacy' }).screen).toBe('privacy');
  });
  it('a loaded protocol opens Home', () => {
    const s = appReducer(initialAppState({ seenPrivacy: true, hasProtocol: false }), { type: 'protocol-loaded' });
    expect(s).toMatchObject({ screen: 'home', hasProtocol: true });
  });
  it('after the notice, the app shows Load or Home', () => {
    expect(appReducer(initialAppState({ seenPrivacy: false, hasProtocol: false }), { type: 'privacy-seen' }).screen).toBe('load');
    expect(appReducer(initialAppState({ seenPrivacy: false, hasProtocol: true }), { type: 'privacy-seen' }).screen).toBe('home');
  });
  it('Progress and My data open from Home', () => {
    expect(appReducer(home(), { type: 'open', screen: 'dashboard' }).screen).toBe('dashboard');
    expect(appReducer(home(), { type: 'open', screen: 'data' }).screen).toBe('data');
  });
  it('the care team view opens from My data only', () => {
    const data = appReducer(home(), { type: 'open', screen: 'data' });
    expect(appReducer(data, { type: 'open', screen: 'clinician' }).screen).toBe('clinician');
    expect(appReducer(home(), { type: 'open', screen: 'clinician' }).screen).toBe('home');
  });
  it('in patient mode no request opens the care team view, from My data or from Home', () => {
    const patient = () => initialAppState({ seenPrivacy: true, hasProtocol: true, mode: 'patient' });
    const data = appReducer(patient(), { type: 'open', screen: 'data' });
    expect(data.screen).toBe('data');
    expect(appReducer(data, { type: 'open', screen: 'clinician' }).screen).toBe('data');
    expect(appReducer(patient(), { type: 'open', screen: 'clinician' }).screen).toBe('home');
  });
  it('patient mode stays after Erase', () => {
    const s = appReducer(initialAppState({ seenPrivacy: true, hasProtocol: true, mode: 'patient' }), { type: 'erased' });
    const loaded = appReducer(s, { type: 'protocol-loaded' });
    const data = appReducer(loaded, { type: 'open', screen: 'data' });
    expect(appReducer(data, { type: 'open', screen: 'clinician' }).screen).toBe('data');
  });
  it('demo mode opens the care team view from My data', () => {
    const data = appReducer(initialAppState({ seenPrivacy: true, hasProtocol: true, mode: 'demo' }), { type: 'open', screen: 'data' });
    expect(appReducer(data, { type: 'open', screen: 'clinician' }).screen).toBe('clinician');
  });
  it('Back goes from each new screen to its parent', () => {
    const dashboard = appReducer(home(), { type: 'open', screen: 'dashboard' });
    expect(appReducer(dashboard, { type: 'open', screen: 'home' }).screen).toBe('home');
    const data = appReducer(home(), { type: 'open', screen: 'data' });
    expect(appReducer(data, { type: 'open', screen: 'home' }).screen).toBe('home');
    const clinician = appReducer(data, { type: 'open', screen: 'clinician' });
    expect(appReducer(clinician, { type: 'open', screen: 'data' }).screen).toBe('data');
  });
  it('the new screens need a stored protocol', () => {
    const none = initialAppState({ seenPrivacy: true, hasProtocol: false });
    expect(appReducer(none, { type: 'open', screen: 'dashboard' }).screen).toBe('load');
    expect(appReducer(none, { type: 'open', screen: 'data' }).screen).toBe('load');
  });
  it('the new screens do not skip the red-flag check of a start', () => {
    const data = appReducer(home(), { type: 'open', screen: 'data' });
    expect(appReducer(data, { type: 'open', screen: 'session' }).screen).toBe('redflag');
    expect(appReducer(data, { type: 'open', screen: 'setup' }).screen).toBe('redflag');
  });
  it('after erase the app shows what a first start shows, with no protocol and no run', () => {
    const state = { ...appReducer(home(), { type: 'open', screen: 'data' }), exercise: 'heel-slide' as const, redFlagBlocks: 2 };
    const erased = appReducer(state, { type: 'erased' });
    expect(erased).toEqual(initialAppState({ seenPrivacy: false, hasProtocol: false }));
    expect(erased.screen).toBe('privacy');
  });
  it('after erase and the notice, the app asks for the protocol file', () => {
    const erased = appReducer(home(), { type: 'erased' });
    expect(appReducer(erased, { type: 'privacy-seen' }).screen).toBe('load');
  });

});

describe('typed set data', () => {
  it('carries the set data of a run in the typed result', () => {
    const sets = startSets({ sets: 2, reps: 3 });
    const run: RunResult = { reason: 'stop', summary: { ...summary, sets } };
    expect(run.summary.sets?.prescription).toEqual({ sets: 2, reps: 3 });
  });

  it('keeps the set data from the session end in the run', () => {
    const sets = startSets({ sets: 2, reps: 3 });
    let s = appReducer(home(), { type: 'choose-exercise', exercise: 'heel-slide' });
    s = appReducer(s, { type: 'red-flags-clear' });
    s = appReducer(s, { type: 'open', screen: 'session' });
    s = appReducer(s, { type: 'session-end', reason: 'stop', summary: { ...summary, sets } });
    expect(s.run?.summary.sets).toBe(sets);
  });
});

describe('leg choice and camera side (T17)', () => {
  const inSetup = () => {
    let s = appReducer(home(), { type: 'choose-exercise', exercise: 'heel-slide' });
    s = appReducer(s, { type: 'red-flags-clear' });
    return s;
  };
  const done = { type: 'setup-done', exerciseLeg: 'right', cameraSide: 'left', baselineDeg: 14 } as const;

  it('starts with no leg, no camera side and no baseline', () => {
    const s = home();
    expect([s.exerciseLeg, s.cameraSide, s.baselineDeg]).toEqual([null, null, null]);
  });

  it('keeps the choice and opens Session when Setup is done', () => {
    const s = appReducer(inSetup(), done);
    expect(s.screen).toBe('session');
    expect([s.exerciseLeg, s.cameraSide, s.baselineDeg]).toEqual(['right', 'left', 14]);
  });

  it('changes only the three fields and the screen, so the protocol side and the phase stay as they are', () => {
    const before = inSetup();
    const after = appReducer(before, done);
    const strip = (s: AppState) => ({ ...s, exerciseLeg: null, cameraSide: null, baselineDeg: null, screen: 'x' });
    expect(strip(after)).toEqual(strip(before));
    expect([after.exerciseLeg, after.cameraSide, after.baselineDeg, after.screen]).toEqual(['right', 'left', 14, 'session']);
  });

  it('keeps a missing baseline as null', () => {
    const s = appReducer(inSetup(), { ...done, baselineDeg: null });
    expect(s.baselineDeg).toBeNull();
    expect(s.screen).toBe('session');
  });

  it('ignores Setup done outside Setup and does not open Session', () => {
    const s = appReducer(home(), done);
    expect(s.screen).toBe('home');
    expect(s.exerciseLeg).toBeNull();
  });

  it('does not open Session without a cleared red-flag check', () => {
    let s = appReducer(inSetup(), { type: 'red-flags-blocked' });
    s = appReducer(s, done);
    expect(s.screen).not.toBe('session');
  });

  it('forgets the choice when a new exercise starts, so the choice lasts for one session only', () => {
    let s = appReducer(inSetup(), done);
    s = appReducer(s, { type: 'choose-exercise', exercise: 'mini-squat' });
    expect([s.exerciseLeg, s.cameraSide, s.baselineDeg]).toEqual([null, null, null]);
  });

  it('forgets the choice at finish and at erase', () => {
    const ended = appReducer(appReducer(inSetup(), done), { type: 'session-end', reason: 'stop', summary });
    expect(ended.exerciseLeg).toBe('right'); // Summary still needs it
    const fin = appReducer(ended, { type: 'finish' });
    expect([fin.exerciseLeg, fin.cameraSide, fin.baselineDeg]).toEqual([null, null, null]);
    const erased = appReducer(ended, { type: 'erased' });
    expect(erased.exerciseLeg).toBeNull();
  });
});

describe('companion screen (T12b, the phone as the second camera)', () => {
  const noProtocol = (): AppState => initialAppState({ seenPrivacy: true, hasProtocol: false });

  it('opens from Home with a protocol', () => {
    expect(appReducer(home(), { type: 'open', screen: 'companion' }).screen).toBe('companion');
  });
  it('opens on a device with no stored protocol, such as the phone', () => {
    expect(appReducer(noProtocol(), { type: 'open', screen: 'companion' }).screen).toBe('companion');
  });
  it('the privacy notice still comes first on the first launch', () => {
    const first = initialAppState({ seenPrivacy: false, hasProtocol: false });
    expect(first.screen).toBe('privacy');
    expect(appReducer(first, { type: 'privacy-seen' }).screen).toBe('load');
  });
  it('leaving it goes Home with a protocol and to the Load screen without one', () => {
    const withFile = appReducer(home(), { type: 'open', screen: 'companion' });
    expect(appReducer(withFile, { type: 'open', screen: 'home' }).screen).toBe('home');
    const without = appReducer(noProtocol(), { type: 'open', screen: 'companion' });
    expect(appReducer(without, { type: 'open', screen: 'home' }).screen).toBe('load');
  });
  it('changes nothing of the run: no exercise, no cleared check, no leg, no baseline', () => {
    const before = home();
    const after = appReducer(before, { type: 'open', screen: 'companion' });
    expect({ ...after, screen: before.screen }).toEqual(before);
  });
  it('drops a cleared red-flag check, so the next start needs a new one', () => {
    let s = appReducer(home(), { type: 'choose-exercise', exercise: 'heel-slide' });
    s = appReducer(s, { type: 'red-flags-clear' });
    expect(s.redFlagCleared).toBe(true);
    s = appReducer(s, { type: 'open', screen: 'companion' });
    expect(s.redFlagCleared).toBe(false);
    expect(appReducer(s, { type: 'open', screen: 'session' }).screen).toBe('redflag');
    expect(appReducer(s, { type: 'open', screen: 'setup' }).screen).toBe('redflag');
  });
  it('never opens Setup or Session by itself, and ignores setup-done', () => {
    const s = appReducer(home(), { type: 'open', screen: 'companion' });
    expect(appReducer(s, { type: 'setup-done', exerciseLeg: 'left', cameraSide: 'left', baselineDeg: 0 }).screen).toBe('companion');
  });
  it('erase from the companion screen is not possible, and an erase resets to the first start', () => {
    const s = appReducer(home(), { type: 'open', screen: 'companion' });
    expect(appReducer(s, { type: 'erased' }).screen).toBe('privacy');
  });
});

// ---- The plan generator flow ----

const inputs: GeneratorInputs = {
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-10-20', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
};
const made = generateProtocol(inputs, '2026-11-08');
if (made.kind !== 'protocol') throw new Error('expected a plan');
const planDraft = (origin: 'create' | 'update'): PlanDraft => ({ kind: 'plan', origin, protocol: made.protocol, why: made.why, inputs, changes: [], hold: null });
const referralDraft: PlanDraft = { kind: 'referral', origin: 'create', reason: 'R2', text: 'The app cannot make a plan for you.', inputs: null };
const noProtocol = (mode: 'demo' | 'patient' = 'demo') => initialAppState({ seenPrivacy: true, hasProtocol: false, mode });

describe('plan generator flow', () => {
  it('opens the questions from the Load screen with no protocol', () => {
    expect(appReducer(noProtocol(), { type: 'open', screen: 'onboarding' }).screen).toBe('onboarding');
  });

  it('opens the questions with a stored protocol too', () => {
    expect(appReducer(home(), { type: 'open', screen: 'onboarding' }).screen).toBe('onboarding');
  });

  it('sends the questions to the Load screen in patient mode', () => {
    expect(appReducer(noProtocol('patient'), { type: 'open', screen: 'onboarding' }).screen).toBe('load');
  });

  it('shows the plan after the questions, and keeps it as a draft that saves nothing', () => {
    const s = appReducer(noProtocol(), { type: 'draft', draft: planDraft('create') });
    expect(s.screen).toBe('plan');
    expect(s.draft).toEqual(planDraft('create'));
    expect(s.hasProtocol).toBe(false);
  });

  it('shows the refusal for a referral and gives no plan screen', () => {
    const s = appReducer(noProtocol(), { type: 'draft', draft: referralDraft });
    expect(s.screen).toBe('referral');
    expect(s.hasProtocol).toBe(false);
    expect(appReducer(s, { type: 'open', screen: 'plan' }).screen).toBe('load');
  });

  it('goes from the plan to the confirmation and back to the questions with the draft kept', () => {
    let s = appReducer(noProtocol(), { type: 'draft', draft: planDraft('create') });
    s = appReducer(s, { type: 'open', screen: 'confirm' });
    expect(s.screen).toBe('confirm');
    expect(s.draft).not.toBeNull();
    s = appReducer(s, { type: 'open', screen: 'onboarding' });
    expect(s.screen).toBe('onboarding');
    expect(s.draft).not.toBeNull();
  });

  it('does not open the plan or the confirmation without a draft', () => {
    expect(appReducer(home(), { type: 'open', screen: 'plan' }).screen).toBe('home');
    expect(appReducer(home(), { type: 'open', screen: 'confirm' }).screen).toBe('home');
    expect(appReducer(home(), { type: 'open', screen: 'referral' }).screen).toBe('home');
  });

  it('goes from the update screen straight to the confirmation, never to a saved plan', () => {
    let s = appReducer(home(), { type: 'open', screen: 'update' });
    expect(s.screen).toBe('update');
    s = appReducer(s, { type: 'draft', draft: planDraft('update') });
    expect(s.screen).toBe('confirm');
  });

  it('opens the update screen only with a stored protocol, and not in patient mode', () => {
    expect(appReducer(noProtocol(), { type: 'open', screen: 'update' }).screen).toBe('load');
    const patient = initialAppState({ seenPrivacy: true, hasProtocol: true, mode: 'patient' });
    expect(appReducer(patient, { type: 'open', screen: 'update' }).screen).toBe('home');
  });

  it('ignores a draft in patient mode', () => {
    const patient = initialAppState({ seenPrivacy: true, hasProtocol: true, mode: 'patient' });
    const s = appReducer(patient, { type: 'draft', draft: planDraft('create') });
    expect(s.draft).toBeNull();
    expect(s.screen).toBe('home');
  });

  it('plan accepted: a protocol is stored, the draft is gone and Home shows', () => {
    let s = appReducer(noProtocol(), { type: 'draft', draft: planDraft('create') });
    s = appReducer(s, { type: 'plan-accepted' });
    expect(s).toMatchObject({ screen: 'home', hasProtocol: true, draft: null });
  });

  it('plan kept: nothing changes, the draft is gone and the person returns to Home or to Load', () => {
    const withPlan = appReducer(home(), { type: 'draft', draft: planDraft('update') });
    expect(appReducer(withPlan, { type: 'plan-kept' })).toMatchObject({ screen: 'home', hasProtocol: true, draft: null });
    const none = appReducer(noProtocol(), { type: 'draft', draft: planDraft('create') });
    expect(appReducer(none, { type: 'plan-kept' })).toMatchObject({ screen: 'load', hasProtocol: false, draft: null });
  });

  it('drops the draft when the person leaves the flow by any other screen', () => {
    const s = appReducer(appReducer(home(), { type: 'draft', draft: planDraft('update') }), { type: 'open', screen: 'home' });
    expect(s.draft).toBeNull();
  });

  it('erase clears the draft with its answers, and the next start is a first start', () => {
    const s = appReducer(appReducer(home(), { type: 'draft', draft: planDraft('update') }), { type: 'erased' });
    expect(s).toMatchObject({ screen: 'privacy', hasProtocol: false, draft: null });
  });

  it('loading a file drops a draft', () => {
    const s = appReducer(appReducer(noProtocol(), { type: 'draft', draft: planDraft('create') }), { type: 'protocol-loaded' });
    expect(s).toMatchObject({ screen: 'home', draft: null });
  });

  it('keeps the red-flag gate: Setup and Session still need a cleared check after a plan is accepted', () => {
    let s = appReducer(noProtocol(), { type: 'draft', draft: planDraft('create') });
    s = appReducer(s, { type: 'plan-accepted' });
    expect(appReducer(s, { type: 'open', screen: 'setup' }).screen).toBe('redflag');
    expect(appReducer(s, { type: 'open', screen: 'session' }).screen).toBe('redflag');
  });
});
