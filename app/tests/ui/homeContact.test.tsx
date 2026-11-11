// Home, build C: the seated hold card and the B1 "Contact your care team" card (adaptation design 5.4).
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProtocol, type Protocol } from '../../src/lib/protocol';
import { saveSession, type SessionInput } from '../../src/lib/storage';
import { Home } from '../../src/ui/Home';
import { freshDb, protocolText, sessionInput } from './helpers';
import { hasVerdictWord } from './verdict';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const protocol = (over: Record<string, unknown> = {}): Protocol => {
  const r = loadProtocol(protocolText(over), 'demo');
  if (!r.ok) throw new Error(r.error.message);
  return r.protocol;
};

const holdPhase = (exercise: Record<string, unknown>) => ({
  phases: [{ id: 1, name: 'Strength', exercises: [{ kind: 'seated-extension-hold', source: 'test', ...exercise }] }],
});

function setup(p: Protocol = protocol(), db = freshDb()) {
  const phase = p.phases.find((x) => x.id === p.activePhase);
  const props = { onStart: vi.fn(), onLoadProtocol: vi.fn() };
  const view = render(<Home protocol={p} phase={phase} activePhase={p.activePhase} db={db} now={() => new Date('2026-03-20T10:00:00Z')} {...props} />);
  return { db, view, p, phase };
}

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
}

describe('Home, seated hold card', () => {
  it('draws the protocol hold angle on the end drawing of a ready hold', () => {
    setup(protocol(holdPhase({ holdSeconds: 5, minFlexion: 40, targetFlexion: 60 })));
    const card = screen.getAllByRole('listitem').find((li) => li.classList.contains('exercise-featured'))!;
    expect(within(card).getByRole('img', { name: /end position/i }).textContent).toContain('60°');
  });

  it('names the missing value and asks the surgeon for the hold angle, never "Target missing"', () => {
    setup(protocol(holdPhase({ holdSeconds: 5, targetFlexion: 60 })));
    expect(screen.getByText(/Straightest knee angle missing\. Ask your surgeon how far you can straighten your knee in this exercise\./)).toBeInTheDocument();
    expect(screen.queryByText(/target missing/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Start Seated knee extension hold' })).toBeDisabled();
  });

  it('names a missing hold angle and a missing hold time', () => {
    setup(protocol(holdPhase({ holdSeconds: 5, minFlexion: 40 })));
    expect(screen.getByText(/Hold angle missing\. Ask your surgeon how far/)).toBeInTheDocument();
    cleanup();
    setup(protocol(holdPhase({ minFlexion: 40, targetFlexion: 60 })));
    expect(screen.getByText('Hold time missing. Ask your surgeon.')).toBeInTheDocument();
  });
});

describe('Home, contact card (B1)', () => {
  const seed = async (over: Partial<SessionInput>, db = freshDb()) => {
    await saveSession(db, { ...sessionInput(), ...over });
    return db;
  };
  const card = () => screen.queryByText('Contact your care team');

  it('shows no card with no session', async () => {
    setup();
    await settle();
    expect(card()).toBeNull();
  });

  it('shows no card after a clean session', async () => {
    setup(protocol(), await seed({}));
    await settle();
    expect(card()).toBeNull();
  });

  it('shows a strong notice with the title and a one-line reason after a gave-way press', async () => {
    setup(protocol(), await seed({ gaveWayPresses: 1 }));
    await settle();
    const notice = screen.getByText('Contact your care team').closest('.notice')!;
    expect(notice).toHaveClass('notice-strong');
    expect(notice).toHaveTextContent('On 2026-03-01 you pressed "Knee gave way or hurts".');
    expect(within(notice as HTMLElement).getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('shows the card for pain at the floor of 7 and for swelling more than before', async () => {
    setup(protocol(), await seed({ pain: 7 }));
    await settle();
    expect(screen.getByText(/you reported pain 7 out of 10/)).toBeInTheDocument();
    cleanup();
    setup(protocol(), await seed({ swelling: 'more' }));
    await settle();
    expect(screen.getByText(/you reported swelling: more than before/)).toBeInTheDocument();
  });

  it('uses the clinician pain threshold of the protocol, and a pain answer between sets', async () => {
    setup(protocol({ painPauseThreshold: 4 }), await seed({ pain: 4 }));
    await settle();
    expect(card()).not.toBeNull();
    cleanup();
    setup(protocol({ painPauseThreshold: 4 }), await seed({ setPain: [null, 5] }));
    await settle();
    expect(card()).not.toBeNull();
    cleanup();
    // FR12: with no clinician threshold the floor of 7 applies between sets too (final review R-02).
    setup(protocol(), await seed({ setPain: [9] }));
    await settle();
    expect(card()).not.toBeNull();
    cleanup();
    setup(protocol(), await seed({ setPain: [6] }));
    await settle();
    expect(card()).toBeNull();
  });

  it('reads the last saved session only', async () => {
    const db = await seed({ date: '2026-03-01T10:00:00.000Z', gaveWayPresses: 1 });
    await seed({ date: '2026-03-02T10:00:00.000Z' }, db);
    setup(protocol(), db);
    await settle();
    expect(card()).toBeNull();
  });

  it('hides the card on Dismiss and keeps it hidden when Home opens again', async () => {
    const db = await seed({ gaveWayPresses: 1 });
    setup(protocol(), db);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(card()).toBeNull();
    cleanup();
    setup(protocol(), db);
    await settle();
    expect(card()).toBeNull();
  });

  it('shows the card again after the next session with a safety event', async () => {
    const db = await seed({ gaveWayPresses: 1 });
    setup(protocol(), db);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    cleanup();
    await seed({ date: '2026-03-05T10:00:00.000Z', gaveWayPresses: 1 }, db);
    setup(protocol(), db);
    await settle();
    expect(card()).not.toBeNull();
    expect(screen.getByText(/2026-03-05/)).toBeInTheDocument();
  });

  it('holds no verdict word and uses no verdict icon or colour class', async () => {
    setup(protocol(), await seed({ gaveWayPresses: 1 }));
    await settle();
    expect(hasVerdictWord(document.body.textContent ?? '')).toBeNull();
    const notice = screen.getByText('Contact your care team').closest('.notice')!;
    expect(notice.className).toBe('notice notice-strong');
    expect(document.querySelector('[style]')).toBeNull();
  });
});
