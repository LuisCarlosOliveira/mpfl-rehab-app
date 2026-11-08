// The step indicator of the two pairing screens. It reuses the classes of the Setup indicator.
// The words are the same on the laptop and on the phone, so each screen only says where it is.
import { Fragment } from 'react';
import { Icon } from './Icon';

export const PAIR_STEPS = ['Start', 'Pair codes', 'Connected'] as const;

export function PairSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="steps" aria-label="Pairing steps">
      {PAIR_STEPS.map((label, i) => (
        <Fragment key={label}>
          {i > 0 && <li className="step-line" aria-hidden="true" />}
          <li className={i < current ? 'step step-done' : 'step'} aria-current={i === current ? 'step' : undefined}>
            <span className="step-dot">{i < current ? <Icon name="check" size={14} /> : i + 1}</span>
            {label}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
