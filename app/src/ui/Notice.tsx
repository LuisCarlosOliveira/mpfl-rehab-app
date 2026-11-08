// A notice block. A strong neutral accent, an icon and words. Never a green or red verdict colour.
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface Props {
  icon?: IconName;
  /** "strong" is the dark accent block. It carries the pause and emergency messages. */
  tone?: 'soft' | 'strong';
  role?: 'alert' | 'status' | 'note';
  title?: string;
  children?: ReactNode;
}

export function Notice({ icon = 'info', tone = 'soft', role, title, children }: Props) {
  return (
    <div className={tone === 'strong' ? 'notice notice-strong' : 'notice'} role={role}>
      <Icon name={icon} size={26} />
      <div>
        {title && <p className="notice-title">{title}</p>}
        {children}
      </div>
    </div>
  );
}
