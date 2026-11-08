// Sound cues (FR10). One short oscillator beep from the Web Audio API. No audio file.
// The audio context is made only after a press (unlock), never when this file loads.
// Two beeps: a low double beep for "near-limit" and one longer, higher beep for "over-limit".
// An in-range rep, a counted rep and the paused cue make no sound (FR23).
// The mute state lives in memory only. It is written to no storage.
import type { CueEvent } from '../lib/cues';

export type BeepKind = 'near-limit' | 'over-limit';

export interface Sound {
  /** Call this inside a press handler. It makes the audio context once. */
  unlock(): void;
  /** Play the beep for a kind. It does nothing before unlock or while muted. */
  play(kind: BeepKind): void;
  /** Play the beep for a counter event. Only near-limit and over-limit make a sound. */
  playFor(event: CueEvent): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

interface Tone {
  hz: number;
  seconds: number;
  at: number; // seconds after the start of the cue
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
const RAMP_SECONDS = 0.02; // a short fade in and out, so the beep does not click

function browserContext(): AudioContext | null {
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  return Ctor ? new Ctor() : null;
}

/** `factory` makes the audio context. Tests give a fake one. */
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
          ctx = null; // no audio in this browser. The cues stay as text.
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
