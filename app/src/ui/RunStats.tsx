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
import { BigNumber } from './v3/BigNumber';
import './flowV2.css';
import './liveV3.css';

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
          /* M8: a leg raise peak above the plausibility value is a camera misread. The record keeps the number. */
          /* peakFlexion is set by the four old kinds only */
          <BigNumber
            label="Highest knee bend"
            value={peakUnreadable(kind as Exercise['kind'], summary.peakFlexion) ? null : peakWhole}
            unit={plural(peakWhole, 'degree')}
            note={note}
            missingReason={PEAK_NO_VALUE_TEXT}
          />
        )}
        {/* U4: the angle at the top of a leg raise is its own line. It is the highest top angle of the sets, the number that the live screen showed. */}
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
