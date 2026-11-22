// FR5. A tick list from RED_FLAGS (src/lib/redflags.ts). Any tick blocks the session and
// shows the message of its group. The block stays until the patient goes back to Home. Source of the copy: the project knowledge base.
import { useEffect, useRef, useState } from 'react';
import { GENERAL_GUIDANCE_NOTE, RED_FLAGS, evaluateRedFlags, type RedFlagGroup } from '../lib/redflags';
import { Icon, type IconName } from './Icon';
import { Notice } from './Notice';
import './flowV2.css';

const GROUPS: { id: RedFlagGroup; legend: string; icon: IconName }[] = [
  { id: 'emergency', legend: 'Call emergency services if any of these is true', icon: 'siren' },
  { id: 'care-team', legend: 'Contact your care team if any of these is true', icon: 'phone' },
];

interface Props {
  onClear: () => void;
  onBlocked: () => void;
  onCancel: () => void;
}

export function RedFlag({ onClear, onBlocked, onCancel }: Props) {
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [everTicked, setEverTicked] = useState<Record<string, boolean>>({});
  const result = evaluateRedFlags(everTicked);

  const counted = useRef(false);
  useEffect(() => {
    if (result.blocked && !counted.current) {
      counted.current = true;
      onBlocked();
    }
  }, [result.blocked, onBlocked]);

  return (
    <section aria-labelledby="redflag-title" className="narrow v2-flow v2-redflag">
      <header className="page-head">
        <h1 id="redflag-title" tabIndex={-1}>
          Check before you exercise
        </h1>
      </header>
      <div className="stack-s">
        <p className="lede">Tick each sentence that is true today.</p>
        <p className="detail">{GENERAL_GUIDANCE_NOTE}</p>
      </div>

      <div className="stack mt">
        {GROUPS.map((group) => (
          <fieldset key={group.id} className="choices">
            <legend>
              <Icon name={group.icon} size={22} />
              {group.legend}
            </legend>
            {RED_FLAGS.filter((f) => f.group === group.id).map((flag) => (
              <label key={flag.id} className="choice">
                <input
                  type="checkbox"
                  checked={ticked[flag.id] === true}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setTicked((t) => ({ ...t, [flag.id]: on }));
                    if (on) setEverTicked((t) => ({ ...t, [flag.id]: true }));
                  }}
                />
                <span>{flag.text}</span>
              </label>
            ))}
          </fieldset>
        ))}

      </div>

      {result.blocked && (
        <div className="redflag-after">
          <button type="button" className="btn btn-primary btn-lg" disabled>
            None of these apply. Continue
          </button>
        </div>
      )}

      <div className="action-bar" data-blocked={result.blocked ? 'true' : undefined}>
        <div role="alert" className="redflag-block">
          {result.blocked && (
            <Notice tone="strong" icon="triangle-alert" title={result.message}>
              <p className="detail">{GENERAL_GUIDANCE_NOTE}</p>
            </Notice>
          )}
        </div>
        {!result.blocked && (
          <button type="button" className="btn btn-primary btn-lg" onClick={onClear}>
            None of these apply. Continue
          </button>
        )}
        <button type="button" className="btn btn-lg" onClick={onCancel}>
          <Icon name="arrow-left" size={18} />
          Back to Home
        </button>
      </div>
    </section>
  );
}
