import { describe, expect, it } from 'vitest';
import { appReducer, initialAppState, type AppState } from '../src/ui/appState';
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
  it('the screens of a later task fall back to Home', () => {
    expect(appReducer(home(), { type: 'open', screen: 'dashboard' }).screen).toBe('home');
  });
});
