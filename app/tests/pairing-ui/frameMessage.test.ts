import { describe, expect, it } from 'vitest';
import { parseMessage } from '../../src/lib/pairing';
import { createThrottle, landmarksMessage, SEND_HZ } from '../../src/pairing/frameMessage';

const full = Array.from({ length: 33 }, (_, i) => ({ x: i / 40 + 0.123456789, y: 0.5, visibility: 0.987654321 }));

describe('landmarksMessage', () => {
  it('keeps the hips, knees and ankles and hides the other 27 landmarks', () => {
    const message = landmarksMessage(full, 'front', 1234.6, 0.5625);
    expect(message.landmarks).toHaveLength(33);
    message.landmarks.forEach((l, i) => {
      if (i >= 23 && i <= 28) expect(l.visibility).toBeGreaterThan(0.9);
      else expect(l).toEqual({ x: 0, y: 0, visibility: 0 });
    });
  });

  it('rounds the numbers to 4 decimals and the time to whole milliseconds', () => {
    const message = landmarksMessage(full, 'front', 1234.6, 0.5625);
    expect(message.tMs).toBe(1235);
    expect(message.landmarks[23]).toEqual({ x: 0.6985, y: 0.5, visibility: 0.9877 });
  });

  it('carries the view tag and the aspect and nothing else', () => {
    const message = landmarksMessage(full, 'front', 1, 1.77777);
    expect(Object.keys(message).sort()).toEqual(['aspect', 'landmarks', 'tMs', 'type', 'view']);
    expect(message).toMatchObject({ type: 'landmarks', view: 'front', aspect: 1.7778 });
  });

  it('passes the schema and stays well below the size cap', () => {
    const text = JSON.stringify(landmarksMessage(full, 'front', 9_999_999, 0.5625));
    expect(parseMessage(text).ok).toBe(true);
    expect(new TextEncoder().encode(text).length).toBeLessThan(2500);
  });

  it('gives visibility 0 to a leg landmark that has none, so the angle code does not trust it', () => {
    const noVis = full.map(({ x, y }) => ({ x, y }));
    expect(landmarksMessage(noVis, 'front', 1, 1).landmarks[25]?.visibility).toBe(0);
  });

  it('clamps a coordinate that is outside the schema range', () => {
    const wild = full.map(() => ({ x: 7, y: -7, visibility: 3 }));
    const text = JSON.stringify(landmarksMessage(wild, 'front', 1, 1));
    expect(parseMessage(text).ok).toBe(true);
  });

  it('refuses a list that is shorter than 33 landmarks', () => {
    expect(() => landmarksMessage(full.slice(0, 20), 'front', 1, 1)).toThrow();
  });
});

describe('createThrottle', () => {
  it('uses 15 messages each second', () => expect(SEND_HZ).toBe(15));

  it('lets the first call pass and holds the next ones until the gap is over', () => {
    const allow = createThrottle(15);
    expect(allow(0)).toBe(true);
    expect(allow(10)).toBe(false);
    expect(allow(66)).toBe(false);
    expect(allow(67)).toBe(true);
    expect(allow(100)).toBe(false);
  });

  it('never gives more than the cap in one second, even for a 60 Hz camera', () => {
    const allow = createThrottle(15);
    let sent = 0;
    for (let t = 0; t < 1000; t += 1000 / 60) if (allow(t)) sent++;
    expect(sent).toBeLessThanOrEqual(15);
    expect(sent).toBeGreaterThanOrEqual(14);
  });

  it('passes again after the clock goes back', () => {
    const allow = createThrottle(15);
    allow(5000);
    expect(allow(10)).toBe(true);
  });
});
