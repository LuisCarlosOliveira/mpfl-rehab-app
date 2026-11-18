// The frame of every screen except the live ones: skip link, notice banner, header with navigation,
// a centered content area (1200 px, two columns from 900 px) and a sticky action bar.
// Compound parts: AppShell.Main, AppShell.Columns, AppShell.Actions. The banner is always there (design doc 7.4).
import type { ReactNode } from 'react';
import { Icon } from '../Icon';
import { Actions, Banner, SkipLink } from './shellParts';
import './parts.css';

export type ShellTab = 'today' | 'progress' | 'sessions' | 'data';

const TABS: readonly { tab: ShellTab; label: string }[] = [
  { tab: 'today', label: 'Today' },
  { tab: 'progress', label: 'Progress' },
  { tab: 'sessions', label: 'Sessions' },
  { tab: 'data', label: 'My data' },
];

interface Props {
  tab: ShellTab;
  onNavigate: (tab: ShellTab) => void;
  banner: string;
  children: ReactNode;
}

export function AppShell({ tab, onNavigate, banner, children }: Props) {
  return (
    <div className="v3 v3-shell">
      <SkipLink />
      <Banner>{banner}</Banner>
      <header className="v3-appbar">
        <span className="v3-brand" translate="no">
          <span className="v3-mark">
            <Icon name="activity" size={18} />
          </span>
          MPFL Rehab
        </span>
        <nav aria-label="Main" className="v3-tabs">
          {TABS.map((t) => (
            <button key={t.tab} type="button" aria-current={t.tab === tab ? 'page' : undefined} onClick={() => t.tab !== tab && onNavigate(t.tab)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}

function Main({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="v3-main">
      {children}
    </main>
  );
}

/** Two columns from 900 px, one column below. Give it exactly two children. */
function Columns({ children }: { children: ReactNode }) {
  return <div className="v3-cols">{children}</div>;
}

AppShell.Main = Main;
AppShell.Columns = Columns;
AppShell.Actions = Actions;
