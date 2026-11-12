// Plain names for the exercise kinds (plan FR9).
import { PLAN_NAMES } from '../lib/planView';

/** The plain name of every exercise that a plan or a stored session can hold. */
export const EXERCISE_NAMES = PLAN_NAMES;

export const ANGLE_LABEL = 'estimated angle, not a medical measurement';

/** The name of the measured value of a kind that the camera measures (the definition of lib/monitor/registry.ts). The four old kinds use "Knee bend". */
export const MEASURE_LABEL: Partial<Record<string, string>> = {
  'ankle-pump': 'Ankle angle',
  'leg-raise-side': 'Lift angle',
  'leg-raise-back': 'Lift angle',
};

export const NO_CAMERA_EFFORT = 'The camera cannot see this effort. The app times your hold.';

/** "5, 8, 6 seconds": the holds that the person timed, in whole seconds. */
export const secondsText = (list: readonly number[]): string => `${list.join(', ')} ${list.length === 1 && list[0] === 1 ? 'second' : 'seconds'}`;

/** Why a press pair saved no hold. One polite line shows it until the next start. */
export type HoldDrop = 'too-short' | 'too-long' | 'list-full';
export const HOLD_DROP_TEXT: Record<HoldDrop, string> = {
  'too-short': 'A hold under 1 second was not saved.',
  'too-long': 'A hold over 1 hour was not saved.',
  'list-full': 'This session holds 50 holds. This hold was not saved.',
};
