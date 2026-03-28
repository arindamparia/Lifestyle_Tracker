import React, { useState, useEffect } from 'react';

export default function HistoryLog() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/.netlify/functions/daily-log?history=true')
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) setHistory(data);
         setLoading(false);
      })
      .catch((err) => {
         console.error(err);
         setLoading(false);
      });
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
      <p className="subtitle">Review your dedication over the past logs. Data is fetched directly from your Neon database.</p>

      {loading ? (
        <p style={{textAlign: 'center', opacity: 0.5}}>Loading history...</p>
      ) : (
        <div className="history-grid">
          {history.length === 0 ? (
            <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>No previous logs found. Ensure your SQL table has data.</p>
          ) : (
            history.map((day, idx) => {
              const stats = getCompletionData(day);
              // Format date cleanly
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
