// The banners of src/lib/mode.ts. The shell shows them above every screen.
import { Icon } from './Icon';

export function Banners({ texts }: { texts: string[] }) {
  if (texts.length === 0) return null;
  return (
    <section className="banners" aria-label="Notices">
      <div className="banners-inner">
        {texts.map((text) => (
          <p key={text} className="banner" role="note">
            <Icon name="info" size={16} />
            {text}
          </p>
        ))}
      </div>
    </section>
  );
}
