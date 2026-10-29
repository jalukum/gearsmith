import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // A new build (including fresh patch notes) claims clients on install.
    // Reload once so the open tab picks up the new precache instead of staying on the old shell.
    let refreshing = false;
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        location.reload();
      });
    }
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
