// Which exercises the new modes of the engine run, and which landmarks the person check needs for them (Step B).
import type { ExerciseSpec, Need } from './spec';
import { REGISTRY, specFor } from './registry';

/** True for a definition that the new modes run: person-timer, reps-cycle, and a lift that measures a segment angle. The straight leg raise has its own gate. */
export const usesNewEngine = (spec: ExerciseSpec): boolean =>
  spec.mode === 'person-timer' || spec.mode === 'reps-cycle' || (spec.mode === 'lift' && spec.measure.kind === 'segment-angle');

/** The kinds that the new modes run now. isMonitored (monitored.ts) stays false for them until Step D wires the screens. */
export const engineKinds = (): readonly string[] => REGISTRY.filter(usesNewEngine).map((s) => s.id);

/** The definition of a kind that the new modes run, or undefined (the four old kinds and an unknown kind). */
export const engineSpecFor = (kind: string): ExerciseSpec | undefined => {
  const spec = specFor(kind);
  return spec !== undefined && usesNewEngine(spec) ? spec : undefined;
};

/** The three landmarks of the person check, from the `needs` of a definition. null means no check (the person-timer exercises). */
export function trackFor(needs: readonly Need[]): 'whole-leg' | 'knee-to-toe' | null {
  if (needs.includes('whole-leg')) return 'whole-leg';
  if (needs.includes('knee-to-toe')) return 'knee-to-toe';
  return null;
}

/**
 * False for an exercise that the camera cannot see and that the app only times: mode person-timer with measure none (quad set, gluteal set).
 * Setup and Session start no camera for it. A kind with no definition keeps the camera.
 */
export const usesCamera = (kind: string): boolean => {
  const spec = specFor(kind);
  return spec === undefined || spec.mode !== 'person-timer' || spec.measure.kind !== 'none';
};
