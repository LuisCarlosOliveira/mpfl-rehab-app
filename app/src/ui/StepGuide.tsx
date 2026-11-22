import { useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import './flowV2.css';

export interface GuideStep {
  icon: IconName;
  label: string;
  text: string;
}

interface Props {
  steps: readonly GuideStep[];
  /** The drawing for the current step, as a number from 1. It must hold the marks of that step. */
  figure: (step: number) => ReactNode;
}

export function StepGuide({ steps, figure }: Props) {
  const [index, setIndex] = useState(0);
  const [all, setAll] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const last = steps.length - 1;
  const here = steps[Math.min(Math.max(index, 0), last)];
  if (!here) return null;

  const go = (to: number) => {
    setIndex(Math.min(Math.max(to, 0), last));
    title.current?.focus();
  };

  return (
    <div className="v2-guide" data-step={index + 1}>
      <div className="guide-figure">{figure(index + 1)}</div>
      <h2 className="guide-title" tabIndex={-1} ref={title}>
        <span className="guide-count">
          Step {index + 1} of {steps.length}
        </span>
        <span className="visually-hidden">: </span>
        {here.label}
      </h2>
      <p className="guide-text">{here.text}</p>
      <div className="guide-nav">
        <button type="button" className="btn" disabled={index === 0} onClick={() => go(index - 1)}>
          <Icon name="arrow-left" size={18} />
          Back
        </button>
        <button type="button" className="btn btn-primary" disabled={index === last} onClick={() => go(index + 1)}>
          Next
          <Icon name="chevron-right" size={18} />
        </button>
      </div>
      <div className="guide-dots" role="group" aria-label="Steps of the guide">
        {steps.map((s, i) => (
          <button key={s.label} type="button" className="guide-dot" aria-current={i === index ? 'step' : undefined} aria-label={`Step ${i + 1}, ${s.label}`} title={s.label} onClick={() => go(i)}>
            {i + 1}
          </button>
        ))}
      </div>
      <button type="button" className="btn guide-all" aria-expanded={all} aria-controls="guide-all-steps" onClick={() => setAll((v) => !v)}>
        {all ? 'Hide all steps' : 'Show all steps'}
      </button>
      {all && (
        <dl className="guide-notes" id="guide-all-steps">
          {steps.map((n, i) => (
            <div key={n.label} className="guide-note">
              <dt>
                <span className="guide-num">{i + 1}</span>
                <Icon name={n.icon} size={22} />
                {n.label}
              </dt>
              <dd>{n.text}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
