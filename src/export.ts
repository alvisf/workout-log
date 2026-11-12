import { parseCsv, toCsv } from './csvutil';
import { getState } from './store';
import { BodyWeight, DATA_VERSION, Exercise, PlannedDay, Program, Workout, WorkoutExercise, uid } from './types';

export const HEVY_HEADER = ['title', 'start_time', 'end_time', 'description', 'exercise_title', 'superset_id', 'exercise_notes', 'set_index', 'set_type', 'weight_kg', 'reps', 'distance_km', 'duration_seconds', 'rpe'];
const iso = (ts: number) => new Date(ts).toISOString();

export function toHevyCsv(ws: Workout[], exercises: Exercise[]): string {
  const name = (id: string) => exercises.find((e) => e.id === id)?.name ?? id;
  const rows: (string | number | null)[][] = [HEVY_HEADER];
  for (const w of [...ws].filter((x) => x.endedAt).sort((a, b) => a.startedAt - b.startedAt)) {
    const title = w.dayName ? `${w.dayName}${w.week ? ` (Week ${w.week})` : ''}` : 'Workout';
    for (const we of w.exercises) for (const s of we.sets) if (s.done) {
      rows.push([title, iso(w.startedAt), iso(w.endedAt!), w.notes, name(we.exerciseId), '', we.notes, s.index, s.type === 'warmup' ? 'warmup' : 'normal', s.weight, s.reps, '', '', s.rir === null ? '' : 10 - s.rir]);
    }
  }
  return toCsv(rows);
}

export const emptyWe = (exerciseId: string, order: number): WorkoutExercise => ({ id: uid(), order, exerciseId, plannedExerciseId: null, swappedFromId: null, sets: [], notes: '' });
