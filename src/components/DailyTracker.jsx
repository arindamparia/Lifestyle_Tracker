import React, { useState, useEffect } from 'react';

const getTodayWorkout = () => {
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const rotation = {
    "Monday": { focus: "Chest & Core", details: "Standard & Incline Push-ups (3x failure). Planks (3x 60s)." },
    "Tuesday": { focus: "Cardio", details: "30 mins interval running (3m run / 1m walk)." },
    "Wednesday": { focus: "Active Recovery", details: "15-minute walk & full body stretching." },
    "Thursday": { focus: "Legs, Chest & Vitality", details: "Decline & Wide Pushups (3x failure). 4x20 Hindu Squats. 3x20 Glute Bridges." },
    "Friday": { focus: "Cardio", details: "30-40 minutes of steady, comfortable jogging." },
    "Saturday": { focus: "Burnout", details: "Standard, Incline, Decline Push-ups (2 sets each)." },
    "Sunday": { focus: "Rest", details: "Complete physical rest." }
  };
  return { day, ...rotation[day] };
};

const TaskRow = ({ id, label, checked, onChange, onInfoClick, isInfoActive }) => {
  return (
    <div className="task-row">
      <div className="task-header">
        <label className="task-label">
          <input type="checkbox" checked={checked} onChange={() => onChange(id)} /> 
          <span className="task-title-text">{label}</span>
        </label>
        <button 
          className={`info-btn ${isInfoActive ? 'active-info' : ''}`} 
          onClick={(e) => {
            e.preventDefault();
            onInfoClick();
          }} 
          title="Show Execution Details"
        >
          {isInfoActive ? '✕' : 'ℹ'}
        </button>
      </div>
    </div>
  );
};

