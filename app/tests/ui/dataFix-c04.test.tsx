import { cleanup, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../../src/ui/Dashboard';
import { day, installDialogStub, session, stubDownload } from './t11helpers';

let stub: ReturnType<typeof stubDownload>;
beforeEach(() => {
  localStorage.clear();
  installDialogStub();
  stub = stubDownload();
});
afterEach(() => {
  cleanup();
  stub.restore();
});

const strip = (container: HTMLElement) => container.querySelector('.stat-strip') as HTMLElement;


describe('C-04 last peak names its exercise and skips the straight leg raise', () => {
  it('never shows a leg raise value as the last peak', () => {
    const list = [session({ date: day(1), exercise: 'heel-slide', peakFlexion: 90 }), session({ date: day(2), exercise: 'straight-leg-raise', peakFlexion: 12 })];
    const { container } = render(<Dashboard sessions={list} onBack={vi.fn()} />);
    expect(strip(container).textContent).not.toMatch(/\b12\b/);
    expect(within(strip(container)).getByText('90')).toBeInTheDocument();
    expect(strip(container).textContent).toMatch(/heel slide/i);
  });
  it('shows no value when only leg raises exist', () => {
    const { container } = render(<Dashboard sessions={[session({ exercise: 'straight-leg-raise', peakFlexion: 12 })]} onBack={vi.fn()} />);
    expect(strip(container).textContent).not.toMatch(/\b12\b/);
    expect(strip(container).textContent).toMatch(/No value/);
  });
});
