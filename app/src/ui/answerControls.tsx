// The answer controls that the questions share: a radio group of cards, the limit question, the swelling question
// and the red-flag tick list. Onboarding and "Update my plan" use them, so the two screens ask in the same way.
import { limitProblem } from '../lib/onboarding';
import { GENERAL_GUIDANCE_NOTE, RED_FLAGS, type RedFlagGroup } from '../lib/redflags';
import type { SwellingAnswer } from '../lib/safety';
import { Icon, type IconName } from './Icon';

export interface Choice {
  value: string;
  label: string;
}

interface GroupProps {
  /** The radio group name. It must be different for each question on one screen. */
  name: string;
  /** The question. It is read by a screen reader and hidden when a heading shows it. */
  legend: string;
  /** True shows the legend as the visible question. The legend stays the one name of the group, so a screen reader reads it once. */
  showLegend?: boolean;
  value: string | null;
  choices: readonly Choice[];
  onChange: (value: string) => void;
}

export function ChoiceGroup({ name, legend, showLegend = false, value, choices, onChange }: GroupProps) {
  return (
    <fieldset className="choices">
      <legend className={showLegend ? undefined : 'visually-hidden'}>{legend}</legend>
      <div className="options options-stack">
        {choices.map((c) => (
          <label key={c.value} className="option">
            <input type="radio" name={name} checked={value === c.value} onChange={() => onChange(c.value)} />
            <span>{c.label}</span>
          </label>
        ))}
      </div>
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
  return (
    <fieldset className="choices">
      <legend>
        <Icon name="stethoscope" size={22} />
        Is your knee swollen?
      </legend>
      <div className="options">
        {SWELLING.map((s) => (
          <label key={s.value} className="option">
            <input type="radio" name={name} checked={value === s.value} onChange={() => onChange(s.value)} />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface LimitProps {
  name: string;
  kind: 'degrees' | 'none' | 'unknown' | null;
  degrees: string;
  onKind: (kind: 'degrees' | 'none' | 'unknown') => void;
  onDegrees: (text: string) => void;
  /** The legend for a screen reader. */
  legend: string;
}

export function LimitChoice({ name, kind, degrees, onKind, onDegrees, legend }: LimitProps) {
  const problem = limitProblem(degrees);
  const problemId = `${name}-degrees-problem`;
  return (
    <fieldset className="choices">
      <legend className="visually-hidden">{legend}</legend>
      <div className="options options-stack">
        <label className="option">
          <input type="radio" name={name} checked={kind === 'degrees'} onChange={() => onKind('degrees')} />
          <span>Yes, my limit is</span>
        </label>
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
        <label className="option">
          <input type="radio" name={name} checked={kind === 'none'} onChange={() => onKind('none')} />
          <span>No limit</span>
        </label>
        <label className="option">
          <input type="radio" name={name} checked={kind === 'unknown'} onChange={() => onKind('unknown')} />
          <span>I do not know</span>
        </label>
      </div>
    </fieldset>
  );
}

const GROUPS: { id: RedFlagGroup; legend: string; icon: IconName }[] = [
  { id: 'emergency', legend: 'Call emergency services if any of these is true', icon: 'siren' },
  { id: 'care-team', legend: 'Contact your care team if any of these is true', icon: 'phone' },
];

/** The same tick list as the check before an exercise (RED_FLAGS). A tick is an answer for the generator. It blocks nothing here. */
export function RedFlagChecklist({ ticked, onToggle }: { ticked: Record<string, boolean>; onToggle: (id: string, on: boolean) => void }) {
  return (
    <div className="stack">
      <p className="detail">{GENERAL_GUIDANCE_NOTE}</p>
      {GROUPS.map((group) => (
        <fieldset key={group.id} className="choices">
          <legend>
            <Icon name={group.icon} size={22} />
            {group.legend}
          </legend>
          {RED_FLAGS.filter((f) => f.group === group.id).map((flag) => (
            <label key={flag.id} className="choice">
              <input type="checkbox" checked={ticked[flag.id] === true} onChange={(e) => onToggle(flag.id, e.target.checked)} />
              <span>{flag.text}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
