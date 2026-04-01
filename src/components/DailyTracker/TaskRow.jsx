import React from 'react';
import '../../styles/TaskRow.css';

const TaskRow = ({ id, label, checked, onChange, onInfoClick, isInfoActive }) => (
  <div className="task-row">
    <div className="task-header">
      <label className="task-label">
        <input type="checkbox" checked={checked} onChange={() => onChange(id)} />
        <span className="task-title-text">{label}</span>
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
