import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateProtocol } from '../../src/lib/protocolGen';
import { markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { freshDb, mockSource } from './helpers';
import { installDialogStub } from './t11helpers';

beforeEach(() => {
  localStorage.clear();
  installDialogStub();
});
afterEach(cleanup);

async function open() {
  const r = generateProtocol(
    {
      writtenPlan: 'no', procedure: 'mpflr-only', ageBand: '18-plus', bothKnees: false, firstSurgery: 'yes', specialRules: 'no',
      surgeryDate: '2026-10-15', side: 'left', surgeonLimit: { kind: 'degrees', degrees: 60 }, phaseClearance: 'no', redFlags: {}, pain: 2, swelling: 'none',
    },
    '2026-11-08',
  );
  if (r.kind !== 'protocol') throw new Error('plan');
  const db = freshDb();
  markPrivacyNoticeSeen();
  const saved = await saveProtocol(db, JSON.stringify(r.protocol), 'demo');
  if (!saved.ok) throw new Error(saved.error.message);
  render(<App db={db} mode="demo" source={mockSource()} now={() => new Date(2026, 10, 8)} />);
}

describe('App, the five new exercises', () => {
  it.each(['Quadriceps set', 'Gluteal set', 'Ankle pump', 'Leg raise to the side', 'Leg raise to the back'])('%s: Start opens the red flag check and then Setup for this exercise', async (name) => {
    await open();
    fireEvent.click(await screen.findByRole('button', { name: `Start ${name}` }));
    fireEvent.click(await screen.findByRole('button', { name: /none of these apply/i }));
    // The two timers use no camera, so their Setup is named "Get ready".
    const timer = name === 'Quadriceps set' || name === 'Gluteal set';
    await screen.findByRole('heading', { level: 1, name: timer ? 'Get ready' : 'Set up the camera' });
    expect(screen.getByText(`Exercise: ${name}`)).toBeInTheDocument();
  });
});
