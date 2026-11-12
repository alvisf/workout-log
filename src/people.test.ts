import { describe, expect, it } from 'vitest';
import { DEFAULT_PEOPLE, ME, personFactor, scaleWeight, switchPerson, workoutsFor } from './people';
import { DEFAULT_SETTINGS, Workout } from './types';

const YEAR = 2026;
const mom = DEFAULT_PEOPLE.find((p) => p.id === 'mom')!;
const dad = DEFAULT_PEOPLE.find((p) => p.id === 'dad')!;
const me = DEFAULT_PEOPLE.find((p) => p.id === ME)!;
const w = (id: string, personId?: string) => ({ id, personId }) as Workout;

describe('people defaults', () => {
  it('has me, mom and dad', () => {
    expect(DEFAULT_PEOPLE.map((p) => p.id)).toEqual(['me', 'mom', 'dad']);
  });

  it('has mom born in 1971', () => {
    expect(mom.birthYear).toBe(1971);
  });

  it('has dad born in 1969', () => {
    expect(dad.birthYear).toBe(1969);
  });
});

describe('personFactor', () => {
  it('is 1 for me, because start weights were set for me', () => {
    expect(personFactor(me, YEAR)).toBe(1);
  });

  it('is lower for mom than dad', () => {
    expect(personFactor(mom, YEAR)).toBeLessThan(personFactor(dad, YEAR));
  });

  it('is lower for dad than me', () => {
    expect(personFactor(dad, YEAR)).toBeLessThan(1);
  });

  it('drops with age', () => {
    expect(personFactor({ ...dad, birthYear: 1950 }, YEAR)).toBeLessThan(personFactor(dad, YEAR));
  });

  it('rises with body weight', () => {
    expect(personFactor({ ...dad, weightKg: 95 }, YEAR)).toBeGreaterThan(personFactor(dad, YEAR));
  });
});

describe('scaleWeight', () => {
  it('rounds barbell weights to 2.5 kg', () => {
    expect(scaleWeight(50, 0.73, true)).toBe(37.5);
  });

  it('rounds other weights to 0.5 kg', () => {
    expect(scaleWeight(8, 0.45, false)).toBe(3.5);
  });

  it('never goes to 0 when there was a weight', () => {
    expect(scaleWeight(4, 0.05, false)).toBe(0.5);
  });

  it('keeps 0 as 0', () => {
    expect(scaleWeight(0, 0.5, false)).toBe(0);
  });
});

describe('switchPerson', () => {
  const start = { ...DEFAULT_SETTINGS, activePersonId: ME, currentWeek: 4, doneDays: ['d1'] };
  const next = switchPerson(start, 'mom');

  it('makes mom active', () => {
    expect(next.activePersonId).toBe('mom');
  });

  it('starts mom on her own week', () => {
    expect([next.currentWeek, next.doneDays]).toEqual([1, []]);
  });

  it('saves my week when leaving me', () => {
    expect(next.people.find((p) => p.id === ME)!.progress).toEqual({ currentWeek: 4, doneDays: ['d1'] });
  });

  it('brings my week back when I switch back', () => {
    const back = switchPerson(next, ME);
    expect([back.currentWeek, back.doneDays]).toEqual([4, ['d1']]);
  });

  it('does nothing for an unknown person', () => {
    expect(switchPerson(start, 'nobody')).toBe(start);
  });
});

describe('workoutsFor', () => {
  const all = [w('a'), w('b', 'mom'), w('c', 'me'), w('d', 'dad')];

  it('counts old workouts with no person as mine', () => {
    expect(workoutsFor(all, ME).map((x) => x.id)).toEqual(['a', 'c']);
  });

  it('gives mom only her workouts', () => {
    expect(workoutsFor(all, 'mom').map((x) => x.id)).toEqual(['b']);
  });
});
