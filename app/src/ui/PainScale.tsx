import { Icon } from './Icon';
import './flowV2.css';

const NOT_ANSWERED = 'Not answered';

const PAIN_VALUES = Array.from({ length: 11 }, (_, i) => i);

interface Props {
  /** The radio group name. It must be different for each question on one screen. */
  name: string;
  value: number | null;
  onChange: (value: number) => void;
}

export function PainScale({ name, value, onChange }: Props) {
  return (
    <fieldset className="choices v2-pain">
      <legend>
        <Icon name="activity" size={22} />
        How much pain do you have now? 0 is no pain. 10 is the worst pain.
      </legend>
      <p className="pain-readout" data-testid="pain-readout">
        {value === null || !Number.isFinite(value) ? (
          <span className="pain-none">{NOT_ANSWERED}</span>
        ) : (
          <>
            <span className="num">{value}</span> <span className="pain-of">out of 10</span>
          </>
        )}
      </p>
      <div className="scale">
        {PAIN_VALUES.map((v) => (
          <label key={v} className="scale-item">
            <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />
            <span className="num">{v}</span>
          </label>
        ))}
      </div>
      <p className="scale-ends" aria-hidden="true">
        <span>No pain</span>
        <span>Worst pain</span>
      </p>
    </fieldset>
  );
}
