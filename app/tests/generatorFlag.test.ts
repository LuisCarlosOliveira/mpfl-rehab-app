import { afterEach, describe, expect, it, vi } from 'vitest';
import { generatorExtendedOn } from '../src/lib/mode';
import { generateProtocol, type GeneratorInputs } from '../src/lib/protocolGen';
import { emptyAnswers, gatesAsked } from '../src/lib/onboarding';

// User decision 2026-11-11: the app proposes the full plan from the guidelines. The extended items are on by default.
afterEach(() => vi.unstubAllEnvs());

const TODAY = '2026-11-08';
const week8 = (over: Partial<GeneratorInputs> = {}): GeneratorInputs => ({
  writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
  surgeryDate: '2026-09-09', side: 'left', surgeonLimit: { kind: 'none' }, phaseClearance: 'yes', redFlags: {}, pain: 2, swelling: 'none',
  walksWithoutCrutches: 'yes', legRaiseStraight: 'yes', seatedHoldCleared: 'yes', ...over,
} as GeneratorInputs);
const kinds = (i: GeneratorInputs) => {
  const r = generateProtocol(i, TODAY);
  if (r.kind !== 'protocol') throw new Error(r.reason);
  return r.protocol.phases.find((p) => p.id === 2)?.exercises.map((e) => e.kind) ?? [];
};

describe('the flag of the extended items', () => {
  it('is on with no value, on for "true", and off only for "false" or "0"', () => {
    vi.stubEnv('VITE_GENERATOR_EXTENDED', undefined as unknown as string);
    expect(generatorExtendedOn()).toBe(true);
    for (const v of ['true', '', 'yes', 'TRUE', '1']) {
      vi.stubEnv('VITE_GENERATOR_EXTENDED', v);
      expect(generatorExtendedOn(), v).toBe(true);
    }
    for (const v of ['false', '0']) {
      vi.stubEnv('VITE_GENERATOR_EXTENDED', v);
      expect(generatorExtendedOn(), v).toBe(false);
    }
  });

  it('adds the mini squat and the seated hold in phase 2 by default, and not with the flag off', () => {
    vi.stubEnv('VITE_GENERATOR_EXTENDED', undefined as unknown as string);
    expect(kinds(week8())).toEqual(expect.arrayContaining(['mini-squat', 'seated-extension-hold']));
    vi.stubEnv('VITE_GENERATOR_EXTENDED', 'false');
    expect(kinds(week8())).toEqual(['straight-leg-raise', 'heel-slide']);
  });

  it('asks the three extra questions by default, and not with the flag off', () => {
    const a = { ...emptyAnswers(), surgeryDate: '2026-09-09', phaseClearance: 'yes' as const };
    vi.stubEnv('VITE_GENERATOR_EXTENDED', undefined as unknown as string);
    expect(gatesAsked(a, TODAY)).toBe(true);
    vi.stubEnv('VITE_GENERATOR_EXTENDED', 'false');
    expect(gatesAsked(a, TODAY)).toBe(false);
  });
});
