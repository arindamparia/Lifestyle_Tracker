import React, { useState, useEffect, useRef, useCallback } from 'react';
import DailyTracker from './components/DailyTracker';
import MasterSchedule from './components/MasterSchedule';
import WorkoutPlan from './components/WorkoutPlan';
import NutritionPrep from './components/NutritionPrep';
import './styles/Navigation.css';
import HistoryLog from './components/HistoryLog';
import AmbientSoundWidget from './components/AmbientSoundWidget';
import PasswordGate from './components/PasswordGate';
import SettingsModal from './components/SettingsModal';
import { 
  ClassicBackground, 
  MeshBackground, 
  SkyBackground,
  CosmosBackground,
  CyberpunkBackground,
  EmeraldBackground,
  SolarBackground,
  OledBackground
} from './components/Backgrounds';
import { getToken, setToken, clearToken, isTokenExpired, handleUnauthorized, getTimeUntilExpiry, getAuthHeader } from './auth';
import { clearAllCache, mergeHistoryRows, setTodayLog, getEffectiveDate, getTodayLog } from './cache';
import PeTreatmentPlan from './components/PeTreatmentPlan';
import Pusher from 'pusher-js';
import useLockBodyScroll from './hooks/useLockBodyScroll';

const TABS = ['tracker', 'workout', 'nutrition'];
const SWIPE_EASE = 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

