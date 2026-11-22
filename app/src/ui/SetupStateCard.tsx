import type { ReactNode, Ref } from 'react';
import { Icon, type IconName } from './Icon';

interface Props {
  icon: IconName;
  line: string;
  help?: string;
  className?: string;
  role?: 'status';
  focusRef?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export function SetupStateCard({ icon, line, help, className, role, focusRef, children }: Props) {
  return (
    <div className={className ? `setup-state ${className}` : 'setup-state'} role={role} tabIndex={focusRef ? -1 : undefined} ref={focusRef}>
      <Icon name={icon} size={36} />
      <p className="setup-line">{line}</p>
      {help !== undefined && help !== '' && <p className="setup-help">{help}</p>}
      {children}
    </div>
  );
}
