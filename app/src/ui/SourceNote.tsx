// The source of a number from a published guideline, as quiet lines under the group that it covers.
// The order is fixed: value, source, evidence, population, the label of the app, and a source that disagrees.
import { sourceLines, type SourceNoteId } from '../lib/planView';
import './screensV2.css';

export function SourceNote({ rule, label }: { rule: SourceNoteId; label: string }) {
  const [value, ...rest] = sourceLines(rule);
  if (value === undefined) return null;
  return (
    <div className="v2-screens source-note">
      <p className="source-value">
        {label}: {value}
      </p>
      <ul className="source-lines" aria-label={`Source of: ${label}`}>
        {rest.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
