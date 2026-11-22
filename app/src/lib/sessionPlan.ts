import { counterSetup } from './exercises';
import { usesCamera } from './monitor/engine';
import { isMonitored, isNumericKind } from './monitor/monitored';
import type { Exercise, PlanExercise } from './protocol';

export function sessionKinds(exercises: readonly PlanExercise[]): PlanExercise['kind'][] {
  return exercises.filter((e) => isMonitored(e.kind) && (!isNumericKind(e.kind) || counterSetup(e as Exercise).ok)).map((e) => e.kind);
}

export function keepsCamera(kinds: readonly string[], index: number): boolean {
  const here = kinds[index];
  const next = kinds[index + 1];
  return here !== undefined && next !== undefined && usesCamera(here) && usesCamera(next);
}
