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

const TABS = ['tracker', 'schedule', 'workout', 'nutrition', 'history'];

// ────────────────────────────────────────────────────────────────────────────
function App() {
  const [authed, setAuthed]     = useState(!!getToken());
  const [activeTab, setActiveTab] = useState('tracker');
  const [syncKey, setSyncKey]   = useState(0);
  const [notifBanner, setNotifBanner] = useState(shouldShowNotifBanner);
  const [inAppToast, setInAppToast]   = useState(null); // { title, body }
  const toastTimer    = useRef(null);
  const touchStartX   = useRef(null);
  const touchStartY   = useRef(null);


  // ── In-app notification toast ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      setInAppToast(e.detail);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setInAppToast(null), 5000);
    };
    window.addEventListener('lt:notify', handler);
    return () => {
      window.removeEventListener('lt:notify', handler);
      clearTimeout(toastTimer.current);
    };
  }, []);

  // ── Swipe left/right to change tab ────────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Ignore if too short or more vertical than horizontal (scroll intent)
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    const idx = TABS.indexOf(activeTab);
    if (deltaX < 0 && idx < TABS.length - 1) setActiveTab(TABS[idx + 1]); // swipe left  → next
    if (deltaX > 0 && idx > 0)               setActiveTab(TABS[idx - 1]); // swipe right → prev
  };

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

        <main className="tab-content window-fade-in" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {activeTab === 'tracker'   && <DailyTracker onSync={handleGlobalSync} syncKey={syncKey} />}
          {activeTab === 'schedule'  && <MasterSchedule />}
          {activeTab === 'workout'   && <WorkoutPlan />}
          {activeTab === 'nutrition' && <NutritionPrep />}
          {activeTab === 'history'   && <HistoryLog syncKey={syncKey} />}
        </main>
      </div>

      <AmbientSoundWidget />

      {/* In-app notification toast (shown instead of OS popup when app is visible) */}
      {inAppToast && (
        <div className="inapp-toast" onClick={() => setInAppToast(null)}>
          <span className="inapp-toast-title">{inAppToast.title}</span>
          <span className="inapp-toast-body">{inAppToast.body}</span>
        </div>
      )}
    </>
  );
}

export default App;
