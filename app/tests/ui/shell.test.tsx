import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Banners } from '../../src/ui/Banners';
import { LoadingScreen } from '../../src/ui/Shell';

afterEach(cleanup);

describe('Shell pieces', () => {
  it('LoadingScreen keeps the heading "Loading" and hides the skeleton', () => {
    const { container } = render(<LoadingScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Loading' })).toBeInTheDocument();
    expect(container.querySelector('.skeleton')).toHaveAttribute('aria-hidden', 'true');
  });

  it('Banners shows each text as a note with an icon, and nothing for an empty list', () => {
    const { container, rerender } = render(<Banners texts={['Prototype. Not for patient use.']} />);
    expect(screen.getByRole('note')).toHaveTextContent('Prototype. Not for patient use.');
    expect(screen.getByRole('region', { name: 'Notices' })).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<Banners texts={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
