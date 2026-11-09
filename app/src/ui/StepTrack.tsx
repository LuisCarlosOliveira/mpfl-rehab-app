// A row of short marks that shows the position in a form or a flow. It is a position mark and not a measure of progress.
// Every mark has the same colour. The current mark is taller and has a solid ink fill. There is no percent and no fill that grows.
import { Fragment } from 'react';

interface Props {
  /** The number of steps. A value that is not a whole number of 1 or more draws nothing. */
  total: number;
  /** The place of the current step, from 0. A value outside the range goes to the nearest end. */
  current: number;
  /** The name of the list for a screen reader, for example "Question 7 of 11". */
  label: string;
  /** Optional names. When given, each name shows inside its mark (the pairing steps use this). */
  names?: readonly string[];
}

export function StepTrack({ total, current, label, names }: Props) {
  const count = Number.isFinite(total) && total >= 1 ? Math.min(Math.floor(total), 50) : 0;
  const place = Number.isFinite(current) ? Math.min(Math.max(Math.floor(current), 0), count - 1) : 0;
  return (
    <ol className={names ? 'step-track step-track-named' : 'step-track'} aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <Fragment key={i}>
          <li className="step-mark" data-place={i < place ? 'past' : i === place ? 'now' : 'next'} aria-current={i === place ? 'step' : undefined}>
            {names && <span className="step-mark-name">{names[i]}</span>}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
