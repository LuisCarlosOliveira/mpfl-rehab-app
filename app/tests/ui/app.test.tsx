import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EXAMPLE_BANNER, PROTOTYPE_BANNER } from '../../src/lib/mode';
import { MESSAGES, RED_FLAGS } from '../../src/lib/redflags';
import { eraseAll, markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { exampleText, fileOf, freshDb, mockSource, protocolText, sessionInput } from './helpers';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

function pickFile(text: string) {
  fireEvent.change(screen.getByLabelText('Protocol file (.json)'), { target: { files: [fileOf(text)] } });
}

describe('App flow', () => {
  it('shows the banners on every screen', async () => {
    const source = mockSource();
    render(<App db={freshDb()} mode="demo" source={source} />);
    const banners = (example: boolean) => {
      expect(screen.getByText(PROTOTYPE_BANNER)).toBeInTheDocument();
      if (example) expect(screen.getByText(EXAMPLE_BANNER)).toBeInTheDocument();
      else expect(screen.queryByText(EXAMPLE_BANNER)).toBeNull();
    };

    await heading('Privacy');
    banners(false);
    click('I understand');
    await heading('Load protocol file');
    banners(false);
    pickFile(exampleText());
    await heading('Home');
    banners(true);
    click('Start Heel slide');
    await heading('Check before you exercise');
    banners(true);
    click(/none of these apply/i);
    await heading('Set up the camera');
    banners(true);
    click('Next: set up the camera');
    click('Start camera');
    fireEvent.click(await screen.findByRole('button', { name: 'Start exercise' }));
    await heading('Heel slide');
    banners(true);
    click('Stop');
    await heading('Summary');
    banners(true);
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    click('Save');
    fireEvent.click(await screen.findByRole('button', { name: 'Done' }));
    await heading('Home');
    banners(true);
  });

  it('the prototype banner is on the loading state and the example banner follows the protocol', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    render(<App db={db} mode="demo" source={mockSource()} />);
    expect(screen.getByText(PROTOTYPE_BANNER)).toBeInTheDocument();
    await heading('Home');
    expect(screen.queryByText(EXAMPLE_BANNER)).toBeNull();
  });

  it('patient mode has no prototype banner', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'patient');
    render(<App db={db} mode="patient" source={mockSource()} />);
    await heading('Home');
    expect(screen.queryByText(PROTOTYPE_BANNER)).toBeNull();
  });

  it('shows the privacy notice on the first launch only, and again after erase', async () => {
    const db = freshDb();
    const first = render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Privacy');
    click('I understand');
    await heading('Load protocol file');
    first.unmount();

    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Load protocol file');
    expect(screen.queryByRole('heading', { name: 'Privacy' })).toBeNull();
    cleanup();

    await eraseAll(db);
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Privacy');
  });

  it('keeps the protocol after a reload (FR26)', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Home');
    expect(screen.getByText('Test clinic')).toBeInTheDocument();
  });

  it('shows the Load screen with the named error for a stored file that patient mode refuses', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, exampleText(), 'demo');
    render(<App db={db} mode="patient" source={mockSource()} />);
    await heading('Load protocol file');
    expect(screen.getByRole('alert')).toHaveTextContent('The example protocol cannot be used in patient mode.');
  });

  it('opens Privacy from My data and returns to Home', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Home');
    click('My data');
    await heading('My data');
    click('Privacy notice');
    await heading('Privacy');
    click('I understand');
    await heading('Home');
  });

  it('a red flag blocks the path to the camera', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    const source = mockSource();
    render(<App db={db} mode="demo" source={source} />);
    await heading('Home');
    click('Start Heel slide');
    await heading('Check before you exercise');
    const emergency = RED_FLAGS.find((f) => f.group === 'emergency')!;
    fireEvent.click(screen.getByLabelText(emergency.text));
    expect(screen.getByText(MESSAGES.emergency)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /none of these apply/i })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: 'Set up the camera' })).toBeNull();
    expect(source.start).not.toHaveBeenCalled();
  });

  it('"Knee gave way or hurts" ends the session, stops the camera and shows the care-team message', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    const source = mockSource();
    render(<App db={db} mode="demo" source={source} />);
    await heading('Home');
    click('Start Heel slide');
    click(/none of these apply/i);
    click('Next: set up the camera');
    click('Start camera');
    fireEvent.click(await screen.findByRole('button', { name: 'Start exercise' }));
    await heading('Heel slide');
    click('Knee gave way or hurts');
    await heading('Summary');
    expect(screen.getByRole('alert')).toHaveTextContent(MESSAGES['care-team']);
    expect(source.stop).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: '1' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    click('Save');
    await screen.findByText('Session saved.');
    expect((await db.sessions.toArray())[0]).toMatchObject({ gaveWayPresses: 1, redFlagBlocks: 0 });
  });

  it('a new session needs a new red-flag check', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Home');
    click('Start Heel slide');
    click(/none of these apply/i);
    click('Next: set up the camera');
    click('Start camera');
    fireEvent.click(await screen.findByRole('button', { name: 'Start exercise' }));
    await heading('Heel slide');
    click('Stop');
    await heading('Summary');
    fireEvent.click(screen.getByRole('radio', { name: '1' }));
    fireEvent.click(screen.getByRole('radio', { name: /no swelling/i }));
    click('Save');
    fireEvent.click(await screen.findByRole('button', { name: 'Done' }));
    await heading('Home');
    click('Start Heel slide');
    await heading('Check before you exercise');
  });

  it('a file with markup in a text field shows as text', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Load protocol file');
    pickFile(protocolText({ authoredBy: '<img src=x onerror=alert(1)>' }));
    await heading('Home');
    await waitFor(() => expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument());
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows a heading on the loading state', () => {
    render(<App db={freshDb()} mode="demo" source={mockSource()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Loading' })).toBeInTheDocument();
  });

  it('replaces the protocol from Home and keeps the stored sessions (U6)', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText({ authoredBy: 'First clinic' }), 'demo');
    await db.sessions.add({ ...sessionInput(), schemaVersion: 1 } as never);
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Home');
    expect(screen.getByText('First clinic')).toBeInTheDocument();
    click('Load a new protocol file');
    await heading('Load protocol file');
    pickFile(protocolText({ authoredBy: 'Second clinic' }));
    await heading('Home');
    await waitFor(() => expect(screen.getByText('Second clinic')).toBeInTheDocument());
    expect(await db.sessions.count()).toBe(1);
  });

  it('can go back from the replace screen to Home without a file', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Home');
    click('Load a new protocol file');
    await heading('Load protocol file');
    click('Back to Home');
    await heading('Home');
  });

  it('shows Loading while a lazy screen loads, then the screen with the focus on its heading', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Home');
    click('Your sessions');
    expect(screen.getByRole('heading', { level: 1, name: 'Loading' })).toBeInTheDocument();
    const h1 = await heading('Your sessions');
    await waitFor(() => expect(h1).toHaveFocus());
    expect(screen.queryByRole('heading', { name: 'Loading' })).toBeNull();
  });

  it('keeps the banners above the new screens', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    render(<App db={db} mode="demo" source={mockSource()} />);
    await heading('Home');
    click('Your sessions');
    await heading('Your sessions');
    expect(screen.getByText(PROTOTYPE_BANNER)).toBeInTheDocument();
  });

  it('a start from Home after a visit to Progress still needs the red-flag check', async () => {
    const db = freshDb();
    markPrivacyNoticeSeen();
    await saveProtocol(db, protocolText(), 'demo');
    const source = mockSource();
    render(<App db={db} mode="demo" source={source} />);
    await heading('Home');
    click('Your sessions');
    await heading('Your sessions');
    click('Back');
    await heading('Home');
    click('Start Heel slide');
    await heading('Check before you exercise');
    expect(source.start).not.toHaveBeenCalled();
  });
});
