import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProtocol, type Protocol } from '../../src/lib/protocol';
import { markExported, saveSession } from '../../src/lib/storage';
import { ASK_SURGEON_ITEMS } from '../../src/ui/askSurgeon';
import { Home } from '../../src/ui/Home';
import { freshDb, protocolText, sessionInput } from './helpers';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const protocol = (over: Record<string, unknown> = {}): Protocol => {
  const r = loadProtocol(protocolText(over), 'demo');
  if (!r.ok) throw new Error(r.error.message);
  return r.protocol;
};

function setup(p: Protocol = protocol(), now = new Date('2026-03-20T10:00:00Z'), db = freshDb()) {
  const props = { onStart: vi.fn(), onOpenPrivacy: vi.fn(), onLoadProtocol: vi.fn() };
  const phase = p.phases.find((x) => x.id === p.activePhase);
  render(<Home protocol={p} phase={phase} activePhase={p.activePhase} db={db} now={() => now} {...props} />);
  return { db, ...props };
}

describe('Home screen', () => {
  it('shows who wrote and approved the protocol, the side and the active phase', () => {
    setup();
    expect(screen.getByText('Test clinic')).toBeInTheDocument();
    expect(screen.getByText('2026-01-02')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('1, Protection')).toBeInTheDocument();
    expect(screen.queryByText(/no clinician approval recorded/i)).toBeNull();
  });

  it('shows "No clinician approval recorded" without an approval date', () => {
    setup(protocol({ approvedOn: undefined }));
    expect(screen.getByText('No clinician approval recorded')).toBeInTheDocument();
  });

  it('lists the exercises of the active phase only', () => {
    setup();
    expect(screen.getByText('Heel slide')).toBeInTheDocument();
    expect(screen.getByText('Straight leg raise')).toBeInTheDocument();
    expect(screen.queryByText('Mini squat')).toBeNull();
    expect(screen.getAllByText('3 sets of 10 reps')).toHaveLength(2);
  });

  it('starts an exercise from its button', () => {
    const { onStart } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Start Heel slide' }));
    expect(onStart).toHaveBeenCalledWith('heel-slide');
  });

  it('shows a surgeon field that is not set as "Ask your surgeon" and a set one as its value', () => {
    setup(protocol({ surgeon: { brace: 'Open brace for walking' } }));
    expect(screen.getByText('Open brace for walking')).toBeInTheDocument();
    const brace = screen.getByText('Brace').nextElementSibling!;
    expect(brace).toHaveTextContent('Open brace for walking');
    expect(screen.getByText('Weight bearing').nextElementSibling).toHaveTextContent('Ask your surgeon');
    expect(screen.getByText('Depth limit').nextElementSibling).toHaveTextContent('Ask your surgeon');
  });

  it('shows the fixed "Ask your surgeon" list with no value', () => {
    setup();
    for (const item of ASK_SURGEON_ITEMS) {
      expect(screen.getByText(item).nextElementSibling).toHaveTextContent(/^Ask your surgeon$/);
    }
  });

  it('shows text from the file as plain text, with no element and no link', () => {
    const markup = '<img src=x onerror=alert(1)>';
    setup(protocol({ authoredBy: markup }));
    expect(screen.getByText(markup)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('a')).toBeNull();
  });

  it('disables the start button of an exercise with no target and says "Ask your surgeon"', () => {
    const p = protocol({
      phases: [{ id: 1, name: 'Protection', exercises: [{ kind: 'heel-slide', source: 'test' }] }],
    });
    setup(p);
    expect(screen.getByRole('button', { name: 'Start Heel slide' })).toBeDisabled();
    expect(screen.getByText(/target missing\. ask your surgeon/i)).toBeInTheDocument();
  });

  it('shows no export reminder with no sessions', () => {
    setup();
    expect(screen.getByText(/no export yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/7 days or more/i)).toBeNull();
  });

  it('shows the reminder when sessions exist and the last export is 7 days old or more', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    markExported(new Date('2026-03-10T10:00:00Z'));
    setup(protocol(), new Date('2026-03-20T10:00:00Z'), db);
    expect(await screen.findByText(/7 days or more since your last export/i)).toBeInTheDocument();
    expect(screen.getByText('2026-03-10')).toBeInTheDocument();
  });

  it('shows no reminder after a recent export', async () => {
    const db = freshDb();
    await saveSession(db, sessionInput());
    markExported(new Date('2026-03-18T10:00:00Z'));
    setup(protocol(), new Date('2026-03-20T10:00:00Z'), db);
    await screen.findByText('2026-03-18');
    expect(screen.queryByText(/7 days or more/i)).toBeNull();
  });

  it('links to the privacy notice', () => {
    const { onOpenPrivacy } = setup();
    fireEvent.click(within(document.body).getByRole('button', { name: 'Privacy notice' }));
    expect(onOpenPrivacy).toHaveBeenCalled();
  });

  it('has a button that goes to the Load screen, with no call that erases sessions (U6)', () => {
    const { onLoadProtocol } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Load a new protocol file' }));
    expect(onLoadProtocol).toHaveBeenCalledTimes(1);
  });
});
