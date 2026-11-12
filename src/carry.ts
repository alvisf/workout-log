import type { WSet, Workout } from './types';

/**
 * Done sets from the last time this exercise slot was trained.
 * `slot` is which occurrence of the exercise it is in the day (0 = first), so a
 * heavy set and a back-off set of the same exercise keep their own weights.
 * Workouts must be newest first. Same day name wins; then any day; then the first slot.
 */
export function previousSets(workouts: readonly Workout[], exerciseId: string, slot: number, dayName: string | null, excludeId?: string): WSet[] | null {
  const find = (sameDay: boolean, want: number | 'first') => {
    for (const w of workouts) {
      if (!w.endedAt || w.id === excludeId || (sameDay && w.dayName !== dayName)) continue;
      const hits = w.exercises.filter((x) => x.exerciseId === exerciseId);
      const we = want === 'first' ? hits.find((x) => x.sets.some((s) => s.done)) : hits[want];
      const done = we?.sets.filter((s) => s.done) ?? [];
      if (done.length) return done;
    }
    return null;
  };
  return find(true, slot) ?? find(false, slot) ?? find(false, 'first');
}
