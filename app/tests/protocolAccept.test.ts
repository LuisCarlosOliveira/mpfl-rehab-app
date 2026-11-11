import { createDb, loadStoredProtocol, type MpflDb } from '../src/lib/storage';
import { createProtocolStore, loadProtocol } from '../src/lib/protocol';
import { protocolSchema, type Protocol } from '../src/lib/protocol/schema';
import { generateProtocol, type GeneratorInputs } from '../src/lib/protocolGen';
import { acceptProposal, confirmByPerson, CONFIRMATION_MAX_AGE_MS, type PersonConfirmation } from '../src/lib/protocol/accept';

// The extended generator items are on by default (VITE_GENERATOR_EXTENDED is off only for false or 0). This file sets the flag on to be exact.
// The value false (off) is tested in protocolGenV2.test.ts, onboardingModel.test.ts and ui/updatePlanV2.test.tsx.
vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true');
beforeEach(() => vi.stubEnv('VITE_GENERATOR_EXTENDED', 'true'));

// A jsdom event is never trusted, so a test marks the real events that stand for a click of a person.
// Only the read of the isTrusted flag is replaced. The check for a real event and for a click type stays real.
const marked = vi.hoisted(() => new WeakSet<object>());
vi.mock('../src/lib/protocol/trustedFlag', () => ({ trustedFlag: (e: object) => marked.has(e) }));

const personClick = (): MouseEvent => {
  const e = new MouseEvent('click');
  marked.add(e);
  return e;
};
const confirmed = (): PersonConfirmation => {
  const c = confirmByPerson(personClick());
  if (c === null) throw new Error('the click was refused');
  return c;
};

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
  side: 'left',
  surgeonLimit: { kind: 'degrees', degrees: 60 },
  phaseClearance: 'no',
  redFlags: {},
  pain: 2,
  swelling: 'none',
  ...over,
});
const plan = (week: number, over: Partial<GeneratorInputs> = {}): Protocol => {
  const r = generateProtocol(at(week, over), TODAY);
  if (r.kind !== 'protocol') throw new Error(`expected a plan, got ${r.reason}`);
  return r.protocol;
};
const proposalOf = (protocol: Protocol) => ({ protocol });

