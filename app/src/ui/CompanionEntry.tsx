// The way into the phone screen. Home and the Load screen show it. It is a secondary action.
// The phone sends landmark numbers only. It records nothing and counts nothing, so no protocol and no red-flag check apply.
import { Icon } from './Icon';

export const COMPANION_BUTTON = 'Use this phone as the second camera';

export function CompanionEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="card" aria-labelledby="companion-entry-title">
      <h2 id="companion-entry-title">Second camera</h2>
      <p>
        This phone can be the second camera of the app on your laptop. It sends body points only. It records nothing and counts
        nothing.
      </p>
      <div className="actions">
        <button type="button" className="btn" onClick={onOpen}>
          <Icon name="phone" size={18} />
          {COMPANION_BUTTON}
        </button>
      </div>
    </section>
  );
}
