import { StepTrack } from './StepTrack';

export const PAIR_STEPS = ['Start', 'Pair codes', 'Connected'] as const;

export function PairSteps({ current }: { current: 0 | 1 | 2 }) {
  return <StepTrack total={PAIR_STEPS.length} current={current} label="Pairing steps" names={PAIR_STEPS} />;
}
