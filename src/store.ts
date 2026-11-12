import { useSyncExternalStore } from 'react';
import * as db from './db';
import seed from './data/minmax.json';
import hevy from './data/hevy.json';
import { applyModelLook, MODEL_LOOK_SEED } from './modelLook';
import { applySwimmer, SWIMMER_SEED } from './swimmer';
import {
  BodyWeight, DEFAULT_SETTINGS, Exercise, Person, PlannedDay, PlannedExercise, Program, Settings, WSet, Workout, WorkoutExercise, uid,
} from './types';
import { e1rm } from './stats';
import { playRestEnd } from './sound';
import { previousSets } from './carry';
import { personFactor, scaleWeight, switchPerson, workoutsFor } from './people';

export interface Rest { endsAt: number; total: number }
interface State {
  ready: boolean; exercises: Exercise[]; programs: Program[]; workouts: Workout[]; allWorkouts: Workout[]; bodyweight: BodyWeight[];
  settings: Settings; open: Workout | null; rest: Rest | null; owner: boolean;
}

const LS_SETTINGS = 'll-settings', LS_OPEN = 'll-open', LS_OWNER = 'll-owner';
const tabId = uid();
const readLS = <T>(k: string, fb: T): T => { try { const v = localStorage.getItem(k); return v ? { ...fb, ...JSON.parse(v) } : fb; } catch { return fb; } };

let state: State = {
  ready: false, exercises: [], programs: [], workouts: [], allWorkouts: [], bodyweight: [],
  settings: readLS(LS_SETTINGS, DEFAULT_SETTINGS), open: null, rest: null, owner: true,
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function set(patch: Partial<State>) { state = { ...state, ...patch }; emit(); }
export const useStore = <T>(sel: (s: State) => T): T => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => sel(state), () => sel(state));
export const getState = () => state;
export const isOwner = () => state.owner;

// Sync hook: local writes to workouts and body weight are reported here so the sync layer can queue them.
export type SyncOp =
  | { kind: 'put'; store: 'workouts' | 'bodyweight'; id: string; value: Workout | BodyWeight; at: number }
  | { kind: 'del'; store: 'workouts' | 'bodyweight'; id: string; at: number };
let syncHook: ((ops: SyncOp[]) => void) | null = null;
export const setSyncHook = (f: (ops: SyncOp[]) => void) => { syncHook = f; };
const stampW = (w: Workout): Workout => ({ ...w, updatedAt: Date.now() });
const stampB = (b: BodyWeight): BodyWeight => ({ ...b, updatedAt: Date.now() });
const opsW = (ws: Workout[]): SyncOp[] => ws.map((w) => ({ kind: 'put', store: 'workouts', id: w.id, value: w, at: w.updatedAt! }));

// ---- tab ownership ----
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ll-sync') : null;
function claimOwner() { localStorage.setItem(LS_OWNER, tabId); set({ owner: true }); bc?.postMessage({ type: 'owner', tabId }); }
export function takeOver() { claimOwner(); loadOpen(); }
if (bc) bc.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'owner' && m.tabId !== tabId) set({ owner: false });
  if (m.type === 'ping' && state.owner) bc?.postMessage({ type: 'owner', tabId });
  if (m.type === 'data') void reload();
  if (m.type === 'open') loadOpen();
};
function loadOpen() {
  const o = readLS<{ open: Workout | null; rest: Rest | null }>(LS_OPEN, { open: null, rest: null });
  set({ open: o.open, rest: o.rest });
}
function persistOpen() {
  localStorage.setItem(LS_OPEN, JSON.stringify({ open: state.open, rest: state.rest }));
  bc?.postMessage({ type: 'open' });
}
window.addEventListener('storage', (e) => { if (e.key === LS_OPEN) loadOpen(); });

// ---- settings ----
export function updateSettings(p: Partial<Settings>) {
  const settings = { ...state.settings, ...p };
  localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
  set({ settings });
}

