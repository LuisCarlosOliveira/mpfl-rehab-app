// Draws a QR code as one svg with one path. The text never goes into HTML.
// The QR code holds a one-time secret, so it is only drawn and never saved as an image.
import { encode } from 'uqr';
import './qr.css';

const QUIET_ZONE = 4; // modules, the QR standard
const MAX_VERSION = 11; // qr-pairing.md section 4: a phone scans this size from a laptop screen

/** One path command for each run of dark modules in a row. */
function runsPath(matrix: boolean[][]): string {
  const parts: string[] = [];
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x++;
      parts.push(`M${start + QUIET_ZONE} ${y + QUIET_ZONE}h${x - start}v1h-${x - start}z`);
    }
  });
  return parts.join('');
}

export function QrCode({ text, label }: { text: string; label: string }) {
  let matrix: boolean[][];
  try {
    matrix = encode(text, { ecc: 'M', maxVersion: MAX_VERSION, border: 0 }).data;
  } catch {
    return <p className="qr-message">The pairing code is too long to show. The app continues with one camera.</p>;
  }
  const size = matrix.length + QUIET_ZONE * 2;
  return (
    <div className="qr-frame">
      <svg className="qr-svg" role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
        <rect className="qr-light" width={size} height={size} />
        <path className="qr-dark" d={runsPath(matrix)} />
      </svg>
    </div>
  );
}
