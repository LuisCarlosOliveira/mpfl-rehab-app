// A simulated pose for the real built app. The init script replaces window.Worker with a stub of the pose worker.
// The stub answers each frame message with the landmark numbers of the present time of a series from tests/helpers/landmarkSeries.ts.
// The fake camera (no person) still gives real video frames, so the camera, the frame loop, the frame bridge, the pipeline,
// the body map, the cues and the sound run as in the app. Only the pose model is replaced. A simulated pose cannot prove model accuracy.
import type { Page } from '@playwright/test';
import type { Landmark } from '../../src/lib/angle';

export interface SimFrame {
  tMs: number;
  landmarks: Landmark[] | null;
}

interface Sim {
  frames: SimFrame[];
  startAt: number;
  swap: boolean;
  /** Frame messages that the stub got, and results that it sent, with the count of null results. */
  got: number;
  sent: number;
  nulls: number;
  /** The kind of delegate that a real worker would use is not simulated. */
  play(frames: SimFrame[]): void;
}
declare global {
  interface Window {
    __sim: Sim;
    __beeps: { hz: number }[];
  }
}

/** Call before the first goto. The stub starts with no pose (null). */
export async function installSimPose(page: Page) {
  await page.addInitScript(() => {
    const sim: Sim = {
      frames: [{ tMs: 0, landmarks: null }],
      startAt: 0,
      swap: false,
      got: 0,
      sent: 0,
      nulls: 0,
      play(frames) {
        sim.frames = frames;
        sim.startAt = performance.now();
      },
    };
    window.__sim = sim;
    const current = () => {
      const t = performance.now() - sim.startAt;
      let lo = 0;
      let hi = sim.frames.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (sim.frames[mid]!.tMs <= t) lo = mid;
        else hi = mid - 1;
      }
      const lm = sim.frames[lo]!.landmarks;
      if (!lm || !sim.swap) return lm;
      // The model names the left leg right and the right leg left: swap the ids of the pairs 23/24 ... 31/32.
      const out = lm.map((p) => ({ ...p }));
      for (let id = 23; id <= 31; id += 2) [out[id], out[id + 1]] = [lm[id + 1]!, lm[id]!];
      return out;
    };
    class StubWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      private closed = false;
      constructor() {
        setTimeout(() => this.send({ type: 'ready' }), 30);
      }
      private send(data: unknown) {
        if (!this.closed) this.onmessage?.({ data } as MessageEvent);
      }
      postMessage(data: { type: string; bitmap?: ImageBitmap; timestampMs?: number; count?: number }) {
        if (data.type === 'poses') {
          if (data.count === 2) this.send({ type: 'probe-ready' });
          return;
        }
        data.bitmap?.close();
        sim.got += 1;
        // The real worker needs about 30 ms for a frame on the CPU.
        setTimeout(() => {
          const landmarks = current();
          sim.sent += 1;
          if (landmarks === null) sim.nulls += 1;
          this.send({ type: 'result', timestampMs: data.timestampMs, landmarks });
        }, 25);
      }
      terminate() {
        this.closed = true;
      }
      addEventListener() {}
      removeEventListener() {}
    }
    // @ts-expect-error the stub has the parts of Worker that the app uses
    window.Worker = StubWorker;
    // Record every beep: an oscillator that starts is a sound.
    window.__beeps = [];
    const Real = window.AudioContext;
    if (Real) {
      window.AudioContext = class extends Real {
        createOscillator() {
          const osc = super.createOscillator();
          const start = osc.start.bind(osc);
          osc.start = (when?: number) => {
            window.__beeps.push({ hz: osc.frequency.value });
            start(when);
          };
          return osc;
        }
      };
    }
  });
}

/** Start a series now. The series time starts at 0 at this call. */
export const play = (page: Page, frames: SimFrame[]) => page.evaluate((f) => window.__sim.play(f), frames);
