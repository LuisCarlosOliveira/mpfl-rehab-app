// F3 (L2-10): the Back button of the browser stays inside the app. The app has no URL routes, so it keeps one history entry.
// A screen with a screen behind it pushes that entry. Back then fires popstate, and the app runs the Back step of the screen.
// The entry holds only a screen id string. It never holds data. Forward does nothing. A Back press on a root screen leaves the app.
import { useEffect, useRef } from 'react';
import type { ScreenId } from '../lib/flow';

/** Where a Back step leads. `root` is true when no screen is behind it, so the first history entry fits. */
export interface BackResult {
  landed: ScreenId;
  root: boolean;
}

/**
 * `screen` is the screen on show. `atRoot` is true when no screen is behind it (appState.backStep gives null).
 * `onBack` runs the Back step and returns where it leads. It returns the same screen when nothing changes (the Summary stays).
 */
export function useBackButton(screen: ScreenId, atRoot: boolean, onBack: () => BackResult): void {
  const mine = useRef({ above: false, base: null as ScreenId | null, undoing: false });
  const run = useRef(onBack);
  useEffect(() => {
    run.current = onBack;
  });

  useEffect(() => {
    const h = mine.current;
    if (h.base === null || (!h.above && atRoot)) {
      h.base = screen;
      window.history.replaceState(screen, '');
    } else if (!h.above) {
      window.history.pushState(screen, '');
      h.above = true;
    } else if (atRoot) {
      // The person came to a root screen by a button. The extra entry goes, so the next Back leaves the app.
      h.base = screen;
      h.undoing = true;
      h.above = false;
      window.history.back();
    } else {
      window.history.replaceState(screen, '');
    }
  }, [screen, atRoot]);

  useEffect(() => {
    const onPop = () => {
      const h = mine.current;
      if (h.undoing) {
        h.undoing = false;
        window.history.replaceState(h.base, '');
        return;
      }
      if (!h.above) {
        // Forward to the entry above. It does nothing: go back at once.
        h.undoing = true;
        window.history.back();
        return;
      }
      h.above = false;
      const { landed, root } = run.current();
      if (root) {
        h.base = landed;
        window.history.replaceState(landed, '');
      } else {
        window.history.pushState(landed, '');
        h.above = true;
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}
