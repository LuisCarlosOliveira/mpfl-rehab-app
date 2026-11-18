// "Check my progress". A read-only screen: it shows the numbers of the person next to published guidelines
// (design docs/progression-evaluation-design.md, section 5). It saves nothing, sets no phase and gives no verdict.
// Every sentence comes from progressCheck.ts, so the word checks cover it.
import { useEffect, useState } from 'react';
import { ANGLE, checkProgress, CHECK_SCREEN, type ProgressCheck } from '../lib/progressCheck';
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
  const [counted, more] = [check.rows.filter((r) => r.type === 'measured'), check.rows.filter((r) => r.type !== 'measured')];
  // In the list of what the app can check, a line that an earlier row already shows (the peak angle, the camera error) shows once.
  const shown = new Set<string>();
  const rowView = (row: ProgressCheck['rows'][number], chip: boolean) => {
    const lines = chip ? row.lines : row.lines.filter((line) => !shown.has(line) && shown.add(line));
    return (
      <li key={row.id} className="check-row" data-type={row.type}>
        {chip && <span className="chip">{CHECK_SCREEN.types[row.type]}</span>}
        <h3>{row.title}</h3>
        {lines.map((line, i) => (
          <p key={line} className={i === 0 ? undefined : 'detail'}>
            {line}
          </p>
        ))}
      </li>
    );
  };
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

      <dl className="check-facts" aria-label="Where you are">
        {check.weekText !== null && (
          <div>
            <dt>{CHECK_SCREEN.weekLabel}</dt>
            <dd>{check.weekText}</dd>
          </div>
        )}
        <div>
          <dt>{CHECK_SCREEN.phaseLabel}</dt>
          <dd>{check.phase}</dd>
        </div>
        {check.surgeryDate !== null && (
          <div>
            <dt>{CHECK_SCREEN.dateLabel}</dt>
            <dd>{check.surgeryDate}</dd>
          </div>
        )}
      </dl>
      {check.surgeryDate !== null && <p className="detail">{CHECK_SCREEN.dateHelp}</p>}
      {check.notices.map((line) => (
        <p key={line}>{line}</p>
      ))}

      <section aria-labelledby="check-sessions" className="check-block">
        <h2 id="check-sessions">{CHECK_SCREEN.sessionsTitle}</h2>
        {check.recent.length === 0 ? (
          <p>{CHECK_SCREEN.noSessions}</p>
        ) : (
          <ul className="check-sessions">
            {check.recent.map((r, i) => (
              <li key={`${r.day}-${r.name}-${i}`}>
                <span className="num">{r.day}</span>
                <span className="check-name">{r.name}</span>
                {r.measure !== null && <span className="check-measure">{r.measure}</span>}
                {r.angle && <span className="detail check-angle">{ANGLE}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="check-rows" className="check-block">
        <h2 id="check-rows">{CHECK_SCREEN.checkTitle}</h2>
        <ul className="check-rows">{counted.map((row) => rowView(row, false))}</ul>
      </section>

      <details className="check-more">
        <summary>
          {CHECK_SCREEN.moreTitle}
          <span className="chev">
            <Icon name="chevron-down" size={22} />
          </span>
        </summary>
        {check.guidelines.length > 0 && (
          <div className="check-weeks">
            <h3>{CHECK_SCREEN.weeksTitle}</h3>
            {check.guidelines.map((line) => (
              <p key={line} className="detail">
                {line}
              </p>
            ))}
          </div>
        )}
        <ul className="check-rows">{more.map((row) => rowView(row, true))}</ul>
      </details>

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