// ---- load ----
async function reload() {
  const [exercises, programs, workouts, bodyweight] = await Promise.all([
    db.getAll<Exercise>('exercises'), db.getAll<Program>('programs'), db.getAll<Workout>('workouts'), db.getAll<BodyWeight>('bodyweight'),
  ]);
  const allWorkouts = workouts.sort((a, b) => b.startedAt - a.startedAt);
  set({ exercises: exercises.sort((a, b) => a.name.localeCompare(b.name)), programs, allWorkouts, workouts: workoutsFor(allWorkouts, state.settings.activePersonId), bodyweight: bodyweight.sort((a, b) => a.date.localeCompare(b.date)) });
}

// ---- people ----
export const activePerson = (): Person => state.settings.people.find((p) => p.id === state.settings.activePersonId) ?? state.settings.people[0];
/** Switch who is training. Not allowed while a workout is open. */
export function selectPerson(id: string) {
  if (state.open) return;
  updateSettings(switchPerson(state.settings, id));
  set({ workouts: workoutsFor(state.allWorkouts, state.settings.activePersonId) });
}
export function updatePerson(id: string, p: Partial<Pick<Person, 'birthYear' | 'sex' | 'weightKg'>>) {
  updateSettings({ people: state.settings.people.map((x) => (x.id === id ? { ...x, ...p } : x)) });
}
const startWeight = (exerciseId: string) => {
  const e = exerciseById(exerciseId);
  return e ? scaleWeight(e.defaultWeight, personFactor(activePerson()), e.isBarbell) : 0;
};
export async function init() {
  let exercises = await db.getAll<Exercise>('exercises');
  let programs = await db.getAll<Program>('programs');
  if (exercises.length === 0) { exercises = seed.exercises as Exercise[]; await db.putMany('exercises', exercises); }
  if (programs.length === 0) { programs = [seed.program as Program]; await db.putMany('programs', programs); }
  if (!state.settings.seeded.includes('hevy-v1')) {
    const have = new Set(exercises.map((e) => e.id));
    await db.putMany('exercises', (hevy.exercises as Exercise[]).filter((e) => !have.has(e.id)));
    if (!programs.some((p) => p.id === hevy.program.id)) await db.put('programs', hevy.program as Program);
    const haveW = new Set((await db.getAll<Workout>('workouts')).map((w) => w.id));
    await db.putMany('workouts', (hevy.workouts as Workout[]).filter((w) => !haveW.has(w.id)));
    updateSettings({ seeded: [...state.settings.seeded, 'hevy-v1'] });
  }
  if (!state.settings.seeded.includes(MODEL_LOOK_SEED)) {
    const minmax = programs.find((p) => p.id === seed.program.id);
    if (minmax) await db.put('programs', applyModelLook(minmax));
    updateSettings({ seeded: [...state.settings.seeded, MODEL_LOOK_SEED] });
  }
  if (!state.settings.seeded.includes(SWIMMER_SEED)) {
    const minmax = (await db.getAll<Program>('programs')).find((p) => p.id === seed.program.id);
    if (minmax) await db.put('programs', applySwimmer(minmax));
    updateSettings({ seeded: [...state.settings.seeded, SWIMMER_SEED] });
  }
  await reload();
  const owner = localStorage.getItem(LS_OWNER);
  if (!owner || owner === tabId) claimOwner();
  else {
    // ask other tabs; if none answers, the old owner is gone: claim
    set({ owner: false }); bc?.postMessage({ type: 'ping' });
    setTimeout(() => { if (!state.owner && localStorage.getItem(LS_OWNER) === owner) claimOwner(); }, 400);
  }
  loadOpen();
  // auto-finish a workout left open more than 12 h
  if (state.open && Date.now() - state.open.startedAt > 12 * 3600_000) await finishWorkout(state.open.startedAt + 12 * 3600_000);
  set({ ready: true });
}
function changed() { bc?.postMessage({ type: 'data' }); }

// ---- lookups ----
export const exerciseById = (id: string) => state.exercises.find((e) => e.id === id);
export const activeProgram = () => state.programs.find((p) => p.id === state.settings.activeProgramId) ?? state.programs[0] ?? null;
export function swapKey(pe: PlannedExercise): string {
  for (const p of state.programs) for (const d of p.days) if (d.exercises.some((x) => x.id === pe.id)) return `${p.id}|${d.dayName}|${pe.exerciseId}`;
  return pe.id;
}
export const effectiveExerciseId = (pe: PlannedExercise) => state.settings.swaps[swapKey(pe)] ?? pe.exerciseId;
export const finished = () => state.workouts.filter((w) => w.endedAt !== null);

