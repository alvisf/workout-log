import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Framework7 from 'framework7/lite';
import Toggle from 'framework7/components/toggle';
import Sheet from 'framework7/components/sheet';
import Framework7React from 'framework7-react';
import 'framework7/css';
import 'framework7/components/toggle/css';
import 'framework7/components/sheet/css';
import App from './App';
import './styles.css';
import { init } from './store';
import { installSync } from './sync';

Framework7.use([Toggle, Sheet, Framework7React]);
void init().then(installSync);
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
