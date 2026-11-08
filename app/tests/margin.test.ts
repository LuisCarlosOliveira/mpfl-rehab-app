import { MARGIN_DEG, classifyAgainstLimit } from '../src/lib/margin';

// Limit 110 degrees and margin 9. The three states mirror the phrases of the clinician summary:
// above the limit by more than the margin, below it by more than the margin, or cannot tell.
describe('classifyAgainstLimit', () => {
  const L = 110;
  const m = MARGIN_DEG;

  it('says above only when the value is more than the margin over the limit', () => {
    expect(classifyAgainstLimit(L + m + 1, L, m)).toBe('above');
    expect(classifyAgainstLimit(L + m, L, m)).toBe('cannot-tell');
  });

  it('says below only when the value is more than the margin under the limit', () => {
    expect(classifyAgainstLimit(L - m - 1, L, m)).toBe('below');
    expect(classifyAgainstLimit(L - m, L, m)).toBe('cannot-tell');
  });

  it('says cannot tell at the limit and inside the margin', () => {
    expect(classifyAgainstLimit(L, L, m)).toBe('cannot-tell');
    expect(classifyAgainstLimit(105, L, m)).toBe('cannot-tell');
    expect(classifyAgainstLimit(115, L, m)).toBe('cannot-tell');
  });

  it('says cannot tell for a missing value', () => {
    expect(classifyAgainstLimit(null, L, m)).toBe('cannot-tell');
  });

  it('works with a margin of zero', () => {
    expect(classifyAgainstLimit(111, L, 0)).toBe('above');
    expect(classifyAgainstLimit(109, L, 0)).toBe('below');
    expect(classifyAgainstLimit(110, L, 0)).toBe('cannot-tell');
  });
});
