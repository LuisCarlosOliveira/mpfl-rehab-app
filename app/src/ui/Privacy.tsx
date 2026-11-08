// FR18. The first launch shows this notice. The button sets the flag. Home links here.
// Source of the content: research/ux-flow.md section 3.1 (F1) and plan FR18.
import { markPrivacyNoticeSeen } from '../lib/storage';
import { Icon, type IconName } from './Icon';

const POINTS: { icon: IconName; text: string }[] = [
  { icon: 'video-off', text: 'No video leaves your device. The app does not record video and does not send video.' },
  { icon: 'users', text: 'A shared device means shared data. Anyone who uses this browser can see your sessions.' },
  { icon: 'file-text', text: 'The export file holds health data. Send it only to your care team.' },
  {
    icon: 'calendar-check',
    text: 'If you ask the app to make a plan, it keeps the date of your surgery and your answers on this device. They are in the export file. Erase removes them.',
  },
];

export function Privacy({ onDone }: { onDone: () => void }) {
  return (
    <section aria-labelledby="privacy-title" className="narrow">
      <header className="page-head">
        <h1 id="privacy-title" tabIndex={-1}>
          Privacy
        </h1>
      </header>
      <ul className="points">
        {POINTS.map((p) => (
          <li key={p.icon} className="point">
            <span className="point-icon">
              <Icon name={p.icon} size={24} />
            </span>
            <p>{p.text}</p>
          </li>
        ))}
      </ul>
      {/* A fixed same-origin link. The text and the target never come from file data (NFR10). The file is in public/. */}
      <p className="mt">
        <a href="/THIRD_PARTY_NOTICES.txt" target="_blank" rel="noopener noreferrer">
          Third-party software notices (opens in a new tab)
        </a>
      </p>
      <div className="actions">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => {
            markPrivacyNoticeSeen();
            onDone();
          }}
        >
          I understand
        </button>
      </div>
    </section>
  );
}
