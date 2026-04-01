import React from 'react';
import '../../styles/SituationCard.css';
import { getHistoryAsArray } from '../../cache';

export default function SituationCard({ log, weightOpen, toggleWeight }) {
  const history = getHistoryAsArray();
  const weightLogs = history.filter(d => d.weight_kg != null);
  const latestWeight = weightLogs.length > 0 ? parseFloat(weightLogs[weightLogs.length - 1].weight_kg) : null;
  const currentWeight = log.weight_kg != null ? parseFloat(log.weight_kg) : latestWeight;

  if (!currentWeight) return null;

  let status = '';
  let icon = '';
  let color = '';
  let message = '';
  
  if (currentWeight < 55.5) {
    status = 'Underweight'; icon = '❄️'; color = '#0abde3'; message = 'Focus on caloric surplus and strength training.';
  } else if (currentWeight >= 55.5 && currentWeight <= 74.4) {
    status = 'Perfect'; icon = '🔥'; color = '#1dd1a1'; message = 'Optimal range maintaining lean mass and vitality.';
  } else if (currentWeight >= 74.5 && currentWeight <= 89.3) {
    status = 'Overweight'; icon = '⚠️'; color = '#ff9f43'; message = 'Cut refined carbs and ensure daily cardio intervals.';
  } else {
    status = 'Obesity'; icon = '🚨'; color = '#ff6b6b'; message = 'Strict adherence to caloric deficit and 50/10 rule required.';
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', borderLeft: `4px solid ${color}`, marginBottom: '16px' }}>
      <div onClick={toggleWeight} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', opacity: weightOpen ? 1 : 0.8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '1.4rem' }}>{icon}</div>
            <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                Status: <span style={{ color }}>{status}</span> · {currentWeight.toFixed(1)} kg
            </div>
          </div>
          <span className="reading-toggle">{weightOpen ? '▲' : '▼'}</span>
      </div>
      {weightOpen && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
              {message}
            </p>
          </div>
      )}
    </div>
  );
}
