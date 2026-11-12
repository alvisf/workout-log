import type { Workout } from './types';

/** Program day id -> when it was last finished (null when only ticked for the current week). */
export function doneDays(programId: string, workouts: readonly Workout[], ticked: readonly string[]): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (const id of ticked) m.set(id, null);
  for (const w of workouts) {
    if (!w.endedAt || w.programId !== programId || !w.plannedDayId) continue;
    const prev = m.get(w.plannedDayId);
    if (prev == null || w.endedAt > prev) m.set(w.plannedDayId, w.endedAt);
  }
  return m;
}
