import React from 'react';

export default function MasterSchedule() {
  const scheduleData = [
    {
      period: "Morning Launch (7:30 AM – 9:00 AM)",
      items: [
        { time: "7:30 AM", title: "Wake & Supplements", desc: "Get out of bed. Pour two separate glasses of warm water. Glass 1: dissolve a pea-sized piece of Shilajit and drink immediately. Glass 2: dissolve 5g of Creatine Monohydrate and drink right after. Do NOT mix them together — Shilajit's fulvic acid affects creatine stability in solution." },
        { time: "7:45 AM", title: "Meditate", desc: "Sit in a quiet place. Set a timer for 20 minutes. Focus entirely on taking slow, deep breaths. Do not look at your phone. This gap allows your body to absorb the supplements." },
        { time: "8:15 AM", title: "Fiber Flush", desc: "Mix your Isabgul into a glass of room-temperature water. Drink it immediately before it turns into a thick gel." },
        { time: "8:30 AM", title: "Breakfast", desc: "Boil 3 whole eggs. Eat them alongside 1 apple or 1 banana." }
      ]
    },
    {
      period: "Work & Mid-Day (9:00 AM – 4:00 PM)",
      items: [
        { time: "9:00 AM - 1:00 PM", title: "Desk Habits", desc: "Drink water from your 1-liter desk bottle. Every 50 mins, stand up and pace for 10 mins. Do 3 sets of 10-15 Kegel contractions while sitting. Do 1 doorway stretch for 30s whenever you get up." },
        { time: "1:00 PM", title: "Pre-Lunch Prep", desc: "Mix 1 tablespoon of Apple Cider Vinegar (ACV) into a glass of water. Drink it using a straw to protect your teeth." },
        { time: "1:15 PM", title: "Lunch", desc: "Eat your pre-packed office lunch: 1.5 katori (150g) of white rice, thick Masoor Dal, 2 pieces of pan-seared Rui/Katla OR 150g chicken breast (palm-sized), and sliced cucumbers." },
        { time: "1:45 PM", title: "Vitamins", desc: "Take 1 Multivitamin and 2–3 Omega-3 Fish Oil capsules (1000mg each) immediately after your last bite of food. Standard fish oil only has ~300mg EPA+DHA per capsule — you need 2–3 for a meaningful dose." },
        { time: "4:00 PM", title: "Energy Snack", desc: "Drink 1 cup of black tea (cha) or sugar-free Lebur Jol. Eat 5–6 almonds or walnuts. If you want a pre-workout coffee boost, save it for 5:30–6:00 PM instead — coffee at 4 PM is too early to benefit the 7 PM workout." }
      ]
    },
    {
      period: "Evening Workouts & Wind-Down (7:00 PM – 12:30 AM)",
      items: [
        { time: "7:00 PM", title: "Workout", desc: "Do your targeted 45-60 minute home workout or interval run." },
        { time: "8:00 PM", title: "Protein", desc: "Mix 1 scoop of Whey Protein with water and drink immediately. On Sunday (rest day), do NOT skip this — muscle repair peaks 24–48 hours after Saturday's burnout. Rest day protein is equally critical." },
        { time: "8:30 PM", title: "Dinner", desc: "Eat your zero-carb recovery meal: 200g pan-seared chicken breast or 3 pieces of Rui/Katla fish, plus a large side of steamed broccoli, spinach, or green beans. No rice, no roti." },
        { time: "9:15 PM", title: "Walk", desc: "Walk outside at a brisk pace for 30 minutes to digest the protein and clear lactic acid." },
        { time: "11:30 PM", title: "Water Cut-off", desc: "Stop drinking water so you do not wake up to use the bathroom." },
        { time: "12:00 AM", title: "Screen Curfew", desc: "Turn off all monitors and your phone. Sit for 15-20 minutes of night meditation to clear your mind." },
        { time: "12:30 AM", title: "Sleep", desc: "Lights out. Sleep for exactly 7 hours." }
      ]
    }
  ];

  return (
    <div className="section-container">
      <h2>Master Schedule</h2>
      <p className="subtitle">Follow this exact chronological order. Timing is designed to maximise supplement absorption and fat loss.</p>

      {scheduleData.map((block, idx) => (
        <div key={idx} className="schedule-block">
          <h3 className="block-title">{block.period}</h3>
          <div className="timeline">
            {block.items.map((item, itemIdx) => (
              <div key={itemIdx} className="timeline-item">
                <div className="timeline-time">{item.time}</div>
                <div className="timeline-content">
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
