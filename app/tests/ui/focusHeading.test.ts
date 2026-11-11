// AC5-01: one helper moves the focus to a heading and puts the page at the top.
import { describe, expect, it } from 'vitest';
import { focusHeading } from '../../src/ui/focusHeading';

describe('focusHeading', () => {
  it('sets both scrollTop values to 0 and focuses the heading without a scroll', () => {
    const h1 = document.createElement('h1');
    h1.tabIndex = -1;
    document.body.append(h1);
    document.documentElement.scrollTop = 120;
    document.body.scrollTop = 80;
    focusHeading(h1);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
    expect(document.activeElement).toBe(h1);
    h1.remove();
  });

  it('does nothing for a missing heading', () => {
    expect(() => focusHeading(null)).not.toThrow();
    expect(() => focusHeading(undefined)).not.toThrow();
  });
});
