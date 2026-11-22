import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Suspense, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoadError, retryableLazy } from '../../src/ui/LoadError';
import { hasVerdictWord } from './verdict';

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

const TEXT = 'This screen could not load. The app may have been updated. Try again reloads the page. Saved sessions stay on this device. Unsaved answers are lost.';

const reload = vi.fn();
beforeEach(() => {
  reload.mockClear();
  vi.stubGlobal('location', { ...window.location, reload });
});
afterEach(() => vi.unstubAllGlobals());

function mount(load: () => Promise<{ default: () => ReactElement }>) {
  const Screen = retryableLazy(load);
  const onBack = vi.fn();
  const view = render(
    <LoadError onBack={onBack}>
      <Suspense fallback={<p>Loading</p>}>
        <Screen />
      </Suspense>
    </LoadError>,
  );
  return { onBack, view };
}

const OFFLINE_TEXT = 'You are offline. Reconnect, then press Try again. Saved sessions stay on this device. Unsaved answers are lost.';

describe('LoadError and retryableLazy', () => {
  it('shows a focused heading, the text and two buttons when the import rejects', async () => {
    mount(() => Promise.reject(new Error('chunk')));
    const h1 = await screen.findByRole('heading', { level: 1 });
    expect(h1).toHaveFocus();
    expect(screen.getByText(TEXT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Home' })).toBeInTheDocument();
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
    expect(document.querySelector('[style]')).toBeNull();
  });

  it('reloads the page on Try again when the chunk failed, because a new build has new chunk names', async () => {
    let calls = 0;
    mount(() => (++calls, Promise.reject(new Error('Failed to fetch dynamically imported module'))));
    await screen.findByText(TEXT);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(calls).toBe(1);
  });

  it('calls onBack from Back to Home', async () => {
    const { onBack } = mount(() => Promise.reject(new Error('x')));
    fireEvent.click(await screen.findByRole('button', { name: 'Back to Home' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the children when nothing fails', async () => {
    mount(() => Promise.resolve({ default: () => <h1>Fine</h1> }));
    expect(await screen.findByRole('heading', { name: 'Fine' })).toBeInTheDocument();
  });

  describe('when the device is offline', () => {
    afterEach(() => vi.restoreAllMocks());

    it('shows the offline text with the same title and both buttons', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      mount(() => Promise.reject(new Error('chunk')));
      const h1 = await screen.findByRole('heading', { level: 1, name: 'Screen not loaded' });
      expect(h1).toHaveFocus();
      expect(screen.getByText(OFFLINE_TEXT)).toBeInTheDocument();
      expect(screen.queryByText(TEXT)).toBeNull();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to Home' })).toBeInTheDocument();
      expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
    });

    it('still reloads on Try again', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      mount(() => Promise.reject(new Error('chunk')));
      await screen.findByText(OFFLINE_TEXT);
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('keeps the existing text when the device is online', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      mount(() => Promise.reject(new Error('chunk')));
      expect(await screen.findByText(TEXT)).toBeInTheDocument();
      expect(screen.queryByText(OFFLINE_TEXT)).toBeNull();
    });
  });
});
