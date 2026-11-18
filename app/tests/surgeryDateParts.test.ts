import { describe, expect, it } from 'vitest';
import { surgeryDateFromParts } from '../src/lib/onboarding';

const TODAY = '2026-11-18';
const REAL = 'Enter a real date';
const FUTURE = 'The date cannot be in the future';

describe('surgeryDateFromParts', () => {
  it('builds the ISO date from day, month and year', () => {
    expect(surgeryDateFromParts('29', '10', '2026', TODAY)).toEqual({ iso: '2026-10-29', problem: null });
    expect(surgeryDateFromParts('1', '2', '2026', TODAY)).toEqual({ iso: '2026-02-01', problem: null });
  });
  it('accepts today, and refuses tomorrow', () => {
    expect(surgeryDateFromParts('18', '11', '2026', TODAY).iso).toBe('2026-11-18');
    expect(surgeryDateFromParts('19', '11', '2026', TODAY)).toEqual({ iso: null, problem: FUTURE });
  });
  it('accepts 29 February only in a leap year', () => {
    expect(surgeryDateFromParts('29', '2', '2024', TODAY).iso).toBe('2024-02-29');
    expect(surgeryDateFromParts('29', '2', '2026', TODAY)).toEqual({ iso: null, problem: REAL });
  });
  it('refuses 31 April, day 0, month 13 and day 32', () => {
    for (const [d, m] of [['31', '4'], ['0', '5'], ['10', '13'], ['32', '1'], ['10', '0']]) {
      expect(surgeryDateFromParts(d!, m!, '2026', TODAY)).toEqual({ iso: null, problem: REAL });
    }
  });
  it('refuses a year with fewer than 4 digits: 26 is not 2026', () => {
    expect(surgeryDateFromParts('29', '10', '26', TODAY)).toEqual({ iso: null, problem: REAL });
    expect(surgeryDateFromParts('29', '10', '202', TODAY)).toEqual({ iso: null, problem: REAL });
  });
  it('refuses text that is not whole digits', () => {
    for (const [d, m, y] of [['2a', '10', '2026'], ['29', '1.5', '2026'], ['29', '10', '20e6'], ['-1', '10', '2026']]) {
      expect(surgeryDateFromParts(d!, m!, y!, TODAY).iso).toBeNull();
    }
  });
  it('gives no date and no message while a part is empty', () => {
    for (const [d, m, y] of [['', '', ''], ['29', '', ''], ['', '10', '2026'], ['29', '10', ''], ['  ', '10', '2026']]) {
      expect(surgeryDateFromParts(d!, m!, y!, TODAY)).toEqual({ iso: null, problem: null });
    }
  });
  it('trims spaces around a part', () => {
    expect(surgeryDateFromParts(' 29 ', '10 ', ' 2026', TODAY).iso).toBe('2026-10-29');
  });
});
