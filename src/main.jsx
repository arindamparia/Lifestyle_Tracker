import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initPWAInstall } from './pwa-install.js'
import { clearAllCache } from './cache.js'

// Automatically detect new app versions and force a hard reload
if ('serviceWorker' in navigator) {
  let isRefreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) return;
    isRefreshing = true;
    console.log('[PWA] New version installed! Clearing cache and reloading...');
    
    // Wipe all stale local data
    clearAllCache();
    try {
      localStorage.clear();
    } catch {}
    
    window.location.reload(true);
  });
}

initPWAInstall();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
