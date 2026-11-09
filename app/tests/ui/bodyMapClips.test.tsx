// G2 replacement: the body map checked on the saved landmarks of the real clips (numbers only, no frame).
import { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Side } from '../../src/lib/angle';
import { MIN_VISIBILITY } from '../../src/lib/angle';
import { BodyMap, type BodyMapHandle } from '../../src/ui/BodyMap';
import { CLIP_SERIES } from '../fixtures/clipSeries';
import { rowFrame } from '../helpers/clip';

afterEach(cleanup);

function play(clip: string, leg: Side) {
  const { aspect, rows } = CLIP_SERIES[clip]!;
  const handle = createRef<BodyMapHandle>();
  const { container } = render(<BodyMap ref={handle} leg={leg} />);
  const svg = container.querySelector('svg')!;
  const q = (k: string) => svg.querySelector(`[data-k="${k}"]`)!;
  const shown = (k: string) => q(k).getAttribute('display') !== 'none';
  return { aspect, rows, handle, q, shown };
}

describe.each([['01'], ['05'], ['06']])('clip %s on the saved landmarks', (clip) => {
  it('draws the chosen leg and the other leg with different style classes in every frame', () => {
    for (const leg of ['left', 'right'] as const) {
      const p = play(clip, leg);
      const other = leg === 'left' ? 'right' : 'left';
      p.rows.forEach((row, i) => {
        const f = rowFrame(row, i);
        act(() => p.handle.current!.update(f.landmarks, f.tMs, p.aspect));
        if (shown(p, `${leg}-0`)) expect(p.q(`${leg}-0-c`).getAttribute('class')).toContain('bm-chosen');
        if (shown(p, `${other}-0`)) expect(p.q(`${other}-0-c`).getAttribute('class')).toContain('bm-other');
      });
      cleanup();
    }
  });

  it('puts the label on a leg that the gate does not see, and nowhere else', () => {
    let held = 0;
    for (const leg of ['left', 'right'] as const) {
      const p = play(clip, leg);
      let lowSince: number | null = null;
      p.rows.forEach((row, i) => {
        const f = rowFrame(row, i);
        act(() => p.handle.current!.update(f.landmarks, f.tMs, p.aspect));
        const vis = row === null ? null : (row[leg === 'left' ? 13 : 14] as number);
        if (vis !== null && vis < MIN_VISIBILITY) lowSince ??= f.tMs;
        else lowSince = null;
        const marked = [0, 1, 2].some((j) => p.shown(`lost-${j}`));
        if (lowSince !== null && f.tMs - lowSince >= 500) {
          held++;
          expect(marked, `${leg} frame ${i} is held low`).toBe(true);
          expect(p.q('lost-1').textContent).toBe('Knee not seen');
        }
        if (vis !== null && vis >= MIN_VISIBILITY) expect(marked, `${leg} frame ${i} is seen`).toBe(false);
      });
      cleanup();
    }
    expect(held).toBeGreaterThan(0); // every one of these clips has a leg that the gate does not see for a while
  });

  it('follows the person: the knee is within 2 percent of the frame of the landmark number in every frame', () => {
    for (const leg of ['left', 'right'] as const) {
      const p = play(clip, leg);
      const id = leg === 'left' ? 25 : 26;
      let checked = 0;
      p.rows.forEach((row, i) => {
        const f = rowFrame(row, i);
        act(() => p.handle.current!.update(f.landmarks, f.tMs, p.aspect));
        if (!f.landmarks || !p.shown(`${leg}-j1`)) return;
        const knee = p.q(`${leg}-j1`);
        const W = p.aspect * 1000;
        expect(Math.abs(Number(knee.getAttribute('cx')) / W - f.landmarks[id]!.x)).toBeLessThan(0.02);
        expect(Math.abs(Number(knee.getAttribute('cy')) / 1000 - f.landmarks[id]!.y)).toBeLessThan(0.02);
        checked++;
      });
      expect(checked).toBeGreaterThan(20);
      cleanup();
    }
  });
});

function shown(p: ReturnType<typeof play>, k: string) {
  return p.shown(k);
}
