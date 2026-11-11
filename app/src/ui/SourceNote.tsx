// The source of a number from a published guideline, as quiet lines under the group that it covers.
// The order is fixed: value, source, evidence, population, the label of the app, and a source that disagrees.
import { sourceLines, type SourceNoteId } from "../lib/planView";
import "./screensV2.css";

/** The label is optional. Without it, the first line is the value alone, as in a row that already names the exercise. */
const LABELS: Record<SourceNoteId, string> = {
  DOSE: "Sets and reps",
  SQUAT_DEPTH: "Mini squat depth",
  HOLD_P2: "Seated hold arc",
  RANGE_NONE: "Knee bend limit by week",
};

export function SourceNote({
  rule,
  label,
  scope,
  hideValue,
}: {
  rule: SourceNoteId;
  label?: string;
  scope?: readonly string[];
  hideValue?: boolean;
}) {
  const [value, ...rest] = sourceLines(rule);
  if (value === undefined) return null;
  return (
    <div className="v2-screens source-note">
      {hideValue !== true && (
        <p className="source-value">
          {[
            label,
            scope !== undefined && scope.length > 0
              ? scope.join(", ")
              : undefined,
            value,
          ]
            .filter((x) => x !== undefined)
            .join(": ")}
        </p>
      )}
      <ul className="source-lines" aria-label={`Source of: ${LABELS[rule]}`}>
        {rest.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/** The source notes of the numbers that the plan holds, as one group under the exercises. A row holds the value and no source. */
export function SourceNotes({
  made,
  scope,
}: {
  made: readonly string[];
  scope?: readonly string[];
}) {
  return (
    <>
      {(["DOSE", "SQUAT_DEPTH", "HOLD_P2"] as const)
        .filter((id) => made.includes(id))
        .map((id) => (
          <SourceNote
            key={id}
            rule={id}
            label={LABELS[id]}
            scope={id === "DOSE" ? scope : undefined}
          />
        ))}
    </>
  );
}
