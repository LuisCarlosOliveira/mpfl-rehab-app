import { cleanup, render } from '@testing-library/react';
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


describe('C-07 dashboard shows whole degrees', () => {
  it('shows 141 and not 141.1 in text, table and strip', () => {
    const list = [session({ date: day(1), peakFlexion: 94.3 }), session({ date: day(2), peakFlexion: 141.1 })];
    const { container } = render(<Dashboard sessions={list} onBack={vi.fn()} />);
    expect(container.textContent).not.toMatch(/\d\.\d/);
    expect(container.textContent).toMatch(/141/);
    expect(container.textContent).toMatch(/94 /);
  });
});
