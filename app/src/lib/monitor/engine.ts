import type { ExerciseSpec, Need } from './spec';
import { REGISTRY, specFor } from './registry';

export const usesNewEngine = (spec: ExerciseSpec): boolean =>
  spec.mode === 'person-timer' || spec.mode === 'reps-cycle' || (spec.mode === 'lift' && spec.measure.kind === 'segment-angle');

export const engineKinds = (): readonly string[] => REGISTRY.filter(usesNewEngine).map((s) => s.id);

export const engineSpecFor = (kind: string): ExerciseSpec | undefined => {
  const spec = specFor(kind);
  return spec !== undefined && usesNewEngine(spec) ? spec : undefined;
};

export function trackFor(needs: readonly Need[]): 'whole-leg' | 'knee-to-toe' | null {
  if (needs.includes('whole-leg')) return 'whole-leg';
  if (needs.includes('knee-to-toe')) return 'knee-to-toe';
  return null;
}

export const usesCamera = (kind: string): boolean => {
  const spec = specFor(kind);
  return spec === undefined || spec.mode !== 'person-timer' || spec.measure.kind !== 'none';
};
