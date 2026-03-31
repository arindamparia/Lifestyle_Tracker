import React, { useState, useEffect, useMemo, useTransition, useRef } from 'react';

const HABIT_LABELS = {
  morning_meditation_completed: { label: 'Morning Meditation',  emoji: '🧘' },
  shilajit_taken:               { label: 'Shilajit',            emoji: '🧪' },
  isabgul_taken:                { label: 'Isabgul Husk',        emoji: '🌾' },
  breakfast_logged:             { label: 'Breakfast',           emoji: '🍳' },
  rule_50_10_followed:          { label: '50/10 Desk Rule',     emoji: '🪑' },
  kegels_completed:             { label: 'Kegels',              emoji: '💪' },
  acv_taken:                    { label: 'ACV Pre-Lunch',       emoji: '🥤' },
  lunch_logged:                 { label: 'Lunch',               emoji: '🍱' },
  multivitamin_taken:           { label: 'Multivitamin',        emoji: '💊' },
  omega3_taken:                 { label: 'Omega-3',             emoji: '🐟' },
  afternoon_snack_logged:       { label: 'Afternoon Snack',     emoji: '☕' },
  scheduled_workout_completed:  { label: 'Workout',             emoji: '🏋️' },
  whey_protein_taken:           { label: 'Whey + Creatine',     emoji: '🥛' },
  dinner_logged:                { label: 'Dinner',              emoji: '🍽️' },
  ashwagandha_taken:            { label: 'Ashwagandha',         emoji: '🌿' },
  post_dinner_walk_completed:   { label: 'Evening Walk',        emoji: '🚶' },
  hydration_cutoff_followed:    { label: 'Hydration Cutoff',    emoji: '💧' },
  screen_curfew_followed:       { label: 'Screen Curfew',       emoji: '📴' },
};
import {
  getHistoryAsArray,
  mergeHistoryRows,
  hasHistoryCache,
  getTodayLog,
  setTodayLog,
  getEffectiveDate,
} from '../cache';
import { getAuthHeader, handleUnauthorized, clearToken } from '../auth';

