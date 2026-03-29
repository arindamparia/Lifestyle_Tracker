import React, { useState, useEffect } from 'react';
import {
  getHistoryAsArray,
  mergeHistoryRows,
  hasHistoryCache,
} from '../cache';
import { getAuthHeader, handleUnauthorized, clearToken } from '../auth';

export default function HistoryLog({ syncKey = 0 }) {
  const [history, setHistory] = useState(() => getHistoryAsArray());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cache is warm — read directly, no network call needed
    if (hasHistoryCache()) {
      setHistory(getHistoryAsArray());
      setLoading(false);
      return;
    }

    // Cache is stale or empty (first load / new day / after sync) — fetch all from DB
    setLoading(true);
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
        if (Array.isArray(data)) {
          mergeHistoryRows(data);
          setHistory(getHistoryAsArray());
        }
        setLoading(false);
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

  const booksRead = history.filter(d => d.book_name);

  return (
    <div className="section-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>History & Consistency</h2>
          <p className="subtitle">Review your consistency and habit completion across previous days.</p>
        </div>
        <button
          onClick={() => { clearToken(); window.location.reload(); }}
          style={{ marginTop: '0.25rem', padding: '0.4rem 0.9rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
        >
          Log out
        </button>
      </div>

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

          {/* ── Weight Trend ───────────────────────────────── */}
          {(() => {
            const weightData = [...history].reverse().filter(d => d.weight_kg != null);
            if (weightData.length < 2) return null;
            const weights = weightData.map(d => parseFloat(d.weight_kg));
            const minW = Math.min(...weights);
            const maxW = Math.max(...weights);
            const range = maxW - minW || 1;
            return (
              <div className="weight-chart-section">
                <h3>⚖️ Weight Trend</h3>
                <div className="weight-chart">
                  {weightData.slice(-30).map((d, i) => {
                    const pct = ((parseFloat(d.weight_kg) - minW) / range) * 80 + 10;
                    const dateStr = new Date(d.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                    return (
                      <div key={i} className="wc-col" title={`${d.weight_kg} kg — ${dateStr}`}>
                        <span className="wc-val">{d.weight_kg}</span>
                        <div className="wc-bar-wrap">
                          <div className="wc-bar" style={{ height: `${pct}%` }} />
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
              </div>
            );
          })()}

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
