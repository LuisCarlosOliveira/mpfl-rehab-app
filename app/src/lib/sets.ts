interface Prescription {
  sets?: number;
  reps?: number;
}

type SetsPhase = 'active' | 'set-complete' | 'all-sets-complete' | 'no-prescription';

export interface SetsState {
  prescription: Prescription;
  setIndex: number; // starts at 0. The screen shows setIndex + 1.
  repsInSet: number;
  completedSets: number;
  repsPerSet: number[]; // one entry for each started set. The last entry is the open set.
  phase: SetsPhase;
  ended: boolean; // true after finish(). Then no rep and no next set is accepted.
}

export const MAX_REPS_WITHOUT_PRESCRIPTION = 1000;

export const SET_TEXT = {
  setComplete: 'Set complete. Rest when you are ready.',
  allComplete: 'That was the last set in your plan.', // A fact about the plan. It does not say that work is finished or a goal is met.
} as const;

// PROPOSAL: reps without sets count as one set of that many reps. No source decides this.
const totalSets = (p: Prescription) => p.sets ?? 1;

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

export function nextSet(state: SetsState): SetsState {
  if (state.ended || state.phase !== 'set-complete') return state;
  return { ...state, setIndex: state.setIndex + 1, repsInSet: 0, repsPerSet: [...state.repsPerSet, 0], phase: 'active' };
}

export function finish(state: SetsState): SetsState {
  return { ...state, ended: true };
}

export function summarySets(state: SetsState): { setsPrescribed?: number; repsPrescribed?: number; repsPerSet: number[] } {
  const { sets, reps } = state.prescription;
  return {
    ...(sets === undefined ? {} : { setsPrescribed: sets }),
    ...(reps === undefined ? {} : { repsPrescribed: reps }),
    repsPerSet: [...state.repsPerSet],
  };
}

export function setLabel(state: SetsState): string | null {
  return state.phase === 'no-prescription' ? null : `Set ${state.setIndex + 1} of ${totalSets(state.prescription)}`;
}

export function repsLabel(state: SetsState, unit: 'reps' | 'holds' = 'reps'): string | null {
  if (state.phase === 'no-prescription') return null;
  return `${unit === 'holds' ? 'Holds' : 'Reps'} in this set: ${state.repsInSet} of ${state.prescription.reps}`;
}

export const plural = (n: number | null, one: string): string => (n === 1 ? one : `${one}s`);
