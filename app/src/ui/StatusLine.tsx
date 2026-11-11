// A status line: one shape and one word (A4). It is a polite live region.
// The word is a new element each time it changes, so the CSS swap runs again. The swap is opacity (and a 2 px blur).
// It never plays a sound. With no text the line is empty, so the live region exists but shows nothing.
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
