Here is the ultimate, complete package. This includes your time-mapped Master Document (ready for Antigravity) with the exact 7:30 AM to 12:30 AM schedule, the complete full-stack code implementation (including the new React frontend component), and your final `README.md`. 

Copy and paste these blocks directly into your workspace.

***

### Part 1: The Antigravity Master Document

```markdown
# 8-Week Body Recomposition & Performance Master Plan

**Objective:** Aggressive chest fat loss, pectoral muscle hypertrophy, cardiovascular conditioning, and sexual performance enhancement. 
**Daily Targets:** 1,900 Calories | 140g Protein | 3.5 to 4.0 Liters of Water | 7 Hours Sleep

---

## 1. The Daily Master Schedule (7:30 AM to 12:30 AM)

**☀️ The Morning Launch (7:30 AM - 9:00 AM)**
* **7:30 AM (Wake & Vitality Mix):** Get out of bed immediately. Drink 500ml of warm water mixed with a pea-sized amount of **Shilajit** and 3-5g of **Creatine Monohydrate**.
* **7:45 AM - 8:15 AM (Morning Meditation):** Sit for 20-30 minutes of deep breathing. No screens. Let the supplements absorb.
* **8:15 AM (The Fiber Flush):** Mix **Isabgul** (Psyllium Husk) in a glass of water and drink it quickly. 
* **8:30 AM (Breakfast):** Eat 3 whole boiled eggs (*dim sheddo*) and 1 whole fruit (Apple or Banana). 

**💻 Mid-Day Focus (1:00 PM - 4:00 PM)**
* **1:00 PM (Pre-Lunch Habit):** Mix 1 tbsp of **Apple Cider Vinegar (ACV)** in water. Drink using a straw.
* **1:15 PM (Lunch):** 1 small katori (100g) white rice, thick Masoor Dal, 2 pieces pan-seared Rui/Katla fish OR 150g chicken breast, and cucumber slices.
* **1:45 PM (Lunch Supplements):** Take 1 **MB-Vite Multivitamin** and 1 **Omega-3 Fish Oil** capsule immediately after eating.
* **4:00 PM (Energy Boost):** 1 cup Black Coffee OR sugar-free *Lebur Jol*. Eat 5-6 whole almonds. *(Strict Rule: No dry fruit milkshakes).*

**🏋️ Evening Workouts & Recovery (7:00 PM - 10:00 PM)**
* **7:00 PM - 8:00 PM (Workout):** Execute the daily push-up/running routine.
* **8:00 PM (Post-Workout):** Drink 1 scoop of **Whey Protein** mixed with water.
* **8:30 PM (Zero-Carb Dinner):** Grilled chicken breast OR baked fish OR chicken clear soup with 3 egg whites. Massive side of stir-fried green vegetables. No rice/roti.
* **9:15 PM - 9:45 PM (Digestion Walk):** Take a brisk 30-minute walk outside to lower blood sugar and aid digestion.

**🌙 The Night Wind-Down (11:30 PM - 12:30 AM)**
* **11:30 PM (Hydration Cut-off):** Stop drinking water to prevent waking up at night.
* **12:00 AM (Screen Curfew & Meditation):** Shut down all devices. Do 15-20 minutes of calming night meditation. 
* **12:30 AM (Lights Out):** Sleep in a dark, cool room for exactly 7 hours.

---

## 2. The Workout Schedule
* **Monday:** Chest & Core (Standard Push-ups, Incline Push-ups, Planks).
* **Tuesday:** Cardio (30 Min Interval Running).
* **Wednesday:** Active Recovery (15-min walk, stretching).
* **Thursday:** Chest, Legs & Vitality (Decline Push-ups, Wide-grip Push-ups, Hindu Squats, Glute Bridges).
* **Friday:** Cardio (30-40 Min Steady Jog).
* **Saturday:** Full Chest Burnout (Standard, Incline, Decline Push-ups).
* **Sunday:** Complete Rest.

---

## 3. Desk Habits (During Coding Blocks)
* **The 50/10 Rule:** Stand up and pace for 10 minutes every 50 minutes of deep focus.
* **Kegels:** 3 sets of 10-15 reps daily at the desk. 
* **Doorway Stretches:** Lean into a doorframe for 30 seconds to fix rounded shoulders.
* **Hydration:** Empty and refill a 1-liter desk bottle 3 times before 11:30 PM.

---

## 4. Full-Stack Code Implementation

### A. Neon DB Master Schema
```sql
CREATE TABLE daily_recomposition_log (
    id SERIAL PRIMARY KEY,
    log_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    water_liters DECIMAL(3,1) DEFAULT 0.0,
    shilajit_taken BOOLEAN DEFAULT FALSE,
    creatine_taken BOOLEAN DEFAULT FALSE,
    isabgul_taken BOOLEAN DEFAULT FALSE,
    acv_taken BOOLEAN DEFAULT FALSE,
    multivitamin_taken BOOLEAN DEFAULT FALSE,
    omega3_taken BOOLEAN DEFAULT FALSE,
    whey_protein_taken BOOLEAN DEFAULT FALSE,
    breakfast_logged BOOLEAN DEFAULT FALSE,
    lunch_logged BOOLEAN DEFAULT FALSE,
    afternoon_snack_logged BOOLEAN DEFAULT FALSE,
    dinner_logged BOOLEAN DEFAULT FALSE,
    scheduled_workout_completed BOOLEAN DEFAULT FALSE,
    post_dinner_walk_completed BOOLEAN DEFAULT FALSE,
    kegels_completed BOOLEAN DEFAULT FALSE,
    glute_bridges_completed BOOLEAN DEFAULT FALSE,
    morning_meditation_completed BOOLEAN DEFAULT FALSE,
    night_meditation_completed BOOLEAN DEFAULT FALSE,
    doorway_stretches_done BOOLEAN DEFAULT FALSE,
    rule_50_10_followed BOOLEAN DEFAULT FALSE
);
```

### B. Netlify Serverless Function (`netlify/functions/daily-log.js`)
```javascript
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const sql = neon(process.env.DATABASE_URL);

  if (event.httpMethod === 'GET') {
    try {
      const result = await sql`SELECT * FROM daily_recomposition_log WHERE log_date = CURRENT_DATE`;
      return { statusCode: 200, body: JSON.stringify(result.length ? result[0] : {}) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const d = JSON.parse(event.body);
      const result = await sql`
        INSERT INTO daily_recomposition_log (
          log_date, water_liters, shilajit_taken, creatine_taken, isabgul_taken, acv_taken, 
          multivitamin_taken, omega3_taken, whey_protein_taken, breakfast_logged, lunch_logged, 
          afternoon_snack_logged, dinner_logged, scheduled_workout_completed, post_dinner_walk_completed,
          kegels_completed, glute_bridges_completed, morning_meditation_completed, night_meditation_completed,
          doorway_stretches_done, rule_50_10_followed
        ) VALUES (
          CURRENT_DATE, ${d.water_liters || 0}, ${d.shilajit_taken || false}, ${d.creatine_taken || false}, 
          ${d.isabgul_taken || false}, ${d.acv_taken || false}, ${d.multivitamin_taken || false}, 
          ${d.omega3_taken || false}, ${d.whey_protein_taken || false}, ${d.breakfast_logged || false}, 
          ${d.lunch_logged || false}, ${d.afternoon_snack_logged || false}, ${d.dinner_logged || false}, 
          ${d.scheduled_workout_completed || false}, ${d.post_dinner_walk_completed || false}, 
          ${d.kegels_completed || false}, ${d.glute_bridges_completed || false}, 
          ${d.morning_meditation_completed || false}, ${d.night_meditation_completed || false}, 
          ${d.doorway_stretches_done || false}, ${d.rule_50_10_followed || false}
        )
        ON CONFLICT (log_date) DO UPDATE SET 
          water_liters = EXCLUDED.water_liters, shilajit_taken = EXCLUDED.shilajit_taken,
          creatine_taken = EXCLUDED.creatine_taken, isabgul_taken = EXCLUDED.isabgul_taken,
          acv_taken = EXCLUDED.acv_taken, multivitamin_taken = EXCLUDED.multivitamin_taken,
          omega3_taken = EXCLUDED.omega3_taken, whey_protein_taken = EXCLUDED.whey_protein_taken, 
          breakfast_logged = EXCLUDED.breakfast_logged, lunch_logged = EXCLUDED.lunch_logged, 
          afternoon_snack_logged = EXCLUDED.afternoon_snack_logged, dinner_logged = EXCLUDED.dinner_logged, 
          scheduled_workout_completed = EXCLUDED.scheduled_workout_completed, post_dinner_walk_completed = EXCLUDED.post_dinner_walk_completed,
          kegels_completed = EXCLUDED.kegels_completed, glute_bridges_completed = EXCLUDED.glute_bridges_completed,
          morning_meditation_completed = EXCLUDED.morning_meditation_completed, night_meditation_completed = EXCLUDED.night_meditation_completed,
          doorway_stretches_done = EXCLUDED.doorway_stretches_done, rule_50_10_followed = EXCLUDED.rule_50_10_followed
        RETURNING *;
      `;
      return { statusCode: 200, body: JSON.stringify(result[0]) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }
  return { statusCode: 405, body: 'Method Not Allowed' };
};
```

### C. React Frontend Component (`src/components/Dashboard.jsx`)
```jsx
import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [log, setLog] = useState({
    water_liters: 0, shilajit_taken: false, creatine_taken: false, isabgul_taken: false,
    morning_meditation_completed: false, acv_taken: false, multivitamin_taken: false, omega3_taken: false,
    whey_protein_taken: false, post_dinner_walk_completed: false, night_meditation_completed: false,
    scheduled_workout_completed: false, kegels_completed: false
  });

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
    const updatedLog = { ...log, water_liters: parseFloat((log.water_liters || 0) + 0.5).toFixed(1) };
    setLog(updatedLog);
    await fetch('/.netlify/functions/daily-log', { method: 'POST', body: JSON.stringify(updatedLog) });
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Daily Recomposition Tracker</h2>
      
      <div style={{ background: '#f4f4f4', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
        <h3>💧 Water Intake: {log.water_liters} / 4.0 L</h3>
        <button onClick={addWater} style={{ padding: '10px', cursor: 'pointer' }}>+ Add 500ml</button>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        <h3>🌅 Morning (7:30 AM - 9:00 AM)</h3>
        <label><input type="checkbox" checked={log.shilajit_taken} onChange={() => handleToggle('shilajit_taken')} /> Shilajit & Creatine</label>
        <label><input type="checkbox" checked={log.morning_meditation_completed} onChange={() => handleToggle('morning_meditation_completed')} /> Morning Meditation (20m)</label>
        <label><input type="checkbox" checked={log.isabgul_taken} onChange={() => handleToggle('isabgul_taken')} /> Isabgul Fiber Flush</label>

        <h3>💻 Mid-Day (1:00 PM - 4:00 PM)</h3>
        <label><input type="checkbox" checked={log.acv_taken} onChange={() => handleToggle('acv_taken')} /> ACV Pre-Lunch</label>
        <label><input type="checkbox" checked={log.multivitamin_taken} onChange={() => handleToggle('multivitamin_taken')} /> Multivitamin & Omega-3</label>
        <label><input type="checkbox" checked={log.kegels_completed} onChange={() => handleToggle('kegels_completed')} /> Desk Kegels (3 sets)</label>

        <h3>🏋️ Evening (7:00 PM - 10:00 PM)</h3>
        <label><input type="checkbox" checked={log.scheduled_workout_completed} onChange={() => handleToggle('scheduled_workout_completed')} /> Workout Completed</label>
        <label><input type="checkbox" checked={log.whey_protein_taken} onChange={() => handleToggle('whey_protein_taken')} /> Post-Workout Whey</label>
        <label><input type="checkbox" checked={log.post_dinner_walk_completed} onChange={() => handleToggle('post_dinner_walk_completed')} /> Post-Dinner Walk (30m)</label>

        <h3>🌙 Night (12:00 AM - 12:30 AM)</h3>
        <label><input type="checkbox" checked={log.night_meditation_completed} onChange={() => handleToggle('night_meditation_completed')} /> Night Wind-Down Meditation</label>
      </div>
    </div>
  );
}
```
```

***

### Part 2: The Final `README.md`

```markdown
# 8-Week Body Recomposition Tracker

A full-stack, single-repository React web application designed to track a highly specific daily routine running from **7:30 AM to 12:30 AM**. It monitors hydration targets, time-gated supplements (Isabgul, Creatine, Multivitamins), zero-carb dinner adherence, and daily NEAT/meditation habits.

## 🚀 Tech Stack
* **Frontend:** React (Vite / Next.js)
* **Backend:** Node.js (Netlify Serverless Edge Functions)
* **Database:** Neon (Serverless PostgreSQL)
* **Hosting:** Netlify

---

## ⚙️ Local Development Setup

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd body-recomp-tracker
npm install
npm install @neondatabase/serverless
```

### 2. Database Setup (Neon DB)
1. Open the Neon DB **SQL Editor**.
2. Run the schema script found in the Master Document to create the `daily_recomposition_log` table.
3. Copy your **Connection String**.

### 3. Environment Variables
Create a `.env` file in the root folder. **Do not commit this file to GitHub.**
```env
DATABASE_URL="your-neon-database-connection-string-here"
```

### 4. Run the App Locally
Use the Netlify CLI to ensure API routes map to the serverless functions correctly.
```bash
netlify dev
```

---

## 🌐 Deployment to Netlify

### Deploy via GitHub
1. Push code to your GitHub repo.
2. Log in to [Netlify](https://app.netlify.com/) > **"Add new site" > "Import an existing project"**.
3. Connect GitHub and select this repository.
4. Go to **"Environment Variables"** and add `DATABASE_URL` with your Neon string.
5. Click **Deploy Site**.

## 📁 Project Structure
```text
├── netlify/
│   └── functions/
│       └── daily-log.js      # Serverless Postgres Upsert Logic
├── src/
│   ├── components/
│   │   └── Dashboard.jsx     # Main UI with time-mapped checkboxes
│   ├── App.jsx               
│   └── index.css             
├── .env                      
├── package.json              
└── README.md
```
```

***
# Lifestyle_Tracker
