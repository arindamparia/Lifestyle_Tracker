import React, { useState } from 'react';
import '../styles/WorkoutPlan.css';
import { WORKOUT_ROTATION } from '../data/dailyTrackingData';
import WorkoutModal from './WorkoutModal';

// ── Deload week helpers ───────────────────────────────────────────────────────
const LS_TRAINING_START = 'lt_training_start';

function getWeekInCycle(startDateStr) {
  if (!startDateStr) return null;
  const start = new Date(startDateStr);
  const daysSince = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  if (daysSince < 0) return null;
  return (Math.floor(daysSince / 7) % 5) + 1; // 1–5
}

const WORKOUTS = Object.entries(WORKOUT_ROTATION).map(([day, data]) => ({
  day,
  focus: data.focus,
  emoji: data.exercises?.length > 0 ? '💪' : '😴',
  exercises: data.exercises || [],
  restNote: data.restNote
}));

export default function WorkoutPlan() {
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // ── Open today's dropdown by default ──────────────────────────────────
  const [openDay, setOpenDay] = useState(todayName);
  const toggle = (day) => setOpenDay(prev => prev === day ? null : day);

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openGuide = (e, exercise) => {
    e.stopPropagation(); // prevent accordion toggle
    setSelectedExercise(exercise);
    setIsModalOpen(true);
  };

  // ── Deload week tracking ────────────────────────────────────────────────
  const [trainingStart, setTrainingStart] = useState(
    () => localStorage.getItem(LS_TRAINING_START) || ''
  );
  const [showStartPicker, setShowStartPicker] = useState(false);

  const weekInCycle  = getWeekInCycle(trainingStart);
  const isDeloadWeek = weekInCycle === 5;

  const handleSetStart = (e) => {
    const val = e.target.value;
    localStorage.setItem(LS_TRAINING_START, val);
    setTrainingStart(val);
    setShowStartPicker(false);
  };

  return (
    <div className="section-container">
      <h2>Workout Plan</h2>
      <p className="subtitle">
        Execute at 7:00 PM daily. Follow the interactive guides to ensure proper form.
      </p>

      {/* ── Deload Week Tracker ─────────────────────────────── */}
      <div className="deload-tracker">
        {weekInCycle ? (
          <>
            <div className="deload-cycle-pills">
              {[1,2,3,4,5].map(w => (
                <div
                  key={w}
                  className={`deload-pill${w === weekInCycle ? ' current' : ''}${w === 5 ? ' deload' : ''}`}
                  title={w === 5 ? 'Deload week' : `Week ${w}`}
                >
                  {w === 5 ? '🔄' : `W${w}`}
                </div>
              ))}
            </div>
            {isDeloadWeek ? (
              <div className="deload-banner">
                🔄 <strong>Deload Week</strong> — Replace all workouts with a 30-min brisk walk only.
              </div>
            ) : (
              <p className="deload-sub">Week {weekInCycle} of 5 · <button className="deload-reset-btn" onClick={() => setShowStartPicker(s => !s)}>change start date</button></p>
            )}
          </>
        ) : (
          <p className="deload-sub">
            Set your training start date to track deload weeks.{' '}
            <button className="deload-reset-btn" onClick={() => setShowStartPicker(s => !s)}>Set date</button>
          </p>
        )}
        {showStartPicker && (
          <input
            type="date"
            className="deload-date-input"
            defaultValue={trainingStart}
            max={new Date().toISOString().slice(0, 10)}
            onChange={handleSetStart}
            autoFocus
          />
        )}
      </div>

      {/* ── Weekly Plan Accordion ────────────────────── */}
      <div className="modern-workout-grid">
        {WORKOUTS.map((item) => {
          const isOpen = openDay === item.day;
          const isToday = item.day === todayName;
          
          return (
            <div 
              key={item.day} 
              className={`modern-workout-card ${item.exercises.length === 0 ? 'rest' : ''} ${isOpen ? 'open' : ''} ${isToday ? 'today' : ''}`}
            >
              <div
                className="modern-workout-header"
                onClick={() => toggle(item.day)}
                role="button"
                aria-expanded={isOpen}
              >
                <div className="modern-workout-header-left">
                  <div className="modern-workout-day-badge">
                    <span className="emoji">{item.emoji}</span>
                    {item.day}
                    {isToday && <span className="today-pulse">TODAY</span>}
                  </div>
                  <h4 className="modern-workout-focus">{item.focus}</h4>
                </div>
                <div className="modern-workout-header-right">
                  <span className={`modern-chevron ${isOpen ? 'open' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </div>
              </div>

              <div className="modern-workout-body">
                <div className="modern-workout-body-inner">
                  {item.exercises.length > 0 ? (
                    <ul className="modern-exercise-list">
                      {item.exercises.map((ex, i) => (
                        <li key={i} className="modern-exercise-item" onClick={(e) => openGuide(e, ex)}>
                          <div className="modern-exercise-info">
                            <span className="modern-exercise-index">{i + 1}</span>
                            <div className="modern-exercise-text">
                              <strong>{ex.name}</strong>
                              <span className="modern-exercise-sets">{ex.sets}</span>
                            </div>
                          </div>
                          <button className="modern-guide-btn">
                            <span>Guide</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polygon points="10 8 16 12 10 16 10 8"></polygon>
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="modern-rest-card">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rest-icon">
                        <path d="M2 12h4l3-9 5 18 3-9h5"/>
                      </svg>
                      <p>{item.restNote}</p>
                    </div>
                  )}
                  {item.restNote && item.exercises.length > 0 && (
                    <div className="modern-rest-note">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                      {item.restNote}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <WorkoutModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        exercise={selectedExercise} 
      />
    </div>
  );
}
