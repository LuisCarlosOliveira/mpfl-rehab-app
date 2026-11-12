// N-01: one function says whether an exercise uses the camera. The definition decides, not an id list in a screen.
import { describe, expect, it } from 'vitest';
import { REGISTRY, usesCamera } from '../../src/lib/monitor';

describe('usesCamera', () => {
  it.each(['quad-set', 'gluteal-set'])('%s: the timer has no camera', (kind) => {
    expect(usesCamera(kind)).toBe(false);
  });

  it.each(['heel-slide', 'mini-squat', 'straight-leg-raise', 'seated-extension-hold', 'ankle-pump', 'leg-raise-side', 'leg-raise-back'])('%s: the camera runs', (kind) => {
    expect(usesCamera(kind)).toBe(true);
  });

  it('a kind with no definition keeps the camera', () => {
    expect(usesCamera('unknown-kind')).toBe(true);
  });

  it('follows the definition: only a person-timer with measure none has no camera', () => {
    const off = REGISTRY.filter((s) => !usesCamera(s.id)).map((s) => s.id);
    expect(off).toEqual(REGISTRY.filter((s) => s.mode === 'person-timer' && s.measure.kind === 'none').map((s) => s.id));
    expect(off.sort()).toEqual(['gluteal-set', 'quad-set']);
  });
});
