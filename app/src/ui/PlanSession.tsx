import { useEffect, useRef, useState } from 'react';
import { MESSAGES } from '../lib/redflags';
import { Icon } from './Icon';
import { EXERCISE_NAMES } from './labels';
import { Notice } from './Notice';
import { RunStats } from './RunStats';
import type { PlanEntry } from './appState';
import { AppShell } from './v3/AppShell';
import { PlanList, type PlanItem } from './v3/PlanList';
import { SessionProgress } from './v3/SessionProgress';
import './flowV2.css';
import './v3home.css';

/** How long the Next card waits. ENGINEERING value, no clinical source. */
export const NEXT_CARD_MS = 5000;

interface NextProps {
  name: string;
  index: number;
  total: number;
  items?: readonly PlanItem[];
  onStart: () => void;
  onSkip: () => void;
  onStop: () => void;
}

export function NextCard({ name, index, total, items, onStart, onSkip, onStop }: NextProps) {
  const [waiting, setWaiting] = useState(true);
  const start = useRef(onStart);
  useEffect(() => {
    start.current = onStart;
  });
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => start.current(), NEXT_CARD_MS);
    return () => clearTimeout(timer);
  }, [waiting]);
  const press = (action: () => void) => () => {
    setWaiting(false);
    action();
  };
  return (
    <section aria-labelledby="next-title" className="v2-flow v2-next v3h-next-card" onKeyDownCapture={() => setWaiting(false)} onPointerDownCapture={() => setWaiting(false)}>
      <header className="page-head">
        <h1 id="next-title" tabIndex={-1}>
          Next: {name}
        </h1>
      </header>
      <div className="stack v3h-single">
        <SessionProgress total={total} current={index + 1} unit="Exercise" />
        {items && items.length > 0 && <PlanList items={items} currentId={items[index]?.id ?? null} />}
        <p className="detail">{waiting ? 'The next screen opens in 5 seconds. Press any key to stay here.' : 'Press Start now when you are ready.'}</p>
      </div>
      <AppShell.Actions label="Actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={press(onStart)}>
          <Icon name="play" size={20} />
          Start now
        </button>
        <button type="button" className="btn btn-lg" onClick={press(onSkip)}>
          Skip
        </button>
        <button type="button" className="btn btn-lg" onClick={press(onStop)}>
          Stop session
        </button>
      </AppShell.Actions>
    </section>
  );
}

export function SessionOverview({ entries, onDone }: { entries: readonly PlanEntry[]; onDone: () => void }) {
  const gaveWay = entries.some((e) => e.run?.reason === 'gave-way');
  return (
    <section aria-labelledby="overview-title" className="v2-flow v2-summary v2-overview v3h-overview">
      <header className="page-head">
        <h1 id="overview-title" tabIndex={-1}>
          Today's session
        </h1>
      </header>
      <div className="stack">
        {gaveWay && (
          <Notice tone="strong" role="alert" icon="heart-pulse" title={MESSAGES['care-team']}>
            <p>You pressed "Knee gave way or hurts".</p>
          </Notice>
        )}
        <ul className="overview-list">
          {entries.map((e) => (
            <li key={e.kind} className="overview-item stack-s">
              <h2>{EXERCISE_NAMES[e.kind]}</h2>
              {e.run === null ? <p className="detail">Skipped</p> : <RunStats kind={e.kind} summary={e.run.summary} />}
            </li>
          ))}
        </ul>
        <p className="detail">Each exercise is saved in Your sessions.</p>
      </div>
      <AppShell.Actions label="Actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={onDone}>
          Done
        </button>
      </AppShell.Actions>
    </section>
  );
}
