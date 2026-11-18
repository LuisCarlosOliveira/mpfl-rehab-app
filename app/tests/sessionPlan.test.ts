import { afterEach, describe, expect, it } from 'vitest';
import { loadProtocol } from '../src/lib/protocol';
import { keepsCamera, sessionKinds } from '../src/lib/sessionPlan';
import { getGuideSeen, getLegPrefs, markGuideSeen, setLegPrefs } from '../src/lib/storage';
import { protocolText } from './ui/helpers';

afterEach(() => localStorage.clear());

const phase1 = () => {
  const r = loadProtocol(protocolText(), 'demo');
  if (!r.ok) throw new Error(r.error.message);
  return r.protocol.phases[0]!.exercises;
};

describe('sessionKinds', () => {
  it('lists the exercises of the phase in plan order', () => {
    expect(sessionKinds(phase1())).toEqual(['heel-slide', 'straight-leg-raise']);
  });
  it('leaves out an exercise that has no values to start with', () => {
    const list = phase1().map((e) => (e.kind === 'heel-slide' ? { ...e, targetFlexion: undefined } : e));
    expect(sessionKinds(list)).toEqual(['straight-leg-raise']);
  });
});

describe('keepsCamera', () => {
  const kinds = ['heel-slide', 'quad-set', 'ankle-pump', 'leg-raise-side'] as const;
  it('is true when this exercise and the next one use the camera', () => {
    expect(keepsCamera(kinds, 2)).toBe(true);
  });
  it('is false when the next exercise is a timer', () => {
    expect(keepsCamera(kinds, 0)).toBe(false);
  });
  it('is false for the last exercise', () => {
    expect(keepsCamera(kinds, 3)).toBe(false);
  });
});

describe('stored leg, camera side and seen guides', () => {
  it('returns nothing before anything is stored', () => {
    expect(getLegPrefs()).toEqual({});
    expect(getGuideSeen()).toEqual([]);
  });
  it('keeps left or right only', () => {
    setLegPrefs('right', 'left');
    expect(getLegPrefs()).toEqual({ leg: 'right', cameraSide: 'left' });
    localStorage.setItem('mpfl.leg', 'up');
    expect(getLegPrefs()).toEqual({ cameraSide: 'left' });
  });
  it('keeps each seen exercise once', () => {
    markGuideSeen('heel-slide');
    markGuideSeen('heel-slide');
    markGuideSeen('quad-set');
    expect(getGuideSeen()).toEqual(['heel-slide', 'quad-set']);
  });
});
