// FR5. A tick list from RED_FLAGS (src/lib/redflags.ts). Any tick blocks the session and
// shows the message of its group. Source of the copy: research/ux-flow.md section 8.3.
import { useEffect, useRef, useState } from 'react';
import { GENERAL_GUIDANCE_NOTE, RED_FLAGS, evaluateRedFlags, type RedFlagGroup } from '../lib/redflags';

const GROUPS: { id: RedFlagGroup; legend: string }[] = [
  { id: 'emergency', legend: 'Call emergency services if any of these is true' },
  { id: 'care-team', legend: 'Contact your care team if any of these is true' },
];

interface Props {
  onClear: () => void;
  onBlocked: () => void;
  onCancel: () => void;
}

export function RedFlag({ onClear, onBlocked, onCancel }: Props) {
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const result = evaluateRedFlags(ticked);

  // Count one block for each visit, not one for each tick.
  const counted = useRef(false);
  useEffect(() => {
    if (result.blocked && !counted.current) {
      counted.current = true;
      onBlocked();
    }
  }, [result.blocked, onBlocked]);

  return (
    <section aria-labelledby="redflag-title">
      <h1 id="redflag-title" tabIndex={-1}>
        Check before you exercise
      </h1>
      <p>Tick each sentence that is true today.</p>
      <p className="detail">{GENERAL_GUIDANCE_NOTE}</p>

      {GROUPS.map((group) => (
        <fieldset key={group.id} className="choices">
          <legend>{group.legend}</legend>
          {RED_FLAGS.filter((f) => f.group === group.id).map((flag) => (
            <label key={flag.id} className="choice">
              <input
                type="checkbox"
                checked={ticked[flag.id] === true}
                onChange={(e) => setTicked((t) => ({ ...t, [flag.id]: e.target.checked }))}
              />
              <span>{flag.text}</span>
            </label>
          ))}
        </fieldset>
      ))}

      <div role="alert">
        {result.blocked && (
          <div className="attention">
            <p className="attention-title">{result.message}</p>
            <p className="detail">{GENERAL_GUIDANCE_NOTE}</p>
          </div>
        )}
      </div>

      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={result.blocked} onClick={onClear}>
          None of these apply. Continue
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Back to Home
        </button>
      </div>
    </section>
  );
}
