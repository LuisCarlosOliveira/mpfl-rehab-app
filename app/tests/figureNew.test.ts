// Figures of the five new exercises (Step C). The drawing is data. Every pose is a PROPOSAL for the drawing only.
import { readFileSync } from 'node:fs';
import { boxShapeGap, cameraPlan, figureFor, obstaclesOf, unionBox, type Box, type Figure, type Point } from '../src/lib/figure';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuideFigure } from '../src/ui/GuideFigure';
import { HOME_EXERCISE_KINDS } from '../src/lib/protocol/schema';

const NEW = HOME_EXERCISE_KINDS;
const SIDES = ['left', 'right'] as const;
const FRAMES = ['start', 'end'] as const;
const GAP = 1.5;
const inView = (p: Point, v: Box) => p.x >= v.x && p.x <= v.x + v.w && p.y >= v.y && p.y <= v.y + v.h;
const boxInView = (b: Box, v: Box) => b.x >= v.x - 0.01 && b.y >= v.y - 0.01 && b.x + b.w <= v.x + v.w + 0.01 && b.y + b.h <= v.y + v.h + 0.01;
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const angleOf = (a: Point, b: Point) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

describe('figures of the five new exercises', () => {
  it.each(NEW)('%s: the view box holds every point, the surface, the arrow and every label', (kind) => {
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) => {
        const fig = figureFor(kind, frame, side);
        expect(fig.view.w).toBeGreaterThan(0);
        expect(fig.view.h).toBeGreaterThan(0);
        [...Object.values(fig.points), fig.arrow.from, fig.arrow.to, ...fig.arrow.head].forEach((p) => expect(inView(p, fig.view), `${kind} ${side} ${frame}`).toBe(true));
        fig.surface.rects.forEach((r) => expect(boxInView(r, fig.view)).toBe(true));
        fig.labels.forEach((l) => expect(boxInView(l.box, fig.view), l.text).toBe(true));
        expect(fig.head.center.y - fig.head.r).toBeGreaterThanOrEqual(fig.view.y);
      }),
    );
  });

  it.each(NEW)('%s: each pose has a label for its end state, and the end frame has a ghost of the start', (kind) => {
    expect(figureFor(kind, 'start', 'left').labels.find((l) => l.key === 'frame')?.text).toBe('Start');
    const end = figureFor(kind, 'end', 'left');
    expect(end.labels.find((l) => l.key === 'frame')?.text).toBe('End');
    expect(end.ghost).not.toBeNull();
    expect(figureFor(kind, 'start', 'left').ghost).toBeNull();
  });

  it.each(NEW)('%s: labels do not overlap and keep clear of every shape', (kind) => {
    SIDES.forEach((side) =>
      FRAMES.forEach((frame) => {
        const fig: Figure = figureFor(kind, frame, side);
        fig.labels.forEach((a, i) => fig.labels.slice(i + 1).forEach((b) => expect(overlap(a.box, b.box), `${kind} ${side} ${frame} ${a.text}/${b.text}`).toBe(false)));
        fig.labels.forEach((l) => {
          const shapes = obstaclesOf(fig).filter((s) => !(l.key === 'surface' && s.k === 'rect'));
          const rects = l.key === 'surface' ? [] : fig.surface.rects.map((r) => ({ k: 'rect' as const, box: r }));
          const gap = Math.min(...[...shapes, ...rects].map((s) => boxShapeGap(l.box, s)));
          expect(gap, `${kind} ${side} ${frame} ${l.key}`).toBeGreaterThanOrEqual(GAP);
        });
      }),
    );
  });

  it.each(NEW)('%s: the near leg is the chosen leg and the left and right drawings mirror each other', (kind) => {
    const l = figureFor(kind, 'end', 'left');
    const r = figureFor(kind, 'end', 'right');
    expect(l.nearLeg).toBe('left');
    expect(r.facing).toBe(1);
    expect(l.view.w).toBeCloseTo(r.view.w, 1);
    expect(l.points.ankle.y).toBeCloseTo(r.points.ankle.y, 1);
  });

  it.each(NEW)('%s: no knee number is drawn', (kind) => {
    FRAMES.forEach((f) => expect(figureFor(kind, f, 'left').kneeArc.label).toBeNull());
  });

  it('quad set: the leg is straight on a mat with a towel roll under the knee', () => {
    const fig = figureFor('quad-set', 'end', 'right');
    expect(fig.surface.key).toBe('mat');
    expect(fig.surface.rects.length).toBe(2);
    const towel = fig.surface.rects[1]!;
    expect(fig.points.knee.x).toBeGreaterThan(towel.x);
    expect(fig.points.knee.x).toBeLessThan(towel.x + towel.w);
    expect(towel.y).toBeGreaterThan(fig.points.knee.y);
    expect(fig.kneeArc.flexionDeg).toBe(0);
  });

  it('gluteal set: supine on a mat with the arrow at the buttocks', () => {
    const fig = figureFor('gluteal-set', 'end', 'right');
    expect(fig.surface.key).toBe('mat');
    expect(Math.abs(fig.arrow.to.x - fig.points.hip.x)).toBeLessThan(12);
    expect(fig.arrow.to.y).toBeLessThan(fig.points.hip.y);
  });

  it('ankle pump: the foot points up in one state and away from the body in the other, the leg stays straight', () => {
    const a = figureFor('ankle-pump', 'start', 'right');
    const b = figureFor('ankle-pump', 'end', 'right');
    expect(a.points.knee).toEqual(b.points.knee);
    const up = angleOf(a.points.ankle, a.points.toe);
    const away = angleOf(b.points.ankle, b.points.toe);
    expect(up).toBeLessThan(-80);
    expect(Math.abs(away)).toBeLessThan(40);
  });

  it('leg raise to the side: side-lying, the top leg goes up and stays straight', () => {
    const a = figureFor('leg-raise-side', 'start', 'right');
    const b = figureFor('leg-raise-side', 'end', 'right');
    expect(b.points.ankle.y).toBeLessThan(a.points.ankle.y - 10);
    expect(angleOf(b.points.hip, b.points.knee)).toBeCloseTo(angleOf(b.points.knee, b.points.ankle), 3);
    expect(b.points.farAnkle.y).toBeCloseTo(a.points.farAnkle.y, 3);
    expect(b.points.hip.y).toBeCloseTo(b.points.shoulder.y, 3);
  });

  it('leg raise to the back: standing side-on with hand support, the leg goes behind the body', () => {
    const a = figureFor('leg-raise-back', 'start', 'right');
    const b = figureFor('leg-raise-back', 'end', 'right');
    expect(b.surface.key).toBe('counter');
    expect(b.points.hand.x).toBeGreaterThan(b.points.shoulder.x);
    expect(b.points.ankle.x).toBeLessThan(a.points.ankle.x - 10);
    expect(angleOf(b.points.hip, b.points.knee)).toBeCloseTo(angleOf(b.points.knee, b.points.ankle), 3);
    expect(b.points.farAnkle).toEqual(a.points.farAnkle);
    expect(b.floor).not.toBeNull();
  });

  it.each(NEW)('%s: the camera plan works for the pose', (kind) => {
    (['side', 'front'] as const).forEach((view) => {
      const plan = cameraPlan(view, kind);
      expect(plan.box.w).toBeGreaterThan(0);
      // Step D1: the front plan of the leg raise to the side draws a standing person with the phone in front at hip height.
      const standing = kind === 'leg-raise-back' || (kind === 'leg-raise-side' && view === 'front');
      expect(plan.posture).toBe(standing ? 'upright' : 'lying');
    });
  });

  it('the view box of a pose is the union of its parts', () => {
    const fig = figureFor('leg-raise-back', 'end', 'left');
    expect(unionBox([fig.view]).w).toBe(fig.view.w);
  });

  it('the figure code holds no colour literal: colour comes only from CSS variables', () => {
    for (const file of ['src/lib/figure.ts', 'src/ui/GuideFigure.tsx']) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src, file).not.toMatch(/\b(rgb|rgba|hsl|hsla|oklch)\(/);
    }
  });

  it.each(NEW)('%s: the figure component renders an svg with a view box and no inline style or colour', (kind) => {
    FRAMES.forEach((frame) => {
      const html = renderToStaticMarkup(createElement(GuideFigure, { kind, frame, side: 'right', description: 'text' }));
      expect(html).toMatch(/<svg class="fig" viewBox="[-\d. ]+"/);
      expect(html).not.toMatch(/style=|#[0-9a-fA-F]{3,6}"|rgb\(/);
    });
  });
});
