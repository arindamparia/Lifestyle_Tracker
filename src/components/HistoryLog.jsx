import React, { useState, useEffect } from 'react';
import {
  getHistoryAsArray,
  mergeHistoryRows,
  getLatestHistoryDate,
  hasHistoryCache,
} from '../cache';

export default function HistoryLog() {
  const [history, setHistory] = useState(() => getHistoryAsArray());
  const [loading, setLoading] = useState(!hasHistoryCache());

  useEffect(() => {
    // If we have cached past days, show them immediately and fetch only newer rows.
    // If cache is empty, fetch everything.
    const since = hasHistoryCache() ? getLatestHistoryDate() : null;
    const url = since
      ? `/.netlify/functions/daily-log?history=true&since=${since}`
      : '/.netlify/functions/daily-log?history=true';

    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(res => {
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
  }, []);

  const getCompletionData = (day) => {
    let completed = 0;
    let total = 0;
    // Exclude non-task booleans: book_finished
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

  // Books summary — all days where a book was logged
  const booksRead = history.filter(d => d.book_name);

  return (
    <div className="section-container">
      <h2>History & Consistency</h2>
      <p className="subtitle">Review your consistency and habit completion across previous days.</p>

      {loading ? (
        <p style={{ textAlign: 'center', opacity: 0.5 }}>Loading history...</p>
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
                      <div className="water-badge">💧 {parseFloat(day.water_liters)}L</div>
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
