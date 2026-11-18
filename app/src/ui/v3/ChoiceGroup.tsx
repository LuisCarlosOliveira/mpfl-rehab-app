// The base of SegmentedChoice, RadioList and later the pain scale: one fieldset, one legend, real radio inputs.
// Children are the options. Text that belongs to the question goes under them, inside the fieldset.
import type { ReactNode } from 'react';
import './parts.css';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** A short second line inside the label, so it is part of the accessible name. */
  hint?: string;
}

export interface ChoiceProps<T extends string> {
  /** The radio group name. It must differ for each question on one screen. */
  name: string;
  legend: string;
  value: T | null;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  /** Notes that belong to the question. */
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

/** One real radio input. The whole label is the hit target. The look comes from the sibling span. */
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
