import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { CameraFigure, GuideFigure } from '../../src/ui/GuideFigure';
import { EXERCISE_KINDS } from '../../src/lib/protocol/schema';

const css = readFileSync('src/ui/figures.css', 'utf8');
const source = readFileSync('src/ui/GuideFigure.tsx', 'utf8');

describe('GuideFigure', () => {
  it.each(EXERCISE_KINDS)('%s: is one svg image with a title, a description and the text alternative', (kind) => {
    const { container } = render(<GuideFigure kind={kind} frame="end" side="left" description="End position. Test text." />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('End position. Test text.');
    expect(svg.querySelector('title')?.textContent).toBe('End position');
    expect(svg.querySelector('desc')?.textContent).toBe('End position. Test text.');
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
    expect(container.querySelector('foreignObject, image, script, style')).toBeNull();
  });

  it('writes the labels as real text elements', () => {
    const { container } = render(<GuideFigure kind="heel-slide" frame="start" side="right" description="d" />);
    const texts = [...container.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toEqual(expect.arrayContaining(['Start', 'Operated leg', 'Camera', 'Bed or mat']));
  });

  it('shows the number from the exercise data on the end frame only', () => {
    const end = render(<GuideFigure kind="heel-slide" frame="end" side="left" description="d" kneeDeg={75} />);
    expect([...end.container.querySelectorAll('text')].map((t) => t.textContent)).toContain('75°');
    end.unmount();
    const start = render(<GuideFigure kind="heel-slide" frame="start" side="left" description="d" kneeDeg={75} />);
    expect(start.container.textContent).not.toMatch(/\d/);
    start.unmount();
    const none = render(<GuideFigure kind="heel-slide" frame="end" side="left" description="d" />);
    expect(none.container.textContent).not.toMatch(/\d/);
  });

  it.each(EXERCISE_KINDS)('%s: the end frame has a ghost of the start and the start frame has none', (kind) => {
    const end = render(<GuideFigure kind={kind} frame="end" side="left" description="d" />);
    expect(end.container.querySelectorAll('.fg-ghost')).toHaveLength(1);
    end.unmount();
    const start = render(<GuideFigure kind={kind} frame="start" side="left" description="d" />);
    expect(start.container.querySelectorAll('.fg-ghost')).toHaveLength(0);
  });

  it.each(EXERCISE_KINDS)('%s: draws a movement arrow and marks the operated knee', (kind) => {
    const { container } = render(<GuideFigure kind={kind} frame="start" side="right" description="d" />);
    expect(container.querySelectorAll('.fg-arrow')).toHaveLength(1);
    expect(container.querySelectorAll('.fg-arrow-head')).toHaveLength(1);
    expect(container.querySelectorAll('.fg-near').length).toBe(3);
    expect(container.querySelectorAll('.fg-knee-mark').length).toBeGreaterThanOrEqual(2);
  });
});

describe('CameraFigure', () => {
  it.each(['side', 'front'] as const)('%s view: an image with the camera, the distance and the operated leg as text', (view) => {
    const { container } = render(<CameraFigure view={view} kind="mini-squat" side="left" description="Camera guide." />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Camera guide.');
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
    const texts = [...container.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toEqual(expect.arrayContaining(['Camera', 'Operated leg', '2 to 2.5 m', 'At knee height']));
    expect(container.querySelector('.fg-cone')).not.toBeNull();
  });
});

describe('figures.css', () => {
  it('sets the text size to at least 14 pixels', () => {
    const sizes = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((s) => expect(s).toBeGreaterThanOrEqual(14));
  });

  it('adds only custom properties with the fig prefix', () => {
    const props = [...css.matchAll(/^\s*(--[a-z-]+):/gm)].map((m) => m[1]);
    expect(props.length).toBeGreaterThan(0);
    props.forEach((p) => expect(p).toMatch(/^--fig-/));
  });

  it('has no green or red colour', () => {
    const hexes = [...css.matchAll(/#([0-9a-f]{6})\b/gi)].map((m) => m[1] as string);
    hexes.forEach((h) => {
      const [r = 0, g = 0, b = 0] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
      const green = g > r + 30 && g > b + 30;
      const red = r > g + 60 && r > b + 60;
      expect(green || red, `#${h}`).toBe(false);
    });
  });

  it('uses no url, no import and no font file', () => {
    expect(css).not.toMatch(/url\(|@import|@font-face/);
  });

  it('is imported by GuideFigure and the component has no network call', () => {
    expect(source).toMatch(/import '\.\/figures\.css'/);
    expect(source).not.toMatch(/fetch\(|XMLHttpRequest|<image|href=/);
  });
});
