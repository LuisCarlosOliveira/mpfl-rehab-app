// The frame of the live screens. No navigation. The notice banner stays.
// Order in the document: Header (the exercise name), Camera, Panel (numbers and controls). One column on a phone.
// From 900 px the camera sits left and the panel right. The Header spans both.
import type { ReactNode } from 'react';
import { Actions, Banner, SkipLink } from './shellParts';
import './parts.css';

export function LiveShell({ banner, children }: { banner: string; children: ReactNode }) {
  return (
    <div className="v3 v3-shell">
      <SkipLink />
      <Banner>{banner}</Banner>
      <main id="main" className="v3-main v3-live">
        {children}
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
