import { EXERCISE_KINDS, type Exercise, type PlanExercise } from '../protocol/schema';
import { specFor } from './registry';

export function isMonitored(kind: PlanExercise['kind']): boolean {
  return specFor(kind) !== undefined;
}

export const isNumericKind = (kind: string): kind is Exercise['kind'] => (EXERCISE_KINDS as readonly string[]).includes(kind);

export const isEngineExercise = (e: PlanExercise): e is Exercise => isNumericKind(e.kind);

export const isEngineKind = (kind: string): kind is Exercise['kind'] => isNumericKind(kind);
