// P-DATA fix .
import { cleanup, render } from '@testing-library/react';
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


describe('Erase text', () => {
  it('names the plan answers in the erase dialog (A-14)', () => {
    render(<DataScreen db={freshDb()} onBack={vi.fn()} onErased={vi.fn()} />);
    expect(document.querySelector('.erase-dialog')!.textContent).toMatch(/plan answers/);
  });
});
