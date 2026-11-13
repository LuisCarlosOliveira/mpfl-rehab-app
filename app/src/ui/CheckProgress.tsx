// "Check my progress". A read-only screen: it shows the numbers of the person next to published guidelines
// (design docs/progression-evaluation-design.md, section 5). It saves nothing, sets no phase and gives no verdict.
// Every sentence comes from progressCheck.ts, so the word checks cover it.
import { useEffect, useState } from 'react';
import { checkProgress, CHECK_SCREEN, type ProgressCheck } from '../lib/progressCheck';
import type { Protocol } from '../lib/protocol';
import { PAUSE_MESSAGE } from '../lib/safety';
import { loadGeneratorInputs, readValidRows, type MpflDb } from '../lib/storage';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { HOLD_EVENT } from './UpdatePlan';
import './screensV2.css';

interface Props {
  db: MpflDb;
  protocol: Protocol;
  /** The calendar date of today, as year-month-day. The app gives it from the clock. */
  today: string;
  /** Opens "Update my plan". */
  onUpdate: () => void;
  onBack: () => void;
}

type Loaded = { state: 'loading' } | { state: 'error' } | { state: 'ready'; check: ProgressCheck };

export function CheckProgress({ db, protocol, today, onUpdate, onBack }: Props) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' });

  useEffect(() => {
    let alive = true;
    // Reads only. A stored row that fails the schema is left out and is not deleted.
    Promise.all([db.sessions.toArray(), loadGeneratorInputs(db)]).then(
      ([rows, inputs]) => alive && setLoaded({ state: 'ready', check: checkProgress({ sessions: readValidRows(rows).rows, inputs, protocol, today }) }),
      () => alive && setLoaded({ state: 'error' }),
    );
    return () => {
      alive = false;
    };
  }, [db, protocol, today]);

  const head = (
    <header className="page-head">
      <h1 id="check-title" tabIndex={-1}>
        {CHECK_SCREEN.title}
      </h1>
    </header>
  );
  const back = (
    <button type="button" className="btn" onClick={onBack}>
      <Icon name="arrow-left" size={18} />
      {CHECK_SCREEN.back}
    </button>
  );

  if (loaded.state !== 'ready') {
    return (
      <section aria-labelledby="check-title" className="narrow v2-screens v2-check">
        {head}
        {loaded.state === 'loading' ? (
          <div className="skeleton" aria-hidden="true">
            <span />
            <span />
          </div>
        ) : (
          <>
            <Notice role="alert" icon="triangle-alert">
              <p>{CHECK_SCREEN.readError}</p>
            </Notice>
            <div className="actions">{back}</div>
          </>
        )}
      </section>
    );
  }

  const { check } = loaded;
  const held = check.events.length > 0;
  return (
    <section aria-labelledby="check-title" className="narrow v2-screens v2-check">
      {head}
      <p className="lede">{CHECK_SCREEN.lede}</p>
      <p className="detail">{check.notApproved}</p>

      {held && (
        <section aria-labelledby="check-events" className="check-block">
          <h2 id="check-events">{CHECK_SCREEN.eventsTitle}</h2>
          <ul className="check-events">
            {check.events.map((e, i) => (
              <li key={`${e.day}-${e.kind}-${i}`}>{e.text}</li>
            ))}
          </ul>
          <Notice tone="strong" icon="heart-pulse">
            <p>{HOLD_EVENT}</p>
            {check.events.some((e) => e.kind === 'pain') && <p>{PAUSE_MESSAGE}</p>}
          </Notice>
        </section>
      )}

      <section aria-labelledby="check-time" className="check-block">
        <h2 id="check-time">{CHECK_SCREEN.timeTitle}</h2>
        {check.time.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      <section aria-labelledby="check-rows" className="check-block">
        <h2 id="check-rows">{CHECK_SCREEN.rowsTitle}</h2>
        <ul className="check-rows">
          {check.rows.map((row) => (
            <li key={row.id} className="check-row" data-type={row.type}>
              <span className="chip">{CHECK_SCREEN.types[row.type]}</span>
              <h3>{row.title}</h3>
              {row.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onUpdate}>
          <Icon name="refresh-cw" size={18} />
          {CHECK_SCREEN.update}
        </button>
        {back}
      </div>
      {!held && <p className="detail">{CHECK_SCREEN.again}</p>}
    </section>
  );
}
