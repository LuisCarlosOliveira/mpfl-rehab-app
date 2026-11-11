// Cue order and rate limit. The 3 s and 10 s values are ENGINEERING values, not clinical values.
import { CUE_MIN_GAP_MS, CUE_REPEAT_MS, PAUSED_CUE_MS, allCueTexts, createCueGate, cueFor, cuePriority, stillOverLimit } from '../src/lib/cues';
import { notReadyText } from '../src/ui/notReady';

const BANNED = /\b(correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|grade|pass|fail|goal|milestone|met|streak|badge|improved|worse)\b|on track|risk of injury/i;

describe('cue priority', () => {
  it('puts the safety cues first, then the leg gate, then tempo, range and hold', () => {
    const order = ['over-limit', 'near-limit', 'paused', 'too-fast', 'shallow', 'hold-restart'] as const;
    const ranks = order.map((e) => cuePriority(e));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(new Set(ranks).size).toBe(order.length);
  });
});

describe('cue gate', () => {
  it('shows the first non-safety cue', () => {
    const gate = createCueGate();
    expect(gate.allow('too-fast', 'a', 0, false)).toBe(true);
  });

  it('drops a second non-safety cue within the minimum gap, and allows it after the gap', () => {
    const gate = createCueGate();
    gate.allow('too-fast', 'a', 0, false);
    expect(gate.allow('shallow', 'b', CUE_MIN_GAP_MS - 1, false)).toBe(false);
    expect(gate.allow('shallow', 'b', CUE_MIN_GAP_MS, false)).toBe(true);
  });

  it('does not repeat the same text within the repeat time', () => {
    const gate = createCueGate();
    gate.allow('shallow', 'b', 0, false);
    expect(gate.allow('shallow', 'b', CUE_MIN_GAP_MS + 1, false)).toBe(false);
    expect(gate.allow('shallow', 'b', CUE_REPEAT_MS, false)).toBe(true);
  });

  it('never drops an over-limit or near-limit cue, even right after a tempo cue', () => {
    const gate = createCueGate();
    gate.allow('too-fast', 'a', 0, false);
    expect(gate.allow('over-limit', 'x', 10, false)).toBe(true);
    expect(gate.allow('near-limit', 'y', 20, false)).toBe(true);
    expect(gate.allow('over-limit', 'x', 30, false)).toBe(true);
  });

  it('drops a non-safety cue while a safety alert is on screen', () => {
    const gate = createCueGate();
    expect(gate.allow('too-fast', 'a', 0, true)).toBe(false);
  });

  it('keeps the leg gate cue on once the leg was lost for 500 ms, because no other cue can fire', () => {
    const gate = createCueGate();
    for (let t = 0; t < 20000; t += 33) {
      gate.note('paused', t);
      expect(gate.allow('paused', 'p', t, false)).toBe(t >= PAUSED_CUE_MS);
    }
  });

  it('B-06: gives no leg gate cue for a gap shorter than 500 ms, and starts the wait again after a seen frame', () => {
    const gate = createCueGate();
    for (let t = 0; t < 400; t += 33) {
      gate.note('paused', t);
      expect(gate.allow('paused', 'p', t, false)).toBe(false);
    }
    gate.note(null, 450); // the leg is back
    for (let t = 500; t < 900; t += 33) {
      gate.note('paused', t);
      expect(gate.allow('paused', 'p', t, false)).toBe(false);
    }
    for (let t = 900; t < 1100; t += 33) gate.note('paused', t);
    expect(gate.allow('paused', 'p', 1100, false)).toBe(true);
  });

  // B2-04: at a clip cut the cue blinked 5 times in 3 s. It needs the same 500 ms to hide as to show.
  it('B2-04: the leg gate cue does not blink when pose and no pose alternate faster than 500 ms', () => {
    const gate = createCueGate();
    const visible: boolean[] = [];
    for (let t = 0; t < 600; t += 33) {
      gate.note('paused', t);
      visible.push(gate.pausedVisible(t));
    }
    expect(visible.at(-1)).toBe(true); // lost for 500 ms: the cue shows
    visible.length = 0;
    for (let t = 600; t < 4000; t += 33) {
      const seen = Math.floor((t - 600) / 200) % 2 === 1; // 200 ms seen, 200 ms lost, again and again
      gate.note(seen ? null : 'paused', t);
      visible.push(gate.pausedVisible(t));
    }
    expect(visible.every(Boolean)).toBe(true);
  });

  it('B2-04: the cue hides after the leg was seen for 500 ms, and needs 500 ms of no pose to show again', () => {
    const gate = createCueGate();
    for (let t = 0; t <= 600; t += 33) gate.note('paused', t);
    expect(gate.pausedVisible(600)).toBe(true);
    let t = 633;
    for (; t < 1100; t += 33) {
      gate.note(null, t);
      expect(gate.pausedVisible(t)).toBe(true); // seen for less than 500 ms
    }
    for (; t < 1300; t += 33) gate.note(null, t);
    expect(gate.pausedVisible(t)).toBe(false); // seen for 500 ms or more
    for (const u of [t, t + 100, t + 200]) {
      gate.note('paused', u);
      expect(gate.pausedVisible(u)).toBe(false);
    }
    gate.note('paused', t + 600);
    expect(gate.pausedVisible(t + 600)).toBe(true);
  });

  it('never shows a storm: 1000 frames of mixed events give at most one non-safety cue each 3 s', () => {
    const gate = createCueGate();
    const events = ['too-fast', 'shallow', 'hold-restart'] as const;
    const shown: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const t = i * 33;
      const e = events[i % 3]!;
      if (gate.allow(e, e, t, false)) shown.push(t);
    }
    for (let i = 1; i < shown.length; i++) expect(shown[i]! - shown[i - 1]!).toBeGreaterThanOrEqual(CUE_MIN_GAP_MS);
  });
});

