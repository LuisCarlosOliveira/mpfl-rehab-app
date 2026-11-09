// The step card of the Setup camera (A3). One state line and an optional help line. The text comes from setupView.ts.
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface Props {
  icon: IconName;
  line: string;
  help?: string;
  className?: string;
  role?: 'status';
  children?: ReactNode;
}

export function SetupStateCard({ icon, line, help, className, role, children }: Props) {
  return (
    <div className={className ? `setup-state ${className}` : 'setup-state'} role={role}>
      <Icon name={icon} size={36} />
      <p className="setup-line">{line}</p>
      {help !== undefined && help !== '' && <p className="setup-help">{help}</p>}
      {children}
    </div>
  );
}
