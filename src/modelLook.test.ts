import { describe, expect, it } from 'vitest';
import seed from './data/minmax.json';
import { Program } from './types';
import { applyModelLook } from './modelLook';

const before = seed.program as Program;
const after = applyModelLook(before);
const week = (p: Program, w: number) => p.days.filter((d) => d.week === w);
const all = (p: Program) => p.days.flatMap((d) => d.exercises);
const setsOf = (p: Program, w: number, id: string) =>
  week(p, w).flatMap((d) => d.exercises).filter((e) => e.exerciseId === id).reduce((n, e) => n + e.workingSets, 0);

describe('applyModelLook', () => {
  it('removes every Incline DB Y-Raise', () => {
    expect(all(after).some((e) => e.exerciseId === 'ex-incline-db-y-raise')).toBe(false);
  });

  it('puts a cable lateral raise where the Y-raise was', () => {
    expect(setsOf(after, 3, 'ex-high-cable-lateral-raise')).toBe(3);
  });

  it('removes every EZ-Bar Skull Crusher', () => {
    expect(all(after).some((e) => e.exerciseId === 'ex-ez-bar-skull-crusher')).toBe(false);
  });

  it('keeps Triceps Pressdown at 2 sets in week 3', () => {
    expect(setsOf(after, 3, 'ex-triceps-pressdown')).toBe(2);
  });

  it('gives Machine Lateral Raise 4 sets in week 3', () => {
    expect(setsOf(after, 3, 'ex-machine-lateral-raise')).toBe(4);
  });

  it('keeps one RIR value per working set', () => {
    expect(all(after).every((e) => e.rir.length === e.workingSets)).toBe(true);
  });

  it('tells you to use straps on Stiff-Leg Deadlift', () => {
    expect(all(after).filter((e) => e.exerciseId === 'ex-stiff-leg-deadlift').every((e) => e.notes.includes('straps'))).toBe(true);
  });

  it('adds a no-shrug cue to every row and pulldown', () => {
    const pulls = all(after).filter((e) => /row|pulldown|pull-up/.test(e.exerciseId));
    expect(pulls.every((e) => e.notes.includes('no shrug'))).toBe(true);
  });

  it('numbers exercises 1..n in each day', () => {
    expect(after.days.every((d) => d.exercises.every((e, i) => e.order === i + 1))).toBe(true);
  });

  it('does not change the input program', () => {
    expect(all(before).some((e) => e.exerciseId === 'ex-ez-bar-skull-crusher')).toBe(true);
  });

  it('gives the same result when run twice', () => {
    expect(applyModelLook(after)).toEqual(after);
  });
});
