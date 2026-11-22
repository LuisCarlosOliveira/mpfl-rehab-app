import { useId, type ComponentProps } from 'react';
import './parts.css';

interface Props {
  label: string;
  value: number | null;
  unit: string;
  note?: string;
  tone?: 'ink' | 'primary';
  missingReason?: string;
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
