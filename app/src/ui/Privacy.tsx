// FR18. The first launch shows this notice. The button sets the flag. Home links here.
// Source of the content: research/ux-flow.md section 3.1 (F1) and plan FR18.
import { markPrivacyNoticeSeen } from '../lib/storage';

export function Privacy({ onDone }: { onDone: () => void }) {
  return (
    <section aria-labelledby="privacy-title">
      <h1 id="privacy-title" tabIndex={-1}>
        Privacy
      </h1>
      <ul className="plain-list">
        <li>No video leaves your device. The app does not record video and does not send video.</li>
        <li>A shared device means shared data. Anyone who uses this browser can see your sessions.</li>
        <li>The export file holds health data. Send it only to your care team.</li>
      </ul>
      {/* A fixed same-origin link. The text and the target never come from file data (NFR10). The file is in public/. */}
      <p>
        <a href="/THIRD_PARTY_NOTICES.txt" target="_blank" rel="noopener noreferrer">
          Third-party software notices (opens in a new tab)
        </a>
      </p>
      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
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
