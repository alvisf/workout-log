// Airtable sync. Two tables: Workouts (one row per workout, exercises as JSON) and BodyWeight (one row per day).
// Rows are keyed by id, deletes are soft (deleted = true), so every change is an upsert. Newest updatedAt wins.
import { useSyncExternalStore } from 'react';
import { BodyWeight, Exercise, Workout } from './types';
import { applyRemote, getState, isOwner, setSyncHook, SyncOp } from './store';

export interface SyncConfig { enabled: boolean; token: string; baseId: string; table: string; lastPull: number }
export interface SyncStatus { state: 'off' | 'idle' | 'syncing' | 'error'; at: number; error: string; pending: number }

const LS_CFG = 'll-airtable', LS_QUEUE = 'll-syncQueue';
const read = <T>(k: string, fb: T): T => { try { const v = localStorage.getItem(k); return v ? { ...fb, ...JSON.parse(v) } : fb; } catch { return fb; } };

function mkStore<T>(key: string | null, init: T) {
  let v = key ? read(key, init) : init;
  const ls = new Set<() => void>();
  return {
    get: () => v,
    set(p: T | ((x: T) => T)) { v = typeof p === 'function' ? (p as (x: T) => T)(v) : p; if (key) localStorage.setItem(key, JSON.stringify(v)); ls.forEach((l) => l()); },
    sub(l: () => void) { ls.add(l); return () => { ls.delete(l); }; },
  };
}
export const syncConfig = mkStore<SyncConfig>(LS_CFG, { enabled: false, token: '', baseId: '', table: 'Workouts', lastPull: 0 });
export const syncStatus = mkStore<SyncStatus>(null, { state: 'off', at: 0, error: '', pending: 0 });
const queue = mkStore<Record<string, SyncOp>>(LS_QUEUE, {});
export const useSync = <T>(s: { get: () => T; sub: (l: () => void) => () => void }) => useSyncExternalStore(s.sub, s.get, s.get);

const API = 'https://api.airtable.com/v0';
const bwTable = (c: SyncConfig) => `${c.table}BodyWeight`;
const num = (name: string) => ({ name, type: 'number', options: { precision: 0 } });
const dec = (name: string) => ({ name, type: 'number', options: { precision: 2 } });
const check = (name: string, color: string) => ({ name, type: 'checkbox', options: { icon: 'check', color } });
const WORKOUT_FIELDS = [
  { name: 'id', type: 'singleLineText' }, num('startedAt'), num('endedAt'), { name: 'dayName', type: 'singleLineText' }, num('week'),
  { name: 'programId', type: 'singleLineText' }, { name: 'plannedDayId', type: 'singleLineText' }, { name: 'notes', type: 'multilineText' },
  dec('bodyWeight'), { name: 'exercises', type: 'multilineText' }, num('updatedAt'), check('deleted', 'redBright'),
];
const BW_FIELDS = [{ name: 'id', type: 'singleLineText' }, { name: 'date', type: 'singleLineText' }, dec('kg'), num('updatedAt'), check('deleted', 'redBright')];

type Row = Record<string, unknown>;
const configured = (c: SyncConfig) => c.enabled && c.token && c.baseId && c.table;

async function api(path: string, init: RequestInit = {}): Promise<Row> {
  const c = syncConfig.get();
  const r = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const body = (await r.json().catch(() => ({}))) as Row;
  if (!r.ok) {
    const e = body.error as { type?: string; message?: string } | string | undefined;
    throw new Error(typeof e === 'string' ? e : e?.message || e?.type || `HTTP ${r.status}`);
  }
  return body;
}

