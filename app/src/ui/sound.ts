import type { CueEvent } from '../lib/cues';

export type BeepKind = 'near-limit' | 'over-limit';

export interface Sound {
  unlock(): void;
  play(kind: BeepKind): void;
  playFor(event: CueEvent): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

interface Tone {
  hz: number;
  seconds: number;
  at: number;
}

// PROPOSAL, no source: the pitches and lengths. A clinician or a patient test can tune them.
const TONES: Record<BeepKind, Tone[]> = {
  'near-limit': [
    { hz: 330, seconds: 0.15, at: 0 },
    { hz: 330, seconds: 0.15, at: 0.3 },
  ],
  'over-limit': [{ hz: 660, seconds: 0.7, at: 0 }],
};

const PEAK_GAIN = 0.2;
const RAMP_SECONDS = 0.02;

function browserContext(): AudioContext | null {
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  return Ctor ? new Ctor() : null;
}

export function createSound(factory: () => AudioContext | null = browserContext): Sound {
  let ctx: AudioContext | null = null;
  let muted = false;

  const beep = (context: AudioContext, tone: Tone) => {
    const start = context.currentTime + tone.at;
    const end = start + tone.seconds;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = tone.hz;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, start + RAMP_SECONDS);
    gain.gain.setValueAtTime(PEAK_GAIN, end - RAMP_SECONDS);
    gain.gain.linearRampToValueAtTime(0, end);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(end);
  };

  const sound: Sound = {
    unlock() {
      if (!ctx) {
        try {
          ctx = factory();
        } catch {
          ctx = null;
        }
      }
      if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined);
    },
    play(kind) {
      if (!ctx || muted) return;
      for (const tone of TONES[kind]) beep(ctx, tone);
    },
    playFor(event) {
      if (event === 'near-limit' || event === 'over-limit') sound.play(event);
    },
    setMuted(value) {
      muted = value;
    },
    isMuted: () => muted,
  };
  return sound;
}
