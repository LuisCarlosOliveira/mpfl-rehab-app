// Today's session: the card between two exercises and the list at the end.
// The Next card opens the next exercise after 5 seconds. It starts no movement: the exercise screen asks for its own Start.
// A key press or a pointer press on the card stops the 5 seconds, so a person who reads has time. Any button stops them too.
import { useEffect, useRef, useState } from 'react';
import { MESSAGES } from '../lib/redflags';
import { Icon } from './Icon';
import { EXERCISE_NAMES } from './labels';
import { Notice } from './Notice';
import { PlanProgress } from './PlanProgress';
import { RunStats } from './RunStats';
import type { PlanEntry } from './appState';
import './flowV2.css';

/** How long the Next card waits. ENGINEERING value, no clinical source. */
export const NEXT_CARD_MS = 5000;

interface NextProps {
  name: string;
  index: number;
  total: number;
  onStart: () => void;
  onSkip: () => void;
  onStop: () => void;
}

export function NextCard({ name, index, total, onStart, onSkip, onStop }: NextProps) {
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
    <section aria-labelledby="next-title" className="narrow v2-flow v2-next" onKeyDownCapture={() => setWaiting(false)} onPointerDownCapture={() => setWaiting(false)}>
      <header className="page-head">
        <h1 id="next-title" tabIndex={-1}>
          Next: {name}
        </h1>
      </header>
      <div className="stack">
        <PlanProgress index={index} total={total} />
        <p className="detail">{waiting ? 'The next screen opens in 5 seconds. Press any key to stay here.' : 'Press Start now when you are ready.'}</p>
      </div>
      <div className="action-bar">
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
      </div>
    </section>
  );
}

export function SessionOverview({ entries, onDone }: { entries: readonly PlanEntry[]; onDone: () => void }) {
  const gaveWay = entries.some((e) => e.run?.reason === 'gave-way');
  return (
    <section aria-labelledby="overview-title" className="narrow v2-flow v2-summary v2-overview">
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
      <div className="action-bar">
        <button type="button" className="btn btn-primary btn-lg" onClick={onDone}>
          Done
        </button>
      </div>
    </section>
  );
}
