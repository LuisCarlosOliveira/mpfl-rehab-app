// The way into the phone screen. Home and the Load screen show it. It is a secondary action.
// The phone sends landmark numbers only. It records nothing and counts nothing, so no protocol and no red-flag check apply.
import { Icon } from './Icon';
import './screensV2.css';

export const COMPANION_BUTTON = 'Use this phone as the second camera';

export function CompanionEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="v2-screens companion-entry" aria-labelledby="companion-entry-title">
      <h2 id="companion-entry-title" className="visually-hidden">
        Second camera
      </h2>
      <button type="button" className="action-row" onClick={onOpen} aria-labelledby="companion-button-name" aria-describedby="companion-button-detail">
        <Icon name="phone" size={24} />
        <span className="row-text">
          <span className="row-title" id="companion-button-name">
            {COMPANION_BUTTON}
          </span>
          <span className="row-detail" id="companion-button-detail">It sends body points only. It records nothing and counts nothing.</span>
        </span>
        <Icon name="chevron-right" size={20} />
      </button>
    </section>
  );
}
