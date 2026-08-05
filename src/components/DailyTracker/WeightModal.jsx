import React, { useState, useEffect, useRef } from 'react';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';


export default function WeightModal({ log, setLog, isOpen, onClose }) {
  useLockBodyScroll(isOpen);
  const [tempWeight, setTempWeight] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTempWeight(log.weight_kg ? String(log.weight_kg) : '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, log.weight_kg]);

  if (!isOpen) return null;

  const handleSave = () => {
    const parsed = parseFloat(tempWeight);
    const newWeight = isNaN(parsed) ? null : parsed;
    setLog({ ...log, weight_kg: newWeight });
    onClose();
  };

  return (
    <div
      className="reading-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="reading-modal-box" role="dialog" aria-modal="true">
        <div className="reading-modal-header">
          <div className="reading-modal-title-group">
            <h3><span>⚖️</span> Log Weight</h3>
            <div className="reading-modal-subtitle">Enter your weight for today (in kg)</div>
          </div>
          <button
            type="button"
            className="reading-modal-close"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="reading-modal-field">
          <label className="reading-modal-label">Weight (kg)</label>
          <div className="reading-input-wrap">
            <input
              ref={inputRef}
              type="number"
              step="0.1"
              className="reading-input"
              placeholder="e.g. 70.5"
              value={tempWeight}
              onChange={e => setTempWeight(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>
        </div>

        <div className="reading-modal-actions">
          <button
            type="button"
            className="reading-modal-cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="reading-modal-save-btn"
            onClick={handleSave}
          >
            Save Weight ✓
          </button>
        </div>
      </div>
    </div>
  );
}
