// One live number with its label, its unit and an optional note. The size is fluid and the box never grows past its column.
// A null value shows "--" and the reason in words, and no unit, so a blank is not read as zero.
import { useId, type ComponentProps } from 'react';
import './parts.css';

interface Props {
  label: string;
  value: number | null;
  unit: string;
  note?: string;
  tone?: 'ink' | 'primary';
  missingReason?: string;
  /** Props for the line that holds the number, for example a ref and tabIndex to take the focus, aria-live or a test id. */
  valueProps?: Omit<ComponentProps<'p'>, 'className' | 'children'> & { 'data-testid'?: string };
}

export function BigNumber({ label, value, unit, note, tone = 'ink', missingReason, valueProps }: Props) {
  const id = useId();
  return (
    <div className="v3-metric" role="group" aria-labelledby={id} data-tone={tone} data-missing={value === null ? '' : undefined}>
      <p className="v3-metric-label" id={id}>
        {label}
      </p>
      {value === null ? (
        <>
          <p className="v3-num" {...valueProps}>
            <b>--</b>
          </p>
          {missingReason && <p className="v3-metric-note">{missingReason}</p>}
        </>
      ) : (
        <p className="v3-num" {...valueProps}>
          <b>{new Intl.NumberFormat().format(value)}</b>
          <span>{unit}</span>
        </p>
      )}
      {note && <p className="v3-metric-note">{note}</p>}
    </div>
  );
}
