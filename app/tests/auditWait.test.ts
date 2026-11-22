import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error plain .mjs module of the audit, no types
import { waitForText } from '../audit/honesty/wait.mjs';

describe('audit wait for a heading', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps waiting when the wall clock jumps forward, because only the monotonic time counts', async () => {
    const wall = vi.spyOn(Date, 'now');
    let calls = 0;
    wall.mockImplementation(() => 1_000_000 + calls++ * 23_000);
    const heads = ['Loading', 'Loading', 'Privacy'];
    let i = 0;
    await expect(waitForText(async () => heads[i++], 'Privacy', 20_000, async () => {})).resolves.toBeUndefined();
  });

  it('fails with the last heading after the real time is over', async () => {
    let t = 0;
    const clock = () => t;
    await expect(
      waitForText(async () => 'Loading', 'Privacy', 1000, async () => { t += 400; }, clock),
    ).rejects.toThrow('h1 is "Loading", wanted "Privacy"');
  });
});
