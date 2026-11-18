// The frame of the live screens. No navigation. The notice banner stays.
// Order in the document: Header (the exercise name), Camera, Panel (numbers and controls), then the Actions. One column on a phone.
// From 900 px the camera sits left and the panel right. The Header spans both.
import { Children, isValidElement, type ReactNode } from 'react';
import { Actions, Banners, SkipLink } from './shellParts';
import './parts.css';

// `banner` is one text, or the list of notices of the app (prototype, example, not approved). Each notice shows on its own, as in AppShell.
export function LiveShell({ banner, children }: { banner: string | readonly string[]; children: ReactNode }) {
  // The action bar is sticky. A grid item can only stick inside its own grid area, so the bar stays outside the grid: after it, in the flow of main.
  const notices = typeof banner === 'string' ? [banner] : banner;
  const parts = Children.toArray(children);
  const isActions = (c: ReactNode) => isValidElement(c) && c.type === Actions;
  const actions = parts.filter(isActions);
  const rest = parts.filter((c) => !isActions(c));
  return (
    <div className="v3 v3-shell">
      <SkipLink />
      <Banners notices={notices} />
      <main id="main" className="v3-main v3-live-main">
        <div className="v3-live">{rest}</div>
        {actions}
      </main>
    </div>
  );
}

function Header({ children }: { children: ReactNode }) {
  return <div className="v3-live-head">{children}</div>;
}

/** The camera slot, 4:3. The video or the drawing goes in as children. */
function Camera({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <section className="v3-cam" aria-label={label}>
      {children}
    </section>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="v3-live-panel">{children}</div>;
}

LiveShell.Header = Header;
LiveShell.Camera = Camera;
LiveShell.Panel = Panel;
LiveShell.Actions = Actions;
