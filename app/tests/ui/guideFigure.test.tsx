import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { CameraFigure, GuideFigure } from '../../src/ui/GuideFigure';
import { EXERCISE_KINDS } from '../../src/lib/protocol/schema';

const css = readFileSync('src/ui/figures.css', 'utf8');
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
const source = readFileSync('src/ui/GuideFigure.tsx', 'utf8');

// The tokens of styles.css: the first :root block is light, the :root block in the dark media query is dark.
const sheet = readFileSync('src/ui/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = (block: string) => Object.fromEntries([...block.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!])) as Record<string, string>;
const lightTokens = tokens(/:root\s*\{([^}]*)\}/.exec(sheet)![1]!);
const darkTokens = { ...lightTokens, ...tokens(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(sheet)![1]!) };
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

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
    expect(texts).toEqual(expect.arrayContaining(['Start', 'Operated leg', 'Bed or mat']));
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

describe('GuideFigure seated hold (T3)', () => {
  const texts = (c: HTMLElement) => [...c.querySelectorAll('text')].map((t) => t.textContent);

  it('draws the arc and the number of the protocol hold angle on the end frame', () => {
    const { container } = render(<GuideFigure kind="seated-extension-hold" frame="end" side="left" description="d" kneeDeg={60} />);
    expect(texts(container)).toContain('60°');
    expect(container.querySelectorAll('.fg-arc')).toHaveLength(1);
  });

  it('draws no arc and no number when the protocol gives no angle', () => {
    const { container } = render(<GuideFigure kind="seated-extension-hold" frame="end" side="left" description="d" />);
    expect(container.textContent).not.toMatch(/\d/);
    expect(container.querySelectorAll('.fg-arc')).toHaveLength(0);
  });
});

describe('CameraFigure', () => {
  it.each(['side', 'front'] as const)('%s view: an image with the camera, the distance and the operated leg as text', (view) => {
    const { container } = render(<CameraFigure view={view} kind="mini-squat" description="Camera guide." />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Camera guide.');
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
    const texts = [...container.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toEqual(expect.arrayContaining(['Camera', 'Operated leg', '2 to 2.5 m', 'At knee height', view === 'side' ? 'Side view' : 'Front view']));
    expect(container.querySelector('.fg-cone')).not.toBeNull();
  });
});

describe('figures.css', () => {
  it('sets no font size, because the size comes from the svg and follows the view box', () => {
    expect(rules).not.toMatch(/font-size/);
  });

  it.each(EXERCISE_KINDS)('%s: every label has a size that is at least 14 pixels at 288 pixels width', (kind) => {
    const { container } = render(<GuideFigure kind={kind} frame="end" side="left" description="d" kneeDeg={45} />);
    const svg = container.querySelector('svg')!;
    const width = Number(svg.getAttribute('viewBox')!.split(' ')[2]);
    const texts = [...container.querySelectorAll('text')];
    expect(texts.length).toBeGreaterThan(2);
    texts.forEach((t) => expect((Number(t.getAttribute('font-size')) * 288) / width).toBeGreaterThanOrEqual(14));
  });

  it('adds only custom properties with the fig prefix', () => {
    const props = [...css.matchAll(/^\s*(--[a-z-]+):/gm)].map((m) => m[1]);
    expect(props.length).toBeGreaterThan(0);
    props.forEach((p) => expect(p).toMatch(/^--fig-/));
  });

  it('takes its colours from the tokens of styles.css and has no colour of its own', () => {
    expect(rules).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    const declared = new Set([...sheet.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]));
    const used = [...rules.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]!).filter((n) => !n.startsWith('--fig-'));
    expect(used.length).toBeGreaterThan(0);
    used.forEach((n) => expect(declared.has(n), n).toBe(true));
  });

  it.each([
    ['light', lightTokens],
    ['dark', darkTokens],
  ] as const)('keeps the contrast of text at 4.5 and of strokes at 3 on the card (%s theme)', (_theme, t) => {
    const card = t['--raised']!;
    expect(contrast(t['--muted']!, card), 'body and surface name').toBeGreaterThanOrEqual(4.5);
    expect(contrast(t['--ink']!, card), 'operated leg and labels').toBeGreaterThanOrEqual(4.5);
    expect(contrast(t['--chart']!, card), 'accent text').toBeGreaterThanOrEqual(4.5);
    expect(contrast(t['--edge']!, card), 'other leg').toBeGreaterThanOrEqual(3);
    expect(contrast(t['--chart']!, card), 'arrows and rings').toBeGreaterThanOrEqual(3);
    expect(contrast(t['--muted']!, t['--sunken']!), 'surface name on the surface').toBeGreaterThanOrEqual(4.5);
    expect(contrast(t['--edge']!, t['--bg']!), 'surface outline').toBeGreaterThanOrEqual(3);
  });

  it('has no green or red colour', () => {
    const hexes = [...css.matchAll(/#([0-9a-f]{6})\b/gi)].map((m) => m[1] as string);
    hexes.forEach((h) => {
      const [r = 0, g = 0, b = 0] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
      expect(g > r + 30 && g > b + 30, `#${h}`).toBe(false);
      expect(r > g + 60 && r > b + 60, `#${h}`).toBe(false);
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