export function bestFor(exerciseId: string, excludeWorkoutId?: string) {
  let weight = 0, oneRm = 0;
  for (const w of finished()) {
    if (w.id === excludeWorkoutId) continue;
    for (const we of w.exercises) if (we.exerciseId === exerciseId) for (const s of we.sets) if (s.done && s.type === 'working') {
      weight = Math.max(weight, s.weight); oneRm = Math.max(oneRm, e1rm(s.weight, s.reps));
    }
  }
  return { weight, oneRm };
}

// ---- workout actions ----
function mkSet(index: number, type: 'warmup' | 'working', prev: WSet | undefined, rir: number | null, fallback: { weight: number; reps: number }): WSet {
  return { id: uid(), index, type, weight: prev?.weight ?? fallback.weight, reps: prev?.reps ?? fallback.reps, rir: prev?.rir ?? rir, done: false, notes: '', isPR: false };
}
/** Pair each exercise id with how many times it already appeared before it. */
function withSlots(ids: string[]): [string, number][] {
  const seen = new Map<string, number>();
  return ids.map((id) => { const n = seen.get(id) ?? 0; seen.set(id, n + 1); return [id, n]; });
}
function buildExercise(order: number, exerciseId: string, pe: PlannedExercise | null, slot = 0, dayName: string | null = null): WorkoutExercise {
  const prev = previousSets(finished(), exerciseId, slot, dayName);
  const prevWork = prev?.filter((s) => s.type === 'working') ?? [];
  const top = prevWork.length ? prevWork.reduce((a, s) => (s.weight > a.weight ? s : a), prevWork[0]) : undefined;
  const prevWarm = prev?.filter((s) => s.type === 'warmup') ?? [];
  const sets: WSet[] = [];
  const nWarm = pe?.warmupSets ?? 0, nWork = pe?.workingSets ?? 3;
  const dw = startWeight(exerciseId);
  const reps = pe ? Math.round((pe.repMin + pe.repMax) / 2) : 10;
  const warmW = Math.round((dw * 0.6) / 2.5) * 2.5;
  for (let i = 0; i < nWarm; i++) sets.push(mkSet(sets.length, 'warmup', prevWarm[i] ?? prevWork[0], null, { weight: warmW, reps }));
  for (let i = 0; i < nWork; i++) sets.push(mkSet(sets.length, 'working', top, pe?.rir[i] ?? pe?.rir[pe.rir.length - 1] ?? null, { weight: dw, reps }));
  return { id: uid(), order, exerciseId, plannedExerciseId: pe?.id ?? null, swappedFromId: pe && pe.exerciseId !== exerciseId ? pe.exerciseId : null, sets, notes: '' };
}
export function startWorkout(day: PlannedDay) {
  if (state.open) return;
  const prog = activeProgram();
  const planned = [...day.exercises].sort((a, b) => a.order - b.order);
  const open: Workout = {
    id: uid(), programId: prog?.id ?? null, plannedDayId: day.id, week: day.week, dayName: day.dayName,
    startedAt: Date.now(), endedAt: null, notes: '', bodyWeight: null, personId: state.settings.activePersonId,
    exercises: withSlots(planned.map(effectiveExerciseId)).map(([eid, slot], i) => buildExercise(i, eid, planned[i], slot, day.dayName)),
  };
  claimOwner();
  set({ open, rest: null }); persistOpen();
}
function mutateOpen(fn: (w: Workout) => Workout) { if (!state.open) return; set({ open: fn(state.open) }); persistOpen(); }
export function updateSet(weId: string, setId: string, p: Partial<WSet>) {
  mutateOpen((w) => ({ ...w, exercises: w.exercises.map((we) => we.id !== weId ? we : { ...we, sets: we.sets.map((s) => s.id === setId ? { ...s, ...p } : s) }) }));
}
const REST_SECONDS = 120;
export function toggleDone(weId: string, setId: string) {
  const w = state.open; if (!w) return;
  const we = w.exercises.find((x) => x.id === weId); const s = we?.sets.find((x) => x.id === setId); if (!we || !s) return;
  const done = !s.done;
  let isPR = false;
  if (done && s.type === 'working' && s.weight > 0 && s.reps > 0) {
    const best = bestFor(we.exerciseId, w.id);
    isPR = s.weight > best.weight || e1rm(s.weight, s.reps) > best.oneRm;
  }
  updateSet(weId, setId, { done, isPR });
  if (done && state.settings.restTimer) {
    startRest(REST_SECONDS);
  }
}
export function addSet(weId: string, type: 'warmup' | 'working' = 'working') {
  mutateOpen((w) => ({ ...w, exercises: w.exercises.map((we) => we.id !== weId ? we : { ...we, sets: [...we.sets, mkSet(we.sets.length, type, we.sets[we.sets.length - 1], null, { weight: startWeight(we.exerciseId), reps: 10 })] }) }));
}
export function removeSet(weId: string, setId: string) {
  mutateOpen((w) => ({ ...w, exercises: w.exercises.map((we) => we.id !== weId ? we : { ...we, sets: we.sets.filter((s) => s.id !== setId).map((s, i) => ({ ...s, index: i })) }) }));
}
export function addExercise(exerciseId: string) {
  mutateOpen((w) => ({ ...w, exercises: [...w.exercises, buildExercise(w.exercises.length, exerciseId, null)] }));
}
export function removeExercise(weId: string) {
  mutateOpen((w) => ({ ...w, exercises: w.exercises.filter((we) => we.id !== weId).map((we, i) => ({ ...we, order: i })) }));
}
export function swapExercise(weId: string, exerciseId: string, remember: boolean) {
  const w = state.open; const we = w?.exercises.find((x) => x.id === weId); if (!w || !we) return;
  const pe = findPlanned(we.plannedExerciseId);
  const fresh = buildExercise(we.order, exerciseId, pe);
  mutateOpen((wk) => ({ ...wk, exercises: wk.exercises.map((x) => x.id === weId ? { ...fresh, id: we.id, swappedFromId: pe && pe.exerciseId !== exerciseId ? pe.exerciseId : null } : x) }));
  if (remember && pe) {
    const swaps = { ...state.settings.swaps }; const k = swapKey(pe);
    if (exerciseId === pe.exerciseId) delete swaps[k]; else swaps[k] = exerciseId;
    updateSettings({ swaps });
  }
}
export function setWorkoutNotes(notes: string) { mutateOpen((w) => ({ ...w, notes })); }
export function setExerciseNotes(weId: string, notes: string) { mutateOpen((w) => ({ ...w, exercises: w.exercises.map((we) => we.id === weId ? { ...we, notes } : we) })); }

