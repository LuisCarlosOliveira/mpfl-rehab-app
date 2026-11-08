// The QR draw component. It must draw what the reader can read, and it must never throw.
import { render } from '@testing-library/react';
import jsQR from 'jsqr';
import { encode } from 'uqr';
import { QrCode } from '../../src/pairing/qrCode';
import { encodeOffer } from '../../src/lib/pairing';
import { fields } from '../pairing/helpers';
import { hasVerdictWord } from '../ui/verdict';
import { frameFromMatrix } from './qrHelpers';

const SHORT = 'MPFL1.hello';
const app = { ecc: 'M', maxVersion: 11, border: 0 } as const;

/** Read the drawn path back into a matrix. The path uses runs: "M x y h w v1 h-w z". */
function matrixFromSvg(svg: Element): { grid: boolean[][]; modules: number } {
  const modules = Number(svg.getAttribute('viewBox')?.split(' ')[2]);
  const grid = Array.from({ length: modules }, () => Array<boolean>(modules).fill(false));
  const d = svg.querySelector('path')?.getAttribute('d') ?? '';
  for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(m[3]); i++) (grid[Number(m[2])] as boolean[])[Number(m[1]) + i] = true;
  }
  return { grid, modules };
}

function draw(text: string) {
  const { container } = render(<QrCode text={text} label="Pairing code" />);
  return container;
}

describe('QrCode', () => {
  it('shows an svg with the role img and the label', () => {
    const svg = draw(SHORT).querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', 'Pairing code');
    expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
  });

  it('adds a quiet zone of 4 modules on each side', () => {
    const svg = draw(SHORT).querySelector('svg') as Element;
    const { size } = encode(SHORT, app);
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${size + 8} ${size + 8}`);
  });

  it('draws the same modules as the encoder with level M', () => {
    const { grid } = matrixFromSvg(draw(SHORT).querySelector('svg') as Element);
    const matrix = encode(SHORT, app).data;
    const inner = grid.slice(4, 4 + matrix.length).map((row) => row.slice(4, 4 + matrix.length));
    expect(inner).toEqual(matrix);
    expect((grid[0] as boolean[]).every((cell) => !cell)).toBe(true);
  });

  it('draws a code that the reader decodes back to the same text', () => {
    const { grid } = matrixFromSvg(draw(SHORT).querySelector('svg') as Element);
    const frame = frameFromMatrix(grid, 0, 4);
    expect(jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data).toBe(SHORT);
  });

  it('draws the 137 character pairing payload at version 11 or less with level M', () => {
    const payload = encodeOffer(fields());
    expect(payload.length).toBeGreaterThanOrEqual(130);
    expect(payload.length).toBeLessThanOrEqual(150);
    const { version } = encode(payload, app);
    expect(version).toBeLessThanOrEqual(11);
    const { grid } = matrixFromSvg(draw(payload).querySelector('svg') as Element);
    const frame = frameFromMatrix(grid, 0, 4);
    expect(jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data).toBe(payload);
  });

  it('draws 251 characters, the limit of version 11 at level M', () => {
    expect(draw('a'.repeat(251)).querySelector('svg')).not.toBeNull();
  });

  it('shows a plain message and does not throw when the text is too long', () => {
    const container = draw('a'.repeat(252));
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toMatch(/too long/i);
    expect(container.textContent).toMatch(/one camera/i);
  });

  it('has no inline style attribute anywhere', () => {
    expect(draw(SHORT).querySelectorAll('[style]')).toHaveLength(0);
    expect(draw('a'.repeat(300)).querySelectorAll('[style]')).toHaveLength(0);
  });

  it('uses css classes for the colours', () => {
    const container = draw(SHORT);
    expect(container.querySelector('svg')).toHaveClass('qr-svg');
    expect(container.querySelector('rect')).toHaveClass('qr-light');
    expect(container.querySelector('path')).toHaveClass('qr-dark');
  });

  it('holds no verdict word', () => {
    expect(hasVerdictWord(draw('a'.repeat(300)).textContent ?? '')).toBeNull();
    expect(hasVerdictWord(draw(SHORT).querySelector('svg')?.getAttribute('aria-label') ?? '')).toBeNull();
  });

  it('does not use an inner html string for the drawing', () => {
    expect(draw(SHORT).querySelectorAll('svg *').length).toBeLessThanOrEqual(2);
  });
});
