// The bars that stick to the bottom of the screen (the action bar, the session bar, the bottom nav) cover what is under them.
// This hook measures them and sets --bar-h on the root element. styles.css uses it for scroll-padding-bottom,
// so a control that gets keyboard focus scrolls fully above the bar, at any size and at any text size.
// An action bar that would take more than 40 percent of the screen height (big text) becomes part of the page (data-static).
// A bar that holds a block message (data-blocked) always stays in view.
// A focused tick row, scale box or segment scrolls in as a whole row, not only its small input.
import { useEffect } from 'react';

const BARS = '.action-bar, .session-bar, .bottom-nav';
const MAX_SHARE = 0.4;

export function measureBars(root: HTMLElement = document.documentElement): number {
  const vh = window.innerHeight;
  let tallest = 0;
  for (const bar of document.querySelectorAll<HTMLElement>(BARS)) {
    const height = bar.getBoundingClientRect().height;
    if (!Number.isFinite(height)) continue;
    if (bar.classList.contains('action-bar') && !bar.hasAttribute('data-blocked')) {
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
    // An old browser or a test DOM may lack the observers. The bar height then stays at its fallback in CSS.
    if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') return;
    const resize = new ResizeObserver(schedule);
    const watch = () => {
      resize.disconnect();
      for (const bar of document.querySelectorAll(BARS)) resize.observe(bar);
      schedule();
    };
    // A screen change adds or removes bars. The page body also changes the height of a bar (a message appears in it).
    const mutation = new MutationObserver(watch);
    mutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-blocked', 'class'] });
    const focusRow = (e: FocusEvent) => {
      const row = e.target instanceof Element ? e.target.closest('label') : null;
      // block nearest does nothing when the row is in view. It uses scroll-padding-bottom, so the row ends above the bar.
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
