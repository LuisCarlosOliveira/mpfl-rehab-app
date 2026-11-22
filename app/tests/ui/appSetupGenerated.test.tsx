import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateProtocol, RULES } from '../../src/lib/protocolGen';
import { markPrivacyNoticeSeen, saveProtocol } from '../../src/lib/storage';
import { App } from '../../src/ui/App';
import { freshDb, mockSource } from './helpers';
import { installDialogStub } from './t11helpers';

beforeEach(() => {
  localStorage.clear();
  installDialogStub();
});
afterEach(cleanup);

describe('Setup for a generated heel slide', () => {
  it('draws no number on the end position', async () => {
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
    fireEvent.click(await screen.findByRole('button', { name: 'Start Heel slide' }));
    fireEvent.click(await screen.findByRole('button', { name: /none of these apply/i }));
    await screen.findByRole('heading', { level: 1, name: 'Set up the camera' });
    const texts = [...document.querySelectorAll('svg text')].map((t) => t.textContent);
    expect(texts).not.toContain(`${RULES.ENG_TARGET.values.targetFlexion}°`);
    expect(texts.length).toBeGreaterThan(0);
  });
});
