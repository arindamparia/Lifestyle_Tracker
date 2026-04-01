import React from 'react';
import '../../styles/WaterCard.css';

export default function WaterCard({ log, waterOpen, toggleWater, addWater, removeWater }) {
  return (
    <div className={`card water-card${log.water_liters >= 4 ? ' water-card-full' : ''}`}>
      <div onClick={toggleWater} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: waterOpen ? '16px' : '0' }}>
         <h3 style={{ margin: 0 }}>💧 Hydration Track</h3>
         <span className="reading-toggle">{waterOpen ? '▲' : '▼'}</span>
      </div>
      {waterOpen && (
        <div className="water-visual-row">
          {/* Animated water bottle */}
          <div className={`wbt-outer${log.water_liters >= 4 ? ' wbt-full' : ''}`}>
            <div className="wbt-neck">
              <div className="wbt-cap" />
            </div>
            <div className="wbt-body">
              <div
                className="wbt-fill-wrap"
                style={{ height: `${(log.water_liters / 4) * 100}%` }}
              >
                <div className="wbt-wave-a" />
                <div className="wbt-wave-b" />
                <div className="wbt-water" />
                {log.water_liters > 0 && (
                  <>
                    <div className="wbt-bub wbt-bub1" />
                    <div className="wbt-bub wbt-bub2" />
                    <div className="wbt-bub wbt-bub3" />
                  </>
                )}
              </div>
              <div className="wbt-marks">
                <span className="wbt-mark" style={{ bottom: '75%' }}>3L</span>
                <span className="wbt-mark" style={{ bottom: '50%' }}>2L</span>
                <span className="wbt-mark" style={{ bottom: '25%' }}>1L</span>
              </div>
              <div className="wbt-shine" />
            </div>
          </div>

          {/* Right panel: stats + buttons */}
          <div className="water-right-panel">
            <div className="water-stat-block">
              <div className="water-liters-num">
                {Math.round(parseFloat(log.water_liters || 0))}
                <span className="water-of-goal"> / 4L</span>
                {log.water_liters >= 4 && (
                  <span className="water-goal-badge">✓ Goal Complete</span>
                )}
              </div>
              <div className="water-stat-label">Hydration Today</div>
            </div>
            <p className="water-tip">Drink from a 1L bottle. Finish before 11:30 PM cut-off.</p>
            <div className="water-btns">
              <button
                className="water-btn-remove"
                onClick={removeWater}
                disabled={log.water_liters <= 0}
                aria-label="Remove 1 litre"
              >
                −1L
              </button>
              <button
                className="water-btn-add"
                onClick={addWater}
                disabled={log.water_liters >= 4}
                aria-label="Add 1 litre"
              >
                +1L
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
