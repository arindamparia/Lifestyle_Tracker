import React, { useState, useEffect, useRef, useCallback } from 'react';
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
const SWIPE_EASE = 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

// ────────────────────────────────────────────────────────────────────────────
function App() {
  const [authed, setAuthed]           = useState(!!getToken());
  const [activeTab, setActiveTab]     = useState('tracker');
  const [navTab, setNavTab]           = useState('tracker'); // updates immediately on swipe; activeTab waits for animation
  const [syncKey, setSyncKey]         = useState(0);
  const [notifBanner, setNotifBanner] = useState(shouldShowNotifBanner);
  const [inAppToast, setInAppToast]   = useState(null); // { title, body }

  const toastTimer   = useRef(null);
  const contentRef   = useRef(null);   // ref on <main> for direct DOM translate
  const tabInnerRef  = useRef(null);   // ref on .tab-inner for auto-scroll
  const touchStartX  = useRef(null);
  const touchStartY  = useRef(null);
  const isDragging   = useRef(false);
  const isAnimating  = useRef(false);
  const activeIdxRef = useRef(0);      // mirror of activeTab index, accessible in stable callbacks

  // Keep activeIdxRef in sync with activeTab state
  useEffect(() => {
    activeIdxRef.current = TABS.indexOf(activeTab);
  }, [activeTab]);

  // Scroll the active tab button into view whenever navTab changes
  useEffect(() => {
    if (!tabInnerRef.current) return;
    const activeBtn = tabInnerRef.current.querySelector('button.active');
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [navTab]);

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

  // ── Swipe gesture — stable callbacks use refs, not closed-over state ────────

  const handleTouchStart = useCallback((e) => {
    if (isAnimating.current) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current  = false;
  }, []);

  // handleTouchMove is registered via addEventListener (passive:false) so we can
  // call e.preventDefault() to block native scroll during a horizontal swipe.
  const handleTouchMove = useCallback((e) => {
    if (touchStartX.current === null || isAnimating.current) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    if (!isDragging.current) {
      // Need at least 8px movement before committing to a direction
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      if (Math.abs(deltaY) >= Math.abs(deltaX)) {
        // Primarily vertical — cancel swipe, let scroll proceed
        touchStartX.current = null;
        return;
      }
      isDragging.current = true;
    }

    const idx = activeIdxRef.current;
    if (deltaX > 0 && idx === 0)               return; // already at first tab
    if (deltaX < 0 && idx === TABS.length - 1) return; // already at last tab

    e.preventDefault(); // block page scroll while swiping
    if (contentRef.current) {
      contentRef.current.style.transition = 'none';
      contentRef.current.style.transform  = `translateX(${deltaX}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!isDragging.current || touchStartX.current === null) {
      touchStartX.current = null;
      isDragging.current  = false;
      return;
    }
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    isDragging.current  = false;

    const THRESHOLD = window.innerWidth * 0.22; // ~22% of screen width
    const idx       = activeIdxRef.current;
    const canGoNext = deltaX < -THRESHOLD && idx < TABS.length - 1;
    const canGoPrev = deltaX >  THRESHOLD && idx > 0;

    if (canGoNext || canGoPrev) {
      isAnimating.current = true;
      const newIdx = deltaX < 0 ? idx + 1 : idx - 1;
      const vw     = window.innerWidth;
      const exitX  = deltaX < 0 ? -vw : vw;   // current slides out this direction
      const enterX = deltaX < 0 ?  vw : -vw;  // new content enters from opposite side

      // Nav highlight updates immediately so it tracks the swipe
      setNavTab(TABS[newIdx]);

      if (contentRef.current) {
        contentRef.current.style.transition = SWIPE_EASE;
        contentRef.current.style.transform  = `translateX(${exitX}px)`;
      }

      setTimeout(() => {
        // Switch tab while content is off-screen, then slide new content in
        setActiveTab(TABS[newIdx]);
        if (contentRef.current) {
          contentRef.current.style.transition = 'none';
          contentRef.current.style.transform  = `translateX(${enterX}px)`;
          void contentRef.current.offsetWidth; // force reflow so transition fires
          contentRef.current.style.transition = SWIPE_EASE;
          contentRef.current.style.transform  = 'translateX(0)';
        }
        isAnimating.current = false;
      }, 290);
    } else {
      // Didn't cross threshold — spring back
      if (contentRef.current) {
        contentRef.current.style.transition = SWIPE_EASE;
        contentRef.current.style.transform  = 'translateX(0)';
      }
    }
  }, []);

  const handleTouchCancel = useCallback(() => {
    touchStartX.current = null;
    isDragging.current  = false;
    if (!isAnimating.current && contentRef.current) {
      contentRef.current.style.transition = SWIPE_EASE;
      contentRef.current.style.transform  = 'translateX(0)';
    }
  }, []);

  // Register touchmove as non-passive so e.preventDefault() works.
  // Also re-run when authed changes — contentRef is null before login.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMove);
  }, [handleTouchMove, authed]);

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
          <div className="tab-inner" ref={tabInnerRef}>
            <button className={`main-tab${navTab === 'tracker' ? ' active' : ''}`} onClick={() => { setActiveTab('tracker'); setNavTab('tracker'); }}>
              Daily Tracker
            </button>
            <button className={navTab === 'schedule' ? 'active' : ''} onClick={() => { setActiveTab('schedule'); setNavTab('schedule'); }}>
              Master Schedule
            </button>
            <button className={navTab === 'workout' ? 'active' : ''} onClick={() => { setActiveTab('workout'); setNavTab('workout'); }}>
              Workouts
            </button>
            <button className={navTab === 'nutrition' ? 'active' : ''} onClick={() => { setActiveTab('nutrition'); setNavTab('nutrition'); }}>
              Preparation
            </button>
            <button className={navTab === 'history' ? 'active' : ''} onClick={() => { setActiveTab('history'); setNavTab('history'); }}>
              Profile
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

        <main
          ref={contentRef}
          className="tab-content"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
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
