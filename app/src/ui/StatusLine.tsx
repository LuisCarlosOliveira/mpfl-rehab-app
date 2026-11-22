import { Icon, type IconName } from './Icon';

interface Props {
  icon: IconName;
  text: string;
  className?: string;
}

export function StatusLine({ icon, text, className }: Props) {
  const cls = className ? `status-line ${className}` : 'status-line';
  return (
    <p role="status" className={cls}>
      {text !== '' && (
        <>
          <Icon name={icon} size={20} />
          <span key={text} className="status-word">
            {text}
          </span>
        </>
      )}
    </p>
  );
}
