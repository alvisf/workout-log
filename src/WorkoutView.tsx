import { IconCheck, IconClock, IconTrophy, IconWeight } from './icons';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Tab } from './App';
import { t } from './i18n';
import {
  addExercise, addSet, adjustRest, discardWorkout, exerciseById, findPlanned, finishWorkout, finished, removeExercise, removeSet,
  setExerciseNotes, setWorkoutNotes, stopRest, swapExercise, toggleDone, updateSet, useStore, updateSettings,
} from './store';
import { fmtClock, fmtDur, fromUnit, prCount, setCount, toUnit, volume } from './stats';
import { Modal, Toggle, useNow } from './ui';
import type { PlannedExercise, WSet, Workout, WorkoutExercise } from './types';
import { ExercisePicker } from './ExercisesView';
import { previousSets } from './carry';


export default function WorkoutView({ go }: { go: (t: Tab) => void }) {
  const open = useStore((s) => s.open);
  const rest = useStore((s) => s.rest);
  const settings = useStore((s) => s.settings);
  const owner = useStore((s) => s.owner);
  useStore((s) => s.exercises);
  const now = useNow(!!rest, 250);
  const [adding, setAdding] = useState(false);
  const [summary, setSummary] = useState<Workout | null | 'none'>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (summary) {
    return (
      <div className="view">
        <div className="trophy" aria-hidden><svg viewBox="0 0 64 64"><path d="M20 8h24v16a12 12 0 0 1-24 0V8z" fill="currentColor"/><path d="M20 12H8v4a10 10 0 0 0 12 10M44 12h12v4a10 10 0 0 1-12 10" fill="none" stroke="currentColor" strokeWidth="4"/><rect x="28" y="34" width="8" height="10" fill="currentColor"/><rect x="20" y="46" width="24" height="8" rx="3" fill="currentColor"/></svg></div>
        {summary === 'none' ? <p>{t('noSets')}</p> : (
          <div className="tiles">
            <div className="tile" style={{ ['--i' as string]: 0 }}><span className="ico"><IconClock /></span><strong>{fmtDur(summary.endedAt! - summary.startedAt)}</strong></div>
            <div className="tile" style={{ ['--i' as string]: 1 }}><span className="ico"><IconCheck /></span><strong>{setCount(summary)}</strong></div>
            <div className="tile" style={{ ['--i' as string]: 2 }}><span className="ico"><IconWeight /></span><strong>{Math.round(toUnit(volume(summary), settings.unit))} {settings.unit}</strong></div>
            <div className="tile" style={{ ['--i' as string]: 3 }}><span className="ico"><IconTrophy /></span><strong>{prCount(summary)}</strong></div>
          </div>
        )}
        {summary !== 'none' && summary.exercises.flatMap((we) => we.sets.filter((s) => s.isPR).map((s) => (
          <p key={s.id} className="pr"><IconTrophy /> {exerciseById(we.exerciseId)?.name} {toUnit(s.weight, settings.unit)} × {s.reps}</p>
        )))}
        <button className="primary big" onClick={() => { setSummary(null); go('home'); }}>{t('done')}</button>
      </div>
    );
  }

  if (!open) return <div className="view"><h1>{t('workout')}</h1><p className="muted">{t('noData')}</p><button className="primary" onClick={() => go('home')}>{t('home')}</button></div>;
  const ro = !owner;
  const restLeft = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;

  return (
    <div className={`view workout${rest ? ' resting' : ''}`}>
      <header className="wk-head">
        <div><h1>{open.dayName ?? t('workout')}</h1><span className="muted">{open.week ? `${t('week')} ${open.week} · ` : ''}{fmtDur(now - open.startedAt)}</span></div>
        <button className="primary" disabled={ro} onClick={async () => { const w = await finishWorkout(); setSummary(w ?? 'none'); }}>{t('finish')}</button>
      </header>
      {rest && createPortal(
        <div className="rest-float" role="timer" aria-live="off">
          <div className="rest-bar" style={{ width: `${Math.min(100, (restLeft / rest.total) * 100)}%` }} />
          <span className="rest-time"><span className="muted small">{restLeft === 0 ? t('restOver') : t('rest')}</span> <strong>{fmtClock(restLeft)}</strong></span>
          <span className="rest-actions">
            <button onClick={() => adjustRest(-settings.restStep)}>-{settings.restStep}s</button>
            <button onClick={() => adjustRest(settings.restStep)}>+{settings.restStep}s</button>
            <button className="primary" onClick={stopRest}>{restLeft === 0 ? t('done') : t('skip')}</button>
          </span>
        </div>
      , document.body)}
      {open.exercises.map((we) => <ExerciseCard key={we.id} we={we} ro={ro} />)}
      <button className="ghost" disabled={ro} onClick={() => setAdding(true)}>+ {t('addExercise')}</button>
      <label className="block">{t('notes')}<textarea value={open.notes} disabled={ro} onChange={(e) => setWorkoutNotes(e.target.value)} /></label>
      <button className="ghost danger" disabled={ro} onClick={() => setConfirmDiscard(true)}>{t('discard')}</button>
      {adding && <Modal title={t('addExercise')} onClose={() => setAdding(false)}><ExercisePicker onPick={(id) => { addExercise(id); setAdding(false); }} /></Modal>}
      {confirmDiscard && <Modal title={t('discard')} onClose={() => setConfirmDiscard(false)}>
        <p>{t('confirmDelete')}</p>
        <div className="row"><button onClick={() => setConfirmDiscard(false)}>{t('cancel')}</button><button className="danger" onClick={() => { discardWorkout(); setConfirmDiscard(false); go('home'); }}>{t('discard')}</button></div>
      </Modal>}
    </div>
  );
}

