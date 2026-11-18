// The place in today's session: "Exercise 3 of 6" and one mark for each exercise. It marks a position and measures nothing.
// It reuses StepTrack: every mark has the same ink and nothing fills up. `detail` names the sets of the present exercise.
import { StepTrack } from './StepTrack';
import './screensV2.css';

interface Props {
  /** The place of the present exercise, from 0. */
  index: number;
  total: number;
  /** A short line next to the place, for example "Set 2 of 3" or "3 sets". */
  detail?: string | null;
}

export function PlanProgress({ index, total, detail }: Props) {
  const label = `Exercise ${index + 1} of ${total}`;
  return (
    <div className="plan-progress v2-flow v2-screens">
      <p className="plan-progress-line">
        <span className="plan-progress-count">{label}</span>
        {detail && <span className="detail">{detail}</span>}
      </p>
      <StepTrack total={total} current={index} label={label} />
    </div>
  );
}
