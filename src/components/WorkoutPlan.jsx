import React, { useState } from 'react';

const WORKOUTS = [
  {
    day: 'Monday',
    focus: 'Chest & Core',
    emoji: '💪',
    steps: [
      'Standard Push-ups — 3 sets to failure: Place hands shoulder-width apart, body in a straight line from head to heels. Lower your chest 2–3 cm from the floor, then push up explosively. Stop only at true failure — no partial reps.',
      'Incline Push-ups — 3 sets to failure: Place hands on the edge of your bed or a sturdy chair seat. Same straight-body form. This angle targets the upper chest and front delts.',
      'Plank — 3 × 60 seconds: Forearms flat on the floor, elbows directly under shoulders. Brace your core hard, squeeze glutes, breathe steadily. Do not let hips sag or rise.',
      'Rest 90 seconds between each set. Drink water during rest.',
      'Progression rule: When you consistently hit 20+ reps per set, advance to Diamond Push-ups (hands form a triangle below chest). When Diamond becomes easy, move to Archer Push-ups.',
      'Total session: ~25–35 minutes.',
    ],
  },
  {
    day: 'Tuesday',
    focus: 'Cardio — Interval Run',
    emoji: '🏃',
    steps: [
      'Warm-up — 5 min: Walk at a brisk pace to raise your heart rate and loosen joints.',
      'Interval rounds × 6–7: Jog at a moderate effort for 3 minutes, then walk briskly for 1 minute. Repeat without full stops.',
      'Effort check: You should be breathing hard during the jog but still able to say short sentences. If you cannot speak at all, slow down.',
      'Cool-down — 5 min: Slow to a comfortable walk, then hold quad, hamstring, and calf stretches for 30 seconds each leg.',
      'Total session: 30–35 minutes.',
    ],
  },
  {
    day: 'Wednesday',
    focus: 'Active Recovery',
    emoji: '🧘',
    steps: [
      'Walk — 15 min: Relaxed outdoor walk at a gentle pace. Leave your phone at home. Focus on breathing.',
      'Neck & Shoulders — 2 min: Slow neck rolls × 10 each direction. Cross-body shoulder stretch — hold 30 sec each arm.',
      'Hip Flexors — 2 min: Step into a deep lunge, lower back knee to the floor. Feel the front of your hip open. Hold 30 sec each leg.',
      'Hamstrings — 2 min: Sit with legs straight and reach toward your feet. Hold 30 sec. Stand and do a standing forward fold for another 30 sec.',
      'Spine — 2 min: Cat-Cow on all fours × 10 slow rounds. Finish with Child\'s Pose held for 60 seconds.',
    ],
  },
  {
    day: 'Thursday',
    focus: 'Legs, Back & Vitality',
    emoji: '🦵',
    steps: [
      'Table Rows (Back & Biceps) — 3 sets to failure: Lie under a sturdy dining table. Grip the table edge with both hands shoulder-width apart, body completely straight like a reverse plank, heels on the floor. Pull your chest up to the table, then lower slowly.',
      'Decline Push-ups — 3 sets to failure: Feet on a chair, hands on the floor. Lower chest to the floor. Targets lower chest and front delts. Full range of motion only.',
      'Wide-Grip Push-ups — 3 sets to failure: Spread hands 1.5× shoulder-width. Elbows flare slightly outward. Go slow on the descent — 2 counts down, 1 count up.',
      'Hindu Squats — 4 × 20 reps: Feet hip-width. As you squat, heels naturally rise and arms sweep back. As you rise, sweep arms forward. Keep a fluid, rhythmic motion.',
      'Glute Bridges — 3 × 20 reps: Lie on back, knees bent, feet flat. Drive hips as high as possible, squeeze glutes hard for 2 seconds at top. Lower slowly.',
      'Rest 60–90 seconds between sets. Total session: ~40–50 minutes.',
    ],
  },
  {
    day: 'Friday',
    focus: 'Cardio — Steady Jog',
    emoji: '🏃',
    steps: [
      'Warm-up — 5 min: Brisk walk to prepare joints and heart rate.',
      'Steady jog — 30–40 min: Maintain a constant, conversational pace. You should be able to say full sentences without gasping. Do not sprint.',
      'Target heart rate: 60–70% of max (roughly 220 – your age × 0.65). Stay in this zone the entire run.',
      'Cool-down — 5 min: Slow to a walk for the final 5 minutes, then stretch quads, calves, and IT band × 30 sec each.',
      'Total session: 40–50 minutes.',
    ],
  },
  {
    day: 'Saturday',
    focus: 'Burnout',
    emoji: '🔥',
    steps: [
      'Standard Push-ups — 2 sets to absolute failure: No partial reps. Every set ends when you physically cannot push up even once more. Rest 60 seconds.',
      'Incline Push-ups — 2 sets to absolute failure: Hands on a raised surface (chair/bed). Same absolute-failure rule. Rest 60 seconds.',
      'Decline Push-ups — 2 sets to absolute failure: Feet elevated. Push until zero reps are possible. Rest 60 seconds.',
      'Burnout rule: These sets must genuinely hurt. Your muscles should be shaking by the final set.',
      'Progression: When standard push-ups feel easy even at failure, replace them with Diamond Push-ups for the burnout sets.',
      'Total session: ~20–25 minutes. Short but brutal.',
    ],
  },
  {
    day: 'Sunday',
    focus: 'Rest Day',
    emoji: '😴',
    steps: [
      'No training today. Rest is a mandatory part of the program — it is when muscles repair and grow.',
      'Focus on quality sleep (7–8 hours), 4 litres of water, and clean eating. Your whey protein shake is still important today — do not skip it.',
      'Light movement only: a slow 20-minute walk or 10 minutes of gentle stretching. Nothing that elevates heart rate.',
      'Use this time to restock groceries and mentally review the coming week.',
      'Deload Week (every 5th week): Replace ALL workout sessions that week with a 30-minute brisk walk only. No push-ups, no running, no burnout.',
    ],
  },
];

