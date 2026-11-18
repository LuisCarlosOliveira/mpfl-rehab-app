// The measured numbers of one run, as a list. Summary shows it for the exercise that just ended.
// The session summary shows it for each exercise of today's session. Whole degrees, as the record stores them.
// No total, no verdict. The set lines list the reps of each set.
import type { ReactNode } from 'react';
import { PEAK_NO_VALUE_TEXT, peakUnreadable, topUnreadable } from '../lib/cues';
import type { Exercise } from '../lib/protocol';
import { plural } from '../lib/sets';
import type { ExerciseKind, RunSummary } from './appState';
import { ANGLE_LABEL, secondsText } from './labels';
import { storedWhole } from './sessionRecord';
import './flowV2.css';

interface Props {
  kind: ExerciseKind;
  summary: RunSummary;
  /** Shown after the numbers and before the set lines. Summary puts the pause message here (FR12). */
  between?: ReactNode;
}

const REPORT_LINE = { 'ankle-range': 'Largest ankle range', 'lift-angle': 'Largest lift angle' } as const;

export function RunStats({ kind, summary, between }: Props) {
  const sets = summary.sets ?? null;
  const topWhole = storedWhole(summary.topFlexion);
  const peakWhole = storedWhole(summary.peakFlexion);
  const overLimit = summary.eventCounts.overLimit; // the stored count: bends past the limit of the care team
  const unit = summary.holds === null ? 'rep' : 'hold';
  // The five new kinds. The values come from the engine (RunSummary.engine).
  const engine = summary.engine;
  const timedByPerson = engine?.timedBy === 'person';
  const holdList = engine?.holdList ?? [];
  const reportWhole = engine?.reportValue === undefined ? null : storedWhole(engine.reportValue);
  return (
    <>
      <dl className="stats">
        {summary.reps !== null && (
          <div className="stat">
            <dt>Reps counted</dt>
            <dd>
              <span className="num">{summary.reps}</span> <span className="unit">{plural(summary.reps, 'rep')}</span>
            </dd>
          </div>
        )}
        {summary.holds !== null && (
          <div className="stat">
            <dt>{timedByPerson ? 'Holds timed by you' : 'Holds counted'}</dt>
            <dd>
              <span className="num">{summary.holds}</span> <span className="unit">{plural(summary.holds, 'hold')}</span>
            </dd>
          </div>
        )}
        {engine?.reportKey !== undefined && reportWhole !== null && (
          <div className="stat">
            <dt>{REPORT_LINE[engine.reportKey]}</dt>
            <dd>
              <span className="num">{reportWhole}</span> <span className="unit">{plural(reportWhole, 'degree')}</span>
              <span className="detail">({ANGLE_LABEL})</span>
            </dd>
          </div>
        )}
        {summary.peakFlexion !== null && (
          <div className="stat">
            <dt>Highest knee bend</dt>
            {/* M8: a leg raise peak above the plausibility value is a camera misread. The record keeps the number. */}
            {peakUnreadable(kind as Exercise['kind'], summary.peakFlexion) /* peakFlexion is set by the four old kinds only */ ? (
              <dd>{PEAK_NO_VALUE_TEXT}</dd>
            ) : (
              <dd>
                <span className="num">{peakWhole}</span> <span className="unit">{plural(peakWhole, 'degree')}</span>
                <span className="detail">({ANGLE_LABEL})</span>
              </dd>
            )}
          </div>
        )}
        {/* U4: the angle at the top of a leg raise is its own line. It is the highest top angle of the sets, the number that the live screen showed. */}
        {kind === 'straight-leg-raise' && topWhole !== null && (
          <div className="stat">
            <dt>Angle at the top</dt>
            {topUnreadable(summary.topFlexion) ? (
              <dd>{PEAK_NO_VALUE_TEXT}</dd>
            ) : (
              <dd>
                <span className="num">{topWhole}</span> <span className="unit">{plural(topWhole, 'degree')}</span>
                <span className="detail">({ANGLE_LABEL})</span>
              </dd>
            )}
          </div>
        )}
      </dl>
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
