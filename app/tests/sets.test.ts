import {
  MAX_REPS_WITHOUT_PRESCRIPTION,
  SET_TEXT,
  countRep,
  finish,
  nextSet,
  repsLabel,
  setLabel,
  startSets,
  summarySets,
  type SetsState,
} from '../src/lib/sets';

const repeat = (state: SetsState, times: number) => {
  let s = state;
  for (let i = 0; i < times; i += 1) s = countRep(s);
  return s;
};

// Run a whole prescription: every rep of every set, with Start next set between the sets.
const runAll = (sets: number, reps: number) => {
  let s = startSets({ sets, reps });
  for (let i = 0; i < sets; i += 1) {
    s = repeat(s, reps);
    if (i < sets - 1) s = nextSet(s);
  }
  return s;
};

describe('startSets', () => {
  it('starts in set 1 with no reps when sets and reps exist', () => {
    expect(startSets({ sets: 3, reps: 10 })).toMatchObject({
      setIndex: 0, repsInSet: 0, completedSets: 0, repsPerSet: [0], phase: 'active',
    });
  });

  it('treats reps without sets as one set of that many reps', () => {
    const s = repeat(startSets({ reps: 10 }), 10);
    expect(s.phase).toBe('all-sets-complete');
    expect(summarySets(s)).toEqual({ repsPrescribed: 10, repsPerSet: [10] });
  });

  it('gives no prescription when reps are missing, with or without sets', () => {
    expect(startSets({ sets: 3 }).phase).toBe('no-prescription');
    expect(startSets({}).phase).toBe('no-prescription');
  });
});