function ExerciseCard({ we, ro }: { we: WorkoutExercise; ro: boolean }) {
  const settings = useStore((s) => s.settings);
  const open = useStore((s) => s.open);
  const ex = exerciseById(we.exerciseId);
  const pe = findPlanned(we.plannedExerciseId);
  const [swapping, setSwapping] = useState(false);
  const u = settings.unit;
  const slot = open ? open.exercises.filter((x) => x.exerciseId === we.exerciseId).findIndex((x) => x.id === we.id) : 0;
  const last = previousSets(finished(), we.exerciseId, Math.max(0, slot), open?.dayName ?? null, open?.id)?.filter((s) => s.type === 'working') ?? null;

  return (
    <section className="card ex">
      <div className="ex-head">
        <strong>{ex?.name ?? we.exerciseId}</strong>
        <span className="row">
          <button className="small" disabled={ro} onClick={() => setSwapping(true)}>{t('swap')}</button>
          <button className="small danger" disabled={ro} aria-label={t('delete')} onClick={() => removeExercise(we.id)}>×</button>
        </span>
      </div>
      {pe && <PlannedInfo pe={pe} />}
      {we.swappedFromId && <p className="muted small">{t('swap')}: {exerciseById(we.swappedFromId)?.name}</p>}
      {last && last.length > 0 && <p className="muted small">{t('lastTime')}: {last.map((s) => `${toUnit(s.weight, u)}×${s.reps}`).join(', ')}</p>}
      <table className="sets">
        <thead><tr><th>#</th><th>{u}</th><th>{t('reps')}</th><th>{t('rir')}</th><th /><th /></tr></thead>
        <tbody>
          {we.sets.map((s, i) => <SetRow key={s.id} we={we} s={s} n={i + 1} ro={ro} unit={u} />)}
        </tbody>
      </table>
      <div className="row">
        <button className="small" disabled={ro} onClick={() => addSet(we.id, 'working')}>+ {t('addSet')}</button>
        <button className="small" disabled={ro} onClick={() => addSet(we.id, 'warmup')}>+ {t('warmup')}</button>
      </div>
      <input className="note" placeholder={t('notes')} value={we.notes} disabled={ro} onChange={(e) => setExerciseNotes(we.id, e.target.value)} />
      {swapping && <SwapModal we={we} pe={pe} onClose={() => setSwapping(false)} />}
    </section>
  );
}

