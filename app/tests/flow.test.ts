import { initialScreen, SCREEN_IDS } from '../src/lib/flow';
import { EXAMPLE_BANNER, PROTOTYPE_BANNER, appMode, bannersFor } from '../src/lib/mode';

describe('initialScreen', () => {
  it('shows the privacy notice first on the first launch, whatever else is stored', () => {
    expect(initialScreen({ seenPrivacy: false, hasProtocol: false })).toBe('privacy');
    expect(initialScreen({ seenPrivacy: false, hasProtocol: true })).toBe('privacy');
  });

  it('asks for the protocol file when none is stored', () => {
    expect(initialScreen({ seenPrivacy: true, hasProtocol: false })).toBe('load');
  });

  it('shows Home when the notice was seen and a protocol is stored', () => {
    expect(initialScreen({ seenPrivacy: true, hasProtocol: true })).toBe('home');
  });

  it('only returns known screens', () => {
    for (const seen of [true, false]) {
      for (const has of [true, false]) {
        expect(SCREEN_IDS).toContain(initialScreen({ seenPrivacy: seen, hasProtocol: has }));
      }
    }
  });
});

describe('appMode', () => {
  it('is patient mode only when the flag is exactly "true"', () => {
    expect(appMode('true')).toBe('patient');
  });

  it.each([undefined, '', 'false', 'TRUE', '1', 'yes'])('is demo mode for %j', (flag) => {
    expect(appMode(flag as string | undefined)).toBe('demo');
  });
});

describe('bannersFor', () => {
  it('shows the prototype banner in demo mode', () => {
    expect(bannersFor('demo', false)).toEqual([PROTOTYPE_BANNER]);
  });

  it('shows no prototype banner in patient mode', () => {
    expect(bannersFor('patient', false)).toEqual([]);
  });

  it('adds the example banner when the protocol is the example', () => {
    expect(bannersFor('demo', true)).toEqual([PROTOTYPE_BANNER, EXAMPLE_BANNER]);
  });

  it('has the fixed texts of the guardrails', () => {
    expect(PROTOTYPE_BANNER).toBe('Prototype. Not for patient use.');
    expect(EXAMPLE_BANNER).toBe('EXAMPLE, NOT APPROVED');
  });
});
