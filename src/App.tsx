import { useEffect, useState } from 'react';
import { App as F7App, f7, f7ready, Link, Navbar, Page, Toolbar, View } from 'framework7-react';
import { t } from './i18n';
import { takeOver, updateSettings, useStore } from './store';
import HomeView from './HomeView';
import WorkoutView from './WorkoutView';
import ProgramView from './ProgramView';
import SettingsView from './SettingsView';
import { prime } from './sound';

const P: Record<string, string> = {
  home: 'M3 11 12 3l9 8v10h-6v-6H9v6H3z',
  workout: 'M2 10h2v4H2zm18 0h2v4h-2zM5 8h2v8H5zm12 0h2v8h-2zM8 11h8v2H8z',
  program: 'M4 4h16v16H4zM4 9h16M8 2v4m8-4v4',
  exercises: 'M4 6h16M4 12h16M4 18h16',
  history: 'M12 3a9 9 0 1 0 9 9M12 7v5l4 2M3 3v5h5',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4-2 1 .5 2.5-2 1.5-2.3-1-1.7 2H11.5l-1.7-2-2.3 1-2-1.5L6 13 4 12l2-1-.5-2.5 2-1.5 2.3 1L11.5 6h1l1.7 2 2.3-1 2 1.5L18 11z',
};
const Icon = ({ k }: { k: string }) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden><path d={P[k]} /></svg>;

const ACCENT = '#2f80ed';

export type Tab = 'home' | 'workout' | 'program' | 'settings';

export default function App() {
  const ready = useStore((s) => s.ready);
  const settings = useStore((s) => s.settings);
  const open = useStore((s) => s.open);
  const owner = useStore((s) => s.owner);
  const [tab, setTabState] = useState<Tab>(() => (['home', 'workout', 'program', 'settings'].includes(sessionStorage.getItem('ll-tab') ?? '') ? sessionStorage.getItem('ll-tab') as Tab : 'home'));
  const setTab = (t: Tab) => { sessionStorage.setItem('ll-tab', t); setTabState(t); };

  // Theme always follows the system, with the default accent.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = 'system';
    f7ready(() => { f7.setDarkMode('auto'); f7.setColorTheme(ACCENT); });
    root.style.setProperty('--accent', ACCENT);
  }, []);
  useEffect(() => { const h = () => prime(); window.addEventListener('pointerdown', h, { once: true }); return () => window.removeEventListener('pointerdown', h); }, []);

  if (!ready) return <div className="center">…</div>;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) || matchMedia('(display-mode: standalone)').matches;
  const showInstall = isIOS && !standalone && !settings.installDismissed;
  const showBackup = Date.now() - settings.lastBackupAt > 30 * 86400_000 && Date.now() - settings.dismissedBackup > 7 * 86400_000;

  return (
    <F7App theme="ios" darkMode="auto" colors={{ primary: ACCENT }} className="app">
      <View main className="safe-areas">
        <Page>
          <Navbar title={settings.activePersonId === 'me' ? 'Lift Log' : `Lift Log · ${settings.people.find((p) => p.id === settings.activePersonId)?.name ?? ''}`} />
          <Toolbar tabbar icons bottom>
            {(['home', 'workout', 'settings'] as Tab[]).map((k) => (
              <Link key={k} tabLink tabLinkActive={tab === k || (k === 'home' && tab === 'program')} aria-current={tab === k} onClick={() => setTab(k)}>
                <i className="icon"><Icon k={k} />{k === 'workout' && open ? <span className="dot" aria-label="open" /> : null}</i>
                <span className="tabbar-label">{t(k)}</span>
              </Link>
            ))}
          </Toolbar>
          {showInstall && <div className="banner">{t('install')} <button onClick={() => updateSettings({ installDismissed: true })}>{t('close')}</button></div>}
          {showBackup && <div className="banner">{t('backup')} <button onClick={() => setTab('settings')}>{t('export')}</button> <button onClick={() => updateSettings({ dismissedBackup: Date.now() })}>{t('close')}</button></div>}
          {!owner && open && <div className="banner warn">{t('readOnly')} <button onClick={takeOver}>{t('takeOver')}</button></div>}
          <main>
            {tab === 'home' && <HomeView go={setTab} />}
            {tab === 'workout' && <WorkoutView go={setTab} />}
            {tab === 'program' && <ProgramView go={setTab} />}
            {tab === 'settings' && <SettingsView />}
          </main>
        </Page>
      </View>
    </F7App>
  );
}
