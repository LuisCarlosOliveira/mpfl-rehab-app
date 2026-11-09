import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadStoredProtocol } from '../../src/lib/storage';
import { LoadProtocol } from '../../src/ui/LoadProtocol';
import { exampleText, fileOf, freshDb, protocolText } from './helpers';

afterEach(cleanup);

async function pick(text: string, mode: 'demo' | 'patient') {
  const db = freshDb();
  const onLoaded = vi.fn();
  render(<LoadProtocol db={db} mode={mode} onLoaded={onLoaded} />);
  fireEvent.change(screen.getByLabelText('Choose a file from your care team'), { target: { files: [fileOf(text)] } });
  return { db, onLoaded };
}

describe('Load protocol screen', () => {
  it('loads a valid file, keeps it in the database and calls onLoaded', async () => {
    const { db, onLoaded } = await pick(protocolText(), 'patient');
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    expect((await loadStoredProtocol(db, 'patient'))?.ok).toBe(true);
  });

  it('loads the example in demo mode', async () => {
    const { onLoaded } = await pick(exampleText(), 'demo');
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
  });

  it('shows the named error for the example in patient mode, as plain text', async () => {
    const { db, onLoaded } = await pick(exampleText(), 'patient');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Example not allowed');
    expect(alert).toHaveTextContent('The example protocol cannot be used in patient mode.');
    expect(onLoaded).not.toHaveBeenCalled();
    expect(await loadStoredProtocol(db, 'patient')).toBeNull();
  });

  it('shows the named error for an unapproved file in patient mode', async () => {
    const { onLoaded } = await pick(protocolText({ approvedOn: undefined }), 'patient');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No approval recorded');
    expect(alert).toHaveTextContent('No clinician approval is recorded in this protocol.');
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('shows an error for a file that is not JSON', async () => {
    await pick('not json', 'demo');
    expect(await screen.findByRole('alert')).toHaveTextContent('The file is not valid JSON.');
  });

  it('shows an error for an unknown key', async () => {
    await pick(protocolText({ extra: 1 }), 'demo');
    expect(await screen.findByRole('alert')).toHaveTextContent('Protocol not valid');
  });

  it('does not read a file over 5 MB and names the error', async () => {
    const db = freshDb();
    render(<LoadProtocol db={db} mode="demo" onLoaded={vi.fn()} />);
    const big = fileOf('{}');
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    const text = vi.spyOn(big, 'text');
    fireEvent.change(screen.getByLabelText('Choose a file from your care team'), { target: { files: [big] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('The file is larger than 5 MB.');
    expect(text).not.toHaveBeenCalled();
  });

  it('shows an error text from the file as plain text and makes no element from it', async () => {
    const markup = '<img src=x onerror=alert(1)>';
    await pick(protocolText({ unknownKey: markup }), 'demo');
    await screen.findByRole('alert');
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows the error of a stored file that start-up refused', () => {
    render(
      <LoadProtocol
        db={freshDb()}
        mode="patient"
        onLoaded={vi.fn()}
        initialError={{ title: 'Stored file refused', message: 'No clinician approval is recorded in this protocol.' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Stored file refused');
  });
});

describe('Load protocol screen, design', () => {
  it('shows the picker as an action row with a hidden icon, and no inline style', () => {
    const { container } = render(<LoadProtocol db={freshDb()} mode="demo" onLoaded={vi.fn()} />);
    const zone = screen.getByLabelText('Choose a file from your care team').closest('.action-row')!;
    expect(zone.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('[style]')).toBeNull();
  });

  it('shows a refused file as a notice with a title in the alert role', async () => {
    await pick(exampleText(), 'patient');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveClass('notice');
    expect(alert.querySelector('.notice-title')).toHaveTextContent('Example not allowed');
  });
});

describe('Load protocol screen, back button', () => {
  it('has no back button when no stored protocol exists', () => {
    render(<LoadProtocol db={freshDb()} mode="demo" onLoaded={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Back to Home' })).toBeNull();
  });

  it('has a back button when the app can go back', () => {
    const onCancel = vi.fn();
    render(<LoadProtocol db={freshDb()} mode="demo" onLoaded={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('Load protocol screen, Create my plan', () => {
  it('shows Create my plan with the line of the design in demo mode, and calls the handler', () => {
    const onCreatePlan = vi.fn();
    render(<LoadProtocol db={freshDb()} mode="demo" onLoaded={vi.fn()} onCreatePlan={onCreatePlan} />);
    expect(screen.getByText('The app uses published protocols. No clinician checks this plan.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create my plan' }));
    expect(onCreatePlan).toHaveBeenCalledTimes(1);
  });

  it('keeps the file picker next to it, with the same label', () => {
    render(<LoadProtocol db={freshDb()} mode="demo" onLoaded={vi.fn()} onCreatePlan={vi.fn()} />);
    expect(screen.getByLabelText('Choose a file from your care team')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Load protocol file' })).toBeInTheDocument();
  });

  it('shows no Create my plan in patient mode, even when the handler is given', () => {
    render(<LoadProtocol db={freshDb()} mode="patient" onLoaded={vi.fn()} onCreatePlan={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Create my plan' })).toBeNull();
    expect(screen.queryByText(/No clinician checks this plan/)).toBeNull();
  });

  it('shows no Create my plan without the handler', () => {
    render(<LoadProtocol db={freshDb()} mode="demo" onLoaded={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Create my plan' })).toBeNull();
  });

  it('names a stored plan that the app made, in patient mode, with its own title', async () => {
    const text = JSON.stringify({ schemaVersion: 1, id: 'g-1', side: 'left', generated: { on: '2026-11-08', rules: ['W1'] }, activePhase: 1, phases: [{ id: 1, name: 'P', exercises: [] }], surgeon: {} });
    await pick(text, 'patient');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Plan from the app not allowed');
    expect(alert).toHaveTextContent('A plan that the app made has no clinician approval. It cannot be used in patient mode.');
  });
});
