// Parts that AppShell and LiveShell share: the skip link, the notice banner and the action bar.
import type { ReactNode } from 'react';
import './parts.css';

export function SkipLink() {
  return (
    <a className="v3-skip" href="#main">
      Skip to main content
    </a>
  );
}

/** The prototype notice. The shells always render it. A screen cannot switch it off. */
export function Banner({ children }: { children: ReactNode }) {
  return (
    <aside className="v3-banner" aria-label="Notice">
      <p>{children}</p>
    </aside>
  );
}

/**
 * The bottom action bar. It is sticky and sits in the page flow after main, so it never covers content.
 * It keeps clear of the notch and the home bar with the env() insets.
 */
export function Actions({ label = 'Actions', children }: { label?: string; children: ReactNode }) {
  return (
    <section className="v3-actions" aria-label={label}>
      {children}
    </section>
  );
}
