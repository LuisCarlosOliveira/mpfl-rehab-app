import { Children, isValidElement, type ReactNode } from 'react';
import { Actions, Banners, SkipLink } from './shellParts';
import './parts.css';

export function LiveShell({ banner, children }: { banner: string | readonly string[]; children: ReactNode }) {
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
