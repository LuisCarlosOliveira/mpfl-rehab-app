import { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Landmark } from '../../src/lib/angle';
import { BodyMap, type BodyMapHandle } from '../../src/ui/BodyMap';

afterEach(cleanup);

const pose = (): Landmark[] => {
  const out: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  out[23] = { x: 0.3, y: 0.2, visibility: 1 };
  out[25] = { x: 0.35, y: 0.5, visibility: 1 };
  out[27] = { x: 0.6, y: 0.8, visibility: 1 };
  return out;
};

describe.each([[16 / 9], [4 / 3], [1], [9 / 16]])('body map at aspect %s', (aspect) => {
  it('draws the knee at the same fraction of the width and of the height', () => {
    const handle = createRef<BodyMapHandle>();
    const { container } = render(<BodyMap ref={handle} leg="left" />);
    act(() => handle.current!.update(pose(), 0, aspect));
    const svg = container.querySelector('svg.body-map')!;
    const knee = svg.querySelector('[data-k="left-j1"]')!;
    const [, , w, h] = (svg.getAttribute('viewBox') as string).split(' ').map(Number) as [number, number, number, number];
    expect(w / h).toBeCloseTo(aspect, 2);
    expect(Number(knee.getAttribute('cx')) / w).toBeCloseTo(0.35, 2);
    expect(Number(knee.getAttribute('cy')) / h).toBeCloseTo(0.5, 2);
  });
});