let n = 0;
let db: MpflDb;
beforeEach(() => {
  db = createDb(`accept-${Date.now()}-${n++}`);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
const storedRaw = async () => (await db.protocol.get('current'))?.raw;

describe('confirmByPerson', () => {
  it('gives a confirmation for a trusted click', () => {
    expect(confirmByPerson(personClick())).not.toBeNull();
  });

  it.each([
    ['null', null],
    ['a plain object that claims to be trusted', { type: 'click', isTrusted: true }],
    ['an object that copies the event prototype', Object.assign(Object.create(MouseEvent.prototype), { isTrusted: true })],
    ['an untrusted click made by script', new MouseEvent('click')],
  ])('refuses %s', (_name, value) => {
    expect(confirmByPerson(value as unknown as Event)).toBeNull();
  });

  it('refuses a click that script starts with the click method', () => {
    const button = document.createElement('button');
    document.body.append(button);
    let seen: Event | undefined;
    button.addEventListener('click', (e) => (seen = e));
    button.click();
    button.remove();
    expect(confirmByPerson(seen as Event)).toBeNull();
  });

  it('refuses a proxy that reports isTrusted true', () => {
    const proxy = new Proxy(new MouseEvent('click'), { get: (t, k) => (k === 'isTrusted' ? true : Reflect.get(t, k)) });
    expect(confirmByPerson(proxy)).toBeNull();
  });

  it('refuses a trusted event that is not a click', () => {
    const e = new KeyboardEvent('keydown');
    marked.add(e);
    expect(confirmByPerson(e)).toBeNull();
  });
});

describe('acceptProposal: the confirmation', () => {
  it('refuses a missing confirmation and saves nothing', async () => {
    const r = await acceptProposal(db, proposalOf(plan(4)), undefined as unknown as PersonConfirmation, 'demo');
    expect(r).toMatchObject({ ok: false, code: 'no-confirmation' });
    expect(await storedRaw()).toBeUndefined();
  });

  it('refuses a forged confirmation object', async () => {
    const forged = { at: Date.now() } as unknown as PersonConfirmation;
    expect(await acceptProposal(db, proposalOf(plan(4)), forged, 'demo')).toMatchObject({ ok: false, code: 'no-confirmation' });
    expect(await storedRaw()).toBeUndefined();
  });

  it('refuses a copy of a real confirmation', async () => {
    const copy = { ...confirmed() } as unknown as PersonConfirmation;
    expect(await acceptProposal(db, proposalOf(plan(4)), copy, 'demo')).toMatchObject({ ok: false, code: 'no-confirmation' });
  });

  it('refuses a stale confirmation', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'performance'] });
    const c = confirmed();
    vi.advanceTimersByTime(CONFIRMATION_MAX_AGE_MS + 1);
    expect(await acceptProposal(db, proposalOf(plan(4)), c, 'demo')).toMatchObject({ ok: false, code: 'stale' });
    expect(await storedRaw()).toBeUndefined();
  });

  it('accepts a confirmation at the edge of the time limit', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'performance'] });
    const c = confirmed();
    vi.advanceTimersByTime(CONFIRMATION_MAX_AGE_MS);
    expect(await acceptProposal(db, proposalOf(plan(4)), c, 'demo')).toMatchObject({ ok: true });
  });

  // Live test: the wall clock can step back (a device that syncs its time). The age of a confirmation must come from a
  // clock that never steps, or a stale confirmation looks fresh.
  it('refuses a stale confirmation even when the wall clock steps back', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'performance'] });
    const c = confirmed();
    vi.advanceTimersByTime(CONFIRMATION_MAX_AGE_MS + 1); // real elapsed time passes the limit
    vi.setSystemTime(Date.now() - 9_090); // then the wall clock steps back by 9 seconds
    expect(await acceptProposal(db, proposalOf(plan(4)), c, 'demo')).toMatchObject({ ok: false, code: 'stale' });
    expect(await storedRaw()).toBeUndefined();
  });

  it('refuses a confirmation that was used before', async () => {
    const c = confirmed();
    expect(await acceptProposal(db, proposalOf(plan(4)), c, 'demo')).toMatchObject({ ok: true });
    const before = await storedRaw();
    expect(await acceptProposal(db, proposalOf(plan(5)), c, 'demo')).toMatchObject({ ok: false, code: 'reused' });
    expect(await storedRaw()).toBe(before);
  });

  it('lets only one of two accepts at the same time use one confirmation', async () => {
    const c = confirmed();
    const results = await Promise.all([acceptProposal(db, proposalOf(plan(4)), c, 'demo'), acceptProposal(db, proposalOf(plan(4)), c, 'demo')]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ code: 'reused' });
  });

  it('uses up a confirmation even when the proposal is refused', async () => {
    const c = confirmed();
    const bad = { ...plan(4), approvedOn: '2026-11-01' };
    expect(await acceptProposal(db, proposalOf(bad), c, 'demo')).toMatchObject({ ok: false });
    expect(await acceptProposal(db, proposalOf(plan(4)), c, 'demo')).toMatchObject({ ok: false, code: 'reused' });
  });
});

