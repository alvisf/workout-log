import type { Tab } from './App';
import { t } from './i18n';
import { IconCheck, IconPlay } from './icons';
import { activeProgram, startWorkout, useStore } from './store';
import Bell from './Bell';
import { strength } from './strength';
import { doneDays } from './done';

export default function HomeView({ go }: { go: (t: Tab) => void }) {
  const settings = useStore((s) => s.settings);
  const workouts = useStore((s) => s.workouts);
  const open = useStore((s) => s.open);
  useStore((s) => s.programs);
  const prog = activeProgram();
  if (!prog) return <div className="view"><h1>Lift Log</h1></div>;

  const doneIds = doneDays(prog.id, workouts, settings.doneDays);

  const weeks = Array.from({ length: prog.weeks }, (_, i) => {
    const days = prog.days.filter((d) => d.week === i + 1).sort((a, b) => a.order - b.order);
    const done = days.filter((d) => doneIds.has(d.id)).length;
    return { n: i + 1, total: days.length, done, complete: days.length > 0 && done === days.length };
  });
  const week = settings.currentWeek;
  const next = prog.days.filter((d) => d.week === week).sort((a, b) => a.order - b.order).find((d) => !doneIds.has(d.id)) ?? null;
  const completeCount = weeks.filter((w) => w.complete).length;
  const power = strength(workouts.flatMap((w) => (w.endedAt ? [w.endedAt] : [])));

  return (
    <div className="view">
      <Bell value={power} />
      <div className="hero">
        <svg viewBox="0 0 120 120" className="ring" aria-hidden>
          <circle cx="60" cy="60" r="52" className="ring-bg" />
          <circle cx="60" cy="60" r="52" className="ring-fg" strokeDasharray={`${2 * Math.PI * 52}`} strokeDashoffset={`${2 * Math.PI * 52 * (1 - completeCount / prog.weeks)}`} />
        </svg>
        <div className="ring-text"><strong>{completeCount}</strong><span className="muted small">/ {prog.weeks}</span></div>
      </div>
      {open ? (
        <section className="card accent">
          <h2>{open.dayName ?? t('workout')}</h2>
          <button className="primary big pulse" onClick={() => go('workout')}><IconPlay /> {t('resume')}</button>
        </section>
      ) : next ? (
        <section className="card accent">
          <div className="next-row"><span className="bell" aria-hidden><svg viewBox="0 0 48 24"><rect x="0" y="8" width="5" height="8" rx="1" fill="currentColor"/><rect x="6" y="4" width="5" height="16" rx="1" fill="currentColor"/><rect x="11" y="10.5" width="26" height="3" fill="currentColor"/><rect x="37" y="4" width="5" height="16" rx="1" fill="currentColor"/><rect x="43" y="8" width="5" height="8" rx="1" fill="currentColor"/></svg></span><h2>{next.dayName}</h2></div>
          <button className="primary big pulse" onClick={() => { startWorkout(next); go('workout'); }}><IconPlay /> {t('start')}</button>
        </section>
      ) : <section className="card"><p className="all-done"><IconCheck /></p></section>}
      <button className="ghost" onClick={() => go('program')}>{t('program')}</button>
      <div className="weeks">
        {weeks.map((w) => (
          <div key={w.n} style={{ ['--i' as string]: w.n }} className={'wk' + (w.complete ? ' complete' : '') + (w.n === week ? ' current' : '')}>
            <strong>{w.complete ? <IconCheck /> : w.n}</strong>
            <span className="dots">{Array.from({ length: w.total }, (_, i) => <i key={i} className={i < w.done ? 'on' : ''} />)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
