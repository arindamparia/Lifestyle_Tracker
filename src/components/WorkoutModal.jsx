import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import '../styles/WorkoutModal.css';

function WorkoutModal({ isOpen, onClose, exercise }) {
  useLockBodyScroll(isOpen);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShowContent(true), 10);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  if (!isOpen && !showContent) return null;
  if (!exercise) return null;

  return createPortal(
    <div className={`workout-modal-overlay ${showContent ? 'open' : ''}`} onClick={onClose}>
      <div className={`workout-modal-content ${showContent ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="workout-modal-header">
          <h2>{exercise.name}</h2>
          <button className="workout-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="workout-modal-body">
          {exercise.imageKey && (
            <div className="workout-image-container">
              <img src={`/workouts/${exercise.imageKey}`} alt={exercise.name} className="workout-image" />
            </div>
          )}
          
          <div className="workout-section">
            <h3 className="workout-section-title">Sets & Reps</h3>
            <p className="workout-section-text">{exercise.sets}</p>
          </div>
          
          {exercise.setup && (
            <div className="workout-section">
              <h3 className="workout-section-title">Setup</h3>
              <p className="workout-section-text">{exercise.setup}</p>
            </div>
          )}
          
          {exercise.execution && (
            <div className="workout-section">
              <h3 className="workout-section-title">Execution</h3>
              <p className="workout-section-text">{exercise.execution}</p>
            </div>
          )}
          
          {exercise.pitfall && (
            <div className="workout-section warning">
              <h3 className="workout-section-title">Common Pitfall</h3>
              <p className="workout-section-text">{exercise.pitfall}</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default WorkoutModal;
