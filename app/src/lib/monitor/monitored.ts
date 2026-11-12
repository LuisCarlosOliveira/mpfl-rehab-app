// Which exercises the app can run with the camera. The camera monitors every exercise that has a definition (user decision 2026-11-12).
// A future exercise needs a definition in registry.ts and no change here.
import { EXERCISE_KINDS, type Exercise, type PlanExercise } from '../protocol/schema';
import { specFor } from './registry';

/** True when the registry holds a definition for this kind. Home shows Start only then. */
export function isMonitored(kind: string): boolean {
  return specFor(kind) !== undefined;
}

/** True for the four kinds that a plan sets with numbers (the type Exercise). The counter set-up of exercises.ts covers these four. */
export const isNumericKind = (kind: string): kind is Exercise['kind'] => (EXERCISE_KINDS as readonly string[]).includes(kind);

/** The type guard for code that needs the four-kind type Exercise. The five new kinds are monitored but are not Exercise. */
export const isEngineExercise = (e: PlanExercise): e is Exercise => isNumericKind(e.kind);

/** True for a stored or planned kind of the four-kind type. For the four-kind type of cues.ts and exercises.ts. */
export const isEngineKind = (kind: string): kind is Exercise['kind'] => isNumericKind(kind);
