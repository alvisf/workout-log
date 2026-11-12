import { Workout } from './types';

export const e1rm = (w: number, reps: number) => (reps <= 0 || w <= 0 ? 0 : reps === 1 ? w : Math.round(w * (1 + reps / 30) * 10) / 10);
export const volume = (w: Workout) => w.exercises.reduce((a, we) => a + we.sets.filter((s) => s.done && s.type === 'working').reduce((b, s) => b + s.weight * s.reps, 0), 0);
export const setCount = (w: Workout) => w.exercises.reduce((a, we) => a + we.sets.filter((s) => s.done && s.type === 'working').length, 0);
export const prCount = (w: Workout) => w.exercises.reduce((a, we) => a + we.sets.filter((s) => s.done && s.isPR).length, 0);
export const avgRir = (w: Workout) => {
  const r = w.exercises.flatMap((we) => we.sets.filter((s) => s.done && s.type === 'working' && s.rir !== null).map((s) => s.rir as number));
  return r.length ? Math.round((r.reduce((a, b) => a + b, 0) / r.length) * 10) / 10 : null;
};
const pad = (n: number) => String(n).padStart(2, '0');
export const localDate = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const fmtTime = (ts: number) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtDur = (ms: number) => { const m = Math.round(ms / 60000); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
export const fmtClock = (s: number) => `${Math.floor(s / 60)}:${pad(s % 60)}`;
export function weekKey(ts: number) {
  const d = new Date(ts); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); return d.getTime();
}
export interface ExPoint { ts: number; best: number; oneRm: number; vol: number; sets: number }
export function exerciseHistory(ws: Workout[], exerciseId: string): ExPoint[] {
  const out: ExPoint[] = [];
  for (const w of ws) {
    if (!w.endedAt) continue;
    const sets = w.exercises.filter((we) => we.exerciseId === exerciseId).flatMap((we) => we.sets.filter((s) => s.done && s.type === 'working'));
    if (!sets.length) continue;
    out.push({ ts: w.startedAt, best: Math.max(...sets.map((s) => s.weight)), oneRm: Math.max(...sets.map((s) => e1rm(s.weight, s.reps))), vol: sets.reduce((a, s) => a + s.weight * s.reps, 0), sets: sets.length });
  }
  return out.sort((a, b) => a.ts - b.ts);
}
export const toUnit = (kg: number, unit: 'kg' | 'lb') => (unit === 'kg' ? kg : Math.round(kg * 2.20462 * 10) / 10);
export const fromUnit = (v: number, unit: 'kg' | 'lb') => (unit === 'kg' ? v : Math.round((v / 2.20462) * 100) / 100);
