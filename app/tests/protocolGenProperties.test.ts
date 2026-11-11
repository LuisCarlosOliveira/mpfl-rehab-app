import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { protocolSchema, type Protocol } from '../src/lib/protocol/schema';
import { RED_FLAGS } from '../src/lib/redflags';
import { generateProtocol, RULES, type GeneratorInputs, type WhyEntry } from '../src/lib/protocolGen';

// The extended generator items are behind VITE_GENERATOR_EXTENDED (off by default). This file tests them with the flag on.
// The default (off) is tested in protocolGenV2.test.ts, onboardingModel.test.ts and ui/updatePlanV2.test.tsx.
vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true');
beforeEach(() => vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true'));

// Plain case tables. A small seeded generator gives many inputs. No extra package.
const TODAY = '2026-11-08';
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const at = (week: number, over: Partial<GeneratorInputs> = {}): GeneratorInputs => ({
  writtenPlan: 'no',
  procedure: 'mpflr-only',
  ageBand: '18-plus',
  bothKnees: false,
  firstSurgery: 'yes',
  specialRules: 'no',
  surgeryDate: addDays(TODAY, -(7 * week + 3)),
  side: 'right',
  surgeonLimit: { kind: 'unknown' },
  phaseClearance: 'no',
  redFlags: {},
  pain: 1,
  swelling: 'none',
  ...over,
});

function seeded(seed: number) {
  let s = (seed * 2_654_435_761) % 4_294_967_296;
  const step = () => ((s = (s * 1_664_525 + 1_013_904_223) % 4_294_967_296) / 4_294_967_296);
  for (let k = 0; k < 5; k++) step();
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(step() * xs.length)] as T;
  return { next: step, pick };
}

// About one answer in fourteen is a referral case, so most inputs give a plan.
function randomInputs(seed: number): GeneratorInputs {
  const { next, pick } = seeded(seed);
  const flaw = () => next() < 0.07;
  const flagIds = RED_FLAGS.map((f) => f.id);
  return {
    writtenPlan: flaw() ? pick(['yes', 'unknown'] as const) : 'no',
    procedure: flaw() ? pick(['combined', 'unknown'] as const) : 'mpflr-only',
    ageBand: flaw() ? 'under-18' : '18-plus',
    bothKnees: flaw(),
    firstSurgery: flaw() ? pick(['no', 'unknown'] as const) : 'yes',
    specialRules: flaw() ? pick(['yes', 'unknown'] as const) : 'no',
    surgeryDate: next() < 0.03 ? null : addDays(TODAY, -Math.floor(next() * 95)),
    side: pick(['left', 'right'] as const),
    surgeonLimit: pick([
      { kind: 'unknown' },
      { kind: 'none' },
      { kind: 'degrees', degrees: Math.floor(next() * 181) },
      { kind: 'degrees', degrees: 28 + Math.floor(next() * 120) },
    ] as GeneratorInputs['surgeonLimit'][]),
    phaseClearance: pick(['yes', 'no', 'unknown'] as const),
    walksWithoutCrutches: pick(['yes', 'yes', 'no', 'unknown'] as const),
    legRaiseStraight: pick(['yes', 'yes', 'no', 'unknown'] as const),
    seatedHoldCleared: pick(['yes', 'yes', 'no', 'unknown'] as const),
    kneeGaveWay: next() < 0.15,
    redFlags: next() < 0.05 ? { [pick(flagIds)]: true } : {},
    pain: next() < 0.05 ? 7 + Math.floor(next() * 4) : Math.floor(next() * 7),
    swelling: next() < 0.05 ? 'more' : pick(['none', 'some'] as const),
  };
}

const SEEDS = Array.from({ length: 600 }, (_, i) => i + 1);
const protocols = SEEDS.flatMap((seed) => {
  const r = generateProtocol(randomInputs(seed), TODAY);
  return r.kind === 'protocol' ? [{ seed, ...r }] : [];
});

