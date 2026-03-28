import React from 'react';

export default function WorkoutPlan() {
  const rotation = [
    { day: "Monday", focus: "Chest & Core", details: "3 sets to failure of Standard Push-ups. 3 sets to failure of Incline Push-ups. 3 sets of 60-second Plank holds." },
    { day: "Tuesday", focus: "Cardio", details: "30 minutes interval running (3 minutes jogging, 1 minute walking, repeat)." },
    { day: "Wednesday", focus: "Active Recovery", details: "15-minute walk. Full body stretching." },
    { day: "Thursday", focus: "Legs, Chest & Vitality", details: "3 sets to failure of Decline Push-ups. 3 sets to failure of Wide-grip Push-ups. 4 sets of 20 Hindu Squats. 3 sets of 15-20 Glute Bridges." },
    { day: "Friday", focus: "Cardio", details: "30-40 minutes of steady, comfortable jogging." },
    { day: "Saturday", focus: "Burnout", details: "2 sets each of Standard, Incline, and Decline Push-ups." },
    { day: "Sunday", focus: "Rest", details: "Complete physical rest." }
  ];

  return (
    <div className="section-container">
      <h2>Weekly Workout Rotation</h2>
      <p className="subtitle">Execute daily at 7:00 PM. Target 45-60 minutes max.</p>

      <div className="workout-grid">
        {rotation.map((item, idx) => (
          <div key={idx} className={`workout-card ${item.day === 'Sunday' ? 'rest-card' : ''}`}>
            <div className="workout-day">{item.day}</div>
            <h4 className="workout-focus">{item.focus}</h4>
            <p className="workout-details">{item.details}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
