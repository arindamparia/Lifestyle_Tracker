import React, { useState, useEffect } from 'react';
import '../styles/MasterSchedule.css';

// Parse a time string like "7:30 AM" or "9:00 AM - 1:00 PM" → minutes from midnight
const parseTimeToMins = (timeStr) => {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return -1;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

const getNowMins = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

export default function MasterSchedule() {
  const [nowMins, setNowMins] = useState(getNowMins());

  // Refresh every minute so the live indicator updates
  useEffect(() => {
    const t = setInterval(() => setNowMins(getNowMins()), 60_000);
    return () => clearInterval(t);
  }, []);

  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;

  const eveningBlock = {
    period: "Evening Workouts & Wind-Down (7:00 PM – 12:30 AM)",
    items: [
      { time: "7:00 PM", title: "Workout", desc: "Do your targeted 45-60 minute home workout or interval run." },
      { time: "8:00 PM", title: "Whey + Creatine", desc: "Mix 1 scoop of Whey Protein AND 5g (1 level teaspoon) of Creatine Monohydrate into 300 ml of cold water. Shake and drink within 45 minutes of your workout. Post-workout insulin sensitivity is elevated, driving creatine into muscle cells far more efficiently than morning. On Sunday (rest day), do not skip — muscle repair peaks 24–48 hours after Saturday's burnout." },
      { time: "8:30 PM", title: "Dinner", desc: "Eat your zero-carb recovery meal: 200g pan-seared chicken breast or 3 pieces of Rui/Katla fish, plus a large side of steamed broccoli, spinach, or green beans. No rice, no roti." },
      { time: "8:35 PM", title: "Kapiva Ashwagandha Gold", desc: "Take 1 capsule of Kapiva Ashwagandha Gold immediately after your last bite of dinner." },
      { time: "9:15 PM", title: "Walk", desc: "Walk outside at a brisk pace for 30 minutes to digest the protein and clear lactic acid." },
      { time: "11:30 PM", title: "Water Cut-off", desc: "Stop drinking water so you do not wake up to use the bathroom." },
      { time: "12:00 AM", title: "Screen Curfew", desc: "Turn off all monitors and your phone. Sit for 15-20 minutes of night meditation to clear your mind." },
      { time: "12:30 AM", title: "Sleep", desc: "Lights out. Sleep for exactly 7 hours." }
    ]
  };

  const middayBlock = {
    period: "Work & Mid-Day (10:00 AM – 4:00 PM)",
    items: [
      { time: "10:00 AM - 1:00 PM", title: "Desk Habits", desc: "Drink water from your 1-liter desk bottle. Every 50 mins, stand up and pace for 10 mins. Do 3 sets of 10-15 Kegel contractions while sitting. Do 1 doorway stretch for 30s whenever you get up." },
      { time: "1:00 PM", title: "Pre-Lunch Prep", desc: "Mix 1 tablespoon of Apple Cider Vinegar (ACV) into a glass of water. Drink it using a straw to protect your teeth." },
      { time: "1:15 PM", title: "Lunch", desc: "Eat your pre-packed office lunch: 1.5 katori (150g) of white rice, thick Masoor Dal, 2 pieces of pan-seared Rui/Katla OR 150g chicken breast (palm-sized), and sliced cucumbers." },
      { time: "1:45 PM", title: "Vitamins", desc: "Take 1 sachet (3 tablets) of MuscleBlaze Biozyme 5-in-1 Multivitamin AND 1 Omega-3 triple-strength capsule (~900mg EPA+DHA) immediately after your last bite of food." },
      { time: "4:00 PM", title: "Energy Snack", desc: "Drink 1 cup of black tea (cha) or sugar-free Lebur Jol. Eat 5–6 almonds or walnuts. If you want a pre-workout coffee boost, save it for 5:30–6:00 PM instead." }
    ]
  };

  const weekdaySchedule = [
    {
      period: "Morning Launch (7:00 AM – 9:30 AM) · Leave by 9:30 AM",
      items: [
        { time: "7:00 AM", title: "Wake & Shilajit", desc: "Get out of bed. Pour 250 ml of warm water and dissolve a pea-sized piece of Shilajit resin. Drink immediately on an empty stomach — before food or coffee. Wait at least 15 minutes before eating." },
        { time: "7:15 AM", title: "Meditate", desc: "Sit in a quiet place. Set a timer for 20 minutes. Focus entirely on taking slow, deep breaths. Do not look at your phone." },
        { time: "7:40 AM", title: "Fiber Flush", desc: "Mix 1 heaped teaspoon (~5g) of Isabgul into a full glass of room-temperature water. Drink it IMMEDIATELY before it turns into a thick gel." },
        { time: "7:50 AM", title: "Breakfast", desc: "Boil 3 whole eggs. Eat alongside 1 apple or 1 banana. Keep it quick — you have a tight morning." },
        { time: "8:20 AM", title: "Bath & Get Ready", desc: "Shower with warm water, finish the last 30–60 seconds cold for alertness. Get fully dressed and groomed. Be out the door by 9:30 AM sharp for your 10 AM meeting." },
      ]
    },
    middayBlock,
    eveningBlock,
  ];

  const weekendSchedule = [
    {
      period: "Morning Launch (7:30 AM – 10:00 AM) · Relaxed",
      items: [
        { time: "7:30 AM", title: "Wake & Shilajit", desc: "Get out of bed. Pour 250 ml of warm water and dissolve a pea-sized piece of Shilajit resin. Drink immediately on an empty stomach — before food or coffee. Wait 20 minutes before eating." },
        { time: "7:45 AM", title: "Meditate", desc: "Sit in a quiet place. Set a timer for 20 minutes. Focus entirely on taking slow, deep breaths. Do not look at your phone. This gap allows the Shilajit to absorb." },
        { time: "8:15 AM", title: "Fiber Flush", desc: "Mix 1 heaped teaspoon (~5g) of Isabgul into a full glass of room-temperature water. Drink it IMMEDIATELY before it turns into a thick gel." },
        { time: "8:30 AM", title: "Breakfast", desc: "Boil 3 whole eggs. Eat them alongside 1 apple or 1 banana. No rush — take your time." },
        { time: "9:30 AM", title: "Bath (Relaxed)", desc: "Take a comfortable shower at your own pace. Finish with a cold rinse if you like. No rush today — ease into the morning." },
      ]
    },
    middayBlock,
    eveningBlock,
  ];

  const scheduleData = isWeekend ? weekendSchedule : weekdaySchedule;

  // Flatten all items with their parsed start times for finding the active one
  const allItems = scheduleData.flatMap(block =>
    block.items.map(item => ({ ...item, startMins: parseTimeToMins(item.time) }))
  ).filter(item => item.startMins >= 0);

  // Active item = the last item whose start time has passed but next hasn't started yet
  // Handle late-night (midnight+) by shifting times
  const getActiveTitle = () => {
    const t = nowMins < 90 ? nowMins + 1440 : nowMins; // handle past midnight
    let active = null;
    for (let i = 0; i < allItems.length; i++) {
      const itemMins = allItems[i].startMins < 90 ? allItems[i].startMins + 1440 : allItems[i].startMins;
      const nextMins = i + 1 < allItems.length
        ? (allItems[i + 1].startMins < 90 ? allItems[i + 1].startMins + 1440 : allItems[i + 1].startMins)
        : 1440 + 90;
      if (t >= itemMins && t < nextMins) {
        active = allItems[i].title;
        break;
      }
    }
    return active;
  };

  const activeTitle = getActiveTitle();

  return (
    <div className="section-container">
      <h2>Master Schedule</h2>
      <p className="subtitle">{isWeekend ? 'Weekend — relaxed start, same evening routine.' : 'Weekday — compressed morning to leave by 9:30 AM for your 10 AM office meeting.'} Timing is designed to maximise supplement absorption and fat loss.</p>

      {scheduleData.map((block, idx) => (
        <div key={idx} className="schedule-block">
          <h3 className="block-title">{block.period}</h3>
          <div className="timeline">
            {block.items.map((item, itemIdx) => {
              const isActive = activeTitle === item.title;
              return (
                <div key={itemIdx} className={`timeline-item${isActive ? ' timeline-item--active' : ''}`}>
                  {isActive && <div className="timeline-active-pulse" />}
                  <div className="timeline-time">{item.time}</div>
                  <div className="timeline-content">
                    <h4>
                      {isActive && <span className="timeline-live-dot" />}
                      {item.title}
                    </h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
