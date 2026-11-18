// The frame of every screen except the live ones: skip link, notice banner, header with navigation,
// a centered content area (1200 px, two columns from 900 px) and a sticky action bar.
// Compound parts: AppShell.Main, AppShell.Columns, AppShell.Actions. The banner is always there (design doc 7.4).
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
  /** The open tab. null on a screen that is a step of a flow or that comes before the first plan: the bar shows no tabs. */
  tab: ShellTab | null;
  onNavigate: (tab: ShellTab) => void;
  /** One notice, or a list of notices. An empty list shows none (patient mode). The prototype notice is the caller's text. */
  banner: string | readonly string[];
  children: ReactNode;
}

// The bar of actions sits after main in the page. A screen declares it inside main, and it moves to the slot after main.
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

/** Two columns from 900 px, one column below. Give it exactly two children. */
function Columns({ children }: { children: ReactNode }) {
  return <div className="v3-cols">{children}</div>;
}

AppShell.Main = Main;
AppShell.Columns = Columns;
AppShell.Actions = Actions;
