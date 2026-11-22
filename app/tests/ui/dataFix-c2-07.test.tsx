import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BANNER } from '../../src/lib/reviewSummary';
import { ClinicianView } from '../../src/ui/ClinicianView';
import { exportText, peakCriterion, pick, protocolFileText, threeSquats } from './t11helpers';

afterEach(cleanup);
const setup = () => render(<ClinicianView onBack={vi.fn()} mode="demo" now={() => new Date('2026-11-20T09:00:00.000Z')} />);

describe('C2-07 loaded file names', () => {
  it('names the session file and the protocol file under their pickers', async () => {
    setup();
    pick(screen.getByLabelText(/session file/i), exportText(threeSquats(120)), 'visit-1.json');
    await screen.findByText(BANNER);
    expect(screen.getByText('Session file loaded: visit-1.json')).toBeInTheDocument();
    expect(screen.queryByText(/Protocol file loaded/)).toBeNull();
    pick(screen.getByLabelText(/protocol file/i), protocolFileText([peakCriterion()]), 'plan.json');
    await screen.findByRole('table', { name: /criteria/i });
    expect(screen.getByText('Protocol file loaded: plan.json')).toBeInTheDocument();
  });

  it('shows a hostile file name as plain text, with no markup and no control or direction characters', async () => {
    const { container } = setup();
    const name = '<img src=x onerror=alert(1)>‮\u0000evil.json';
    pick(screen.getByLabelText(/session file/i), exportText(threeSquats(120)), name);
    await screen.findByText(BANNER);
    expect(container.querySelector('img')).toBeNull();
    const line = screen.getByText(/^Session file loaded:/);
    expect(line.textContent).toBe('Session file loaded: <img src=x onerror=alert(1)>evil.json');
    expect(line.children).toHaveLength(0);
  });

  it('cuts a very long name', async () => {
    setup();
    pick(screen.getByLabelText(/session file/i), exportText(threeSquats(120)), `${'a'.repeat(300)}.json`);
    await screen.findByText(BANNER);
    expect(screen.getByText(/^Session file loaded:/).textContent!.length).toBeLessThan(120);
  });

  it('uses no raw HTML sink in the view', () => {
    expect(readFileSync('src/ui/ClinicianView.tsx', 'utf8')).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
  });
});
