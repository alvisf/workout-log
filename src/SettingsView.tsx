import { useState } from 'react';
import { t } from './i18n';
import { activeProgram, deleteAll, updateSettings, useStore } from './store';
import { toHevyCsv } from './export';
import { saveFile } from './csvutil';
import { localDate } from './stats';
import { Toggle } from './ui';
import { createTables, pushAll, syncConfig, syncNow, syncStatus, useSync } from './sync';

function SyncSection() {
  const c = useSync(syncConfig);
  const st = useSync(syncStatus);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const set = (p: Partial<typeof c>) => syncConfig.set((x) => ({ ...x, ...p }));
  const go = async (what: string, fn: () => Promise<void>, ok: string) => {
    setBusy(what); setMsg('');
    try { await fn(); setMsg(ok); } catch (e) { setMsg(`${t('syncError')}: ${(e as Error).message}`); } finally { setBusy(''); }
  };
  const status = st.state === 'off' ? t('syncOff') : st.state === 'syncing' ? t('syncing')
    : st.state === 'error' ? `${t('syncError')}: ${st.error}` : st.at ? `${t('syncedAt')} ${new Date(st.at).toLocaleTimeString()}.` : t('syncIdle');
  return (
    <section><h2>{t('gSync')}</h2>
      <p className="muted small">{t('syncNote')}</p>
      <label className="block">{t('syncToken')}<input type="password" autoComplete="off" value={c.token} placeholder="pat…" onChange={(e) => set({ token: e.target.value.trim() })} /></label>
      <label className="block">{t('syncBase')}<input value={c.baseId} placeholder="app…" onChange={(e) => set({ baseId: e.target.value.trim() })} /></label>
      <label className="block">{t('syncTable')}<input value={c.table} onChange={(e) => set({ table: e.target.value })} /></label>
      <Toggle label={t('syncEnable')} checked={c.enabled} onChange={(v) => set({ enabled: v })} />
      <div className="row wrap">
        <button className="small" disabled={!!busy || !c.token || !c.baseId} onClick={() => go('create', createTables, t('syncTableCreated'))}>{t('syncCreateTable')}</button>
        <button className="small" disabled={!!busy || !c.enabled} onClick={() => go('now', syncNow, t('syncDone'))}>{t('syncNow')}</button>
        <button className="small" disabled={!!busy || !c.enabled} onClick={() => go('all', pushAll, t('syncDone'))}>{t('syncPushAll')}</button>
      </div>
      <p className="muted small">{status}{st.pending ? ` · ${st.pending} ${t('syncPending')}` : ''}</p>
      {msg && <p className="small">{msg}</p>}
    </section>
  );
}

export default function SettingsView() {
  const s = useStore((x) => x.settings);
  const workouts = useStore((x) => x.workouts);
  const exercises = useStore((x) => x.exercises);
  useStore((x) => x.programs);
  const [msg, setMsg] = useState('');
  const prog = activeProgram();

  const exportDone = () => updateSettings({ lastBackupAt: Date.now() });
  const notif = typeof Notification !== 'undefined';

  return (
    <div className="view">
      <h1>{t('settings')}</h1>
      <section><h2>{t('workout')}</h2>
        {notif && Notification.permission !== 'granted' && <button className="small" onClick={() => void Notification.requestPermission().then(() => updateSettings({ notifAsked: true }))}>Allow notifications</button>}
      </section>
      <section><h2>{t('program')}</h2>
        <label className="row switch"><span>{t('currentWeek')}</span><input type="number" min={1} max={prog?.weeks ?? 1} value={s.currentWeek} onChange={(e) => updateSettings({ currentWeek: Math.min(prog?.weeks ?? 1, Math.max(1, Number(e.target.value))), doneDays: [] })} /></label>
      </section>
      <SyncSection />
      <section><h2>{t('export')}</h2>
        <div className="row wrap">
          <button className="small" onClick={async () => { await saveFile(`lift-log-hevy-${localDate(Date.now())}.csv`, 'text/csv', toHevyCsv(workouts, exercises)); exportDone(); }}>{t('export')} CSV</button>
        </div>
        {msg && <p className="small">{msg}</p>}
        <p className="muted small">Data is stored only in this browser. Export is the only backup. On iOS, install the app to keep data past 7 days of no use.</p>
        <button className="ghost danger" onClick={async () => { if (confirm(t('confirmDelete'))) { await deleteAll(); setMsg(t('done')); } }}>{t('deleteAll')}</button>
      </section>
    </div>
  );
}
