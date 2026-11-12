import { DEFAULT_PEOPLE, Person, Settings, Workout } from './types';

export { DEFAULT_PEOPLE };
export const ME = 'me';

// Start weights in the exercise list were set for a 74 kg man aged 27.
const BASE = { weightKg: 74, age: 27 };
const FEMALE_FACTOR = 0.6;
const AGE_DROP_PER_YEAR = 0.01;
const AGE_DROP_FROM = 30;
const MIN_AGE_FACTOR = 0.6;
const BODY_WEIGHT_POWER = 0.67;
const BARBELL_STEP = 2.5;
const OTHER_STEP = 0.5;

const ageFactor = (age: number) => Math.max(MIN_AGE_FACTOR, 1 - AGE_DROP_PER_YEAR * Math.max(0, age - AGE_DROP_FROM));
const weightFactor = (kg: number) => (kg / BASE.weightKg) ** BODY_WEIGHT_POWER;

/** How much of the base start weight this person should lift. */
export function personFactor(p: Person, year = new Date().getFullYear()): number {
  const sex = p.sex === 'female' ? FEMALE_FACTOR : 1;
  const raw = sex * ageFactor(year - p.birthYear) * weightFactor(p.weightKg);
  return raw / ageFactor(BASE.age);
}

export function scaleWeight(kg: number, factor: number, isBarbell: boolean): number {
  if (kg <= 0) return 0;
  const step = isBarbell ? BARBELL_STEP : OTHER_STEP;
  return Math.max(step, Math.round((kg * factor) / step) * step);
}

/** Save the current person's week, then load the next person's. */
export function switchPerson(s: Settings, id: string): Settings {
  const next = s.people.find((p) => p.id === id);
  if (!next) return s;
  const saved = { currentWeek: s.currentWeek, doneDays: s.doneDays };
  const people = s.people.map((p) => (p.id === s.activePersonId ? { ...p, progress: saved } : p));
  return { ...s, people, activePersonId: id, currentWeek: next.progress.currentWeek, doneDays: next.progress.doneDays };
}

export const workoutsFor = (all: readonly Workout[], personId: string) =>
  all.filter((w) => (w.personId ?? ME) === personId);