export function findPlanned(peId: string | null): PlannedExercise | null {
  if (!peId) return null;
  for (const p of state.programs) for (const d of p.days) { const pe = d.exercises.find((x) => x.id === peId); if (pe) return pe; }
  return null;
}

export async function finishWorkout(endedAt = Date.now()) {
  const w = state.open; if (!w) return null;
  const exercises = w.exercises.map((we) => ({ ...we, sets: we.sets.filter((s) => s.done) })).filter((we) => we.sets.length > 0);
  set({ open: null, rest: null }); persistOpen();
  if (exercises.length === 0) return null;
  const done: Workout = stampW({ ...w, exercises, endedAt });
  await db.put('workouts', done); await reload(); changed();
  syncHook?.(opsW([done]));
  // program progress
  if (done.plannedDayId && done.week === state.settings.currentWeek) {
    const prog = activeProgram();
    const doneDays = Array.from(new Set([...state.settings.doneDays, done.plannedDayId]));
    const weekDays = prog?.days.filter((d) => d.week === state.settings.currentWeek) ?? [];
    if (state.settings.autoAdvance && weekDays.length > 0 && weekDays.every((d) => doneDays.includes(d.id)) && prog && state.settings.currentWeek < prog.weeks) {
      updateSettings({ currentWeek: state.settings.currentWeek + 1, doneDays: [] });
    } else updateSettings({ doneDays });
  }
  return done;
}
export function discardWorkout() { set({ open: null, rest: null }); persistOpen(); }

