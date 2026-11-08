// Set logic for one exercise in one session. Pure code: no React, no storage, no clock.
//
// For the Session and Summary screens (call order):
//   1. At the start of the run:   let sets = startSets({ sets: exercise.sets, reps: exercise.reps });
//   2. Each time the counter reports one counted rep (event 'rep' or 'too-fast', or
//      'hold-complete' for the seated hold): sets = countRep(sets);
//      Show setLabel(sets) and repsLabel(sets, unit). The unit is 'holds' for the seated hold. Both are null when there is no prescription.
//   3. While sets.phase is 'set-complete' or 'all-sets-complete', the screen pauses counting. This
//      code also ignores a rep in these phases. Show SET_TEXT.setComplete or SET_TEXT.allComplete.
//      Play no sound and use no verdict colour (FR10, FR23).
//   4. When the person presses "Start next set" (only when phase is 'set-complete'): sets = nextSet(sets);
//   5. When the session ends for any reason (Stop, gave way, all sets complete): sets = finish(sets);
//   6. In Summary, add the data to the record: saveSession(db, { ...input, ...summarySets(sets) });
//      The fields are setsPrescribed?, repsPrescribed? and repsPerSet. The record schema checks them.
//
// The straight leg raise has no rep event in the pipeline, so the screen has no rep to pass for it.
//
// Rest between sets is not timed. The protocol has no rest field and the app sets no default.

/** The prescription of one exercise. Both values are optional. A missing value gets no default. */
export interface Prescription {
  sets?: number;
  reps?: number;
}

export type SetsPhase = 'active' | 'set-complete' | 'all-sets-complete' | 'no-prescription';

export interface SetsState {
  prescription: Prescription;
  setIndex: number; // starts at 0. The screen shows setIndex + 1.
  repsInSet: number;
  completedSets: number;
  repsPerSet: number[]; // one entry for each started set. The last entry is the open set.
  phase: SetsPhase;
  ended: boolean; // true after finish(). Then no rep and no next set is accepted.
}

// The stored record holds at most 1000 reps (sessionSchema), so one stream stops there.
export const MAX_REPS_WITHOUT_PRESCRIPTION = 1000;

// Neutral status texts. They state a fact and give no verdict (FR10, FR23).
export const SET_TEXT = {
  setComplete: 'Set complete. Rest when you are ready.',
  allComplete: 'All prescribed sets are complete.',
} as const;

// PROPOSAL: reps without sets count as one set of that many reps. No source decides this.
const totalSets = (p: Prescription) => p.sets ?? 1;

/** Without reps there is no target per set. The app invents none. Reps count in one stream, as before. */
export function startSets(prescription: Prescription): SetsState {
  return {
    prescription,
    setIndex: 0,
    repsInSet: 0,
    completedSets: 0,
    repsPerSet: [0],
    phase: prescription.reps === undefined ? 'no-prescription' : 'active',
    ended: false,
  };
}

/** Call once for each rep that the counter reports. A rep is ignored outside the phases 'active' and 'no-prescription'. */
export function countRep(state: SetsState): SetsState {
  if (state.ended) return state;
  if (state.phase !== 'active' && state.phase !== 'no-prescription') return state;
  if (state.phase === 'no-prescription' && state.repsInSet >= MAX_REPS_WITHOUT_PRESCRIPTION) return state;

  const repsInSet = state.repsInSet + 1;
  const repsPerSet = [...state.repsPerSet.slice(0, -1), repsInSet];
  const next = { ...state, repsInSet, repsPerSet };
  if (state.phase === 'no-prescription' || repsInSet < (state.prescription.reps as number)) return next;

  const last = state.setIndex === totalSets(state.prescription) - 1;
  return { ...next, completedSets: state.completedSets + 1, phase: last ? 'all-sets-complete' : 'set-complete' };
}

/** The person pressed Start next set. Allowed only from 'set-complete'. */
export function nextSet(state: SetsState): SetsState {
  if (state.ended || state.phase !== 'set-complete') return state;
  return { ...state, setIndex: state.setIndex + 1, repsInSet: 0, repsPerSet: [...state.repsPerSet, 0], phase: 'active' };
}

/** The session ends. The open set keeps the reps counted so far. */
export function finish(state: SetsState): SetsState {
  return { ...state, ended: true };
}

/** The data for the stored session. Missing prescription values stay out of the object. */
export function summarySets(state: SetsState): { setsPrescribed?: number; repsPrescribed?: number; repsPerSet: number[] } {
  const { sets, reps } = state.prescription;
  return {
    ...(sets === undefined ? {} : { setsPrescribed: sets }),
    ...(reps === undefined ? {} : { repsPrescribed: reps }),
    repsPerSet: [...state.repsPerSet],
  };
}

/** "Set 1 of 3". null when there is no prescription. */
export function setLabel(state: SetsState): string | null {
  return state.phase === 'no-prescription' ? null : `Set ${state.setIndex + 1} of ${totalSets(state.prescription)}`;
}

/** "Reps in this set: 4 of 10", or "Holds in this set: 2 of 5" for a hold. null when there is no prescription. */
export function repsLabel(state: SetsState, unit: 'reps' | 'holds' = 'reps'): string | null {
  if (state.phase === 'no-prescription') return null;
  return `${unit === 'holds' ? 'Holds' : 'Reps'} in this set: ${state.repsInSet} of ${state.prescription.reps}`;
}
