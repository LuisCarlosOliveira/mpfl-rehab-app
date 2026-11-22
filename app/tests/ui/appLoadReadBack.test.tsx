import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { markPrivacyNoticeSeen } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { fileOf, freshDb, mockSource, protocolText } from './helpers';
import { installDialogStub } from './t11helpers';

beforeEach(() => {
  localStorage.clear();
  installDialogStub();
});
afterEach(cleanup);

describe('the read after a saved file fails', () => {
  it('shows a message on the load screen and stays there', async () => {
    markPrivacyNoticeSeen();
    const db = freshDb();
    const read = vi.spyOn(db.protocol, 'get');
    render(<App db={db} mode="demo" source={mockSource()} />);
    const input = await screen.findByLabelText('Choose a file from your care team');
    read.mockRejectedValue(new Error('storage broke'));
    fireEvent.change(input, { target: { files: [fileOf(protocolText())] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Stored file not read');
    expect(screen.getByLabelText('Choose a file from your care team')).toBeInTheDocument();
  });
});
