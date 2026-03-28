import React, { useState, useEffect } from 'react';

// Module-level cache — survives tab switches without re-fetching.
// Invalidates after 5 minutes so fresh data shows after a long session.
const _historyCache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;

export default function HistoryLog() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Serve from cache if recent enough
    const now = Date.now();
    if (_historyCache.data && now - _historyCache.fetchedAt < CACHE_TTL_MS) {
      setHistory(_historyCache.data);
      setLoading(false);
      return;
    }

    // AbortController cancels the in-flight request when the component
    // unmounts (tab switch) or when React StrictMode remounts, preventing
    // the double-call dev artifact.
    const controller = new AbortController();

    fetch('/.netlify/functions/daily-log?history=true', { signal: controller.signal })
      .then(res => {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return null;
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          _historyCache.data = data;
          _historyCache.fetchedAt = Date.now();
          setHistory(data);
        }
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return; // request was cancelled — ignore
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const getCompletionData = (day) => {
    let completed = 0;
    let total = 0;
    for (const key in day) {
      if (typeof day[key] === 'boolean' && key !== 'id') {
        total++;
        if (day[key]) completed++;
      }
    }
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed/total)*100) : 0
    };
  }

  return (
    <div className="section-container">
      <h2>History & Consistency</h2>
      <p className="subtitle">Review your consistency and habit completion across previous days.</p>

      {loading ? (
        <p style={{textAlign: 'center', opacity: 0.5}}>Loading history...</p>
      ) : (
        <div className="history-grid">
          {history.length === 0 ? (
            <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>No previous logs found. Ensure your SQL table has data.</p>
          ) : (
            history.map((day, idx) => {
              const stats = getCompletionData(day);
              const dateStr = new Date(day.log_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });

              return (
                <div key={idx} className="card history-card">
                  <div className="history-header">
                    <h3>{dateStr}</h3>
                    <div className="water-badge">💧 {day.water_liters}L</div>
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
            })
          )}
        </div>
      )}
    </div>
  );
}
