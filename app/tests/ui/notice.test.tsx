import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Notice } from '../../src/ui/Notice';

afterEach(cleanup);

describe('Notice', () => {
  it('shows an icon and the words, and the icon is hidden from assistive technology', () => {
    const { container } = render(<Notice title="Pause">Rest now.</Notice>);
    expect(screen.getByText('Pause')).toHaveClass('notice-title');
    expect(screen.getByText('Rest now.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('is a soft notice by default and a strong notice on request', () => {
    const { container, rerender } = render(<Notice>Text</Notice>);
    expect(container.firstElementChild).toHaveClass('notice');
    expect(container.firstElementChild).not.toHaveClass('notice-strong');
    rerender(<Notice tone="strong">Text</Notice>);
    expect(container.firstElementChild).toHaveClass('notice-strong');
  });

  it('takes the alert and status roles from its caller', () => {
    const { rerender } = render(<Notice role="alert">Urgent</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('Urgent');
    rerender(<Notice role="status">Info</Notice>);
    expect(screen.getByRole('status')).toHaveTextContent('Info');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('has no role when the caller sets none, and sets no inline style', () => {
    const { container } = render(<Notice>Plain</Notice>);
    expect(container.firstElementChild).not.toHaveAttribute('role');
    expect(container.querySelector('[style]')).toBeNull();
  });
});
