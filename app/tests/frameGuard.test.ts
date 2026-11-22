import { describe, expect, it, vi } from 'vitest';
import { renderUnlessFramed } from '../src/lib/frameGuard';

const doc = () => ({ documentElement: { hidden: false } });

describe('frame guard (a fallback only: the frame-ancestors header in public/_headers is the real control)', () => {
  it('renders when top equals self', () => {
    const self = {} as Window;
    const d = doc();
    const render = vi.fn();
    renderUnlessFramed({ self, top: self, document: d as unknown as Document }, render);
    expect(render).toHaveBeenCalledTimes(1);
    expect(d.documentElement.hidden).toBe(false);
  });
  it('hides the page and does not render when top differs', () => {
    const d = doc();
    const render = vi.fn();
    renderUnlessFramed({ self: {} as Window, top: {} as Window, document: d as unknown as Document }, render);
    expect(render).not.toHaveBeenCalled();
    expect(d.documentElement.hidden).toBe(true);
  });
  it('hides the page and does not render when reading top throws', () => {
    const d = doc();
    const render = vi.fn();
    const win = {
      self: {} as Window,
      get top(): Window {
        throw new DOMException('blocked', 'SecurityError');
      },
      document: d as unknown as Document,
    };
    renderUnlessFramed(win, render);
    expect(render).not.toHaveBeenCalled();
    expect(d.documentElement.hidden).toBe(true);
  });
});
