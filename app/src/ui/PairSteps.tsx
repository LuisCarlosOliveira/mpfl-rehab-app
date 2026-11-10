// The step track of the two pairing screens. The words are the same on the laptop and on the phone, so each screen only says where it is.
// It is a position mark, with the name of each step inside its mark (see StepTrack).
import { StepTrack } from './StepTrack';

export const PAIR_STEPS = ['Start', 'Pair codes', 'Connected'] as const;

export function PairSteps({ current }: { current: 0 | 1 | 2 }) {
  return <StepTrack total={PAIR_STEPS.length} current={current} label="Pairing steps" names={PAIR_STEPS} />;
}