export default function WorkoutPlan() {
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayWorkout = WORKOUTS.find(w => w.day === todayName) || WORKOUTS[6];
  const otherWorkouts = WORKOUTS.filter(w => w.day !== todayName);

  const [openDay, setOpenDay] = useState(null);
  const toggle = (day) => setOpenDay(prev => prev === day ? null : day);

  const isRestDay = todayWorkout.day === 'Sunday';

  return (
    <div className="section-container">
      <h2>Workout Plan</h2>
      <p className="subtitle">
        Execute at 7:00 PM daily. Today's session is shown below.
      </p>

      {/* ── Today's Hero Card ───────────────────────────── */}
      <div className={`workout-hero-card${isRestDay ? ' workout-hero-rest' : ''}`}>
        <div className="workout-hero-top">
          <div className="workout-hero-badge">Today</div>
          <div className="workout-hero-emoji">{todayWorkout.emoji}</div>
        </div>
        <div className="workout-hero-meta">
          <div className="workout-hero-day">{todayWorkout.day}</div>
          <div className="workout-hero-focus">{todayWorkout.focus}</div>
        </div>
        <ol className="workout-hero-steps">
          {todayWorkout.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      {/* ── Weekly Plan (collapsible) ────────────────────── */}
      <h3 style={{ marginTop: '28px' }}>📅 Weekly Plan</h3>
      <div className="workout-grid">
        {otherWorkouts.map((item) => {
          const isOpen = openDay === item.day;
          return (
            <div key={item.day} className={`workout-card ${item.day === 'Sunday' ? 'rest-card' : ''}`}>
              <div
                className="workout-card-btn"
                onClick={() => toggle(item.day)}
                role="button"
                aria-expanded={isOpen}
              >
                <div>
                  <div className="workout-day">
                    <span className="workout-day-emoji">{item.emoji}</span>
                    {item.day}
                  </div>
                  <h4 className="workout-focus">{item.focus}</h4>
                </div>
                <span className={`expand-chevron ${isOpen ? 'open' : ''}`}>▼</span>
              </div>
              {isOpen && (
                <ol className="workout-step-list">
                  {item.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
