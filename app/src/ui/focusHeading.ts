/** Focuses a screen heading. A new screen or step opens at the top of the page: the page scroll goes to 0, so the prototype banner above
 * the heading stays visible and the heading is in view (final review A2-04 and C3-01, AC5-01). The scroll is instant, so it respects
 * prefers-reduced-motion. It sets scrollTop and does not call window.scrollTo, so a test DOM that lacks scrollTo logs no error. */
export function focusHeading(h1: HTMLElement | null | undefined) {
  if (!h1) return;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  h1.focus({ preventScroll: true });
}
