import { isMonitored } from '../../src/lib/monitor/monitored';

describe('isMonitored (Step D turns the five on)', () => {
  it('is true for the four exercises that the engine runs today', () => {
    for (const k of ['heel-slide', 'straight-leg-raise', 'mini-squat', 'seated-extension-hold']) expect(isMonitored(k), k).toBe(true);
  });
  it('is false for the five new exercises and for an unknown kind', () => {
    for (const k of ['quad-set', 'gluteal-set', 'ankle-pump', 'leg-raise-side', 'leg-raise-back', 'lunge', '']) expect(isMonitored(k), k).toBe(false);
  });
});
