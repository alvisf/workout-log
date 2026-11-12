import { describe, expect, it } from 'vitest';
import seed from './data/minmax.json';
import { Program } from './types';
import { applyModelLook } from './modelLook';
import { applySwimmer } from './swimmer';

const before = applyModelLook(seed.program as Program);
const after = applySwimmer(before);
const all = (p: Program) => p.days.flatMap((d) => d.exercises);
const dayOf = (p: Program, w: number, name: string) => p.days.find((d) => d.week === w && d.dayName === name)!;
const LATS = ['ex-machine-lat-pullover', 'ex-pull-up-wide-grip', 'ex-close-grip-lat-pulldown', 'ex-cable-lat-pullover'];
const latSets = (p: Program, w: number) =>
  p.days.filter((d) => d.week === w).flatMap((d) => d.exercises).filter((e) => LATS.includes(e.exerciseId)).reduce((n, e) => n + e.workingSets, 0);

describe('applySwimmer', () => {
  it('removes leg work from Push day', () => {
    expect(all(after).some((e) => e.exerciseId === 'ex-single-leg-leg-extension')).toBe(false);
  });

  it('removes Stiff-Leg Deadlift from Pull day', () => {
    expect(all(after).some((e) => e.exerciseId === 'ex-stiff-leg-deadlift')).toBe(false);
  });

  it('adds Cable Lat Pullover to Push day', () => {
    expect(dayOf(after, 3, 'Push').exercises.some((e) => e.exerciseId === 'ex-cable-lat-pullover')).toBe(true);
  });

  it('raises week 3 lat sets from 7 to 11', () => {
    expect([latSets(before, 3), latSets(after, 3)]).toEqual([7, 11]);
  });

  it('keeps the Lower day as is', () => {
    expect(dayOf(after, 3, 'Lower')).toEqual(dayOf(before, 3, 'Lower'));
  });

  it('keeps one RIR value per working set', () => {
    expect(all(after).every((e) => e.rir.length === e.workingSets)).toBe(true);
  });

  it('numbers exercises 1..n in each day', () => {
    expect(after.days.every((d) => d.exercises.every((e, i) => e.order === i + 1))).toBe(true);
  });

  it('gives the same result when run twice', () => {
    expect(applySwimmer(after)).toEqual(after);
  });
});
