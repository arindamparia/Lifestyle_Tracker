import React, { useState, useEffect, useMemo, useTransition, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/HistoryLog.css';

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

// Helper to determine color based on BMI cutoff limits
const getWeightColor = (w) => {
  if (w < 55) return '#48dbfb';     // Underweight
  if (w <= 68.5) return '#1dd1a1';  // Healthy
  if (w <= 74.5) return '#feca57';  // Overweight
  if (w <= 89.5) return '#ff6b6b';  // Obesity I
  return '#ee5253';                 // Obesity II+
};

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const w = payload[0].value;
    const color = getWeightColor(w);
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-date">{label}</p>
        <p className="chart-tooltip-weight" style={{ color }}>{w} kg</p>
      </div>
    );
  }
  return null;
};

export default function HistoryLog({ syncKey = 0, bgPref, setBgPref }) {
  const [isPending, startTransition] = useTransition();
  const [history, setHistory]   = useState(() => getHistoryAsArray());
  const [loading, setLoading]   = useState(() => getHistoryAsArray().length === 0);

  // ── Ui States ─────────────────────────────────────────────────────────────
  const [isBooksOpen, setIsBooksOpen] = useState(true);
  const [isTasksOpen, setIsTasksOpen] = useState(true);
  const [visibleTasksCount, setVisibleTasksCount] = useState(6);

  // ── Weight card ───────────────────────────────────────────────────────────
  const [weightInput, setWeightInput] = useState('');
  const [weightSaved, setWeightSaved] = useState(false);
  const savedWeightRef = useRef(null);

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
    if (hasHistoryCache()) {
      setHistory(getHistoryAsArray());
      return;
    }

    if (history.length === 0) setLoading(true);

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
  }, [syncKey]);

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

  // ── Derived Data ──────────────────────────────────────────────────────────

  // Computed properties
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

  // Unique Books Calculation
  const uniqueBooks = useMemo(() => {
    const booksMap = new Map();
    [...history].reverse().forEach(d => {
      if (!d.book_name) return;
      const key = d.book_name.trim().toLowerCase();
      if (!booksMap.has(key)) {
        booksMap.set(key, {
          name: d.book_name,
          startDate: d.log_date,
          completionDate: d.book_finished ? d.log_date : null,
          lastLogDate: d.log_date,
          completionCount: d.book_finished ? 1 : 0,
          wasJustFinished: !!d.book_finished,
          currentlyReading: !d.book_finished
        });
      } else {
        const entry = booksMap.get(key);
        entry.lastLogDate = d.log_date;
        entry.currentlyReading = !d.book_finished;
        
        if (d.book_finished) {
          entry.completionDate = d.log_date;
          if (!entry.wasJustFinished) {
            entry.completionCount += 1;
          }
          entry.wasJustFinished = true;
        } else {
          entry.wasJustFinished = false;
        }
      }
    });
    return Array.from(booksMap.values()).sort((a, b) => new Date(b.lastLogDate) - new Date(a.lastLogDate));
  }, [history]);

  // Weight Trend Data
  const weightData = useMemo(() => {
    return [...history].reverse()
      .filter(d => d.weight_kg != null)
      .map(d => ({
        ...d,
        weight: parseFloat(d.weight_kg),
        dateStr: new Date(d.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
      }));
  }, [history]);

  // View state arrays
  const visibleTasks = history.slice(0, visibleTasksCount);

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
          {/* ── Weight Trend Graph ──────────────────────────── */}
          {(() => {
            if (weightData.length === 0) return null;
            let ticks = [];
            if (weightData.length > 0) {
              ticks.push(weightData[0].dateStr);
              if (weightData.length > 2) ticks.push(weightData[Math.floor(weightData.length / 2)].dateStr);
              if (weightData.length > 1) ticks.push(weightData[weightData.length - 1].dateStr);
              ticks = [...new Set(ticks)];
            }
            return (
              <div className="weight-chart-section">
                <h3>⚖️ Weight Trend</h3>
                <div className="modern-weight-chart-container" style={{ paddingBottom: '8px' }}>
                  <div style={{ width: '100%', height: '240px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis 
                          dataKey="dateStr" 
                          stroke="rgba(255,255,255,0.2)" 
                          tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 11}} 
                          tickMargin={10} 
                          ticks={ticks}
                          interval={0}
                        />
                        <YAxis 
                          domain={[50, 100]} 
                          stroke="rgba(255,255,255,0.2)" 
                          tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 11}} 
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                        <Line 
                          type="monotone" 
                          dataKey="weight"
                          stroke="#6C5CE7" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#161821', stroke: '#6C5CE7', strokeWidth: 2 }} 
                          activeDot={{ r: 6, fill: '#6C5CE7', stroke: '#f8f8fc', strokeWidth: 2 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── Asian-Indian BMI Classification ────────────────────────── */}
                <div className="bmi-warning-table" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '12px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Weight Classification
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem', color: 'var(--text-secondary)', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 500 }}>Category</th>
                          <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 500 }}>BMI Cutoff</th>
                          <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 500 }}>Weight Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '6px 4px', color: '#48dbfb' }}>Underweight</td>
                          <td style={{ padding: '6px 4px' }}>Below 18.5</td>
                          <td style={{ padding: '6px 4px' }}>Less than 55 kg</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '6px 4px', color: '#1dd1a1' }}>Healthy / Normal</td>
                          <td style={{ padding: '6px 4px' }}>18.5 – 22.9</td>
                          <td style={{ padding: '6px 4px' }}>55 kg – 68.5 kg</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '6px 4px', color: '#feca57' }}>Overweight</td>
                          <td style={{ padding: '6px 4px' }}>23.0 – 24.9</td>
                          <td style={{ padding: '6px 4px' }}>68.6 kg – 74.5 kg</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '6px 4px', color: '#ff6b6b' }}>Obesity (Class I)</td>
                          <td style={{ padding: '6px 4px' }}>25.0 – 29.9</td>
                          <td style={{ padding: '6px 4px' }}>74.6 kg – 89.5 kg</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 4px', color: '#ee5253' }}>Obesity (Class II+)</td>
                          <td style={{ padding: '6px 4px' }}>30.0+</td>
                          <td style={{ padding: '6px 4px' }}>89.6 kg or more</td>
                        </tr>
                      </tbody>
                    </table>
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
          {uniqueBooks.length > 0 && (
            <div className="books-summary">
              <div className="collapsible-header" onClick={() => setIsBooksOpen(!isBooksOpen)}>
                <h3>📚 Books Read</h3>
                <span className={`collapse-icon ${isBooksOpen ? 'open' : ''}`}>▼</span>
              </div>
              
              {isBooksOpen && (
                <ul className="books-list window-fade-in">
                  {uniqueBooks.map((book, i) => {
                    const startStr = new Date(book.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
                    const endStr = book.completionDate ? new Date(book.completionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'Present';
                    return (
                      <li key={i} className="books-list-item unique-book-item">
                        <div className="book-item-content">
                          <span className="book-item-name">{book.name}</span>
                          <span className="book-item-timeline">{startStr} — {endStr}</span>
                        </div>
                        {book.currentlyReading ? (
                          <span className="book-reading-badge">Reading</span>
                        ) : book.completionCount > 0 ? (
                          <span className="book-finished-badge" style={
                            book.completionCount >= 3 ? {
                              background: 'linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%)',
                              color: '#fff',
                              border: 'none',
                              padding: '5px 12px'
                            } : book.completionCount === 2 ? {
                              background: 'linear-gradient(135deg, #48dbfb 0%, #1dd1a1 100%)',
                              color: '#fff',
                              border: 'none',
                              padding: '5px 12px'
                            } : {}
                          }>
                            {book.completionCount >= 3 ? '🎯 Finished (3x+)' : 
                             book.completionCount === 2 ? '🌟 Finished (2x)' : 
                             '✓ Finished'}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* ── Task History Grid ──────────────────────────── */}
          <div className="card task-history-outer" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
            <div className="task-history-section">
              <div className="collapsible-header" style={{ paddingTop: '0' }} onClick={() => setIsTasksOpen(!isTasksOpen)}>
                <h3>📓 Task Logging History</h3>
                <span className={`collapse-icon ${isTasksOpen ? 'open' : ''}`}>▼</span>
              </div>
              
              {isTasksOpen && (
                <div className="window-fade-in" style={{ marginTop: '16px' }}>
                  {history.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No previous logs found. Ensure your SQL table has data.</p>
                  ) : (
                    <>
                      <div className="history-grid">
                        {visibleTasks.map((day, idx) => {
                          const stats = getCompletionData(day);
                          const dateStr = new Date(day.log_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });

                          return (
                            <div key={idx} className="card history-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <div className="history-header">
                                <h3>{dateStr}</h3>
                                <div className="water-badge">💧 {Math.round(parseFloat(day.water_liters || 0))}L</div>
                              </div>
                              
                              {/* Inner Details */}
                              <div className="history-details-row">
                                {day.weight_kg != null && (
                                  <span className="history-weight-tag">⚖️ {day.weight_kg} kg</span>
                                )}
                                {day.book_name && (
                                  <span className="history-book-tag" title={day.book_name}>
                                    📚 {day.book_name} {day.book_finished ? '✓' : ''}
                                  </span>
                                )}
                              </div>

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
                        })}
                      </div>
                      
                      {visibleTasksCount < history.length && (
                        <div className="load-more-container">
                          <button 
                            className="load-more-btn"
                            onClick={() => setVisibleTasksCount(c => c + 6)}
                          >
                            Show More ({history.length - visibleTasksCount} left)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