// Exercise names ride along inside the JSON so the other device can create missing exercises.
function workoutRow(w: Workout): Row {
  const ex = getState().exercises;
  const exercises = w.exercises.map((we) => ({ ...we, exerciseName: ex.find((e) => e.id === we.exerciseId)?.name ?? '' }));
  return {
    id: w.id, startedAt: w.startedAt, endedAt: w.endedAt, dayName: w.dayName ?? '', week: w.week, programId: w.programId ?? '', plannedDayId: w.plannedDayId ?? '',
    notes: w.notes, bodyWeight: w.bodyWeight, exercises: JSON.stringify(exercises), updatedAt: w.updatedAt ?? Date.now(), deleted: false,
  };
}
function workoutFromRow(f: Row, newEx: Exercise[]): Workout {
  let raw: (Workout['exercises'][number] & { exerciseName?: string })[] = [];
  try { raw = JSON.parse(String(f.exercises || '[]')); } catch { /* keep empty */ }
  const have = [...getState().exercises, ...newEx];
  const exercises = raw.map(({ exerciseName, ...we }) => {
    if (!have.some((e) => e.id === we.exerciseId) && exerciseName) {
      const byName = have.find((e) => e.name.toLowerCase() === exerciseName.toLowerCase());
      if (byName) return { ...we, exerciseId: byName.id };
      const e: Exercise = { id: we.exerciseId, name: exerciseName, muscleGroup: '', equipment: '', notes: '', videoUrl: '', isBarbell: false, defaultWeight: 0 };
      newEx.push(e); have.push(e);
    }
    return we;
  });
  return {
    id: String(f.id), programId: String(f.programId || '') || null, plannedDayId: String(f.plannedDayId || '') || null,
    week: f.week == null || f.week === '' ? null : Number(f.week), dayName: String(f.dayName || '') || null,
    startedAt: Number(f.startedAt) || 0, endedAt: f.endedAt == null || f.endedAt === '' ? null : Number(f.endedAt),
    notes: String(f.notes ?? ''), bodyWeight: f.bodyWeight == null || f.bodyWeight === '' ? null : Number(f.bodyWeight), exercises, updatedAt: Number(f.updatedAt) || 0,
  };
}
const bwRow = (b: BodyWeight): Row => ({ id: b.date, date: b.date, kg: b.kg, updatedAt: b.updatedAt ?? Date.now(), deleted: false });
const bwFromRow = (f: Row): BodyWeight => ({ date: String(f.date || f.id), kg: Number(f.kg) || 0, updatedAt: Number(f.updatedAt) || 0 });

const setStatus = (p: Partial<SyncStatus>) => syncStatus.set((s) => ({ ...s, ...p, pending: Object.keys(queue.get()).length }));
const qKey = (op: SyncOp) => `${op.store}:${op.id}`;

async function pushTable(table: string, ops: [string, SyncOp][]) {
  const c = syncConfig.get();
  for (let i = 0; i < ops.length; i += 10) {
    const chunk = ops.slice(i, i + 10);
    const records = chunk.map(([, op]) => ({
      fields: op.kind === 'del' ? { id: op.id, updatedAt: op.at, deleted: true } : op.store === 'workouts' ? workoutRow(op.value as Workout) : bwRow(op.value as BodyWeight),
    }));
    await api(`/${c.baseId}/${encodeURIComponent(table)}`, { method: 'PATCH', body: JSON.stringify({ performUpsert: { fieldsToMergeOn: ['id'] }, records, typecast: true }) });
    queue.set((cur) => { const n = { ...cur }; chunk.forEach(([k, op]) => { if (n[k] === op) delete n[k]; }); return n; });
  }
}
async function push() {
  const c = syncConfig.get();
  const all = Object.entries(queue.get());
  await pushTable(c.table, all.filter(([, op]) => op.store === 'workouts'));
  await pushTable(bwTable(c), all.filter(([, op]) => op.store === 'bodyweight'));
}

// Fetches the whole table. No "since" cursor: updatedAt comes from each device's own clock,
// so a cursor skipped rows pushed later with older stamps (e.g. Push all from another device).
async function fetchAll(table: string): Promise<Row[]> {
  const c = syncConfig.get();
  const rows: Row[] = [];
  let offset: string | undefined;
  do {
    const p = new URLSearchParams({ pageSize: '100' });
    if (offset) p.set('offset', offset);
    const r = await api(`/${c.baseId}/${encodeURIComponent(table)}?${p}`);
    (r.records as { fields: Row }[]).forEach((x) => rows.push(x.fields));
    offset = r.offset as string | undefined;
  } while (offset);
  return rows;
}

