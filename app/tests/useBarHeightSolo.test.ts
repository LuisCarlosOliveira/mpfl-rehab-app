import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { measureBars } from '../src/lib/useBarHeight';

const bar = (inSolo: boolean, height: number) => {
  const wrap = document.createElement('div');
  wrap.className = inSolo ? 'session-grid session-solo' : 'session-grid';
  const el = document.createElement('div');
  el.className = 'session-bar';
  el.getBoundingClientRect = () => ({ height }) as DOMRect;
  wrap.append(el);
  document.body.append(wrap);
  return el;
};

beforeEach(() => {
  vi.stubGlobal('innerHeight', 640);
});
afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('measureBars, the session bar', () => {
  it('a timer bar over 40 percent of the height becomes static', () => {
    const el = bar(true, 273);
    measureBars();
    expect(el.hasAttribute('data-static')).toBe(true);
  });

  it('a timer bar under 40 percent stays fixed', () => {
    const el = bar(true, 150);
    measureBars();
    expect(el.hasAttribute('data-static')).toBe(false);
  });

  it('a camera session bar over 40 percent stays fixed', () => {
    const el = bar(false, 273);
    measureBars();
    expect(el.hasAttribute('data-static')).toBe(false);
  });
});
