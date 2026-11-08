import { describe, expect, it } from 'vitest';
import { ASK_SURGEON_ITEMS, ASK_SURGEON_TEXT } from '../../src/ui/askSurgeon';
import { VERDICT_WORDS, hasVerdictWord } from './verdict';

describe('askSurgeon list', () => {
  it('has the 5 decisions of research/clinical.md section 9 (items 5, 8, 10, 12, 13)', () => {
    expect(ASK_SURGEON_ITEMS).toHaveLength(5);
    expect(ASK_SURGEON_ITEMS.join(' ')).toMatch(/graft type and fixation/i);
    expect(ASK_SURGEON_ITEMS.join(' ')).toMatch(/run, jump, cut and pivot/i);
    expect(ASK_SURGEON_ITEMS.join(' ')).toMatch(/blood flow restriction or electrical muscle stimulation/i);
    expect(ASK_SURGEON_ITEMS.join(' ')).toMatch(/blood clot prevention/i);
    expect(ASK_SURGEON_ITEMS.join(' ')).toMatch(/age under 18, both knees, repeat surgery, knee anatomy/i);
  });
  it('has no verdict word', () => {
    expect(VERDICT_WORDS.length).toBeGreaterThan(10);
    for (const text of [...ASK_SURGEON_ITEMS, ASK_SURGEON_TEXT]) expect(hasVerdictWord(text)).toBeNull();
  });
});
