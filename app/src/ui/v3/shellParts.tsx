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

/**
 * The notices of the app. One aside named Notice holds every notice as a paragraph, so the page has one such landmark.
 * The shells always render it. A screen cannot switch it off. An empty list shows none (patient mode).
 */
export function Banners({ notices }: { notices: readonly string[] }) {
  if (notices.length === 0) return null;
  return (
    <aside className="v3-banner" aria-label="Notice">
      {notices.map((text) => (
        <p key={text}>{text}</p>
      ))}
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
