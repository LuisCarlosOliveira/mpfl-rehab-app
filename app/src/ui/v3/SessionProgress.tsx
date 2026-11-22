import './parts.css';

interface Props {
  total: number;
  current: number;
  unit: 'Exercise' | 'Step';
  set?: { current: number; total: number };
}

export function SessionProgress({ total, current, unit, set }: Props) {
  const now = Math.min(Math.max(current, 1), Math.max(total, 1));
  const text = `${unit} ${now} of ${total}${set ? `, set ${set.current} of ${set.total}` : ''}`;
  return (
    <div className="v3-progress">
      <div role="progressbar" aria-label="Session progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={now} aria-valuetext={text}>
        <div className="v3-segs" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <i key={i} data-seg={i + 1 < now ? 'done' : i + 1 === now ? 'now' : 'later'} />
          ))}
        </div>
      </div>
      <p className="v3-progress-text">{text}</p>
    </div>
  );
}
