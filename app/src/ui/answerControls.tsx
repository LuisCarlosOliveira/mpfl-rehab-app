// The answer controls that the questions share: a radio group of cards, the limit question, the swelling question
// and the red-flag tick list. Onboarding and "Update my plan" use them, so the two screens ask in the same way.
import { useState } from 'react';
import { limitProblem, surgeryDateFromParts } from '../lib/onboarding';
import { surgeryDateWords } from '../lib/planView';
import { GENERAL_GUIDANCE_NOTE, RED_FLAGS, type RedFlagGroup } from '../lib/redflags';
import type { SwellingAnswer } from '../lib/safety';
import { Icon, type IconName } from './Icon';
import { RadioList } from './v3/RadioList';
import { SegmentedChoice } from './v3/SegmentedChoice';
import './formsV3.css';

export interface Choice {
  value: string;
  label: string;
}

interface GroupProps {
  /** The radio group name. It must be different for each question on one screen. */
  name: string;
  /** The question. It is the visible legend, so a screen reader reads it once. */
  legend: string;
  /** True puts a short list of answers (2 or 3) side by side as a segmented choice. Four or more answers, or long answers, stay one under the other. */
  row?: boolean;
  value: string | null;
  choices: readonly Choice[];
  onChange: (value: string) => void;
}

export function ChoiceGroup({ name, legend, row = false, value, choices, onChange }: GroupProps) {
  const Group = row ? SegmentedChoice : RadioList;
  return <Group name={name} legend={legend} value={value} options={choices} onChange={onChange} />;
}

const partsOf = (iso: string) => {
  const [y = '', m = '', d = ''] = iso.split('-');
  return iso === '' ? { day: '', month: '', year: '' } : { day: String(Number(d)), month: String(Number(m)), year: y };
};

/**
 * The date of surgery as three plain number fields: day, month and year. A native date field shows the format of the browser
 * and has a popup with a Today button, so the shown date and the kept date can differ. These fields have one meaning in every locale.
 * The value kept is the ISO date, and only when the three parts make a real date that is not in the future. Otherwise it is empty.
 * The line under the fields says the date in words. A click elsewhere or a blur never changes the value.
 * Onboarding and "Update my plan" use it. The app never uses today instead of a missing date.
 */
export function SurgeryDateField({ value, today, onChange }: { value: string; today: string; onChange: (value: string) => void }) {
  const [parts, setParts] = useState(() => partsOf(value));
  const [yearLeft, setYearLeft] = useState(false);
  const { iso, problem } = surgeryDateFromParts(parts.day, parts.month, parts.year, today);
  // A value from outside (for example the stored date that loads late) replaces the typed parts. The empty value keeps them.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== '' && value !== iso) setParts(partsOf(value));
  }
  const set = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    onChange(surgeryDateFromParts(next.day, next.month, next.year, today).iso ?? '');
  };
  // While the year is still being typed, 202 is not an error yet. A 4-digit year or a left year field shows the message.
  const shown = problem !== null && (parts.year.trim().length >= 4 || yearLeft || problem !== 'Enter a real date') ? problem : null;
  const words = iso === null ? null : surgeryDateWords(iso, today);
  const describedBy = shown !== null ? 'surgery-date-problem' : words !== null ? 'surgery-date-words' : undefined;
  const part = (key: keyof typeof parts, label: string, max: number, extra?: { onBlur: () => void }) => (
    <div className="field date-part" data-part={key}>
      <label htmlFor={`surgery-date-${key}`}>{label}</label>
      <input
        id={`surgery-date-${key}`}
        className="text-input"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={max}
        value={parts[key]}
        aria-invalid={shown !== null}
        aria-describedby={describedBy}
        onChange={(e) => set({ [key]: e.target.value })}
        onBlur={extra?.onBlur}
      />
    </div>
  );
  return (
    <fieldset className="v3-choice date-field">
      <legend>Date of surgery</legend>
      <div className="date-parts">
        {part('day', 'Day', 2)}
        {part('month', 'Month', 2)}
        {part('year', 'Year', 4, { onBlur: () => setYearLeft(true) })}
      </div>
      {shown !== null && (
        <p id="surgery-date-problem" className="detail date-problem" role="alert">
          {shown}
        </p>
      )}
      {words !== null && (
        <p id="surgery-date-words" className="date-words" role="status">
          {`You chose ${words}.`}
        </p>
      )}
    </fieldset>
  );
}

