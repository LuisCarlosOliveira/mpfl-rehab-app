import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/ui/styles.css', 'utf8');
const start = css.indexOf('===== W2 START');
const end = css.indexOf('===== W2 END');
const block = css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');

describe('styles.css W2 block', () => {
  it('is one marked block and sits after the other blocks', () => {
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(css.indexOf('===== W2 START', start + 1)).toBe(-1);
  });

  it('keeps the width of the Start camera button for the widest label', () => {
    expect(block).toMatch(/\.btn-swap\s*\{[^}]*min-width:\s*calc\(20ch/);
  });

  it('gives the hide switch a 48 px row', () => {
    expect(block).toMatch(/\.body-map-switch\s*\{[^}]*min-height:\s*48px/);
  });

  it('lets a point move with the data: no transition or animation on the map, and the map takes no pointer', () => {
    const map = block.slice(block.indexOf('.body-map {'), block.indexOf('.body-map-switch'));
    expect(map).not.toMatch(/transition|animation|@keyframes/);
    expect(block).toMatch(/\.body-map\s*\{[^}]*pointer-events:\s*none/);
  });

  it('mirrors with the same rule for picture and map, and does not use scaleX(-1)', () => {
    expect(block).toMatch(/\.mirrored\s*\{\s*scale:\s*-1 1/);
    expect(block).not.toMatch(/scaleX/);
  });

  it('draws the chosen leg bolder than the other leg, and only the other leg is dashed by default', () => {
    const width = (sel: string) => Number(new RegExp(`${sel.replace(/\./g, '\\.')}[^{]*\\{[^}]*stroke-width:\\s*(\\d+)px`).exec(block)![1]);
    expect(width('.bm-core.bm-chosen')).toBeGreaterThan(width('.bm-core.bm-other'));
    expect(width('.bm-halo.bm-chosen')).toBeGreaterThan(width('.bm-halo.bm-other'));
    expect(block).toMatch(/\.bm-core\.bm-other\s*\{[^}]*stroke-dasharray/);
    expect(block).not.toMatch(/\.bm-core\.bm-chosen\s*\{[^}]*dasharray/);
  });

  it('has no colour that depends on the angle: no angle class and no red or green name', () => {
    expect(block).not.toMatch(/bm-(good|bad|over|near|limit|angle)/);
    expect(block).not.toMatch(/\b(red|green)\b/i);
  });
});
