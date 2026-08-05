import React from 'react';
import '../../styles/TaskRow.css';

const TaskRow = ({ id, label, checked, onChange, onInfoClick, isInfoActive, isCritical }) => (
  <div className={`task-row ${checked ? 'task-done' : ''} ${isCritical ? 'critical-task' : ''}`}>
    <div className="task-header">
      <label className="task-label">
        <input type="checkbox" checked={!!checked} onChange={() => onChange(id)} />
        <span className="task-title-text">{label} {isCritical && !checked && <span className="critical-badge">CRITICAL</span>}</span>
      </label>
      <button
        className={`info-btn ${isInfoActive ? 'active-info' : ''}`}
        onClick={(e) => { e.preventDefault(); onInfoClick(); }}
        title="Show execution steps"
      >
        {isInfoActive ? '✕' : 'ℹ'}
      </button>
    </div>
  </div>
);

export default TaskRow;
