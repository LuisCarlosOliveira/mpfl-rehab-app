// @vitest-environment node
// L4-02: the first screens must not carry the screens that load later. Each lazy screen uses retryableLazy,
// so a chunk that fails shows the load error screen with Try again and Back to Home.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync('src/ui/App.tsx', 'utf8');

const LAZY = ['Dashboard', 'DataScreen', 'ClinicianView', 'CheckProgress', 'ConfirmPlan', 'Onboarding', 'PairCompanion', 'PlanResult', 'Session', 'Setup', 'Summary', 'UpdatePlan'];

describe('App.tsx lazy screens', () => {
  it.each(LAZY)('%s loads with retryableLazy and has no static import', (name) => {
    expect(app).toMatch(new RegExp(`const ${name} = retryableLazy\\(\\(\\) => import\\('\\./${name}'\\)`));
    expect(app).not.toMatch(new RegExp(`^import \\{[^}]*\\b${name}\\b[^}]*\\} from './${name}';`, 'm'));
  });

  it('never uses the plain lazy function, because it keeps a failed import for ever', () => {
    expect(app).not.toMatch(/\blazy\(/);
    expect(app).not.toMatch(/React\.lazy/);
  });

  it('keeps the first screens in the main chunk', () => {
    for (const name of ['Home', 'Privacy', 'LoadProtocol', 'RedFlag']) {
      expect(app).toMatch(new RegExp(`^import \\{ ${name} \\} from './${name}';`, 'm'));
    }
  });

  it('moves the focus to the heading of every lazy screen, but not on the first screen', () => {
    for (const id of ['setup', 'session', 'summary', 'dashboard', 'data', 'clinician', 'onboarding', 'plan', 'confirm', 'update', 'progress', 'companion']) {
      expect(app).toMatch(new RegExp(`LAZY_SCREENS[^;]*'${id}'`));
    }
    expect(app).not.toMatch(/LAZY_SCREENS[^;]*'privacy'/);
    expect(app).not.toMatch(/LAZY_SCREENS[^;]*'home'/);
  });
});
