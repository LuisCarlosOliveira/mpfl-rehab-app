import { describe, expect, it } from 'vitest';
import { createPipeline } from '../src/lib/exercises';
import type { Exercise } from '../src/lib/protocol';
import { CLIP_FULL } from './fixtures/clipFull';
import { rowFrame } from './helpers/clip';

const squat: Exercise = { kind: 'mini-squat', targetFlexion: 60, returnWithinDeg: 10, source: 'PROPOSAL' } as Exercise;

describe('B2-03: a clip cut does not drive the angle', () => {
  it('reads every close-up frame of clip 05 (8.1 s to 11.7 s) as not seen, and the person again after', () => {
    const s = CLIP_FULL['05']!;
    const made = createPipeline(squat, 'left', s.aspect, { baselineDeg: 5 });
    if (!made.ok) throw new Error('setup');
    const out: { t: number; f: number | null }[] = [];
    s.rows.forEach((row, i) => {
      const fr = rowFrame(row, i);
      out.push({ t: fr.tMs, f: made.pipeline.step(fr.landmarks, fr.tMs).flexion });
    });
    const closeUp = out.filter((o) => o.t >= 8100 && o.t <= 11700);
    expect(closeUp.length).toBeGreaterThan(20);
    expect(closeUp.filter((o) => o.f !== null)).toEqual([]);
    expect(out.find((o) => o.t === 12500)!.f).not.toBeNull(); // the person is back
  });
});