/** The three questions of the next exercises. Onboarding asks the same words (TITLES in Onboarding.tsx). A test pins the two to each other. */
export const GATE_QUESTIONS = {
  walking: 'Do you walk without crutches?',
  legRaise: 'Can you lift your leg with a straight knee, with no bend in the knee while the leg is up?',
  seatedHold: 'Did your surgeon say that you can do knee straightening exercises while you sit?',
} as const;

export const YES_NO_UNKNOWN: readonly Choice[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'I do not know' },
];
export const YES_NO: readonly Choice[] = YES_NO_UNKNOWN.slice(0, 2);

const SWELLING: readonly { value: SwellingAnswer; label: string }[] = [
  { value: 'none', label: 'No swelling' },
  { value: 'some', label: 'Some swelling' },
  { value: 'more', label: 'More than before' },
];

export function SwellingChoice({ name, value, onChange }: { name: string; value: SwellingAnswer | null; onChange: (v: SwellingAnswer) => void }) {
  return <SegmentedChoice name={name} legend="Is your knee swollen?" value={value} options={SWELLING} onChange={onChange} />;
}

type LimitKind = 'degrees' | 'none' | 'unknown';

interface LimitProps {
  name: string;
  kind: LimitKind | null;
  degrees: string;
  onKind: (kind: LimitKind) => void;
  onDegrees: (text: string) => void;
  /** The question. It is the visible legend. */
  legend: string;
}

const LIMIT_OPTIONS: readonly { value: LimitKind; label: string }[] = [
  { value: 'degrees', label: 'Yes, my limit is' },
  { value: 'none', label: 'No limit' },
  { value: 'unknown', label: 'I do not know' },
];

export function LimitChoice({ name, kind, degrees, onKind, onDegrees, legend }: LimitProps) {
  const problem = limitProblem(degrees);
  const problemId = `${name}-degrees-problem`;
  return (
    <RadioList name={name} legend={legend} value={kind} options={LIMIT_OPTIONS} onChange={onKind}>
      {kind === 'degrees' && (
        <div className="field limit-field">
          <label htmlFor={`${name}-degrees`}>Limit in degrees</label>
          <input
            id={`${name}-degrees`}
            className="text-input"
            type="number"
            inputMode="numeric"
            min={0}
            max={180}
            step={1}
            value={degrees}
            aria-invalid={problem !== null}
            aria-describedby={problem === null ? undefined : problemId}
            onChange={(e) => onDegrees(e.target.value)}
          />
          {problem !== null && (
            <p id={problemId} className="detail" role="alert">
              {problem}
            </p>
          )}
        </div>
      )}
    </RadioList>
  );
}

const GROUPS: { id: RedFlagGroup; legend: string; icon: IconName }[] = [
  { id: 'emergency', legend: 'Call emergency services if any of these is true', icon: 'siren' },
  { id: 'care-team', legend: 'Contact your care team if any of these is true', icon: 'phone' },
];

/** The same tick list as the check before an exercise (RED_FLAGS). A tick is an answer for the generator. It blocks nothing here. */
export function RedFlagChecklist({ ticked, onToggle }: { ticked: Record<string, boolean>; onToggle: (id: string, on: boolean) => void }) {
  return (
    <div className="v3-flags">
      <p className="detail">{GENERAL_GUIDANCE_NOTE}</p>
      {GROUPS.map((group) => (
        <fieldset key={group.id} className="v3-choice">
          <legend>
            <Icon name={group.icon} size={22} />
            {group.legend}
          </legend>
          <div className="v3-flag-list">
            {RED_FLAGS.filter((f) => f.group === group.id).map((flag) => (
              <label key={flag.id} className="v3-flag">
                <input type="checkbox" checked={ticked[flag.id] === true} onChange={(e) => onToggle(flag.id, e.target.checked)} />
                <span>{flag.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
