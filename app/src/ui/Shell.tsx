import { useEffect, useRef } from 'react';
import { focusHeading } from './focusHeading';
export function LoadingScreen() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeading(heading.current), []);
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
