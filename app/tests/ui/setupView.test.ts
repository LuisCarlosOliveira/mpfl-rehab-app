import { describe, expect, it } from 'vitest';
import { SETUP_TEXT, type SetupRuleId } from '../../src/lib/setupRules';
import { countdownSeconds, RULE_ROWS, ruleRows } from '../../src/ui/setupView';

describe('setup rule list', () => {
  it('lists the six rules in the priority order of the setup check', () => {
    expect(RULE_ROWS.map((r) => r.label)).toEqual([
      'Person in the view',
      'Hip, knee and ankle',
      'Whole leg in the frame',
      'Leg big enough in the frame',
      'Side-on to the camera',
      'Leg held still',
    ]);
  });

  it('marks every rule "seen" when the check is ready', () => {
    expect(ruleRows('ready').every((r) => r.word === 'seen')).toBe(true);
  });

  it('marks the failed rule and the rules after it "not seen"', () => {
    const rows = ruleRows('whole-leg');
    expect(rows.map((r) => r.word)).toEqual(['seen', 'seen', 'not seen', 'not seen', 'not seen', 'not seen']);
  });

  it('turn-leg and show-leg both fail the hip, knee and ankle rule', () => {
    for (const id of ['turn-leg', 'show-leg'] as SetupRuleId[]) {
      expect(ruleRows(id).map((r) => r.word)).toEqual(['seen', 'not seen', 'not seen', 'not seen', 'not seen', 'not seen']);
    }
  });

  it('no pose fails all rules', () => {
    expect(ruleRows('no-pose').every((r) => r.word === 'not seen')).toBe(true);
  });

  it('knows every rule id of the setup check', () => {
    for (const id of Object.keys(SETUP_TEXT) as SetupRuleId[]) expect(ruleRows(id)).toHaveLength(6);
  });
});

describe('countdownSeconds', () => {
  it('rounds up to whole seconds and gives null when no countdown runs', () => {
    expect(countdownSeconds(null)).toBeNull();
    expect(countdownSeconds(5000)).toBe(5);
    expect(countdownSeconds(4001)).toBe(5);
    expect(countdownSeconds(400)).toBe(1);
    expect(countdownSeconds(0)).toBe(0);
  });
});
