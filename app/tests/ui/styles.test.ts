import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/ui/styles.css', 'utf8');
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Hex to OKLCH. Chroma c and hue h in degrees. Colours are 3, 6 or 8 digit hex (alpha is ignored). */
function oklch(hex: string): { c: number; h: number } {
  const body = hex.slice(1);
  const full = body.length === 3 ? [...body].map((x) => x + x).join('') : body.slice(0, 6);
  const lin = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const [r, g, b] = lin;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { c: Math.hypot(a, bb), h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
}

function luminance(hex: string): number {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex.slice(0, 7);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

// The light tokens sit in the first :root block. The dark tokens sit in the :root block inside the dark media query.
const lightBlock = /:root\s*\{([^}]*)\}/.exec(rules)![1]!;
const darkBlock = /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(rules)![1]!;
const tokenIn = (block: string, name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6,8})\\b`).exec(block)![1]!;
const THEMES: [string, string][] = [
  ['light', lightBlock],
  ['dark', darkBlock],
];

describe('styles.css rules', () => {
  it('has no mirrored preview', () => {
    expect(rules).not.toMatch(/scaleX\(\s*-1/i);
  });

  it('uses no red or green colour with real chroma (no verdict colour)', () => {
    const colours = rules.match(/#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [];
    expect(colours.length).toBeGreaterThan(40);
    for (const c of colours) {
      const { c: chroma, h } = oklch(c);
      // OKLCH red sits near 29 degrees and green near 142 degrees. The warm paper neutrals have a hue near 38 and a chroma below 0.04.
      const red = h < 40 || h > 340;
      const green = h > 100 && h < 175;
      expect(chroma < 0.04 || !(red || green), `${c} is a red or green colour (chroma ${chroma.toFixed(3)}, hue ${h.toFixed(0)})`).toBe(true);
    }
    expect(rules).not.toMatch(/\b(red|green|lime|crimson|tomato)\b/i);
    expect(rules).not.toMatch(/\b(rgb|hsl|oklch)a?\(/i); // colours stay in the checked hex tokens
  });

  it('keeps nothing moving, and respects reduced motion', () => {
    expect(rules).not.toMatch(/@keyframes/);
    for (const m of rules.matchAll(/(?<![a-z-])animation:\s*([^;!]+)/g)) expect(m[1]!.trim()).toBe('none');
    expect(rules).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it('ends every font-family with a generic family', () => {
    const families = [...rules.replace(/@font-face\s*\{[^}]*\}/g, '').matchAll(/(?:font-family|--font-[a-z]+):\s*([^;]+);/g)]
      .map((m) => m[1]!.trim())
      .filter((f) => !f.startsWith('var('));
    expect(families.length).toBeGreaterThanOrEqual(2);
    for (const f of families) expect(f, f).toMatch(/(sans-serif|serif|monospace)$/);
  });

  it('gives buttons a touch target of at least 48 px and a visible focus style', () => {
    expect(rules).toMatch(/\.btn\s*\{[^}]*min-height:\s*48px[^}]*min-width:\s*48px/);
    expect(rules).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px/);
  });

  it.each(THEMES)('has text contrast of at least 4.5 to 1 on the page and the surface (%s)', (_name, block) => {
    const t = (n: string) => tokenIn(block, n);
    for (const fg of ['ink', 'muted', 'subtle', 'link', 'focus']) {
      for (const bg of ['bg', 'surface']) {
        expect(contrast(t(fg), t(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const bg of ['raised', 'bg']) expect(contrast(t('accent-ink'), t(bg)), `accent-ink on ${bg}`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t('disabled-ink'), t('disabled-bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t('on-primary'), t('primary'))).toBeGreaterThanOrEqual(4.5); // primary button text
    expect(contrast(t('on-accent'), t('accent'))).toBeGreaterThanOrEqual(4.5); // banner and strong notice text
  });

  it.each(THEMES)('has control edges and the focus ring of at least 3 to 1 on the page (%s)', (_name, block) => {
    const t = (n: string) => tokenIn(block, n);
    expect(contrast(t('edge'), t('bg')), 'edge on bg').toBeGreaterThanOrEqual(3);
    expect(contrast(t('focus'), t('bg')), 'focus on bg').toBeGreaterThanOrEqual(3);
    expect(contrast(t('primary'), t('bg')), 'primary on bg').toBeGreaterThanOrEqual(3);
  });

  it('sets the live angle number at 72 px or more at the smallest size', () => {
    const size = /\.readout-number\s*\{[^}]*font-size:\s*var\(--step-hero\)/.test(rules);
    expect(size, '.readout-number uses --step-hero').toBe(true);
    const min = /--step-hero:\s*clamp\(\s*([\d.]+)rem/.exec(rules)!;
    expect(Number(min[1]) * 16).toBeGreaterThanOrEqual(72);
  });
});

// L2-06 and L2-11: long text without spaces and a very narrow screen. The rules sit in a marked block at the end of the file.
describe('styles.css, long text and narrow screens', () => {
  const css2 = css.slice(Math.max(0, css.indexOf('LONG TEXT AND NARROW SCREENS (F2a)')));
  const block = css2.replace(/\/\*[\s\S]*?\*\//g, '');

  it('has the marked block at the end of the file', () => {
    expect(css.includes('LONG TEXT AND NARROW SCREENS (F2a)')).toBe(true);
    expect(css2.length).toBeGreaterThan(100);
  });

  it('lets text without spaces wrap in the cards, the facts, the lists and the notices', () => {
    for (const selector of ['.fact-row dd', '.card', '.notice', '.why-source', '.chip', '.answer-value', '.change-list li', 'main h2']) {
      expect(block, selector).toContain(selector);
    }
    expect(block).toMatch(/overflow-wrap:\s*anywhere/);
    // A heading in a flex row must not shrink to one letter, so headings and chips use break-word.
    expect(/\.chip,[^}]*\{[^}]*overflow-wrap:\s*break-word/.test(block)).toBe(true);
  });

  it('lets grid and flex children shrink with min-width 0', () => {
    expect(block).toMatch(/min-width:\s*0/);
    expect(block).toMatch(/\.home-grid > \*/);
  });

  it('lets the option cards fit a screen of 195 px', () => {
    expect(block).toMatch(/\.options\s*\{[^}]*min\(11rem, 100%\)/);
  });

  it('gives the pain scale a shape that does not overlap below 320 px', () => {
    expect(block).toMatch(/@media \(max-width: 319px\)/);
  });
});
