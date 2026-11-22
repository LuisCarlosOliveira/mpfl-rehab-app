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

  // The map holds a point for one update when it jumps (a spike filter, BodyMap.tsx). So the knee must be within 2 percent of the
  // landmark of this frame or of one of the two frames before. A hold never lasts longer than two updates.
  it('follows the person: the knee is within 2 percent of the landmark number of this frame or one of the two frames before', () => {
    for (const leg of ['left', 'right'] as const) {
      const p = play(clip, leg);
      const id = leg === 'left' ? 25 : 26;
      let checked = 0;
      let before: ({ x: number; y: number } | null)[] = [];
      p.rows.forEach((row, i) => {
        const f = rowFrame(row, i);
        act(() => p.handle.current!.update(f.landmarks, f.tMs, p.aspect));
        const now = f.landmarks ? f.landmarks[id]! : null;
        const prev = before;
        before = [now, prev[0] ?? null];
        if (!now || !p.shown(`${leg}-j1`)) return;
        const knee = p.q(`${leg}-j1`);
        const W = p.aspect * 1000;
        const x = Number(knee.getAttribute('cx')) / W;
        const y = Number(knee.getAttribute('cy')) / 1000;
        const near = (o: { x: number; y: number }) => Math.abs(x - o.x) < 0.02 && Math.abs(y - o.y) < 0.02;
        expect(near(now) || prev.some((o) => o !== null && near(o)), `row ${i}`).toBe(true);
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
