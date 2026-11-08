// Plain names for the exercise kinds (plan FR9).
import type { Exercise } from '../lib/protocol';

export const EXERCISE_NAMES: Record<Exercise['kind'], string> = {
  'heel-slide': 'Heel slide',
  'straight-leg-raise': 'Straight leg raise',
  'mini-squat': 'Mini squat',
  'seated-extension-hold': 'Seated knee extension hold',
};

export const ANGLE_LABEL = 'estimated angle, not a medical measurement';
