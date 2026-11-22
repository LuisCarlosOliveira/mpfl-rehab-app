import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import './flowV2.css';

export interface SegOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  /** The radio group name. It must be different for each question on one screen. */
  name: string;
  legend: string;
  icon?: IconName;
  value: T | null;
  options: readonly SegOption<T>[];
  onChange: (value: T) => void;
  children?: ReactNode;
}

export function Segmented<T extends string>({ name, legend, icon, value, options, onChange, children }: Props<T>) {
  return (
    <fieldset className="v2-seg">
      <legend>
        {icon && <Icon name={icon} size={20} />}
        {legend}
      </legend>
      <div className="seg-track" data-count={options.length}>
        {options.map((o) => (
          <label key={o.value} className="seg-cell">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>
              {o.label}
              {o.hint && <small className="seg-hint">{o.hint}</small>}
            </span>
          </label>
        ))}
      </div>
      {children}
    </fieldset>
  );
}
