import { CUE_SHOW_MS, PAUSED_CUE_MS, createCueGate, cueFor, nextCueView, type CueEvent, type LiveCue } from '../src/lib/cues';

const NOT_SIDE_ON = 'Turn so that your side faces the camera.';

interface Frame {
  event: CueEvent;
  flexion: number | null;
  stillOver: boolean;
}

const step = (gate: ReturnType<typeof createCueGate>, prev: LiveCue | null, f: Frame, now: number) =>
  nextCueView(prev, gate, { event: f.event, text: cueFor(f.event, { repMs: 1000, minRepMs: 2000 }), flexion: f.flexion, stillOver: f.stillOver }, now);

const visible = (cue: LiveCue | null, now: number) => (cue !== null && now < cue.until ? cue : null);

describe('nextCueView: a cue that is tied to a condition', () => {
  it('clears the not-side-on cue at once when the event stops and an angle is measured', () => {
    const gate = createCueGate();
    let cue = step(gate, null, { event: 'not-side-on', flexion: null, stillOver: false }, 0);
    expect(visible(cue, 0)?.text).toBe(NOT_SIDE_ON);
    cue = step(gate, cue, { event: null, flexion: 12, stillOver: false }, 33);
    expect(visible(cue, 33)).toBeNull();
  });

  it('keeps the not-side-on cue while the event continues, then hides it after the show time', () => {
    const gate = createCueGate();
    let cue = step(gate, null, { event: 'not-side-on', flexion: null, stillOver: false }, 0);
    cue = step(gate, cue, { event: 'not-side-on', flexion: null, stillOver: false }, 1000);
    expect(visible(cue, 1000)?.text).toBe(NOT_SIDE_ON);
    expect(visible(cue, CUE_SHOW_MS - 1)?.text).toBe(NOT_SIDE_ON);
    expect(visible(cue, CUE_SHOW_MS)).toBeNull();
  });

  it('keeps the not-side-on cue when the event stops and no angle is measured', () => {
    const gate = createCueGate();
    let cue = step(gate, null, { event: 'not-side-on', flexion: null, stillOver: false }, 0);
    cue = step(gate, cue, { event: null, flexion: null, stillOver: false }, 33);
    expect(visible(cue, 33)?.text).toBe(NOT_SIDE_ON);
  });

  it('keeps the paused rule: the cue stays while the leg is out of view, and clears after the leg is in view for the paused time', () => {
    const gate = createCueGate();
    let cue: LiveCue | null = null;
    for (let t = 0; t <= PAUSED_CUE_MS; t += 100) cue = step(gate, cue, { event: 'paused', flexion: null, stillOver: false }, t);
    expect(visible(cue, PAUSED_CUE_MS)?.text).toBe('Show your whole leg.');
    const back = PAUSED_CUE_MS + 100;
    cue = step(gate, cue, { event: null, flexion: 10, stillOver: false }, back);
    expect(visible(cue, back)?.text).toBe('Show your whole leg.');
    cue = step(gate, cue, { event: null, flexion: 10, stillOver: false }, back + PAUSED_CUE_MS);
    expect(visible(cue, back + PAUSED_CUE_MS)).toBeNull();
  });

  it('never clears a safety alert with this rule', () => {
    for (const event of ['over-limit', 'near-limit'] as const) {
      const gate = createCueGate();
      let cue = step(gate, null, { event, flexion: 80, stillOver: false }, 0);
      cue = step(gate, cue, { event: null, flexion: 70, stillOver: false }, 33);
      expect(visible(cue, 33)?.alert).toBe(event === 'over-limit');
      expect(visible(cue, 33)).not.toBeNull();
    }
  });

  it('extends the over-limit alert while the knee stays past the limit', () => {
    const gate = createCueGate();
    let cue = step(gate, null, { event: 'over-limit', flexion: 90, stillOver: true }, 0);
    cue = step(gate, cue, { event: null, flexion: 90, stillOver: true }, 3000);
    expect(visible(cue, 3000 + CUE_SHOW_MS - 1)?.alert).toBe(true);
  });
});

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EVENTS: CueEvent[] = [null, null, 'rep', 'shallow', 'near-limit', 'over-limit', 'too-fast', 'paused', 'paused', 'not-side-on', 'not-side-on', 'hold-restart'];

function sequence(seed: number, flexionAlwaysNull: boolean): { frame: Frame; now: number }[] {
  const next = rng(seed);
  let now = 0;
  return Array.from({ length: 120 }, () => {
    now += 30 + Math.floor(next() * 700);
    const event = EVENTS[Math.floor(next() * EVENTS.length)] ?? null;
    const flexion = flexionAlwaysNull || next() < 0.3 ? null : Math.floor(next() * 90);
    return { frame: { event, flexion, stillOver: next() < 0.3 }, now };
  });
}

// The cue logic of Session.tsx before the change, copied from the code.
function oldStep(state: { cue: LiveCue | null }, gate: ReturnType<typeof createCueGate>, f: Frame, now: number) {
  const text = cueFor(f.event, { repMs: 1000, minRepMs: 2000 });
  const alertOn = state.cue !== null && state.cue.alert && now < state.cue.until;
  gate.note(f.event, now);
  if (text !== null && gate.allow(f.event, text, now, alertOn)) {
    state.cue = { text, alert: f.event === 'over-limit', paused: f.event === 'paused', until: now + CUE_SHOW_MS, event: f.event };
  } else if (state.cue?.paused && f.event !== 'paused') {
    if (gate.pausedVisible(now)) state.cue.until = now + CUE_SHOW_MS;
    else state.cue = null;
  }
  if (state.cue?.alert && f.stillOver) state.cue.until = now + CUE_SHOW_MS;
}

describe('nextCueView against the old logic, 200 seeded sequences', () => {
  it('gives the same visible cue when no angle is measured next to a not-side-on cue', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const oldGate = createCueGate();
      const newGate = createCueGate();
      const old = { cue: null as LiveCue | null };
      let cue: LiveCue | null = null;
      for (const { frame, now } of sequence(seed, true)) {
        oldStep(old, oldGate, frame, now);
        cue = step(newGate, cue, frame, now);
        expect(visible(cue, now), `seed ${seed} t ${now}`).toEqual(visible(old.cue, now));
      }
    }
  });

  it('differs only where the old logic still shows a not-side-on cue and the new logic shows none', () => {
    let cleared = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const oldGate = createCueGate();
      const newGate = createCueGate();
      const old = { cue: null as LiveCue | null };
      let cue: LiveCue | null = null;
      for (const { frame, now } of sequence(seed, false)) {
        oldStep(old, oldGate, frame, now);
        cue = step(newGate, cue, frame, now);
        const a = visible(old.cue, now);
        const b = visible(cue, now);
        if (b === null && a !== null && a.text === NOT_SIDE_ON) {
          cleared += 1;
          continue;
        }
        expect(b, `seed ${seed} t ${now}`).toEqual(a);
      }
    }
    expect(cleared).toBeGreaterThan(0);
  });
});
