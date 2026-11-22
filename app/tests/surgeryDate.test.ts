import { describe, expect, it } from 'vitest';
import { dateWords, surgeryDateWords, weeksSince, weekWords } from '../src/lib/planView';

describe('weeksSince, the rule of whole weeks', () => {
  it('gives week 2 for a surgery on 2026-10-29 and today 2026-11-18 (20 days)', () => {
    expect(weeksSince('2026-10-29', '2026-11-18')).toBe(2);
  });
  it('changes the week on the seventh day, not before', () => {
    expect(weeksSince('2026-10-29', '2026-11-04')).toBe(0);
    expect(weeksSince('2026-10-29', '2026-11-05')).toBe(1);
    expect(weeksSince('2026-10-29', '2026-11-18')).toBe(2);
    expect(weeksSince('2026-10-29', '2026-11-19')).toBe(3);
  });
  it('gives null for a future date or a date that is not real', () => {
    expect(weeksSince('2026-11-19', '2026-11-18')).toBeNull();
    expect(weeksSince('2026-02-30', '2026-11-18')).toBeNull();
    expect(weeksSince('', '2026-11-18')).toBeNull();
  });
});

describe('the words for a date and a week', () => {
  it('writes the date with the name of the month', () => {
    expect(dateWords('2026-10-29')).toBe('29 October 2026');
    expect(dateWords('2026-01-05')).toBe('5 January 2026');
  });
  it('writes the week with the number of the week after surgery', () => {
    expect(weekWords(0)).toBe('week 0 (the first week after surgery)');
    expect(weekWords(2)).toBe('week 2 (the third week after surgery)');
    expect(weekWords(11)).toBe('week 11 (the twelfth week after surgery)');
    expect(weekWords(20)).toBe('week 20 (the 21st week after surgery)');
  });
  it('joins both for the answers screen', () => {
    expect(surgeryDateWords('2026-10-29', '2026-11-18')).toBe('29 October 2026, week 2 (the third week after surgery)');
  });
  it('gives only the date for a date in the future, and null for no date or a date that is not real', () => {
    expect(surgeryDateWords('2026-12-01', '2026-11-18')).toBe('1 December 2026');
    expect(surgeryDateWords('', '2026-11-18')).toBeNull();
    expect(surgeryDateWords('2026-02-30', '2026-11-18')).toBeNull();
  });
});