export async function saveWorkout(w: Workout) { const x = stampW(w); await db.put('workouts', x); await reload(); changed(); syncHook?.(opsW([x])); }
export async function deleteWorkout(id: string) { await db.del('workouts', id); await reload(); changed(); syncHook?.([{ kind: 'del', store: 'workouts', id, at: Date.now() }]); }
export async function putWorkouts(list: Workout[]) { const xs = list.map(stampW); await db.putMany('workouts', xs); await reload(); changed(); syncHook?.(opsW(xs)); }

// Writes that came FROM the sync layer: no stamp, no hook.
export async function applyRemote(d: { exercises: Exercise[]; workouts: Workout[]; deleteWorkouts: string[]; bodyweight: BodyWeight[]; deleteBodyweight: string[] }) {
  if (d.exercises.length) await db.putMany('exercises', d.exercises);
  if (d.workouts.length) await db.putMany('workouts', d.workouts);
  for (const id of d.deleteWorkouts) await db.del('workouts', id);
  if (d.bodyweight.length) await db.putMany('bodyweight', d.bodyweight);
  for (const id of d.deleteBodyweight) await db.del('bodyweight', id);
  await reload(); changed();
}

// ---- rest timer ----
let restTimeout: ReturnType<typeof setTimeout> | null = null;
export function startRest(seconds: number) {
  const rest = { endsAt: Date.now() + seconds * 1000, total: seconds };
  set({ rest }); persistOpen(); schedule();
}
export function adjustRest(delta: number) {
  if (!state.rest) return;
  set({ rest: { endsAt: Math.max(Date.now(), state.rest.endsAt + delta * 1000), total: state.rest.total + delta } }); persistOpen(); schedule();
}
export function stopRest() { set({ rest: null }); persistOpen(); if (restTimeout) clearTimeout(restTimeout); }
function schedule() {
  if (restTimeout) clearTimeout(restTimeout);
  if (!state.rest) return;
  const ms = state.rest.endsAt - Date.now();
  restTimeout = setTimeout(() => {
    if (!state.rest) return;
    if (state.settings.restSound) playRestEnd();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('Rest over', { body: 'Next set.' }); } catch { /* unsupported */ }
    }
  }, Math.max(0, ms));
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { loadOpen(); schedule(); } });

// ---- exercises / programs / bodyweight ----
export async function saveExercise(e: Exercise) { await db.put('exercises', e); await reload(); changed(); }
export async function mergeExercise(fromId: string, intoId: string) {
  const ws = state.allWorkouts.filter((w) => w.exercises.some((we) => we.exerciseId === fromId))
    .map((w) => ({ ...w, exercises: w.exercises.map((we) => we.exerciseId === fromId ? { ...we, exerciseId: intoId } : we) }));
  await db.putMany('workouts', ws);
  const progs = state.programs.map((p) => ({ ...p, days: p.days.map((d) => ({ ...d, exercises: d.exercises.map((pe) => ({ ...pe, exerciseId: pe.exerciseId === fromId ? intoId : pe.exerciseId, subExerciseIds: pe.subExerciseIds.map((s) => s === fromId ? intoId : s) })) })) }));
  await db.putMany('programs', progs);
  await db.del('exercises', fromId); await reload(); changed();
}
export async function saveBodyWeight(b: BodyWeight) { const x = stampB(b); await db.put('bodyweight', x); await reload(); changed(); syncHook?.([{ kind: 'put', store: 'bodyweight', id: x.date, value: x, at: x.updatedAt! }]); }
export async function deleteBodyWeight(date: string) { await db.del('bodyweight', date); await reload(); changed(); syncHook?.([{ kind: 'del', store: 'bodyweight', id: date, at: Date.now() }]); }

export async function deleteAll() {
  await Promise.all([db.clear('workouts'), db.clear('bodyweight'), db.clear('programs'), db.clear('exercises')]);
  localStorage.removeItem(LS_SETTINGS); localStorage.removeItem(LS_OPEN);
  state = { ...state, settings: DEFAULT_SETTINGS, open: null, rest: null };
  await init(); changed();
}