export function PlannedInfo({ pe }: { pe: PlannedExercise }) {
  return (
    <p className="muted small plan">
      {pe.technique && <span className="tag">{pe.technique}</span>}
      {pe.warmupSets ? `${pe.warmupSets} ${t('warmup').toLowerCase()} · ` : ''}{pe.workingSets} {t('working').toLowerCase()} · {pe.repMin === pe.repMax ? pe.repMin : `${pe.repMin}-${pe.repMax}`} {t('reps')} · {t('rir')} {pe.rir.join('/')} · {t('rest')} {pe.restLabel}
      {pe.notes && <><br />{pe.notes}</>}
    </p>
  );
}

function SetRow({ we, s, n, ro, unit }: { we: WorkoutExercise; s: WSet; n: number; ro: boolean; unit: 'kg' | 'lb' }) {
  const num = (v: string) => (v === '' ? 0 : Number(v));
  return (
    <tr className={(s.done ? 'done ' : '') + (s.type === 'warmup' ? 'warm' : '')}>
      <td><button className="type" disabled={ro} onClick={() => updateSet(we.id, s.id, { type: s.type === 'warmup' ? 'working' : 'warmup' })} aria-label={t(s.type)}>{s.type === 'warmup' ? 'W' : n}</button></td>
      <td><input type="number" inputMode="decimal" step={0.5} min={0} aria-label={unit} disabled={ro} value={s.weight ? toUnit(s.weight, unit) : ''} onChange={(e) => updateSet(we.id, s.id, { weight: fromUnit(num(e.target.value), unit) })} />
      </td>
      <td><input type="number" inputMode="numeric" min={0} aria-label={t('reps')} disabled={ro} value={s.reps || ''} onChange={(e) => updateSet(we.id, s.id, { reps: Math.round(num(e.target.value)) })} /></td>
      <td><select aria-label={t('rir')} disabled={ro} value={s.rir ?? ''} onChange={(e) => updateSet(we.id, s.id, { rir: e.target.value === '' ? null : Number(e.target.value) })}>
        <option value="">-</option>{[0, 1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r}</option>)}</select></td>
      <td><button className={'check' + (s.done ? ' on' : '')} disabled={ro} aria-pressed={s.done} aria-label={t('done')} onClick={() => toggleDone(we.id, s.id)}>✓{s.isPR && s.done ? <span className="pr-badge">PR</span> : null}</button></td>
      <td><button className="tiny danger" disabled={ro} aria-label={t('delete')} onClick={() => removeSet(we.id, s.id)}>×</button></td>
    </tr>
  );
}

function SwapModal({ we, pe, onClose }: { we: WorkoutExercise; pe: PlannedExercise | null; onClose: () => void }) {
  const [remember, setRemember] = useState(true);
  const subs = pe ? [pe.exerciseId, ...pe.subExerciseIds].filter((id) => id !== we.exerciseId) : [];
  return (
    <Modal title={t('swap')} onClose={onClose}>
      {subs.length > 0 && <>
        <h3>{t('substitutes')}</h3>
        {subs.map((id) => <button key={id} className="card row-card" onClick={() => { swapExercise(we.id, id, remember); onClose(); }}>{exerciseById(id)?.name ?? id}</button>)}
      </>}
      {pe && <Toggle label={t('remember')} checked={remember} onChange={setRemember} />}
      <h3>{t('exercises')}</h3>
      <ExercisePicker onPick={(id) => { swapExercise(we.id, id, remember); onClose(); }} />
    </Modal>
  );
}
