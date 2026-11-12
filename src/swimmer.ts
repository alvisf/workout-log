import { PlannedDay, PlannedExercise, Program } from './types';

// Swimmer look: wider lats, legs only on Lower day.
export const SWIMMER_SEED = 'swimmer-v1';

const LEG_EXTENSION = 'ex-single-leg-leg-extension';
const STIFF_LEG_DEADLIFT = 'ex-stiff-leg-deadlift';
const CLOSE_GRIP_PULLDOWN = 'ex-close-grip-lat-pulldown';
const CABLE_LAT_PULLOVER = 'ex-cable-lat-pullover';
const PULLOVER_SETS = 3;
const MIN_PULLDOWN_SETS = 2;
const PULLOVER_NOTES = 'Arms nearly straight. Pull the bar down to your hips with your lats, shoulders down.';

const withSets = (pe: PlannedExercise, sets: number): PlannedExercise => {
  const extra = Math.max(0, sets - pe.rir.length);
  return { ...pe, workingSets: sets, rir: [...pe.rir.slice(0, sets), ...Array(extra).fill(0)] };
};

const latPullover = (slot: PlannedExercise): PlannedExercise =>
  withSets({
    ...slot, exerciseId: CABLE_LAT_PULLOVER, technique: '', repMin: 10, repMax: 12, restSeconds: 120, restLabel: '1-2 min',
    subExerciseIds: ['ex-db-lat-pullover', 'ex-machine-lat-pullover'], notes: PULLOVER_NOTES,
  }, PULLOVER_SETS);

function moreFirst(exercises: PlannedExercise[], id: string, min: number): PlannedExercise[] {
  const first = exercises.findIndex((pe) => pe.exerciseId === id);
  return exercises.map((pe, i) => (i === first ? withSets(pe, Math.max(pe.workingSets, min)) : pe));
}

function reshapeDay(day: PlannedDay): PlannedDay {
  const swapped = day.exercises
    .filter((pe) => pe.exerciseId !== STIFF_LEG_DEADLIFT)
    .map((pe) => (pe.exerciseId === LEG_EXTENSION ? latPullover(pe) : pe));
  const exercises = moreFirst(swapped, CLOSE_GRIP_PULLDOWN, MIN_PULLDOWN_SETS).map((pe, i) => ({ ...pe, order: i + 1 }));
  return { ...day, exercises };
}

export function applySwimmer(program: Program): Program {
  return { ...program, days: program.days.map(reshapeDay) };
}
