import { useEffect, useRef } from 'react';
import { focusHeading } from './focusHeading';
// Shell pieces: the brand bar and the loading state. The loading state keeps the heading "Loading" for screen readers.
export function Brand() {
  return (
    <header className="topbar wrap">
      <span className="brand">
        <span className="brand-mark">
          {/* Own mark: two limbs that meet at a knee, with the angle arc. */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M8 3v9l8 8" />
            <path d="M8 16.5a4.5 4.5 0 0 0 2.2-.5" />
          </svg>
        </span>
        MPFL Rehab
      </span>
    </header>
  );
}

export function LoadingScreen() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeading(heading.current), []); // U5: the focus does not fall to the page body
  return (
    <div>
      <h1 className="visually-hidden" tabIndex={-1} ref={heading}>
        Loading
      </h1>
      <div className="skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
