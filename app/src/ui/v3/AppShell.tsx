import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { Actions as ActionsBar, Banners, SkipLink } from './shellParts';
import './parts.css';

export type ShellTab = 'today' | 'progress' | 'sessions' | 'data';

const TABS: readonly { tab: ShellTab; label: string }[] = [
  { tab: 'today', label: 'Today' },
  { tab: 'progress', label: 'Progress' },
  { tab: 'sessions', label: 'Sessions' },
  { tab: 'data', label: 'My data' },
];

interface Props {
  tab: ShellTab | null;
  onNavigate: (tab: ShellTab) => void;
  banner: string | readonly string[];
  children: ReactNode;
}

const SlotContext = createContext<HTMLElement | null>(null);

export function AppShell({ tab, onNavigate, banner, children }: Props) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const notices = typeof banner === 'string' ? [banner] : banner;
  return (
    <div className="v3 v3-shell">
      <SkipLink />
      <Banners notices={notices} />
      <header className="v3-appbar">
        <span className="v3-brand" translate="no">
          <span className="v3-mark">
            <Icon name="activity" size={18} />
          </span>
          MPFL Rehab
        </span>
        {tab !== null && (
          <nav aria-label="Main" className="v3-tabs">
            {TABS.map((t) => (
              <button key={t.tab} type="button" aria-current={t.tab === tab ? 'page' : undefined} onClick={() => t.tab !== tab && onNavigate(t.tab)}>
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </header>
      <SlotContext value={slot}>{children}</SlotContext>
      <div ref={setSlot} className="v3-slot" />
    </div>
  );
}

/**
 * The sticky action bar. Inside an AppShell it moves to the slot after main, so it spans the page and never covers content.
 * Without a shell (a unit test of one screen) it stays where it is declared.
 */
function Actions({ label, children }: { label?: string; children: ReactNode }) {
  const slot = useContext(SlotContext);
  const bar = <ActionsBar label={label}>{children}</ActionsBar>;
  return slot ? createPortal(bar, slot) : bar;
}

function Main({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="v3-main">
      {children}
    </main>
  );
}

function Columns({ children }: { children: ReactNode }) {
  return <div className="v3-cols">{children}</div>;
}

AppShell.Main = Main;
AppShell.Columns = Columns;
AppShell.Actions = Actions;
