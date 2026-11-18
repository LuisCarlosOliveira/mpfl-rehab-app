import { describe, expect, it } from 'vitest';
import { appReducer, backStep, initialAppState, type AppState, type RunResult } from '../src/ui/appState';
import { SCREEN_IDS } from '../src/lib/flow';
import type { Summary } from '../src/lib/exercises';

const summary: Summary = { reps: 3, holds: null, peakFlexion: 50, topFlexion: null, topState: null, eventCounts: { nearLimit: 0, overLimit: 0, tooFast: 0 } };
const run = (reason: RunResult['reason'] = 'stop') => ({ type: 'session-end', reason, summary }) as const;
const KINDS = ['heel-slide', 'quad-set', 'ankle-pump'] as const;
const home = (): AppState => initialAppState({ seenPrivacy: true, hasProtocol: true });

/** Start the plan session, clear the check, and open Session of the first exercise. */
function inSession(): AppState {
  let s = appReducer(home(), { type: 'start-session', kinds: [...KINDS] });
  s = appReducer(s, { type: 'red-flags-clear' });
  s = appReducer(s, { type: 'setup-done', exerciseLeg: 'right', cameraSide: 'left', baselineDeg: 5 });
  return s;
}

describe('plan session', () => {
  it('knows the new screens', () => {
    expect(SCREEN_IDS).toContain('next');
    expect(SCREEN_IDS).toContain('overview');
  });

  it('starts with the red-flag check and the first exercise', () => {
    const s = appReducer(home(), { type: 'start-session', kinds: [...KINDS] });
    expect(s.screen).toBe('redflag');
    expect(s.exercise).toBe('heel-slide');
    expect(s.plan).toMatchObject({ index: 0, entries: [] });
  });

  it('does nothing for an empty list', () => {
    expect(appReducer(home(), { type: 'start-session', kinds: [] })).toEqual(home());
  });

  it('asks the check once: the next exercise opens Setup with no new check', () => {
    let s = appReducer(inSession(), run());
    expect(s.screen).toBe('summary');
    expect(s.redFlagCleared).toBe(true);
    s = appReducer(s, { type: 'plan-continue' });
    expect(s.screen).toBe('next');
    expect(s.exercise).toBe('quad-set');
    expect(s.plan?.index).toBe(1);
    expect(s.plan?.entries).toHaveLength(1);
    s = appReducer(s, { type: 'open', screen: 'setup' });
    expect(s.screen).toBe('setup');
  });

  it('keeps the leg and the camera side, and clears the resting angle', () => {
    const s = appReducer(appReducer(inSession(), run()), { type: 'plan-continue' });
    expect(s.exerciseLeg).toBe('right');
    expect(s.cameraSide).toBe('left');
    expect(s.baselineDeg).toBeNull();
  });

  it('goes to the summary after the last exercise', () => {
    let s = inSession();
    for (let i = 0; i < KINDS.length; i++) {
      s = appReducer(s, run());
      s = appReducer(s, { type: 'plan-continue' });
      if (s.screen === 'next') {
        s = appReducer(s, { type: 'open', screen: 'setup' });
        s = appReducer(s, { type: 'setup-done', exerciseLeg: 'right', cameraSide: 'left', baselineDeg: null });
      }
    }
    expect(s.screen).toBe('overview');
    expect(s.plan?.entries.map((e) => e.kind)).toEqual([...KINDS]);
  });

  it('Skip passes over the next exercise and records it as skipped', () => {
    let s = appReducer(appReducer(inSession(), run()), { type: 'plan-continue' });
    s = appReducer(s, { type: 'plan-skip' });
    expect(s.screen).toBe('next');
    expect(s.exercise).toBe('ankle-pump');
    expect(s.plan?.entries.map((e) => [e.kind, e.run === null])).toEqual([
      ['heel-slide', false],
      ['quad-set', true],
    ]);
  });

  it('Skip on the last exercise goes to the summary', () => {
    let s = appReducer(appReducer(inSession(), run()), { type: 'plan-continue' });
    s = appReducer(appReducer(s, { type: 'plan-skip' }), { type: 'plan-skip' });
    expect(s.screen).toBe('overview');
  });

  it('Stop session on the Next card goes to the summary', () => {
    const s = appReducer(appReducer(appReducer(inSession(), run()), { type: 'plan-continue' }), { type: 'plan-stop' });
    expect(s.screen).toBe('overview');
    expect(s.plan?.entries).toHaveLength(1);
  });

  it('"Knee gave way or hurts" ends the whole session after the Done step', () => {
    const s = appReducer(appReducer(inSession(), run('gave-way')), { type: 'plan-continue' });
    expect(s.screen).toBe('overview');
  });

  it('a stop request on the Done step records the run and ends the session', () => {
    const s = appReducer(appReducer(inSession(), run()), { type: 'plan-stop' });
    expect(s.screen).toBe('overview');
    expect(s.plan?.entries).toHaveLength(1);
  });

  it('leaving to Home drops the check and the plan. The next session asks again', () => {
    const s = appReducer(appReducer(appReducer(inSession(), run()), { type: 'plan-continue' }), { type: 'open', screen: 'home' });
    expect(s.screen).toBe('home');
    expect(s.plan).toBeNull();
    expect(s.redFlagCleared).toBe(false);
    expect(appReducer(s, { type: 'open', screen: 'setup' }).screen).toBe('redflag');
  });

  it('the Next card and the summary need a plan', () => {
    expect(appReducer(home(), { type: 'open', screen: 'next' }).screen).toBe('home');
    expect(appReducer(home(), { type: 'open', screen: 'overview' }).screen).toBe('home');
  });

  it('a single exercise start has no plan and drops the check at its end, as before', () => {
    let s = appReducer(home(), { type: 'choose-exercise', exercise: 'heel-slide' });
    expect(s.plan).toBeNull();
    s = appReducer(appReducer(s, { type: 'red-flags-clear' }), { type: 'setup-done', exerciseLeg: 'left', cameraSide: 'left', baselineDeg: null });
    s = appReducer(s, run());
    expect(s.redFlagCleared).toBe(false);
  });

  it('Finish on the summary returns Home with no plan', () => {
    const s = appReducer(appReducer(appReducer(inSession(), run()), { type: 'plan-stop' }), { type: 'finish' });
    expect(s.screen).toBe('home');
    expect(s.plan).toBeNull();
    expect(s.redFlagCleared).toBe(false);
  });

  it('Back acts like the buttons of the screen', () => {
    const toNext = appReducer(appReducer(inSession(), run()), { type: 'plan-continue' });
    expect(backStep(toNext)).toEqual({ type: 'plan-stop' });
    const toEnd = appReducer(toNext, { type: 'plan-stop' });
    expect(backStep(toEnd)).toEqual({ type: 'finish' });
  });
});