const weeksOf = (iso: string) => Math.floor((Date.parse(`${TODAY}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000 / 7);

const leaves = (p: Protocol) => {
  const out: [string, number | string][] = [];
  for (const ph of p.phases) {
    if (ph.reviewDate) out.push([`phase${ph.id}.reviewDate`, ph.reviewDate]);
    for (const e of ph.exercises) {
      for (const [k, v] of Object.entries(e)) if (typeof v === 'number') out.push([`phase${ph.id}.${e.kind}.${k}`, v]);
    }
    for (const e of ph.homeExercises ?? []) {
      for (const [k, v] of Object.entries(e)) if (typeof v === 'number') out.push([`phase${ph.id}.${e.kind}.${k}`, v]);
    }
  }
  if (p.painPauseThreshold !== undefined) out.push(['painPauseThreshold', p.painPauseThreshold]);
  return out;
};

describe('properties of the generator', () => {
  it('has enough protocols and enough referrals in the random sample', () => {
    expect(protocols.length).toBeGreaterThan(50);
    expect(SEEDS.length - protocols.length).toBeGreaterThan(50);
  });

  it('always passes the existing protocol schema', () => {
    for (const { seed, protocol } of protocols) {
      expect(protocolSchema.safeParse(protocol).success, `seed ${seed}`).toBe(true);
    }
  });

  it('never gives a phase beyond the weeks window and never a plan from week 12', () => {
    for (let w = 0; w <= 30; w++) {
      const r = generateProtocol(at(w, { surgeonLimit: { kind: 'none' }, phaseClearance: 'yes' }), TODAY);
      if (w >= 12) expect(r, `week ${w}`).toMatchObject({ kind: 'referral', reason: 'R10' });
      else expect(r.kind, `week ${w}`).toBe('protocol');
    }
    for (const { seed, protocol } of protocols) {
      expect(protocol.activePhase, `seed ${seed}`).toBeLessThanOrEqual(2);
      for (const ph of protocol.phases) expect([1, 2]).toContain(ph.id);
    }
  });

  it('never gives phase 2 before week 7 or without the clearance answer', () => {
    for (const seed of SEEDS) {
      const i = randomInputs(seed);
      const r = generateProtocol(i, TODAY);
      if (r.kind !== 'protocol') continue;
      const w = weeksOf(i.surgeryDate as string);
      if (r.protocol.activePhase === 2 || r.protocol.phases.some((p) => p.id === 2)) {
        expect(w, `seed ${seed}`).toBeGreaterThanOrEqual(7);
        expect(i.phaseClearance, `seed ${seed}`).toBe('yes');
      }
    }
  });

  it('turns every red flag into a referral at every week', () => {
    for (const flag of RED_FLAGS) {
      for (let w = 0; w <= 13; w++) {
        const r = generateProtocol(at(w, { redFlags: { [flag.id]: true } }), TODAY);
        expect(r, `${flag.id} week ${w}`).toMatchObject({ kind: 'referral', reason: 'R8' });
      }
    }
  });

  it('lets the surgeon limit only lower the generated limit', () => {
    const limits = [20, 27, 28, 29, 40, 60, 90, 120, 150, 180];
    const heelLimit = (w: number, degrees: number) => {
      const r = generateProtocol(at(w, { surgeonLimit: { kind: 'degrees', degrees }, phaseClearance: 'yes' }), TODAY);
      if (r.kind !== 'protocol') throw new Error('expected a protocol');
      return r.protocol.phases.flatMap((p) => p.exercises).filter((e) => e.kind === 'heel-slide').map((e) => e.maxFlexion);
    };
    for (const w of [0, 3, 6, 7, 9, 11]) {
      let previous: number | undefined;
      for (const degrees of limits) {
        const found = heelLimit(w, degrees);
        for (const m of found) {
          expect(m, `week ${w} limit ${degrees}`).toBeDefined();
          expect(m as number).toBeLessThanOrEqual(degrees);
        }
        const top = found.length === 0 ? undefined : Math.max(...(found as number[]));
        if (previous !== undefined && top !== undefined) expect(top).toBeGreaterThanOrEqual(previous);
        if (top !== undefined) previous = top;
        // A lower limit never adds the exercise that a higher limit leaves out.
        if (found.length > 0) {
          for (const higher of limits.filter((l) => l > degrees)) expect(heelLimit(w, higher).length, `week ${w} ${degrees} vs ${higher}`).toBeGreaterThan(0);
        }
      }
    }
    // The mini squat ceiling of 50 is a rule value (SQUAT_DEPTH), tested below. Only the heel slide ceiling comes from the person.
    for (const { seed, protocol } of protocols) {
      const limit = randomInputs(seed).surgeonLimit;
      for (const e of protocol.phases.flatMap((p) => p.exercises).filter((x) => x.kind === 'heel-slide')) {
        if (e.maxFlexion === undefined) continue;
        expect(limit.kind, `seed ${seed}`).toBe('degrees');
        expect(e.maxFlexion).toBeLessThanOrEqual((limit as { degrees: number }).degrees);
      }
    }
  });

  it('gives a ceiling only when a limit exists and never invents one', () => {
    for (const seed of SEEDS) {
      const i = randomInputs(seed);
      const r = generateProtocol(i, TODAY);
      if (r.kind !== 'protocol') continue;
      for (const e of r.protocol.phases.flatMap((p) => p.exercises).filter((x) => x.kind === 'heel-slide')) {
        if (i.surgeonLimit.kind !== 'degrees') expect(e.maxFlexion, `seed ${seed}`).toBeUndefined();
      }
    }
  });

  it('gives every number in a protocol a rule, a source and a grade', () => {
    for (const { seed, protocol, why } of protocols) {
      const applied = new Map<string, { entry: WhyEntry; value: number | string; origin: string }>();
      for (const entry of why) for (const a of entry.applied) applied.set(a.path, { entry, value: a.value, origin: a.origin });
      for (const [path, value] of leaves(protocol)) {
        const a = applied.get(path);
        expect(a, `seed ${seed}: no rule for ${path}`).toBeDefined();
        expect(a?.value, `seed ${seed}: ${path}`).toBe(value);
        expect(a?.entry.sourceIds.length, `seed ${seed}: ${path}`).toBeGreaterThan(0);
        expect(a?.entry.grade, `seed ${seed}: ${path}`).toBeTruthy();
        const rule = RULES[a?.entry.ruleId as keyof typeof RULES];
        if (a?.origin === 'rule' && typeof value === 'number') {
          expect(Object.values(rule.values), `seed ${seed}: ${path}`).toContain(value);
        }
        if (a?.origin === 'person') expect(rule.personEntered, `seed ${seed}: ${path}`).toContain(path.split('.').pop());
      }
    }
  });

  it('never fills a value that the knowledge base leaves as NONE', () => {
    for (const { seed, protocol } of protocols) {
      expect(protocol.painPauseThreshold, `seed ${seed}`).toBeUndefined();
      expect(protocol.approvedOn, `seed ${seed}`).toBeUndefined();
      expect(protocol.generated, `seed ${seed}`).toMatchObject({ on: TODAY });
      for (const ph of protocol.phases) {
        for (const c of ph.reviewCriteria ?? []) expect(c.kind, `seed ${seed}`).toBe('clinicianCheck');
        for (const e of ph.exercises) {
          expect(e.holdSeconds).toBeUndefined();
          expect(e.minRepSeconds).toBeUndefined();
          expect(e.maxTopFlexion).toBeUndefined();
          // The heel slide has no dose (DOSE_NONE). The other exercises start at the dose range of P2 rec 26 (DOSE, V49).
          if (e.kind === 'heel-slide') {
            expect(e.sets, `seed ${seed}`).toBeUndefined();
            expect(e.reps, `seed ${seed}`).toBeUndefined();
          } else {
            expect(e, `seed ${seed}`).toMatchObject({ sets: 2, reps: 10 });
          }
          expect(e.minFlexion, `seed ${seed}`).toBeUndefined();
          expect(['straight-leg-raise', 'heel-slide', 'mini-squat', 'seated-extension-hold']).toContain(e.kind);
        }
        for (const h of ph.homeExercises ?? []) {
          if (h.kind === 'ankle-pump') expect(h, `seed ${seed}`).not.toHaveProperty('sets');
          else expect(h, `seed ${seed}`).toMatchObject({ sets: 2, reps: 10 });
        }
      }
    }
  });

  it('never gives a mini squat ceiling above 50, lowers it only with a surgeon number, and never gives a squat without the gates', () => {
    let squats = 0;
    let lowered = 0;
    for (const seed of SEEDS) {
      const i = randomInputs(seed);
      const r = generateProtocol(i, TODAY);
      if (r.kind !== 'protocol') continue;
      for (const ph of r.protocol.phases) {
        const squat = ph.exercises.find((e) => e.kind === 'mini-squat');
        if (squat === undefined) continue;
        squats += 1;
        expect(ph.id, `seed ${seed}`).toBe(2);
        expect(squat.maxFlexion, `seed ${seed}`).toBeLessThanOrEqual(RULES.SQUAT_DEPTH.values.maxFlexion);
        const expected = i.surgeonLimit.kind === 'degrees' ? Math.min(50, i.surgeonLimit.degrees) : 50;
        expect(squat.maxFlexion, `seed ${seed}`).toBe(expected);
        if (expected < 50) lowered += 1;
        expect([i.walksWithoutCrutches, i.legRaiseStraight, i.phaseClearance], `seed ${seed}`).toEqual(['yes', 'yes', 'yes']);
        expect(i.kneeGaveWay, `seed ${seed}`).toBe(false);
      }
    }
    expect(squats).toBeGreaterThan(0);
    expect(lowered).toBeGreaterThan(0);
  });

  // Guardrail: the arc of the seated hold is a clinical number. The generator never adds the hold, whatever the answers are.
  it('never adds a seated hold, with any answers', () => {
    for (const seed of SEEDS) {
      const r = generateProtocol(randomInputs(seed), TODAY);
      if (r.kind !== 'protocol') continue;
      for (const ph of r.protocol.phases) expect(ph.exercises.map((e) => e.kind), `seed ${seed}`).not.toContain('seated-extension-hold');
    }
  });

  it('puts the home exercises in every plan and ankle pumps in phase 1 only', () => {
    for (const { seed, protocol } of protocols) {
      for (const ph of protocol.phases) {
        const kinds = (ph.homeExercises ?? []).map((h) => h.kind);
        expect(kinds, `seed ${seed}`).toEqual(expect.arrayContaining(['quad-set', 'gluteal-set', 'leg-raise-side', 'leg-raise-back']));
        expect(kinds.includes('ankle-pump'), `seed ${seed}`).toBe(ph.id === 1);
      }
    }
  });

  it('is deterministic', () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const i = randomInputs(seed);
      expect(JSON.stringify(generateProtocol(i, TODAY))).toBe(JSON.stringify(generateProtocol(structuredClone(i), TODAY)));
    }
  });

  it('gives every referral a text that starts with the fixed line', () => {
    for (const seed of SEEDS) {
      const r = generateProtocol(randomInputs(seed), TODAY);
      if (r.kind === 'referral') {
        expect(r.text.startsWith('The app cannot make a plan for you.'), `seed ${seed}`).toBe(true);
        expect(RULES[r.reason as keyof typeof RULES].kind).toBe('referral');
      }
    }
  });
});

describe('the core stays pure', () => {
  const dir = resolve(__dirname, '../src/lib/protocolGen');
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
  const sourceOf = (f: string) => readFileSync(resolve(dir, f), 'utf8');

  it('imports no storage module and no UI module', () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const f of files) {
      const text = sourceOf(f);
      expect(text, f).not.toMatch(/from\s+['"][^'"]*(storage|dexie|\/ui\/|react)[^'"]*['"]/);
      expect(text, f).not.toMatch(/localStorage|indexedDB|sessionStorage|saveProtocol|acceptProposal/);
    }
  });

  it('reads no clock and no random source', () => {
    for (const f of files) {
      const text = sourceOf(f);
      expect(text, f).not.toMatch(/Date\.now\(|new Date\(\)|Math\.random/);
    }
  });

  it('never writes the active phase', () => {
    for (const f of files) expect(sourceOf(f), f).not.toMatch(/activePhase\s*=[^=]|setActivePhase/);
  });
});
