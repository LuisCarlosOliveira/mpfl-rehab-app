import type { ReactNode } from 'react';
import './parts.css';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export interface ChoiceProps<T extends string> {
  /** The radio group name. It must differ for each question on one screen. */
  name: string;
  legend: string;
  value: T | null;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  children?: ReactNode;
}

export function ChoiceGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="v3-choice">
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

export function ChoiceInput<T extends string>({ name, option, checked, onChange, className }: { name: string; option: ChoiceOption<T>; checked: boolean; onChange: (v: T) => void; className: string }) {
  return (
    <label className={className}>
      <input type="radio" name={name} value={option.value} checked={checked} onChange={() => onChange(option.value)} />
      <span>
        {option.label}
        {option.hint && <small>{option.hint}</small>}
      </span>
    </label>
  );
}
