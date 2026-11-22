import { useEffect } from 'react';

const BARS = '.action-bar, .session-bar, .v3-actions, .bottom-nav';
const MAX_SHARE = 0.4;

export function measureBars(root: HTMLElement = document.documentElement): number {
  const vh = window.innerHeight;
  let tallest = 0;
  for (const bar of document.querySelectorAll<HTMLElement>(BARS)) {
    const height = bar.getBoundingClientRect().height;
    if (!Number.isFinite(height)) continue;
    const mayBeStatic = bar.classList.contains('action-bar') || (bar.classList.contains('session-bar') && bar.closest('.session-solo') !== null);
    if (mayBeStatic && !bar.hasAttribute('data-blocked')) {
      if (height > vh * MAX_SHARE) bar.setAttribute('data-static', '');
      else if (bar.hasAttribute('data-static') && height < vh * MAX_SHARE * 0.9) bar.removeAttribute('data-static');
    }
    if (['sticky', 'fixed'].includes(getComputedStyle(bar).position)) tallest = Math.max(tallest, height);
  }
  root.style.setProperty('--bar-h', `${Math.ceil(tallest)}px`);
  return tallest;
}

export function useBarHeight(): void {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => measureBars());
    };
    if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') return;
    const resize = new ResizeObserver(schedule);
    const watch = () => {
      resize.disconnect();
      for (const bar of document.querySelectorAll(BARS)) resize.observe(bar);
      schedule();
    };
    const mutation = new MutationObserver(watch);
    mutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-blocked', 'class'] });
    const focusRow = (e: FocusEvent) => {
      const row = e.target instanceof Element ? e.target.closest('label') : null;
      row?.scrollIntoView({ block: 'nearest' });
    };
    document.addEventListener('focusin', focusRow);
    window.addEventListener('resize', schedule);
    watch();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      document.removeEventListener('focusin', focusRow);
      window.removeEventListener('resize', schedule);
    };
  }, []);
}
