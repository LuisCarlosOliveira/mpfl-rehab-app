import { PLAN_NAMES } from '../lib/planView';

export const EXERCISE_NAMES = PLAN_NAMES;

export const ANGLE_LABEL = 'estimated angle, not a medical measurement';

export const MEASURE_LABEL: Partial<Record<string, string>> = {
  'ankle-pump': 'Ankle angle',
  'leg-raise-side': 'Lift angle',
  'leg-raise-back': 'Lift angle',
};

export const NO_CAMERA_EFFORT = 'The camera cannot see this effort. The app times your hold.';

export const secondsText = (list: readonly number[]): string => `${list.join(', ')} ${list.length === 1 && list[0] === 1 ? 'second' : 'seconds'}`;

export type HoldDrop = 'too-short' | 'too-long' | 'list-full';
export const HOLD_DROP_TEXT: Record<HoldDrop, string> = {
  'too-short': 'A hold under 1 second was not saved.',
  'too-long': 'A hold over 1 hour was not saved.',
  'list-full': 'This session holds 50 holds. This hold was not saved.',
};
