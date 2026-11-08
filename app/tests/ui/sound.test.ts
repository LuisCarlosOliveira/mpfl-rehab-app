import { afterEach, describe, expect, it, vi } from 'vitest';

// A fake AudioContext. It records each oscillator, so a test can count the beeps.
interface FakeOsc {
  frequency: { value: number };
  type: string;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

function fakeContext() {
  const oscillators: FakeOsc[] = [];
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    createOscillator: vi.fn(() => {
      const osc: FakeOsc = { frequency: { value: 0 }, type: 'sine', connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => ({
      gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    })),
  };
  return { ctx, oscillators };
}

async function load() {
  const { createSound } = await import('../../src/ui/sound');
  const fake = fakeContext();
  const factory = vi.fn(() => fake.ctx as unknown as AudioContext);
  return { sound: createSound(factory), factory, ...fake };
}

// How long the beep lasts: the stop time minus the start time.
const length = (o: FakeOsc) => (o.stop.mock.calls[0]![0] as number) - (o.start.mock.calls[0]![0] as number);

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('sound (FR10)', () => {
  it('creates no AudioContext when the module is imported', async () => {
    const Ctor = vi.fn();
    vi.stubGlobal('AudioContext', Ctor);
    vi.resetModules();
    await import('../../src/ui/sound');
    expect(Ctor).not.toHaveBeenCalled();
  });

  it('plays nothing and creates no context before the gesture', async () => {
    const { sound, factory, oscillators } = await load();
    sound.play('near-limit');
    sound.play('over-limit');
    expect(factory).not.toHaveBeenCalled();
    expect(oscillators).toHaveLength(0);
  });

  it('unlock creates the context once, and a second unlock does not create another', async () => {
    const { sound, factory } = await load();
    sound.unlock();
    sound.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('near-limit is a low double beep', async () => {
    const { sound, oscillators } = await load();
    sound.unlock();
    sound.play('near-limit');
    expect(oscillators).toHaveLength(2);
    oscillators.forEach((o) => expect(o.start).toHaveBeenCalledTimes(1));
  });

  it('over-limit is one longer beep, and it differs from near-limit', async () => {
    const near = await load();
    near.sound.unlock();
    near.sound.play('near-limit');
    vi.resetModules();
    const over = await load();
    over.sound.unlock();
    over.sound.play('over-limit');
    expect(over.oscillators).toHaveLength(1);
    expect(length(over.oscillators[0]!)).toBeGreaterThan(length(near.oscillators[0]!));
    expect(over.oscillators[0]!.frequency.value).not.toBe(near.oscillators[0]!.frequency.value);
  });

  it('makes no sound for a rep, for a pause cue or for no event', async () => {
    const { sound, oscillators } = await load();
    sound.unlock();
    for (const event of ['rep', 'paused', 'shallow', 'too-fast', null] as const) sound.playFor(event);
    expect(oscillators).toHaveLength(0);
  });

  it('playFor sounds near-limit and over-limit only', async () => {
    const { sound, oscillators } = await load();
    sound.unlock();
    sound.playFor('near-limit');
    expect(oscillators).toHaveLength(2);
    sound.playFor('over-limit');
    expect(oscillators).toHaveLength(3);
  });

  it('mute stops the sound and unmute brings it back', async () => {
    const { sound, oscillators } = await load();
    sound.unlock();
    sound.setMuted(true);
    expect(sound.isMuted()).toBe(true);
    sound.play('over-limit');
    expect(oscillators).toHaveLength(0);
    sound.setMuted(false);
    sound.play('over-limit');
    expect(oscillators).toHaveLength(1);
  });

  it('keeps the mute state in memory only, in no storage', async () => {
    localStorage.clear();
    const { sound } = await load();
    sound.setMuted(true);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('does nothing and does not throw when the browser has no audio', async () => {
    const { createSound } = await import('../../src/ui/sound');
    const sound = createSound(() => null);
    sound.unlock();
    expect(() => sound.play('over-limit')).not.toThrow();
  });
});
