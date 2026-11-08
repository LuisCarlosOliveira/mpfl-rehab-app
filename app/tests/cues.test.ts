import { allCueTexts, cueFor, topAngleText, type CueEvent } from '../src/lib/cues';

const BANNED = /\b(correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|grade|pass|fail|goal|milestone)\b|risk of injury/i;

describe('cueFor', () => {
  it('gives no cue for an in-range rep and for no event', () => {
    expect(cueFor('rep', {})).toBeNull();
    expect(cueFor(null, {})).toBeNull();
  });

  it.each([
    ['shallow', 'Depth below your target.'],
    ['near-limit', 'Close to your limit, stop.'],
    ['over-limit', 'Stop at your limit, do not push.'],
    ['paused', 'Show your whole leg.'],
  ] as Array<[CueEvent, string]>)('maps %s to a fixed text', (event, text) => {
    expect(cueFor(event, {})).toBe(text);
  });

  it('maps the hold restart to the text of the reconciliation (T5), which asks for no full extension', () => {
    expect(cueFor('hold-restart', {})).toBe('The knee left the hold angle. The hold timer starts again.');
    expect(cueFor('hold-restart', {})).not.toMatch(/straight/i);
  });

  it('gives no hold cue for a counted hold', () => {
    expect(cueFor('hold-complete', {})).toBeNull();
  });

  it('writes the rep time and the minimum for a fast rep', () => {
    expect(cueFor('too-fast', { repMs: 1234, minRepMs: 2000 })).toBe('Slow down. Rep time 1.2 s. Your care team set at least 2.0 s.');
  });

  it('gives no fast-rep cue when the numbers are missing', () => {
    expect(cueFor('too-fast', {})).toBeNull();
  });
});

describe('topAngleText', () => {
  it('shows the angle as a number with the label', () => {
    expect(topAngleText(12.4)).toBe('Estimated angle at the top: 12 degrees (estimated angle, not a medical measurement).');
  });

  it('shows nothing when no angle was measured', () => {
    expect(topAngleText(null)).toBeNull();
  });
});

describe('cue texts follow the guardrails', () => {
  it('has no verdict word in any text', () => {
    for (const t of allCueTexts()) expect(t).not.toMatch(BANNED);
  });

  it('has no text that gives a medical measurement without the label', () => {
    for (const t of allCueTexts()) {
      if (/degrees/i.test(t)) expect(t).toMatch(/estimated angle, not a medical measurement/);
    }
  });

  it('keeps each text short', () => {
    for (const t of allCueTexts()) expect(t.split(/\s+/).length).toBeLessThanOrEqual(25);
  });

  it('includes the hold restart text in the list the tests check', () => {
    expect(allCueTexts()).toContain('The knee left the hold angle. The hold timer starts again.');
  });

  it('lists every fixed cue once', () => {
    const texts = allCueTexts();
    expect(new Set(texts).size).toBe(texts.length);
    expect(texts.length).toBeGreaterThanOrEqual(6);
  });
});
