import { useState } from 'react';
import type { Tab } from './App';
import { t } from './i18n';
import { activeProgram, effectiveExerciseId, exerciseById, startWorkout, updateSettings, useStore } from './store';
import { PlannedInfo } from './WorkoutView';
import { IconCheck } from './icons';
import { doneDays } from './done';
import { localDate } from './stats';

export default function ProgramView({ go }: { go: (t: Tab) => void }) {
  const settings = useStore((s) => s.settings);
  const open = useStore((s) => s.open);
  const workouts = useStore((s) => s.workouts);
  useStore((s) => s.exercises);
  useStore((s) => s.programs);
  const prog = activeProgram();
  const [week, setWeek] = useState(settings.currentWeek);
  if (!prog) return <div className="view"><h1>{t('program')}</h1></div>;
  const w = Math.min(week, prog.weeks);
  const done = doneDays(prog.id, workouts, w === settings.currentWeek ? settings.doneDays : []);
  const days = prog.days.filter((d) => d.week === w).sort((a, b) => a.order - b.order);

  return (
    <div className="view">
      <header className="wk-head"><h1>{prog.name}</h1><button onClick={() => go('home')}>{t('close')}</button></header>
      <div className="row">
        <label>{t('week')} <select value={w} onChange={(e) => setWeek(Number(e.target.value))}>{Array.from({ length: prog.weeks }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}{n === settings.currentWeek ? ' *' : ''}</option>)}</select></label>
        {w !== settings.currentWeek && <button className="small" onClick={() => updateSettings({ currentWeek: w, doneDays: [] })}>{t('currentWeek')} {w}</button>}
      </div>
      {days[0] && <p className="muted">{days[0].blockLabel}</p>}
      {days.map((d) => (
        <section key={d.id} className={'card' + (done.has(d.id) ? ' day-done' : '')}>
          <div className="ex-head"><h2>{d.dayName}</h2>
            {done.has(d.id) ? <span className="done-tag"><IconCheck />{done.get(d.id) ? ` ${localDate(done.get(d.id)!)}` : ''}</span>
            : !open && <button className="small primary" onClick={() => { startWorkout(d); go('workout'); }}>{t('start')}</button>}
          </div>
          <ol className="plan-list">
            {[...d.exercises].sort((a, b) => a.order - b.order).map((pe) => {
              const eid = effectiveExerciseId(pe);
              return <li key={pe.id}>
                <strong>{exerciseById(eid)?.name ?? eid}</strong>
                <PlannedInfo pe={pe} />
              </li>;
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