describe('texts', () => {
  it('starts the too-fast cue with an instruction', () => {
    expect(cueFor('too-fast', { repMs: 1200, minRepMs: 2000 })).toBe('Slow down. Rep time 1.2 s. Your care team set at least 2.0 s.');
  });

  it('holds no verdict word in any cue text or not-ready text', () => {
    const all = [
      ...allCueTexts(),
      notReadyText('seated-extension-hold', 'minFlexion'),
      notReadyText('seated-extension-hold', 'targetFlexion'),
      notReadyText('seated-extension-hold', 'holdSeconds'),
      notReadyText('heel-slide', 'targetFlexion'),
    ];
    for (const t of all) expect(t).not.toMatch(BANNED);
  });
});

describe('not-ready text', () => {
  it('uses the hold angle text for a hold with no minFlexion or no targetFlexion', () => {
    expect(notReadyText('seated-extension-hold', 'minFlexion')).toContain('Ask your surgeon how far you can straighten your knee in this exercise.');
    expect(notReadyText('seated-extension-hold', 'targetFlexion')).toContain('Ask your surgeon how far you can straighten your knee in this exercise.');
  });

  it('names the missing value, and never says "Target missing" for a hold angle', () => {
    expect(notReadyText('seated-extension-hold', 'minFlexion')).not.toMatch(/target missing/i);
    expect(notReadyText('seated-extension-hold', 'holdSeconds')).toBe('Hold time missing. Ask your surgeon.');
  });

  it('keeps the old text for a missing target of the other exercises', () => {
    expect(notReadyText('heel-slide', 'targetFlexion')).toBe('Target missing. Ask your surgeon.');
  });
});

describe('stillOverLimit', () => {
  it('uses the arc end of the hold: flexion below minFlexion minus the margin', () => {
    const hold = { kind: 'seated-extension-hold' as const, minFlexion: 40 };
    expect(stillOverLimit(hold, 30)).toBe(true);
    expect(stillOverLimit(hold, 31)).toBe(false);
    expect(stillOverLimit(hold, null)).toBe(false);
  });

  it('is off for a hold with minFlexion 0 and for a hold with none', () => {
    expect(stillOverLimit({ kind: 'seated-extension-hold', minFlexion: 0 }, 0)).toBe(false);
    expect(stillOverLimit({ kind: 'seated-extension-hold' }, 0)).toBe(false);
  });

  it('uses the ceiling for the other exercises: flexion above maxFlexion plus the margin', () => {
    const slide = { kind: 'heel-slide' as const, maxFlexion: 90 };
    expect(stillOverLimit(slide, 100)).toBe(true);
    expect(stillOverLimit(slide, 99)).toBe(false);
  });
});