export default function HistoryLog({ syncKey = 0, bgPref, setBgPref }) {
  const [isPending, startTransition] = useTransition();
  const [history, setHistory]   = useState(() => getHistoryAsArray());
  // Show skeleton only when there is truly nothing to display yet
  const [loading, setLoading]   = useState(() => getHistoryAsArray().length === 0);

  // ── Weight card ───────────────────────────────────────────────────────────
  const [weightInput, setWeightInput] = useState('');
  const [weightSaved, setWeightSaved] = useState(false);
  const savedWeightRef = useRef(null);

  // Initialise weight input from today's cached log
  useEffect(() => {
    const today = getTodayLog();
    if (today?.weight_kg != null && today.weight_kg !== savedWeightRef.current) {
      savedWeightRef.current = today.weight_kg;
      setWeightInput(String(today.weight_kg));
    }
  }, []);

  const handleWeightSave = async () => {
    if (weightSaved) return;
    const parsed = parseFloat(weightInput);
    if (isNaN(parsed) || parsed <= 0) return;
    if (parsed === savedWeightRef.current) return;
    savedWeightRef.current = parsed;
    const today = getTodayLog() || {};
    const updatedLog = { ...today, weight_kg: parsed };
    setTodayLog(updatedLog);
    setHistory(getHistoryAsArray());
    setWeightSaved(true);
    setTimeout(() => setWeightSaved(false), 2500);
    try {
      await fetch('/.netlify/functions/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...updatedLog, log_date: getEffectiveDate() }),
      });
    } catch {}
  };

  useEffect(() => {
    // Fresh cache — show immediately, no network needed
    if (hasHistoryCache()) {
      setHistory(getHistoryAsArray());
      return;
    }

    // Stale / cleared cache — must fetch from DB.
    // If React state still has data (e.g. after a Sync), keep showing it and
    // update silently via startTransition (no skeleton flash).
    // If state is empty (first ever load), show the skeleton.
    if (history.length === 0) setLoading(true); // eslint-disable-line react-hooks/exhaustive-deps

    const controller = new AbortController();

    fetch('/.netlify/functions/daily-log?history=true', { signal: controller.signal, headers: getAuthHeader() })
      .then(res => {
        if (res.status === 401) { handleUnauthorized(); return null; }
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return null;
        return res.json();
      })
      .then(data => {
        startTransition(() => {
          if (Array.isArray(data)) {
            mergeHistoryRows(data);
            setHistory(getHistoryAsArray());
          }
          setLoading(false);
        });
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [syncKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCompletionData = (day) => {
    let completed = 0;
    let total = 0;
    const excluded = new Set(['book_finished']);
    for (const key in day) {
      if (typeof day[key] === 'boolean' && !excluded.has(key)) {
        total++;
        if (day[key]) completed++;
      }
    }
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };

  const booksRead = history.filter(d => d.book_name);

  // Per-habit consistency across all history days, sorted worst→best
  const habitStats = useMemo(() => {
    if (history.length === 0) return [];
    return Object.entries(HABIT_LABELS).map(([field, { label, emoji }]) => {
      const days = history.filter(d => typeof d[field] === 'boolean');
      if (days.length === 0) return null;
      const done = days.filter(d => d[field]).length;
      const pct  = Math.round((done / days.length) * 100);
      return { field, label, emoji, done, total: days.length, pct };
    }).filter(Boolean).sort((a, b) => a.pct - b.pct);
  }, [history]);

  return (
    <div className="section-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>History & Consistency {isPending && <span className="history-refreshing">↻</span>}</h2>
          <p className="subtitle">Review your consistency and habit completion across previous days.</p>
        </div>
        <button
          className="logout-btn"
          onClick={() => { clearToken(); window.location.reload(); }}
          title="Log out"
          aria-label="Log out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

      {/* ── Theme Options ─────────────────────────────────── */}
      <div className="card theme-card" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>✨ Atmosphere</h3>
        <select 
          value={bgPref || 'mesh'}
          onChange={(e) => setBgPref && setBgPref(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.05)', color: '#f8f8fc', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', outline: 'none', fontWeight: 500 }}
        >
          <option value="mesh" style={{ color: '#1c1c24' }}>Living Mesh</option>
          <option value="sky" style={{ color: '#1c1c24' }}>Ethereal Sky</option>
          <option value="classic" style={{ color: '#1c1c24' }}>Classic Fast</option>
        </select>
      </div>

      {/* ── Weight Card ─────────────────────────────────── */}
      <div className="card weight-card-inline">
        <span className="weight-card-icon">⚖️</span>
        <span className="weight-card-label">Log Weight</span>
        <input
          type="number"
          className="weight-input"
          placeholder="-- kg"
          step="0.1"
          min="30"
          max="300"
          value={weightInput}
          onChange={e => {
            const v = e.target.value;
            if (v === '' || /^\d{0,3}(\.\d{0,1})?$/.test(v)) setWeightInput(v);
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleWeightSave(); } }}
        />
        <span className="weight-unit">kg</span>
        <button
          className="weight-submit-btn"
          onClick={handleWeightSave}
          disabled={weightSaved}
          title="Save weight"
        >
          ✓
        </button>
      </div>
      {weightSaved && <div className="book-toast">⚖️ Weight saved!</div>}

      {loading ? (
        <div className="history-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card history-card skeleton-card">
              <div className="history-header">
                <div className="skel-line" style={{ width: '55%', height: '16px' }} />
                <div className="skel-line" style={{ width: '32px', height: '22px' }} />
              </div>
              <div className="skel-line" style={{ width: '100%', height: '8px', marginTop: '14px' }} />
              <div className="skel-line" style={{ width: '40%', height: '12px', marginTop: '8px' }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── Weight Trend ───────────────────────────────── */}
          {(() => {
            const weightData = [...history].reverse().filter(d => d.weight_kg != null);
            if (weightData.length === 0) return null;
            const weights = weightData.map(d => parseFloat(d.weight_kg));
            const minW = Math.min(...weights);
            const maxW = Math.max(...weights);
            
            // Fixed Axis per user request
            const GRAPH_MIN = 50;
            const GRAPH_MAX = 100;
            const range = GRAPH_MAX - GRAPH_MIN;
            
            // Helper for BMI category colors
            const getBarColor = (w) => {
              if (w < 55.5) return 'linear-gradient(180deg, #48dbfb 0%, #0abde3 100%)'; // Underweight (Blue)
              if (w >= 55.5 && w <= 74.4) return 'linear-gradient(180deg, #1dd1a1 0%, #10ac84 100%)'; // Perfect (Green)
              if (w >= 74.5 && w <= 89.3) return 'linear-gradient(180deg, #feca57 0%, #ff9f43 100%)'; // Overweight (Orange)
              return 'linear-gradient(180deg, #ff6b6b 0%, #ee5253 100%)'; // Obese (Red)
            };
            
            return (
              <div className="weight-chart-section">
                <h3>⚖️ Weight Trend</h3>
                <div className="weight-chart">
                  {weightData.slice(-30).map((d, i) => {
                    const w = parseFloat(d.weight_kg);
                    let pct = ((w - GRAPH_MIN) / range) * 100; 
                    if (pct < 0) pct = 0; // If lower than 50kg, show as 50kg height (floor)
                    if (pct > 100) pct = 100; // Cap at 100kg ceiling
                    const dateStr = new Date(d.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                    return (
                      <div key={i} className="wc-col" title={`${d.weight_kg} kg — ${dateStr}`}>
                        <div className="wc-bar-wrap" style={{ position: 'relative', width: '100%' }}>
                          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${pct}%`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <span className="wc-val" style={{ marginBottom: '4px' }}>{d.weight_kg}</span>
                            <div className="wc-bar" style={{ flex: 1, width: '100%', minHeight: '4px', background: getBarColor(w) }} />
                          </div>
                        </div>
                        <span className="wc-date">{dateStr}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="weight-chart-stats">
                   <span>Low <b>{minW} kg</b></span>
                   <span>Latest <b>{weights[weights.length - 1]} kg</b></span>
                   <span>High <b>{maxW} kg</b></span>
                </div>
                
                {/* Recent Logged Weights List */}
                <div className="recent-weights-list">
                  <h4 style={{ margin: '12px 0 8px', fontSize: '0.85rem', color: 'rgba(161, 167, 179, 0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Logs</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {weightData.slice(-5).reverse().map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem' }}>
                        <span style={{ color: 'rgba(248, 248, 252, 0.9)' }}>{new Date(d.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
                        <strong style={{ color: 'var(--primary)' }}>{d.weight_kg} kg</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Per-Habit Consistency ─────────────────────── */}
          {habitStats.length > 0 && (
            <div className="habit-consistency">
              <h3>📊 Per-Habit Consistency</h3>
              <p className="habit-consistency-sub">Across {history.length} logged day{history.length !== 1 ? 's' : ''} · sorted worst → best</p>
              <div className="habit-rows">
                {habitStats.map(({ field, label, emoji, done, total, pct }) => (
                  <div key={field} className="habit-row">
                    <span className="habit-row-label">{emoji} {label}</span>
                    <div className="habit-row-bar-wrap">
                      <div
                        className="habit-row-bar"
                        style={{
                          width: `${pct}%`,
                          background: pct >= 80 ? 'var(--accent-green)'
                                    : pct >= 50 ? 'var(--primary)'
                                    : '#e17055',
                        }}
                      />
                    </div>
                    <span className="habit-row-pct">{pct}%</span>
                    <span className="habit-row-fraction">{done}/{total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Books Summary ──────────────────────────────── */}
          {booksRead.length > 0 && (
            <div className="books-summary">
              <h3>📚 Books Read</h3>
              <ul className="books-list">
                {booksRead.map((d, i) => {
                  const dateStr = new Date(d.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                  return (
                    <li key={i} className="books-list-item">
                      <span className="book-item-name">{d.book_name}</span>
                      <span className="book-item-meta">
                        {dateStr}
                        {d.book_finished && <span className="book-finished-badge">✓ Finished</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="history-grid">
            {history.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No previous logs found. Ensure your SQL table has data.</p>
            ) : (
              history.map((day, idx) => {
                const stats = getCompletionData(day);
                const dateStr = new Date(day.log_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });

                return (
                  <div key={idx} className="card history-card">
                    <div className="history-header">
                      <h3>{dateStr}</h3>
                      <div className="water-badge">💧 {Math.round(parseFloat(day.water_liters || 0))}L</div>
                    </div>

                    {day.book_name && (
                      <div className="history-book">
                        <span>📚 {day.book_name}</span>
                        {day.book_finished && <span className="book-finished-badge">✓ Finished</span>}
                      </div>
                    )}

                    <div className="progress-container">
                      <div className="progress-bg">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${stats.percentage}%`,
                            background: stats.percentage === 100 ? 'var(--accent-green)' : 'var(--primary)'
                          }}
                        />
                      </div>
                    </div>
                    <p className="history-stats">
                      {stats.percentage}% Complete <span className="fraction">({stats.completed}/{stats.total} checkpoints)</span>
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
