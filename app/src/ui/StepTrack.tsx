import { Fragment } from 'react';

interface Props {
  total: number;
  current: number;
  label: string;
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
