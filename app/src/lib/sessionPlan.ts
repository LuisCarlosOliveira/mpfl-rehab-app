// Today's session: which exercises run, and when the camera stays on. Pure code.
import { counterSetup } from './exercises';
import { usesCamera } from './monitor/engine';
import { isMonitored, isNumericKind } from './monitor/monitored';
import type { Exercise, PlanExercise } from './protocol';

/**
 * The kinds that today's session runs, in plan order. An exercise with no definition has no Start on Home.
 * A numeric kind that still lacks a value of the protocol has none either (the same rule as the Start button).
 */
export function sessionKinds(exercises: readonly PlanExercise[]): PlanExercise['kind'][] {
  return exercises.filter((e) => isMonitored(e.kind) && (!isNumericKind(e.kind) || counterSetup(e as Exercise).ok)).map((e) => e.kind);
}

/** True when the exercise at `index` and the next one both use the camera. Then the camera stays on between them. */
export function keepsCamera(kinds: readonly string[], index: number): boolean {
  const here = kinds[index];
  const next = kinds[index + 1];
  return here !== undefined && next !== undefined && usesCamera(here) && usesCamera(next);
}
