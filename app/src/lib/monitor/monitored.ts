// Which exercises the app can run with the camera today. The plan lists nine exercises. The engine runs four.
// Step D (after the engine of Step B and the guides of Step C) adds the five new kinds here, and Start shows for them.
import { EXERCISE_KINDS, type Exercise, type PlanExercise } from '../protocol/schema';

const MONITORED: readonly string[] = EXERCISE_KINDS;

/** True when the app can run this exercise with the camera now. Home shows Start only then. */
export function isMonitored(kind: string): boolean {
  return MONITORED.includes(kind);
}

/** The type guard for code that needs the four-kind type of the engine. It holds for the same kinds as isMonitored. */
export const isEngineExercise = (e: PlanExercise): e is Exercise => isMonitored(e.kind);

/** True for a stored or planned kind that the engine knows. For the four-kind type of cues.ts and exercises.ts. */
export const isEngineKind = (kind: string): kind is Exercise['kind'] => isMonitored(kind);
