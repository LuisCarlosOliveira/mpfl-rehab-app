import { useEffect, type RefObject } from 'react';

export function useCameraTop(frame: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const el = frame.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      document.documentElement.style.setProperty('--camera-top', `${Math.round(top)}px`);
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    for (const el of [document.querySelector('.banners'), document.querySelector('main')]) if (el) observer?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      document.documentElement.style.removeProperty('--camera-top');
    };
  }, [frame]);
}