// ────────────────────────────────────────────────────────────────────────────
function App() {
  const [authed, setAuthed]           = useState(!!getToken());
  const [activeTab, setActiveTab]     = useState('tracker');
  const [navTab, setNavTab]           = useState('tracker'); // updates immediately on swipe; activeTab waits for animation
  const [syncKey, setSyncKey]         = useState(0);
  const [bgPref, setBgPref]           = useState(() => localStorage.getItem('lt_bg_pref') || 'mesh');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [modalView, setModalView]     = useState(null); // 'schedule' | 'history' | 'peplan'
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  useLockBodyScroll(modalView !== null);

  const handleBgPrefChange = (mode) => {
    setBgPref(mode);
    localStorage.setItem('lt_bg_pref', mode);
  };

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setIsSettingsOpen(false);
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

  const isIgnoredSwipeTarget = (target) => {
    if (!target) return false;
    const el = target instanceof Element ? target : target.parentElement;
    if (!el) return false;
    // Only ignore touches originating strictly inside horizontal scrollbars or form controls/modals
    return !!el.closest(
      '.dt-section-filter-bar, .pe-sessions-table-wrap, .settings-overlay, .detailed-info-overlay, .modal-overlay, input, textarea, select, [data-no-swipe]'
    );
  };

  const handleTouchStart = useCallback((e) => {
    if (isAnimating.current) return;
    if (isIgnoredSwipeTarget(e.target)) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
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

  // ── Auto Lock Check ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => {
      if (isTokenExpired()) {
        console.log('[AutoLock] Token expired. Locking app.');
        setShowSessionWarning(false);
        handleUnauthorized();
      } else {
        const timeRemaining = getTimeUntilExpiry();
        if (timeRemaining <= 60000 && timeRemaining > 0) {
          setShowSessionWarning(true);
        } else {
          setShowSessionWarning(false);
        }
      }
    }, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [authed]);

  const extendSession = async () => {
    try {
      const res = await fetch('/api/passkey/extend', {
        method: 'POST',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setShowSessionWarning(false);
      } else {
        handleUnauthorized();
      }
    } catch (e) {
      console.error('Failed to extend session', e);
    }
  };

  // ── Pusher Real-Time Sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    
    let pusher = null;
    let channel = null;

    fetch('/api/pusher-config')
      .then(res => res.json())
      .then(config => {
        if (!config.pusherKey) return;
        
        pusher = new Pusher(config.pusherKey, {
          cluster: config.pusherCluster
        });

        pusher.connection.bind('connected', () => {
          console.log('[Pusher] Frontend successfully connected to Pusher!');
          window.pusherSocketId = pusher.connection.socket_id;
        });
        pusher.connection.bind('error', (err) => {
          console.error('[Pusher] Connection error:', err);
        });
        
        channel = pusher.subscribe('dailyalign-channel');
        
        channel.bind('daily_log_updated', (data) => {
          console.log('[Pusher] Received daily_log_updated:', data);
          if (data && data.row) {
            mergeHistoryRows([data.row]);
            
            const key = data.row.log_date ? String(data.row.log_date).slice(0, 10) : '';
            if (key && key === getEffectiveDate()) {
              setTodayLog({ ...data.row, log_date: key });
            }
            
            setSyncKey(k => k + 1);
          }
        });

        channel.bind('grocery_updated', (data) => {
          console.log('[Pusher] Received grocery_updated:', data);
          if (data && data.week_start && data.checked_items) {
            // Tell NutritionPrep to update via a custom event
            window.dispatchEvent(new CustomEvent('grocery_sync', { detail: data }));
          }
        });

        // Remote command to forcefully clear cache and reload all clients (e.g. after a deployment)
        channel.bind('app_update', () => {
          console.log('[Pusher] Received app_update command! Clearing cache and reloading...');
          clearAllCache();
          try {
            localStorage.clear();
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(regs => {
                for (let reg of regs) {
                  reg.unregister();
                }
              });
            }
          } catch {}
          
          setTimeout(() => {
            window.location.reload(true);
          }, 500); // Small delay to let unregister happen
        });
      })
      .catch(err => console.error('Pusher config fetch error:', err));

    return () => {
      if (channel) channel.unbind_all();
      if (pusher) pusher.disconnect();
    };
  }, [authed]);

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  return (
    <>
      {bgPref === 'mesh' && <MeshBackground />}
      {bgPref === 'cosmos' && <CosmosBackground />}
      {bgPref === 'cyberpunk' && <CyberpunkBackground />}
      {bgPref === 'emerald' && <EmeraldBackground />}
      {bgPref === 'solar' && <SolarBackground />}
      {bgPref === 'oled' && <OledBackground />}
      {bgPref === 'sky' && <SkyBackground />}
      {bgPref === 'classic' && <ClassicBackground />}
      <AmbientSoundWidget isAnyModalOpen={modalView !== null || isSettingsOpen || showSessionWarning} />
      
      {showSessionWarning && (
        <div className="modal-overlay" style={{ zIndex: 11000 }}>
          <div className="modal-content" style={{ padding: '24px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '16px', color: '#ff4d4f' }}>Session Expiring Soon</h3>
            <p style={{ marginBottom: '24px', color: '#e0e0e0' }}>
              Your session will automatically lock in less than a minute for security.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={extendSession}
                style={{ 
                  background: '#3b82f6', color: 'white', border: 'none', 
                  padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' 
                }}
              >
                Extend 30 Mins
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="app-container">
        <nav className="tab-navigation">
          <div className="tab-inner" ref={tabInnerRef}>
            <button className={`main-tab${navTab === 'tracker' ? ' active' : ''}`} onClick={() => { setActiveTab('tracker'); setNavTab('tracker'); }}>
              Daily Tracker
            </button>
            <button className={navTab === 'workout' ? 'active' : ''} onClick={() => { setActiveTab('workout'); setNavTab('workout'); }}>
              Workouts
            </button>
            <button className={navTab === 'nutrition' ? 'active' : ''} onClick={() => { setActiveTab('nutrition'); setNavTab('nutrition'); }}>
              Preparation
            </button>

            <button
              className="nav-action-trigger settings-nav-trigger"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Settings"
              title="Settings & Passkeys"
            >
              ⚙️
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
          {activeTab === 'workout'   && <WorkoutPlan />}
          {activeTab === 'nutrition' && <NutritionPrep />}
        </main>
      </div>

      <AmbientSoundWidget />

      {/* ── Modals (Full Page Overlays) ── */}
      {modalView === 'schedule' && (
        <div className="modal-overlay" onClick={() => setModalView(null)}>
          <div className="modal-content full-page-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setModalView(null)}>✕</button>
            <MasterSchedule />
          </div>
        </div>
      )}
      {modalView === 'history' && (
        <div className="modal-overlay" onClick={() => setModalView(null)}>
          <div className="modal-content full-page-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setModalView(null)}>✕</button>
            <HistoryLog syncKey={syncKey} bgPref={bgPref} setBgPref={handleBgPrefChange} onLogout={handleLogout} />
          </div>
        </div>
      )}
      {modalView === 'peplan' && (
        <div className="modal-overlay" onClick={() => setModalView(null)}>
          <div className="modal-content full-page-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setModalView(null)}>✕</button>
            <PeTreatmentPlan />
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        bgPref={bgPref}
        setBgPref={handleBgPrefChange}
        onForceSync={handleGlobalSync}
        onLogout={handleLogout}
        onNavigate={(tab) => {
          setModalView(tab);
        }}
      />
    </>
  );
}

export default App;
