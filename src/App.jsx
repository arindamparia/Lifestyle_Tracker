import React, { useState, useEffect, useRef } from 'react';
import DailyTracker from './components/DailyTracker';
import MasterSchedule from './components/MasterSchedule';
import WorkoutPlan from './components/WorkoutPlan';
import NutritionPrep from './components/NutritionPrep';
import HistoryLog from './components/HistoryLog';
import AmbientSoundWidget from './components/AmbientSoundWidget';
import PasswordGate from './components/PasswordGate';
import { getToken } from './auth';
import { clearAllCache } from './cache';
import { requestNotificationPermission } from './notifications';

// ── Notification banner ──────────────────────────────────────────────────────
const NOTIF_LS   = 'lt_notif_snoozed';
const NOTIF_DAYS = { default: 3, denied: 7 };

function shouldShowNotifBanner() {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'default') return false;
  const ts = localStorage.getItem(NOTIF_LS);
  if (!ts) return true;
  return (Date.now() - parseInt(ts, 10)) / 864e5 >= NOTIF_DAYS.default;
}

// ── PWA install banner ───────────────────────────────────────────────────────
const PWA_LS          = 'lt_pwa_dismissed';
const PWA_SNOOZE_DAYS = 3;

function isPwaSnoozed() {
  const ts = localStorage.getItem(PWA_LS);
  if (!ts) return false;
  return (Date.now() - parseInt(ts, 10)) / 864e5 < PWA_SNOOZE_DAYS;
}

// ────────────────────────────────────────────────────────────────────────────
function App() {
  const [authed, setAuthed]     = useState(!!getToken());
  const [activeTab, setActiveTab] = useState('tracker');
  const [syncKey, setSyncKey]   = useState(0);
  const [notifBanner, setNotifBanner] = useState(shouldShowNotifBanner);

  // PWA install banner state
  const deferredPrompt = useRef(null);
  const [pwaBanner, setPwaBanner] = useState(false);
  const [pwaAnim, setPwaAnim]     = useState('');  // '' | '--in' | '--out'

  // ── Global sync ────────────────────────────────────────────────────────────
  const handleGlobalSync = () => {
    clearAllCache();
    setSyncKey(k => k + 1);
  };

  // ── Notification handlers ──────────────────────────────────────────────────
  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    if (result !== 'granted') {
      localStorage.setItem(NOTIF_LS, Date.now().toString());
    }
    setNotifBanner(false);
  };

  const handleSnoozeNotif = () => {
    localStorage.setItem(NOTIF_LS, Date.now().toString());
    setNotifBanner(false);
  };

  // ── PWA install handlers ───────────────────────────────────────────────────
  const dismissPwaBanner = () => {
    setPwaAnim('--out');
    setTimeout(() => { setPwaBanner(false); setPwaAnim(''); }, 300);
    localStorage.setItem(PWA_LS, Date.now().toString());
  };

  const handlePwaInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    dismissPwaBanner();
    if (outcome === 'accepted') localStorage.setItem(PWA_LS, Date.now().toString());
  };

  // Capture beforeinstallprompt → suppress native dialog → show custom banner
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      if (!isPwaSnoozed()) {
        setTimeout(() => {
          setPwaBanner(true);
          requestAnimationFrame(() => setPwaAnim('--in'));
        }, 2500);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ── Time-aware theme ───────────────────────────────────────────────────────
  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours();
      let theme = 'theme-night';
      let bg    = '#07080a';

      if (hour >= 5  && hour < 9)  { theme = 'theme-morning'; bg = '#120e15'; }
      else if (hour >= 9  && hour < 16) { theme = 'theme-day';     bg = '#0a0f16'; }
      else if (hour >= 16 && hour < 19) { theme = 'theme-evening'; bg = '#140a16'; }

      document.body.className = theme;
      document.documentElement.style.backgroundColor = bg;
    };
    updateTheme();
    const t = setInterval(updateTheme, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  return (
    <>
      <div className="app-container">
        <nav className="tab-navigation">
          <div className="tab-inner">
            <button className={`main-tab${activeTab === 'tracker' ? ' active' : ''}`} onClick={() => setActiveTab('tracker')}>
              Daily Tracker
            </button>
            <button className={activeTab === 'schedule' ? 'active' : ''} onClick={() => setActiveTab('schedule')}>
              Master Schedule
            </button>
            <button className={activeTab === 'workout' ? 'active' : ''} onClick={() => setActiveTab('workout')}>
              Workouts
            </button>
            <button className={activeTab === 'nutrition' ? 'active' : ''} onClick={() => setActiveTab('nutrition')}>
              Preparation
            </button>
            <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
              History
            </button>
          </div>
        </nav>
        <div className="tab-spacer" />

        {/* Notification permission bar */}
        {notifBanner && (
          <div className="notif-permission-bar">
            <span className="notif-permission-bar__text">🔔 Enable notifications to get task reminders</span>
            <button className="notif-enable-btn" onClick={handleEnableNotifications}>Enable</button>
            <button className="notif-close-btn" onClick={handleSnoozeNotif}>Not now</button>
          </div>
        )}

        <main className="tab-content window-fade-in">
          {activeTab === 'tracker'   && <DailyTracker onSync={handleGlobalSync} syncKey={syncKey} />}
          {activeTab === 'schedule'  && <MasterSchedule />}
          {activeTab === 'workout'   && <WorkoutPlan />}
          {activeTab === 'nutrition' && <NutritionPrep />}
          {activeTab === 'history'   && <HistoryLog syncKey={syncKey} />}
        </main>
      </div>

      <AmbientSoundWidget />

      {/* PWA Install Banner — slides up from bottom, matches reference design */}
      {pwaBanner && (
        <div className={`pwa-banner pwa-banner${pwaAnim}`}>
          <div className="pwa-banner__icon">
            <svg viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="46" height="46" rx="10" fill="#0d0e14"/>
              <path d="M23 8C23 8 13 19.5 13 25.5C13 31 17.5 36 23 36C28.5 36 33 31 33 25.5C33 19.5 23 8 23 8Z" fill="#7C6AF7"/>
              <path d="M23 20C23 20 18 26.5 18 29.5C18 32.5 20.2 35 23 35C25.8 35 28 32.5 28 29.5C28 26.5 23 20 23 20Z" fill="#a398ff" opacity="0.5"/>
            </svg>
          </div>
          <div className="pwa-banner__text">
            <div className="pwa-banner__title">Install Lifestyle Tracker</div>
            <div className="pwa-banner__sub">Add to your home screen for quick access</div>
          </div>
          <div className="pwa-banner__actions">
            <button className="pwa-banner__install" onClick={handlePwaInstall}>Install</button>
            <button className="pwa-banner__dismiss" onClick={dismissPwaBanner}>Not now</button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
