import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Privacy } from '../../src/ui/Privacy';

afterEach(cleanup);

describe('Privacy screen, notices link (finding S-04)', () => {
  it('has a plain link to the third-party notices file on the same origin', () => {
    render(<Privacy onDone={vi.fn()} />);
    const link = screen.getByRole('link', { name: /third-party software notices/i });
    expect(link).toHaveAttribute('href', '/THIRD_PARTY_NOTICES.txt');
    expect(link.getAttribute('href')).not.toMatch(/^[a-z]+:\/\//i);
  });

  it('opens the file in a new tab and says so, so the app state stays', () => {
    render(<Privacy onDone={vi.fn()} />);
    const link = screen.getByRole('link', { name: /third-party software notices/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAccessibleName(/opens in a new tab/i);
  });

  it('shows the four points as cards with a hidden icon, and a large button', () => {
    const { container } = render(<Privacy onDone={vi.fn()} />);
    const points = screen.getAllByRole('listitem');
    expect(points).toHaveLength(4);
    expect(points[0]).toHaveTextContent('No video leaves your device');
    for (const svg of container.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'I understand' })).toHaveClass('btn-lg');
    expect(container.querySelector('[style]')).toBeNull();
  });
});

describe('Privacy screen, the plan answers (design: protocol generator, privacy rows)', () => {
  it('says that a plan made by the app keeps the date of surgery and the answers on this device, in the export, until erase', () => {
    render(<Privacy onDone={vi.fn()} />);
    const point = screen.getByText(/If you ask the app to make a plan/);
    expect(point).toHaveTextContent('date of your surgery');
    expect(point).toHaveTextContent('on this device');
    expect(point).toHaveTextContent('export file');
    expect(point).toHaveTextContent('Erase removes them');
  });

  it('keeps the three earlier points', () => {
    render(<Privacy onDone={vi.fn()} />);
    expect(screen.getByText(/No video leaves your device/)).toBeInTheDocument();
    expect(screen.getByText(/A shared device means shared data/)).toBeInTheDocument();
    expect(screen.getByText(/The export file holds health data/)).toBeInTheDocument();
  });
});
