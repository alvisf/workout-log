import { describe, expect, it } from 'vitest';
import { previousSets } from './carry';

const set = (weight: number, done = true, type = 'working') => ({ id: String(weight), index: 0, type, weight, reps: 8, rir: null, done, notes: '', isPR: false });
const ex = (exerciseId: string, ...sets: ReturnType<typeof set>[]) => ({ id: exerciseId + Math.random(), order: 0, exerciseId, plannedExerciseId: null, swappedFromId: null, sets, notes: '' });
const wk = (id: string, dayName: string, startedAt: number, exercises: ReturnType<typeof ex>[]) =>
  ({ id, dayName, startedAt, endedAt: startedAt + 1, exercises }) as never;

describe('previousSets', () => {
  const w1 = wk('w1', 'Upper', 100, [ex('chest', set(55)), ex('chest', set(22)), ex('lat', set(30))]);
  it('keeps each slot of a repeated exercise apart', () => {
    expect(previousSets([w1], 'chest', 0, 'Upper')?.[0].weight).toBe(55);
    expect(previousSets([w1], 'chest', 1, 'Upper')?.[0].weight).toBe(22);
  });
  it('prefers the same day name over a newer other day', () => {
    const lower = wk('w2', 'Lower', 200, [ex('chest', set(99))]);
    expect(previousSets([lower, w1], 'chest', 0, 'Upper')?.[0].weight).toBe(55);
  });
  it('falls back to any day, then to the first slot', () => {
    const lower = wk('w2', 'Lower', 200, [ex('chest', set(99))]);
    expect(previousSets([lower], 'chest', 0, 'Upper')?.[0].weight).toBe(99);
    expect(previousSets([lower], 'chest', 1, 'Upper')?.[0].weight).toBe(99);
  });
  it('ignores sets not done and skips an excluded workout', () => {
    const w3 = wk('w3', 'Upper', 300, [ex('chest', set(70, false))]);
    expect(previousSets([w3, w1], 'chest', 0, 'Upper')?.[0].weight).toBe(55);
    expect(previousSets([w1], 'chest', 0, 'Upper', 'w1')).toBeNull();
  });
});
