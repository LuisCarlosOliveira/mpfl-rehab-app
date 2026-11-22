import { isMonitored } from '../../src/lib/monitor/monitored';
import type { PlanExercise } from '../../src/lib/protocol';
import { REGISTRY } from '../../src/lib/monitor/registry';

describe('isMonitored (Step D turns the five on)', () => {
  it('is true for the four exercises that the engine runs today', () => {
    for (const k of ['heel-slide', 'straight-leg-raise', 'mini-squat', 'seated-extension-hold'] as const) expect(isMonitored(k), k).toBe(true);
  });
  it('is true for the five new exercises: the camera monitors every exercise that has a definition', () => {
    for (const k of ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'] as const) expect(isMonitored(k), k).toBe(true);
  });
  it('is true for every kind of the registry and false for a kind with no definition', () => {
    for (const s of REGISTRY) expect(isMonitored(s.id as PlanExercise['kind']), s.id).toBe(true);
    for (const k of ['lunge', 'wall-slide', '']) expect(isMonitored(k as PlanExercise['kind']), k).toBe(false);
  });
});
