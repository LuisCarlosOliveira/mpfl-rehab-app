import { StepTrack } from './StepTrack';
import './screensV2.css';

interface Props {
  index: number;
  total: number;
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
