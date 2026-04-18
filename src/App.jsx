import React, { useState, useEffect, useRef, useCallback } from 'react';
import DailyTracker from './components/DailyTracker';
import MasterSchedule from './components/MasterSchedule';
import WorkoutPlan from './components/WorkoutPlan';
import NutritionPrep from './components/NutritionPrep';
import './styles/Navigation.css';
import HistoryLog from './components/HistoryLog';
import AmbientSoundWidget from './components/AmbientSoundWidget';
import PasswordGate from './components/PasswordGate';
import { ClassicBackground, MeshBackground, SkyBackground } from './components/Backgrounds';
import { getToken } from './auth';
import { clearAllCache } from './cache';

const TABS = ['tracker', 'schedule', 'workout', 'nutrition', 'history'];
const SWIPE_EASE = 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

// ────────────────────────────────────────────────────────────────────────────
function App() {
  const [authed, setAuthed]           = useState(!!getToken());
  const [activeTab, setActiveTab]     = useState('tracker');
  const [navTab, setNavTab]           = useState('tracker'); // updates immediately on swipe; activeTab waits for animation
  const [syncKey, setSyncKey]         = useState(0);
  const [bgPref, setBgPref]           = useState(() => localStorage.getItem('lt_bg_pref') || 'mesh');

  const handleBgPrefChange = (mode) => {
    setBgPref(mode);
    localStorage.setItem('lt_bg_pref', mode);
  };

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

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  return (
    <>
      {bgPref === 'mesh' && <MeshBackground />}
      {bgPref === 'sky' && <SkyBackground />}
      {bgPref === 'classic' && <ClassicBackground />}
      
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
          {activeTab === 'history'   && <HistoryLog syncKey={syncKey} bgPref={bgPref} setBgPref={handleBgPrefChange} />}
        </main>
      </div>

      <AmbientSoundWidget />
    </>
  );
}

export default App;
