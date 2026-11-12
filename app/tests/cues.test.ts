import { allCueTexts, cueFor, PEAK_NO_VALUE_TEXT, PEAK_UNREADABLE_TEXT, peakUnreadable, topAngleNote, topAngleText, topUnreadable, type CueEvent } from '../src/lib/cues';

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
    ['not-side-on', 'Turn so that your side faces the camera.'],
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
  it('uses the singular for 1 degree (R3-01)', () => {
    expect(topAngleText(1.2)).toBe('Estimated angle at the top: 1 degree (estimated angle, not a medical measurement).');
  });
  it('shows the angle as a number with the label', () => {
    expect(topAngleText(12.4)).toBe('Estimated angle at the top: 12 degrees (estimated angle, not a medical measurement).');
  });

  it('shows nothing when no angle was measured', () => {
    expect(topAngleText(null)).toBeNull();
  });

  it('shows the plain sentence and no number above the ENGINEERING limit of 30 degrees (F5a)', () => {
    expect(topAngleText(30)).toMatch(/30 degrees/);
    expect(topAngleText(30.1)).toBe(PEAK_NO_VALUE_TEXT); // B2-06: the neutral text, not "could not read"
    expect(topAngleText(165)).toBe(PEAK_NO_VALUE_TEXT);
  });

  it('flags only a number above the limit as unreadable (F5a)', () => {
    expect(topUnreadable(30)).toBe(false);
    expect(topUnreadable(30.1)).toBe(true);
    expect(topUnreadable(null)).toBe(false);
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

describe('the fast-rep cue (A2-7)', () => {
  it('does not say that the rep did not count, because the counter counts a fast rep (tests/counters.test.ts)', () => {
    expect(cueFor('too-fast', { repMs: 1000, minRepMs: 2000 })).not.toMatch(/did not count/i);
  });
});

describe('the plausibility check of the leg raise peak (M8)', () => {
  it('reads a peak up to 30 degrees and not a higher one, for the straight leg raise only', () => {
    expect(peakUnreadable('straight-leg-raise', 30)).toBe(false);
    expect(peakUnreadable('straight-leg-raise', 30.1)).toBe(true);
    expect(peakUnreadable('straight-leg-raise', 165)).toBe(true);
    expect(peakUnreadable('straight-leg-raise', null)).toBe(false);
    expect(peakUnreadable('heel-slide', 165)).toBe(false);
    expect(peakUnreadable('mini-squat', 100)).toBe(false);
  });

  it('has a plain text with no verdict word', () => {
    expect(PEAK_UNREADABLE_TEXT).toBe('The camera could not read this leg raise.');
    expect(PEAK_UNREADABLE_TEXT).not.toMatch(BANNED);
  });
});

// C-prime live fact (form-evidence check 5): the note names the sources and the camera error. It carries no verdict word.
describe('topAngleNote', () => {
  const NOTE = 'The sources describe a straight knee. The camera error is about 9 degrees or more (estimated angle, not a medical measurement).';
  it('shows nothing when the angle is null or inside the camera error (no praise, no message)', () => {
    expect(topAngleNote(null)).toBeNull();
    expect(topAngleNote(0)).toBeNull();
    expect(topAngleNote(9)).toBeNull();
  });
  it('states the sources and the camera error when the angle is more than the margin', () => {
    expect(topAngleNote(9.1)).toBe(NOTE);
    expect(topAngleNote(30)).toBe(NOTE);
  });
  it('shows nothing for an angle that the camera could not read', () => {
    expect(topAngleNote(30.1)).toBeNull();
  });
  it('has no verdict word and no word "lag"', () => {
    expect(NOTE).not.toMatch(/\b(lag|correct|incorrect|good|bad|safe|dangerous|score|pass|fail)\b/i);
    expect(allCueTexts()).toContain(NOTE);
  });
});
