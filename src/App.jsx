import React, { useState, useEffect } from 'react';
import DailyTracker from './components/DailyTracker';
import MasterSchedule from './components/MasterSchedule';
import WorkoutPlan from './components/WorkoutPlan';
import NutritionPrep from './components/NutritionPrep';
import HistoryLog from './components/HistoryLog';

function App() {
  const [activeTab, setActiveTab] = useState('tracker');

  useEffect(() => {
    // Determine time of day and set the body theme efficiently
    const updateTheme = () => {
      const hour = new Date().getHours();
      let theme = 'theme-night'; // default to night (19 to 4)
      
      if (hour >= 5 && hour < 9) theme = 'theme-morning';
      else if (hour >= 9 && hour < 16) theme = 'theme-day';
      else if (hour >= 16 && hour < 19) theme = 'theme-evening';
      
      document.body.className = theme;
    };

    updateTheme();
    // Update theme every hour seamlessly
    const interval = setInterval(updateTheme, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      <nav className="tab-navigation">
        <button className={activeTab === 'tracker' ? 'active' : ''} onClick={() => setActiveTab('tracker')}>
          Daily Tracker
        </button>
        <button className={activeTab === 'schedule' ? 'active' : ''} onClick={() => setActiveTab('schedule')}>
          Master Schedule
        </button>
        <button className={activeTab === 'workout' ? 'active' : ''} onClick={() => setActiveTab('workout')}>
          Workouts
        </button>
        <button className={activeTab === 'nutrition' ? 'active' : ''} onClick={() => setActiveTab('nutrition')}>
          Preparation
        </button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
          History
        </button>
      </nav>

      <main className="tab-content window-fade-in">
        {activeTab === 'tracker' && <DailyTracker />}
        {activeTab === 'schedule' && <MasterSchedule />}
        {activeTab === 'workout' && <WorkoutPlan />}
        {activeTab === 'nutrition' && <NutritionPrep />}
        {activeTab === 'history' && <HistoryLog />}
      </main>
    </div>
  );
}

export default App;
