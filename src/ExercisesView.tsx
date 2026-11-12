import { useState } from 'react';
import { t } from './i18n';
import { exerciseById, mergeExercise, saveExercise, useStore } from './store';
import { exerciseHistory, fromUnit, localDate, toUnit } from './stats';
import { Modal } from './ui';
import { Exercise, uid } from './types';

export const GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings & glutes', 'Calves', 'Abs', 'Other'];
export const EQUIP = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Other'];

export function ExercisePicker({ onPick }: { onPick: (id: string) => void }) {
  const exercises = useStore((s) => s.exercises);
  const [q, setQ] = useState('');
  const list = exercises.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) || e.muscleGroup.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <input type="search" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('search')} autoFocus />
      <div className="list">
        {list.map((e) => <button key={e.id} className="card row-card" onClick={() => onPick(e.id)}><span>{e.name}</span><span className="muted small">{e.muscleGroup}</span></button>)}
      </div>
    </div>
  );
}

export function Chart({ points, unit, bars }: { points: { x: number; y: number }[]; unit: string; bars?: boolean }) {
  if (points.length === 0) return <p className="muted">{t('noData')}</p>;
  const W = 320, H = 120, P = 24;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.max(...ys, 1);
  const sx = (x: number) => (x1 === x0 ? W / 2 : P + ((x - x0) / (x1 - x0)) * (W - 2 * P));
  const sy = (y: number) => H - P - (y / y1) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`${points.length} points, max ${y1} ${unit}`}>
      <text x={2} y={P - 6} className="axis">{y1} {unit}</text>
      {bars ? points.map((p, i) => <rect key={i} x={sx(p.x) - 6} y={sy(p.y)} width={12} height={H - P - sy(p.y)} className="bar" />)
        : <polyline fill="none" className="line" points={points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} />}
      {!bars && points.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} className="pt" />)}
      <text x={P} y={H - 6} className="axis">{localDate(x0)}</text>
      <text x={W - P} y={H - 6} className="axis" textAnchor="end">{localDate(x1)}</text>
    </svg>
  );
}
