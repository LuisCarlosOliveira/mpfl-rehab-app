import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Icon } from '../../src/ui/Icon';

afterEach(cleanup);

describe('Icon', () => {
  it('draws one svg with the Lucide frame and hides it from assistive technology', () => {
    const { container } = render(<Icon name="play" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg.querySelectorAll('path, circle, rect, line, polyline').length).toBeGreaterThan(0);
  });

  it('uses the size prop and passes other svg props through', () => {
    const { container } = render(<Icon name="info" size={40} className="x" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
    expect(svg).toHaveClass('x');
  });

  it('has path data for every icon name, and sets no inline style', () => {
    const names = [
      'play', 'square', 'chevron-down', 'chevron-left', 'chevron-right', 'info', 'triangle-alert', 'shield-check', 'video-off', 'users',
      'file-text', 'check', 'minus', 'x', 'activity', 'dumbbell', 'footprints', 'ruler', 'hand', 'calendar-check', 'user', 'stethoscope',
      'phone', 'upload', 'download', 'file-up', 'trash-2', 'volume-2', 'volume-x', 'camera', 'refresh-cw', 'chart-line', 'database', 'lock',
      'arrow-left', 'clock', 'siren', 'heart-pulse', 'bed-single', 'armchair', 'circle-dot', 'sliders-horizontal', 'list-checks', 'move-horizontal',
    ] as const;
    expect(names).toHaveLength(44);
    for (const name of names) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelector('svg')!.children.length, name).toBeGreaterThan(0);
      expect(container.querySelector('[style]'), name).toBeNull();
      unmount();
    }
  });
});
