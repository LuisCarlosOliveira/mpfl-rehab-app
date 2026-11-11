// P-DATA2 fix C2-04: the note of the stat strip starts the second sentence with a capital letter.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../../src/ui/Dashboard';
import { day, installDialogStub, session } from './t11helpers';

afterEach(cleanup);

describe('C2-04 stat strip note', () => {
  it('reads "Seated knee extension hold. Estimated angle, not a medical measurement."', () => {
    installDialogStub();
    const { container } = render(<Dashboard sessions={[session({ exercise: 'seated-extension-hold', peakFlexion: 40, date: day(1) })]} onBack={vi.fn()} />);
    const note = container.querySelector('.stat-note')!.textContent;
    expect(note).toBe('Seated knee extension hold. Estimated angle, not a medical measurement.');
  });
});
