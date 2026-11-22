import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataScreen } from '../../src/ui/DataScreen';
import { freshDb } from './helpers';
import { installDialogStub, stubDownload } from './t11helpers';

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


describe('Import text', () => {
  it('states the real import rule (C-09)', async () => {
    render(<DataScreen db={freshDb()} onBack={vi.fn()} onErased={vi.fn()} />);
    const text = (await screen.findByText(/Import adds the sessions/)).textContent ?? '';
    expect(text).not.toMatch(/any session is already stored/);
    expect(text).toMatch(/session of the file is already stored/);
    expect(text).toMatch(/another record/);
  });
});
