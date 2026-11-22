export function focusHeading(h1: HTMLElement | null | undefined) {
  if (!h1) return;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  h1.focus({ preventScroll: true });
}
