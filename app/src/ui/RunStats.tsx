import type { ReactNode } from 'react';
import { PEAK_NO_VALUE_TEXT, peakUnreadable, topUnreadable } from '../lib/cues';
import type { Exercise } from '../lib/protocol';
import { plural } from '../lib/sets';
import type { ExerciseKind, RunSummary } from './appState';
import { ANGLE_LABEL, secondsText } from './labels';
import { storedWhole } from './sessionRecord';
import { BigNumber } from './v3/BigNumber';
import './flowV2.css';
import './liveV3.css';

interface Props {
  kind: ExerciseKind;
  summary: RunSummary;
  between?: ReactNode;
}

const REPORT_LINE = { 'ankle-range': 'Largest ankle range', 'lift-angle': 'Largest lift angle' } as const;

export function RunStats({ kind, summary, between }: Props) {
  const sets = summary.sets ?? null;
  const topWhole = storedWhole(summary.topFlexion);
  const peakWhole = storedWhole(summary.peakFlexion);
  const overLimit = summary.eventCounts.overLimit;
  const unit = summary.holds === null ? 'rep' : 'hold';
  const engine = summary.engine;
  const timedByPerson = engine?.timedBy === 'person';
  const holdList = engine?.holdList ?? [];
  const reportWhole = engine?.reportValue === undefined ? null : storedWhole(engine.reportValue);
  const note = `(${ANGLE_LABEL})`;
  return (
    <>
      <div className="v3 stats run-stats">
        {summary.reps !== null && <BigNumber label="Reps counted" value={summary.reps} unit={plural(summary.reps, 'rep')} tone="primary" />}
        {summary.holds !== null && (
          <BigNumber label={timedByPerson ? 'Holds timed by you' : 'Holds counted'} value={summary.holds} unit={plural(summary.holds, 'hold')} tone="primary" />
        )}
        {engine?.reportKey !== undefined && reportWhole !== null && (
          <BigNumber label={REPORT_LINE[engine.reportKey]} value={reportWhole} unit={plural(reportWhole, 'degree')} note={note} />
        )}
        {summary.peakFlexion !== null && (
          <BigNumber
            label="Highest knee bend"
            value={peakUnreadable(kind as Exercise['kind'], summary.peakFlexion) ? null : peakWhole}
            unit={plural(peakWhole, 'degree')}
            note={note}
            missingReason={PEAK_NO_VALUE_TEXT}
          />
        )}
        {kind === 'straight-leg-raise' && topWhole !== null && (
          <BigNumber label="Angle at the top" value={topUnreadable(summary.topFlexion) ? null : topWhole} unit={plural(topWhole, 'degree')} note={note} missingReason={PEAK_NO_VALUE_TEXT} />
        )}
      </div>
      {timedByPerson && (
        <div className="stack-s">
          {holdList.length > 0 && <p>{`Holds: ${secondsText(holdList)}`}</p>}
          <p className="detail">The camera did not check these holds.</p>
        </div>
      )}
      {between}
      {sets !== null && sets.prescription.reps !== undefined && (
        <ul className="set-list" aria-label="Reps in each set">
          {sets.repsPerSet.map((n, i) => (
            <li key={i}>
              <span>Set {i + 1}:</span>{' '}
              <span className="set-count">
                <span className="num">{n}</span> {plural(n, unit)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {overLimit > 0 && <p>{`Bends past your limit: ${overLimit}.`}</p>}
      {summary.reps === 0 && <p>{overLimit > 0 ? 'No repetitions were counted. Bends past your limit do not count.' : 'No repetitions were counted.'}</p>}
    </>
  );
}