describe('acceptProposal: what is saved', () => {
  it('saves a generated plan with an empty approval and the generated mark', async () => {
    const protocol = plan(4);
    const r = await acceptProposal(db, proposalOf(protocol), confirmed(), 'demo');
    expect(r).toMatchObject({ ok: true });
    const saved = JSON.parse((await storedRaw()) as string);
    expect(saved.approvedOn).toBeUndefined();
    expect(saved.generated).toEqual(protocol.generated);
    expect(saved.generated).toBeDefined();
  });

  it('saves what the loader accepts, with the same content as the proposal', async () => {
    const protocol = plan(8, { phaseClearance: 'yes' });
    await acceptProposal(db, proposalOf(protocol), confirmed(), 'demo');
    const raw = (await storedRaw()) as string;
    const loaded = loadProtocol(raw, 'demo');
    expect(loaded).toMatchObject({ ok: true });
    expect(loaded.ok && loaded.protocol).toEqual(protocolSchema.parse(protocol));
    const again = await loadStoredProtocol(db, 'demo');
    expect(again).toEqual(loaded);
  });

  it('refuses a proposal that carries an approval', async () => {
    const r = await acceptProposal(db, proposalOf({ ...plan(4), approvedOn: '2026-11-01' }), confirmed(), 'demo');
    expect(r).toMatchObject({ ok: false, code: 'has-approval' });
    expect(await storedRaw()).toBeUndefined();
  });

  it('refuses a protocol that is not generated', async () => {
    const { generated, ...plain } = plan(4);
    expect(generated).toBeDefined();
    const r = await acceptProposal(db, proposalOf(plain as Protocol), confirmed(), 'demo');
    expect(r).toMatchObject({ ok: false, code: 'not-generated' });
    expect(await storedRaw()).toBeUndefined();
  });

  it('refuses a proposal that fails the schema', async () => {
    const broken = { ...plan(4), activePhase: 9 } as Protocol;
    expect(await acceptProposal(db, proposalOf(broken), confirmed(), 'demo')).toMatchObject({ ok: false, code: 'invalid' });
    expect(await storedRaw()).toBeUndefined();
  });

  it('refuses a referral result', async () => {
    const r = generateProtocol(at(4, { writtenPlan: 'yes' }), TODAY);
    expect(await acceptProposal(db, r as never, confirmed(), 'demo')).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('lets patient mode refuse an unapproved plan and saves nothing', async () => {
    const r = await acceptProposal(db, proposalOf(plan(4)), confirmed(), 'patient');
    expect(r).toMatchObject({ ok: false, code: 'refused-by-loader' });
    expect(await storedRaw()).toBeUndefined();
  });

  it('replaces the stored plan and keeps one record', async () => {
    await acceptProposal(db, proposalOf(plan(4)), confirmed(), 'demo');
    await acceptProposal(db, proposalOf(plan(5)), confirmed(), 'demo');
    expect(await db.protocol.count()).toBe(1);
  });
});

describe('acceptProposal: the active phase', () => {
  it('gives the active phase from the saved field only', async () => {
    const protocol = plan(8, { phaseClearance: 'yes' });
    expect(protocol.activePhase).toBe(2);
    await acceptProposal(db, proposalOf(protocol), confirmed(), 'demo');
    const stored = await loadStoredProtocol(db, 'demo');
    if (!stored?.ok) throw new Error('expected a stored protocol');
    expect(createProtocolStore(stored.protocol).activePhase).toBe(2);
  });

  it('does not move the phase when a later date is the only change', async () => {
    const first = plan(8);
    await acceptProposal(db, proposalOf(first), confirmed(), 'demo');
    const later = generateProtocol(at(8), addDays(TODAY, 70));
    expect(later.kind).toBe('referral');
    const stored = await loadStoredProtocol(db, 'demo');
    expect(stored?.ok && stored.protocol.activePhase).toBe(1);
  });

  const phase2 = () => plan(8, { phaseClearance: 'yes' });

  it('refuses a phase advance while the flag is off and keeps the stored bytes', async () => {
    await acceptProposal(db, proposalOf(plan(8)), confirmed(), 'demo');
    const before = await storedRaw();
    const r = await acceptProposal(db, proposalOf(phase2()), confirmed(), 'demo');
    expect(r).toMatchObject({ ok: false, code: 'progression-off' });
    expect(await storedRaw()).toBe(before);
  });

  it('refuses a flag value that is not the exact text true', async () => {
    vi.stubEnv('VITE_SELF_PROGRESSION', '1');
    await acceptProposal(db, proposalOf(plan(8)), confirmed(), 'demo');
    expect(await acceptProposal(db, proposalOf(phase2()), confirmed(), 'demo')).toMatchObject({ ok: false, code: 'progression-off' });
  });

  it('accepts a phase advance when the flag is on', async () => {
    vi.stubEnv('VITE_SELF_PROGRESSION', 'true');
    await acceptProposal(db, proposalOf(plan(8)), confirmed(), 'demo');
    expect(await acceptProposal(db, proposalOf(phase2()), confirmed(), 'demo')).toMatchObject({ ok: true });
    const stored = await loadStoredProtocol(db, 'demo');
    expect(stored?.ok && stored.protocol.activePhase).toBe(2);
  });

  // Generator v2: a mini squat or a seated hold that the stored plan does not have is more load, so it counts as a move forward.
  it.each([
    ['a new mini squat', { walksWithoutCrutches: 'yes', legRaiseStraight: 'yes' }],
    ['a new seated hold', { seatedHoldCleared: 'yes' }],
  ] as const)('refuses %s while the flag is off and keeps the stored bytes', async (_name, answers) => {
    const open = { phaseClearance: 'yes', surgeonLimit: { kind: 'none' } } as const;
    await acceptProposal(db, proposalOf(plan(8, open)), confirmed(), 'demo');
    const before = await storedRaw();
    const more = plan(8, { ...open, ...answers });
    expect(await acceptProposal(db, proposalOf(more), confirmed(), 'demo')).toMatchObject({ ok: false, code: 'progression-off' });
    expect(await storedRaw()).toBe(before);
    vi.stubEnv('VITE_SELF_PROGRESSION', 'true');
    expect(await acceptProposal(db, proposalOf(more), confirmed(), 'demo')).toMatchObject({ ok: true });
  });

  it('accepts the removal of a mini squat with the flag off, because it loads the knee less', async () => {
    vi.stubEnv('VITE_SELF_PROGRESSION', 'true');
    const gates = { phaseClearance: 'yes', walksWithoutCrutches: 'yes', legRaiseStraight: 'yes' } as const;
    await acceptProposal(db, proposalOf(plan(8, gates)), confirmed(), 'demo');
    vi.unstubAllEnvs();
    const without = plan(8, { ...gates, kneeGaveWay: true });
    expect(await acceptProposal(db, proposalOf(without), confirmed(), 'demo')).toMatchObject({ ok: true });
  });

  it('refuses a higher limit while the flag is off', async () => {
    await acceptProposal(db, proposalOf(plan(4, { surgeonLimit: { kind: 'degrees', degrees: 60 } })), confirmed(), 'demo');
    const before = await storedRaw();
    const higher = plan(4, { surgeonLimit: { kind: 'degrees', degrees: 90 } });
    expect(await acceptProposal(db, proposalOf(higher), confirmed(), 'demo')).toMatchObject({ ok: false, code: 'progression-off' });
    expect(await storedRaw()).toBe(before);
  });

  it('refuses the removal of a limit while the flag is off', async () => {
    const yes = { phaseClearance: 'yes' } as const;
    await acceptProposal(db, proposalOf(plan(8, { ...yes, surgeonLimit: { kind: 'degrees', degrees: 60 } })), confirmed(), 'demo');
    const noLimit = plan(8, { ...yes, surgeonLimit: { kind: 'none' } });
    expect(await acceptProposal(db, proposalOf(noLimit), confirmed(), 'demo')).toMatchObject({ ok: false, code: 'progression-off' });
  });

  it('accepts a lower limit with the flag off', async () => {
    await acceptProposal(db, proposalOf(plan(4, { surgeonLimit: { kind: 'degrees', degrees: 90 } })), confirmed(), 'demo');
    const lower = plan(4, { surgeonLimit: { kind: 'degrees', degrees: 60 } });
    expect(await acceptProposal(db, proposalOf(lower), confirmed(), 'demo')).toMatchObject({ ok: true });
  });

  it('accepts a new plan when nothing is stored, even in phase 2, because nothing moves forward', async () => {
    expect(await acceptProposal(db, proposalOf(phase2()), confirmed(), 'demo')).toMatchObject({ ok: true });
  });

  it('accepts the same plan again with the flag off', async () => {
    await acceptProposal(db, proposalOf(plan(4)), confirmed(), 'demo');
    expect(await acceptProposal(db, proposalOf(plan(4)), confirmed(), 'demo')).toMatchObject({ ok: true });
  });
});
