import { useEffect, useRef } from 'react';
import type { ScreenId } from '../lib/flow';

export interface BackResult {
  landed: ScreenId;
  root: boolean;
}

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