export default function DailyTracker() {
  const todayWorkout = getTodayWorkout();

  const [log, setLog] = useState({
    water_liters: 0, shilajit_taken: false, creatine_taken: false, isabgul_taken: false,
    breakfast_logged: false, rule_50_10_followed: false, lunch_logged: false,
    afternoon_snack_logged: false, dinner_logged: false,
    morning_meditation_completed: false, acv_taken: false, multivitamin_taken: false, 
    omega3_taken: false, whey_protein_taken: false, post_dinner_walk_completed: false, 
    kegels_completed: false, scheduled_workout_completed: false,
    hydration_cutoff_followed: false, screen_curfew_followed: false
  });

  const [activeDetail, setActiveDetail] = useState(null);

  useEffect(() => {
    fetch('/.netlify/functions/daily-log')
      .then(res => res.json())
      .then(data => { if (Object.keys(data).length > 0) setLog(data); })
      .catch(err => console.error("Failed to load today's log", err));
  }, []);

  const handleToggle = async (field) => {
    const updatedLog = { ...log, [field]: !log[field] };
    setLog(updatedLog);
    
    try {
      await fetch('/.netlify/functions/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLog)
      });
    } catch (error) {
      console.error("Failed to sync", error);
    }
  };

  const addWater = async () => {
    const updatedLog = { ...log, water_liters: parseFloat((log.water_liters || 0) + 1.0).toFixed(1) };
    if (updatedLog.water_liters > 4.0) updatedLog.water_liters = 4.0;
    setLog(updatedLog);
    await fetch('/.netlify/functions/daily-log', { method: 'POST', body: JSON.stringify(updatedLog) });
  };

  const handleInfo = (id, title, desc) => {
    if (activeDetail?.id === id) {
      setActiveDetail(null);
    } else {
      setActiveDetail({ id, title, desc });
    }
  };

  return (
    <div className="section-container">
      <h2>Interactive Daily Log</h2>
      <p className="subtitle">Check off items as you complete them. Click the 'ℹ' button for exact execution details.</p>
      
      <div className="card water-card">
        <h3>💧 Water Intake: {log.water_liters} / 4.0 L</h3>
        <p className="card-subtitle">Drink from 1-L bottle. Empty 3x before 11:30 PM cutoff.</p>
        <div style={{ marginTop: '15px' }}>
            <button className="main-btn" onClick={addWater}>+ Add 1 Liter</button>
        </div>
      </div>

      <div className="grid-stack">
        <h3>🌅 Morning (7:30 AM - 9:00 AM)</h3>
        <TaskRow 
          id="shilajit_taken" label="7:30 AM: Shilajit & Creatine" checked={log.shilajit_taken} onChange={handleToggle} 
          onInfoClick={() => handleInfo('shilajit_taken', '7:30 AM: Shilajit & Creatine', 'Get out of bed. Pour 500ml of warm water. Dissolve a pea-sized amount of Shilajit and 3-5g of Creatine Monohydrate into it and drink.')}
          isInfoActive={activeDetail?.id === 'shilajit_taken'}
        />
        <TaskRow 
          id="morning_meditation_completed" label="7:45 AM: Morning Meditation (20m)" checked={log.morning_meditation_completed} onChange={handleToggle} 
          onInfoClick={() => handleInfo('morning_meditation_completed', '7:45 AM: Morning Meditation', 'Sit in a quiet place. Set a timer for 20 minutes. Focus entirely on taking slow, deep breaths. Do not look at your phone. This gap allows your body to absorb the supplements.')}
          isInfoActive={activeDetail?.id === 'morning_meditation_completed'}
        />
        <TaskRow 
          id="isabgul_taken" label="8:15 AM: Isabgul Fiber Flush" checked={log.isabgul_taken} onChange={handleToggle} 
          onInfoClick={() => handleInfo('isabgul_taken', '8:15 AM: Isabgul Fiber Flush', 'Mix your Isabgul into a glass of room-temperature water. Drink it immediately before it turns into a thick gel.')}
          isInfoActive={activeDetail?.id === 'isabgul_taken'}
        />
        <TaskRow 
          id="breakfast_logged" label="8:30 AM: 3 Boiled Eggs & 1 Apple/Banana" checked={log.breakfast_logged} onChange={handleToggle} 
          onInfoClick={() => handleInfo('breakfast_logged', '8:30 AM: Breakfast', 'Boil 3 whole eggs. Eat them alongside 1 apple or 1 banana.')}
          isInfoActive={activeDetail?.id === 'breakfast_logged'}
        />

        <h3>💻 Mid-Day (9:00 AM - 4:00 PM)</h3>
        <TaskRow 
          id="rule_50_10_followed" label="Desk Habits: 50/10 Rule & Posture" checked={log.rule_50_10_followed} onChange={handleToggle} 
          onInfoClick={() => handleInfo('rule_50_10_followed', 'Desk Habits: Posture', 'Every 50 minutes, stand up and pace for 10 minutes. Do 1 doorway stretch (lean into the doorframe for 30 seconds) whenever you get up.')}
          isInfoActive={activeDetail?.id === 'rule_50_10_followed'}
        />
        <TaskRow 
          id="kegels_completed" label="Desk Habits: 3 sets of Kegels" checked={log.kegels_completed} onChange={handleToggle} 
          onInfoClick={() => handleInfo('kegels_completed', 'Desk Habits: Kegels', 'Do 3 sets of 10-15 Kegel contractions while sitting at your desk.')}
          isInfoActive={activeDetail?.id === 'kegels_completed'}
        />
        <TaskRow 
          id="acv_taken" label="1:00 PM: ACV Drink (Pre-Lunch)" checked={log.acv_taken} onChange={handleToggle} 
          onInfoClick={() => handleInfo('acv_taken', '1:00 PM: ACV Drink', 'Mix 1 tablespoon of Apple Cider Vinegar (ACV) into a glass of water. Drink it using a straw to protect your teeth.')}
          isInfoActive={activeDetail?.id === 'acv_taken'}
        />
        <TaskRow 
          id="lunch_logged" label="1:15 PM: Pre-packed Office Lunch" checked={log.lunch_logged} onChange={handleToggle} 
          onInfoClick={() => handleInfo('lunch_logged', '1:15 PM: Office Lunch', 'Eat your pre-packed office lunch: 1 small katori (100g) of white rice, thick Masoor Dal, 2 pieces of pan-seared Rui/Katla OR 150g chicken breast, and sliced cucumbers.')}
          isInfoActive={activeDetail?.id === 'lunch_logged'}
        />
        <TaskRow 
          id="multivitamin_taken" label="1:45 PM: Multivitamin & Omega-3" checked={log.multivitamin_taken} onChange={handleToggle} 
          onInfoClick={() => handleInfo('multivitamin_taken', '1:45 PM: Vitamins', 'Take 1 Multivitamin and 1 Omega-3 Fish Oil capsule immediately after your last bite of food.')}
          isInfoActive={activeDetail?.id === 'multivitamin_taken'}
        />
        <TaskRow 
          id="afternoon_snack_logged" label="4:00 PM: Black Coffee & 5 Almonds" checked={log.afternoon_snack_logged} onChange={handleToggle} 
          onInfoClick={() => handleInfo('afternoon_snack_logged', '4:00 PM: Snacking', 'Drink 1 cup of black coffee or sugar-free Lebur Jol. Eat exactly 5-6 whole almonds or walnuts.')}
          isInfoActive={activeDetail?.id === 'afternoon_snack_logged'}
        />

        <h3>🏋️ Evening (7:00 PM - 10:00 PM)</h3>
        {todayWorkout.day === 'Sunday' ? (
           <TaskRow 
             id="scheduled_workout_completed" label={`7:00 PM: REST DAY`} checked={log.scheduled_workout_completed} onChange={handleToggle} 
             onInfoClick={() => handleInfo('scheduled_workout_completed', '7:00 PM: Rest Day', `Today is Sunday. Execution: ${todayWorkout.details}`)}
             isInfoActive={activeDetail?.id === 'scheduled_workout_completed'}
           />
        ) : (
           <TaskRow 
             id="scheduled_workout_completed" label={`7:00 PM: Workout - ${todayWorkout.focus}`} checked={log.scheduled_workout_completed} onChange={handleToggle} 
             onInfoClick={() => handleInfo('scheduled_workout_completed', `7:00 PM: ${todayWorkout.focus}`, `Today is ${todayWorkout.day}. Execution: ${todayWorkout.details}`)}
             isInfoActive={activeDetail?.id === 'scheduled_workout_completed'}
           />
        )}
        <TaskRow 
          id="whey_protein_taken" label="8:00 PM: Post-Workout Whey" checked={log.whey_protein_taken} onChange={handleToggle} 
          onInfoClick={() => handleInfo('whey_protein_taken', '8:00 PM: Protein', 'Mix 1 scoop of Whey Protein strictly with water and drink it immediately (Skip on Rest days if unneeded).')}
          isInfoActive={activeDetail?.id === 'whey_protein_taken'}
        />
        <TaskRow 
          id="dinner_logged" label="8:30 PM: Zero-Carb Dinner" checked={log.dinner_logged} onChange={handleToggle} 
          onInfoClick={() => handleInfo('dinner_logged', '8:30 PM: Dinner', 'Eat your zero-carb meal. A large portion of pan-seared chicken/fish or chicken soup with egg whites, plus a massive side of green vegetables.')}
          isInfoActive={activeDetail?.id === 'dinner_logged'}
        />
        <TaskRow 
          id="post_dinner_walk_completed" label="9:15 PM: Post-Dinner Walk (30m)" checked={log.post_dinner_walk_completed} onChange={handleToggle} 
          onInfoClick={() => handleInfo('post_dinner_walk_completed', '9:15 PM: Walk', 'Walk outside at a brisk pace for 30 minutes to digest the protein and clear lactic acid.')}
          isInfoActive={activeDetail?.id === 'post_dinner_walk_completed'}
        />

        <h3>🌙 Night (11:30 PM - 12:30 AM)</h3>
        <TaskRow 
          id="hydration_cutoff_followed" label="11:30 PM: Hydration Cut-off" checked={log.hydration_cutoff_followed} onChange={handleToggle} 
          onInfoClick={() => handleInfo('hydration_cutoff_followed', '11:30 PM: Hydration', 'Stop drinking water so you do not wake up to use the bathroom during the night.')}
          isInfoActive={activeDetail?.id === 'hydration_cutoff_followed'}
        />
        <TaskRow 
          id="screen_curfew_followed" label="12:00 AM: Screen Curfew & Meditation" checked={log.screen_curfew_followed} onChange={handleToggle} 
          onInfoClick={() => handleInfo('screen_curfew_followed', '12:00 AM: Screens Off', 'Turn off all monitors and your phone. Sit for 15-20 minutes of night meditation to clear your mind.')}
          isInfoActive={activeDetail?.id === 'screen_curfew_followed'}
        />
      </div>

      {activeDetail && (
        <div className="detailed-info-overlay" onClick={() => setActiveDetail(null)}>
          <div className="detailed-info-box" onClick={e => e.stopPropagation()}>
            <div className="detailed-info-header">
              <h3>Detailed Information</h3>
              <button className="close-btn" onClick={() => setActiveDetail(null)}>✕</button>
            </div>
            <h4>{activeDetail.title}</h4>
            <p>{activeDetail.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