async function pull() {
  const c = syncConfig.get();
  const [wRows, bRows] = await Promise.all([fetchAll(c.table), fetchAll(bwTable(c))]);
  const st = getState();
  const pending = queue.get();
  const newEx: Exercise[] = [];
  const wPuts: Workout[] = [], wDels: string[] = [], bPuts: BodyWeight[] = [], bDels: string[] = [];
  for (const f of wRows) {
    const id = String(f.id || ''); if (!id) continue;
    const upd = Number(f.updatedAt) || 0;
    const p = pending[`workouts:${id}`]; if (p && p.at >= upd) continue;
    const mine = st.workouts.find((w) => w.id === id); if (mine && (mine.updatedAt ?? 0) >= upd) continue;
    if (f.deleted) { if (mine) wDels.push(id); } else wPuts.push(workoutFromRow(f, newEx));
  }
  for (const f of bRows) {
    const id = String(f.id || f.date || ''); if (!id) continue;
    const upd = Number(f.updatedAt) || 0;
    const p = pending[`bodyweight:${id}`]; if (p && p.at >= upd) continue;
    const mine = st.bodyweight.find((b) => b.date === id); if (mine && (mine.updatedAt ?? 0) >= upd) continue;
    if (f.deleted) { if (mine) bDels.push(id); } else bPuts.push(bwFromRow(f));
  }
  await applyRemote({ exercises: newEx, workouts: wPuts, deleteWorkouts: wDels, bodyweight: bPuts, deleteBodyweight: bDels });
  syncConfig.set((x) => ({ ...x, lastPull: Date.now() }));
}

let running = false;
export async function syncNow(): Promise<void> {
  const c = syncConfig.get();
  if (!configured(c)) { setStatus({ state: 'off' }); return; }
  if (running || !isOwner() || !navigator.onLine) return;
  running = true;
  setStatus({ state: 'syncing', error: '' });
  try { await push(); await pull(); setStatus({ state: 'idle', at: Date.now() }); }
  catch (e) { setStatus({ state: 'error', error: (e as Error).message }); }
  finally { running = false; }
}

/** First-time setup: creates both tables. Needs the schema.bases:write scope. */
export async function createTables(): Promise<void> {
  const c = syncConfig.get();
  await api(`/meta/bases/${c.baseId}/tables`, { method: 'POST', body: JSON.stringify({ name: c.table, fields: WORKOUT_FIELDS }) });
  await api(`/meta/bases/${c.baseId}/tables`, { method: 'POST', body: JSON.stringify({ name: bwTable(c), fields: BW_FIELDS }) });
}

/** Queue every finished workout and body weight (use once on a device that already has data). */
export async function pushAll(): Promise<void> {
  const st = getState();
  queue.set((q) => {
    const n = { ...q };
    st.workouts.filter((w) => w.endedAt !== null).forEach((w) => { n[`workouts:${w.id}`] = { kind: 'put', store: 'workouts', id: w.id, value: w, at: w.updatedAt ?? Date.now() }; });
    st.bodyweight.forEach((b) => { n[`bodyweight:${b.date}`] = { kind: 'put', store: 'bodyweight', id: b.date, value: b, at: b.updatedAt ?? Date.now() }; });
    return n;
  });
  await syncNow();
}

let debounce = 0;
function schedule(ms = 1500) { clearTimeout(debounce); debounce = window.setTimeout(() => { void syncNow(); }, ms); }

export function installSync() {
  setSyncHook((ops) => {
    if (!configured(syncConfig.get())) return;
    queue.set((q) => { const n = { ...q }; ops.forEach((op) => { n[qKey(op)] = op; }); return n; });
    setStatus({});
    schedule();
  });
  window.addEventListener('online', () => schedule(500));
  setInterval(() => { void syncNow(); }, 5 * 60 * 1000);
  syncConfig.sub(() => setStatus({ state: configured(syncConfig.get()) ? (syncStatus.get().state === 'off' ? 'idle' : syncStatus.get().state) : 'off' }));
  setStatus({ state: configured(syncConfig.get()) ? 'idle' : 'off' });
  schedule(800);
}
