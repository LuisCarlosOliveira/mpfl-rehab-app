// L4-02 and L3-05: the focus rules with lazy screens. The first screen keeps the focus on the body.
// A screen that opens later puts the focus on its heading, also when its chunk loads after the click.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { freshDb, mockSource, protocolText } from './helpers';
import { installDialogStub } from './t11helpers';

beforeEach(() => {
  localStorage.clear();
  installDialogStub();
});
afterEach(cleanup);

describe('focus on lazy screens', () => {
  it('keeps the focus on the body of the first screen, Privacy', async () => {
    render(<App db={freshDb()} mode="demo" source={mockSource()} />);
    await screen.findByRole('heading', { level: 1, name: 'Privacy' });
    expect(document.body).toHaveFocus();
  });

  it('puts the focus on the heading of Privacy when My data opens it again', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    render(<App db={db} mode="demo" source={mockSource()} />);
    await screen.findByRole('heading', { level: 1, name: 'Today' });
    fireEvent.click(screen.getByRole('button', { name: 'My data' }));
    await screen.findByRole('heading', { level: 1, name: 'My data' });
    fireEvent.click(screen.getByRole('button', { name: 'Privacy notice' }));
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Privacy' });
    await waitFor(() => expect(h1).toHaveFocus());
  });

  it('puts the focus on the heading of the first question group after the chunk loads', async () => {
    markPrivacyNoticeSeen();
    render(<App db={freshDb()} mode="demo" source={mockSource()} />);
    await screen.findByRole('heading', { level: 1, name: 'Load protocol file' });
    fireEvent.click(screen.getByRole('button', { name: 'Create my plan' }));
    const h1 = await screen.findByRole('heading', { level: 1, name: 'You and your surgery' });
    await waitFor(() => expect(h1).toHaveFocus());
  });
});
