import { useEffect, useRef, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { focusHeading } from './focusHeading';
import './screensV2.css';

export interface StateAction {
  label: string;
  icon?: IconName;
  onClick: () => void;
}

interface Props {
  icon: IconName;
  title: string;
  children: ReactNode;
  primary: StateAction;
  secondary?: StateAction;
  /** The id of the heading. It must be unique on the screen. */
  id?: string;
}

export function StateScreen({ icon, title, children, primary, secondary, id = 'state-title' }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeading(heading.current), []);
  return (
    <section aria-labelledby={id} className="v2-screens state-screen">
      <span className="state-icon" aria-hidden="true">
        <Icon name={icon} size={36} />
      </span>
      <h1 id={id} tabIndex={-1} ref={heading}>
        {title}
      </h1>
      <p>{children}</p>
      <div className="state-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={primary.onClick}>
          {primary.icon && <Icon name={primary.icon} size={18} />}
          {primary.label}
        </button>
        {secondary && (
          <button type="button" className="btn btn-lg" onClick={secondary.onClick}>
            {secondary.icon && <Icon name={secondary.icon} size={18} />}
            {secondary.label}
          </button>
        )}
      </div>
    </section>
  );
}
