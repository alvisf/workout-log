import { PlannedDay, PlannedExercise, Program } from './types';

// Lean "model look": less trap and triceps work, more side-delt work.
export const MODEL_LOOK_SEED = 'model-look-v1';

const Y_RAISE = 'ex-incline-db-y-raise';
const SKULL_CRUSHER = 'ex-ez-bar-skull-crusher';
const MACHINE_LATERAL = 'ex-machine-lateral-raise';
const CABLE_LATERAL = 'ex-high-cable-lateral-raise';
const STIFF_LEG_DEADLIFT = 'ex-stiff-leg-deadlift';
const MIN_LATERAL_SETS = 3;
const NO_SHRUG_CUE = 'Keep your shoulders down, no shrug at the top.';
const STRAPS_CUE = 'Use straps so your traps do not hold the bar.';
const CABLE_LATERAL_CUE = 'Raise out to the side with shoulders down, no shrug.';
const isPull = (id: string) => /row|pulldown|pull-up/.test(id);

const withCue = (notes: string, cue: string) => (notes.includes(cue) ? notes : `${notes} ${cue}`.trim());

const withSets = (pe: PlannedExercise, sets: number): PlannedExercise => {
  const extra = Math.max(0, sets - pe.rir.length);
  return { ...pe, workingSets: sets, rir: [...pe.rir.slice(0, sets), ...Array(extra).fill(0)] };
};

function swapYRaise(pe: PlannedExercise): PlannedExercise {
  if (pe.exerciseId !== Y_RAISE) return pe;
  return { ...pe, exerciseId: CABLE_LATERAL, subExerciseIds: ['ex-db-lateral-raise', MACHINE_LATERAL], notes: CABLE_LATERAL_CUE };
}

function addCues(pe: PlannedExercise): PlannedExercise {
  if (pe.exerciseId === STIFF_LEG_DEADLIFT) return { ...pe, notes: withCue(pe.notes, STRAPS_CUE) };
  if (isPull(pe.exerciseId)) return { ...pe, notes: withCue(pe.notes, NO_SHRUG_CUE) };
  return pe;
}

function moreLateralSets(exercises: PlannedExercise[]): PlannedExercise[] {
  const first = exercises.findIndex((pe) => pe.exerciseId === MACHINE_LATERAL);
  if (first < 0) return exercises;
  const pe = exercises[first];
  return exercises.map((x, i) => (i === first ? withSets(pe, Math.max(pe.workingSets, MIN_LATERAL_SETS)) : x));
}

function reshapeDay(day: PlannedDay): PlannedDay {
  const kept = day.exercises.filter((pe) => pe.exerciseId !== SKULL_CRUSHER).map(swapYRaise).map(addCues);
  const exercises = moreLateralSets(kept).map((pe, i) => ({ ...pe, order: i + 1 }));
  return { ...day, exercises };
}

export function applyModelLook(program: Program): Program {
  return { ...program, days: program.days.map(reshapeDay) };
}