describe('countRep', () => {
  it('adds one rep to the current set', () => {
    const s = repeat(startSets({ sets: 3, reps: 10 }), 4);
    expect(s).toMatchObject({ repsInSet: 4, phase: 'active', repsPerSet: [4] });
  });

  it('completes the set on the last prescribed rep, not one rep early or late', () => {
    expect(repeat(startSets({ sets: 3, reps: 10 }), 9).phase).toBe('active');
    const s = repeat(startSets({ sets: 3, reps: 10 }), 10);
    expect(s).toMatchObject({ phase: 'set-complete', completedSets: 1, repsInSet: 10 });
  });

  it('ignores a rep after the set is complete and returns the same state', () => {
    const done = repeat(startSets({ sets: 3, reps: 10 }), 10);
    expect(countRep(done)).toBe(done);
  });

  it('ignores a rep after the last set is complete', () => {
    const done = runAll(2, 3);
    expect(countRep(done)).toBe(done);
    expect(summarySets(done).repsPerSet).toEqual([3, 3]);
  });

  it('does not change the state it receives', () => {
    const s = startSets({ sets: 2, reps: 2 });
    const before = JSON.stringify(s);
    countRep(s);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('counts reps as one stream when there is no prescription', () => {
    const s = repeat(startSets({ sets: 3 }), 25);
    expect(s).toMatchObject({ phase: 'no-prescription', repsPerSet: [25], completedSets: 0 });
  });

  it('stops at the reps limit of the stored record when there is no prescription', () => {
    const s = repeat(startSets({}), MAX_REPS_WITHOUT_PRESCRIPTION + 5);
    expect(s.repsPerSet).toEqual([MAX_REPS_WITHOUT_PRESCRIPTION]);
  });
});

describe('nextSet', () => {
  it('starts the next set from set-complete', () => {
    const s = nextSet(repeat(startSets({ sets: 3, reps: 2 }), 2));
    expect(s).toMatchObject({ setIndex: 1, repsInSet: 0, completedSets: 1, repsPerSet: [2, 0], phase: 'active' });
  });

  it('is refused from every other phase and returns the same state', () => {
    const active = repeat(startSets({ sets: 3, reps: 10 }), 3);
    const all = runAll(2, 2);
    const none = startSets({});
    for (const s of [active, all, none]) expect(nextSet(s)).toBe(s);
  });

  it('is refused after finish', () => {
    const s = finish(repeat(startSets({ sets: 3, reps: 2 }), 2));
    expect(nextSet(s)).toBe(s);
  });
});

describe('full runs', () => {
  it('ends the last set in all-sets-complete', () => {
    const s = runAll(3, 4);
    expect(s).toMatchObject({ phase: 'all-sets-complete', completedSets: 3, setIndex: 2 });
    expect(summarySets(s)).toEqual({ setsPrescribed: 3, repsPrescribed: 4, repsPerSet: [4, 4, 4] });
  });

  it('handles one set', () => {
    expect(runAll(1, 5).phase).toBe('all-sets-complete');
  });

  it('handles 20 sets of 100 reps', () => {
    const s = runAll(20, 100);
    expect(s.phase).toBe('all-sets-complete');
    expect(s.repsPerSet).toHaveLength(20);
    expect(s.repsPerSet.every((r) => r === 100)).toBe(true);
  });

  it.each([[1, 1], [2, 1], [1, 2], [5, 7], [20, 3]])('runs %i sets of %i reps with the right totals', (sets, reps) => {
    const s = runAll(sets, reps);
    expect(s.completedSets).toBe(sets);
    expect(s.repsPerSet.reduce((a, b) => a + b, 0)).toBe(sets * reps);
  });

  it('does not swap sets and reps', () => {
    const s = startSets({ sets: 2, reps: 5 });
    expect(repeat(s, 5).phase).toBe('set-complete');
    expect(repeat(s, 2).phase).toBe('active');
  });
});

describe('finish and summarySets', () => {
  it('keeps the partial count of the open set and stops counting', () => {
    const s = finish(repeat(startSets({ sets: 3, reps: 10 }), 4));
    expect(summarySets(s)).toEqual({ setsPrescribed: 3, repsPrescribed: 10, repsPerSet: [4] });
    expect(countRep(s)).toBe(s);
  });

  it('keeps a started set that has no rep', () => {
    const s = finish(nextSet(repeat(startSets({ sets: 3, reps: 2 }), 2)));
    expect(summarySets(s).repsPerSet).toEqual([2, 0]);
  });

  it('stores one entry and only the prescribed values when there is no prescription', () => {
    expect(summarySets(repeat(startSets({ sets: 3 }), 7))).toEqual({ setsPrescribed: 3, repsPerSet: [7] });
    expect(summarySets(repeat(startSets({}), 7))).toEqual({ repsPerSet: [7] });
  });

  it('returns a copy of the array', () => {
    const s = repeat(startSets({ sets: 2, reps: 5 }), 1);
    summarySets(s).repsPerSet.push(99);
    expect(s.repsPerSet).toEqual([1]);
  });
});

describe('neutral texts', () => {
  const verdictWords = /\b(correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|grade|pass|fail|goal|milestone|well done|great|success)\b/i;

  it('has the fixed texts', () => {
    expect(SET_TEXT.setComplete).toBe('Set complete. Rest when you are ready.');
    expect(SET_TEXT.allComplete).toBe('All prescribed sets are complete.');
  });

  it('builds the set and rep labels', () => {
    const s = repeat(startSets({ sets: 3, reps: 10 }), 4);
    expect(setLabel(s)).toBe('Set 1 of 3');
    expect(repsLabel(s)).toBe('Reps in this set: 4 of 10');
    expect(setLabel(nextSet(repeat(startSets({ sets: 3, reps: 1 }), 1)))).toBe('Set 2 of 3');
  });

  it('says "Holds" in the label of a hold exercise', () => {
    const s = repeat(startSets({ sets: 2, reps: 5 }), 2);
    expect(repsLabel(s, 'holds')).toBe('Holds in this set: 2 of 5');
    expect(repsLabel(s, 'reps')).toBe('Reps in this set: 2 of 5');
    expect(repsLabel(startSets({ sets: 2 }), 'holds')).toBeNull();
  });

  it('shows "Set 1 of 1" for reps without sets', () => {
    expect(setLabel(startSets({ reps: 8 }))).toBe('Set 1 of 1');
  });

  it('gives no label when there is no prescription', () => {
    expect(setLabel(startSets({}))).toBeNull();
    expect(repsLabel(startSets({ sets: 2 }))).toBeNull();
  });

  it('holds no verdict word', () => {
    const s = repeat(startSets({ sets: 3, reps: 10 }), 4);
    for (const text of [...Object.values(SET_TEXT), setLabel(s), repsLabel(s), repsLabel(s, 'holds')]) {
      expect(text).not.toMatch(verdictWords);
    }
  });
});
