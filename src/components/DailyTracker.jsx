import React, { useState, useEffect, useRef } from 'react';
import { getTodayLog, setTodayLog, getEffectiveDate } from '../cache';
import { getAuthHeader, handleUnauthorized } from '../auth';
import { scheduleNotifications, clearNotificationTimers } from '../notifications';

// Returns parsed JSON only when the response is actually JSON.
// Guards against Vite's HTML 404 fallback in local dev (no netlify dev running).
const safeJson = (res) => {
  if (res.status === 401) { handleUnauthorized(); return null; }
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  return res.json();
};

const WORKOUT_ROTATION = {
  Monday: {
    focus: "Chest & Core",
    steps: [
      "Standard Push-ups — 3 sets to failure: Place hands shoulder-width apart, body in a straight line. Lower chest 2–3 cm from floor, then push up explosively. Count every rep; stop only at true failure.",
      "Incline Push-ups — 3 sets to failure: Place hands on the edge of your bed or a sturdy chair. Same straight-body form. This angle targets the upper chest.",
      "Plank — 3 × 60 seconds: Forearms on the floor, elbows directly under shoulders. Brace your core, squeeze your glutes, breathe steadily. Do not let hips sag or rise.",
      "Rest 90 seconds between each set.",
    ],
  },
  Tuesday: {
    focus: "Cardio — Interval Run",
    steps: [
      "Warm-up (5 min): Walk at a brisk pace to raise heart rate and loosen joints.",
      "Interval rounds × 6–7: Jog at a moderate effort for 3 minutes, then walk briskly for 1 minute. Repeat.",
      "Effort check: You should be breathing hard during the jog but able to speak a few words.",
      "Cool-down (5 min): Slow to a comfortable walk, then stretch quads, hamstrings, and calves — 30 seconds each.",
      "Total session: 30–35 minutes.",
    ],
  },
  Wednesday: {
    focus: "Active Recovery",
    steps: [
      "Walk (15 min): Relaxed outdoor walk at a comfortable pace. Leave your phone at home.",
      "Neck & Shoulders (2 min): Slow neck rolls 10× each direction. Cross-body shoulder stretch — hold 30 seconds each arm.",
      "Hip Flexors (2 min): Step into a lunge, lower back knee to the floor. Hold 30 seconds each leg. Feel the front of the hip stretch.",
      "Hamstrings (2 min): Stand and reach for your toes, or sit with legs extended and reach for your feet. Hold 30 seconds each leg.",
      "Spine (2 min): Cat-Cow — 10 slow rounds on all fours. Finish with Child's Pose held for 60 seconds.",
    ],
  },
  Thursday: {
    focus: "Legs, Back & Vitality",
    steps: [
      "Decline Push-ups — 3 sets to failure: Place feet on a chair, hands on the floor. Lower chest to the floor. This targets the lower chest and front delts.",
      "Wide-Grip Push-ups — 3 sets to failure: Spread hands 1.5× shoulder-width. Elbows flare slightly outward. Go slow on the descent (2 counts down, 1 count up).",
      "Hindu Squats — 4 × 20 reps: Stand feet hip-width. As you squat, let your heels naturally rise and sweep your arms back. As you rise, arms sweep forward. Keep a fluid, rhythmic motion.",
      "Glute Bridges — 3 × 20 reps: Lie on your back, knees bent, feet flat. Drive hips up as high as possible, squeeze glutes hard at the top for 2 seconds. Lower slowly — do not let hips touch the floor between reps.",
      "Rest 60–90 seconds between sets.",
    ],
  },
  Friday: {
    focus: "Cardio — Steady Jog",
    steps: [
      "Warm-up (5 min): Brisk walk to prepare your joints and heart.",
      "Jog (30–40 min): Maintain a steady, conversational pace — you should be able to say short sentences without gasping.",
      "Target heart rate: 60–70% of your maximum. Do not sprint. Do not stop unless needed.",
      "Cool-down (5 min): Slow to a walk for the final 5 minutes, then stretch your quads, calves, and IT band.",
    ],
  },
  Saturday: {
    focus: "Burnout",
    steps: [
      "Standard Push-ups — 2 sets to absolute failure: No partial reps. Every set ends when you physically cannot push up even once more.",
      "Rest 60 seconds. Incline Push-ups — 2 sets to absolute failure: Hands on a raised surface. Same total failure rule.",
      "Rest 60 seconds. Decline Push-ups — 2 sets to absolute failure: Feet elevated. Push until zero reps are possible.",
      "Burnout rule: These sets should hurt. That is the point. Your muscles should be shaking by the final set.",
    ],
  },
  Sunday: {
    focus: "Rest Day",
    steps: [
      "No exercise today. Complete rest is a mandatory part of the program — it is when muscles actually grow.",
      "Focus on quality sleep (7–8 hours), staying hydrated, and eating clean.",
      "Light activity allowed: a slow walk or gentle stretching only — nothing that elevates heart rate.",
      "Use this time to restock groceries and mentally prepare for the upcoming week.",
    ],
  },
};

const getTodayWorkout = () => {
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return { day, ...(WORKOUT_ROTATION[day] || WORKOUT_ROTATION.Sunday) };
};

// ── Smart suggestion schedule ─────────────────────────────────────────────
// Each task with its scheduled minute-of-day (0 = midnight, 450 = 7:30 AM…)
// Used to compute the ±30-min window and the 4-hour overdue check.
const TASK_SCHEDULE = [
  { time: 450,  field: 'shilajit_taken',              emoji: '🧪', label: '7:30 AM — Shilajit (empty stomach)' },
  { time: 465,  field: 'morning_meditation_completed', emoji: '🧘', label: '7:45 AM — Meditation (20 min)' },
  { time: 495,  field: 'isabgul_taken',                emoji: '🌾', label: '8:15 AM — Isabgul Husk' },
  { time: 510,  field: 'breakfast_logged',             emoji: '🍳', label: '8:30 AM — Breakfast' },
  { time: 540,  field: 'rule_50_10_followed',          emoji: '🪑', label: '9:00 AM — 50/10 Desk Rule' },
  { time: 720,  field: 'kegels_completed',             emoji: '🔄', label: 'Midday — Kegel Exercises' },
  { time: 780,  field: 'acv_taken',                    emoji: '🥤', label: '1:00 PM — ACV Drink' },
  { time: 795,  field: 'lunch_logged',                 emoji: '🍱', label: '1:15 PM — Lunch' },
  { time: 825,  field: 'multivitamin_taken',           emoji: '💊', label: '1:45 PM — Supplements' },
  { time: 960,  field: 'afternoon_snack_logged',       emoji: '☕', label: '4:00 PM — Energy Snack' },
  { time: 1140, field: 'scheduled_workout_completed',  emoji: '🏋️', label: '7:00 PM — Workout' },
  { time: 1200, field: 'whey_protein_taken',           emoji: '🥛', label: '8:00 PM — Whey + Creatine (post-workout)' },
  { time: 1230, field: 'dinner_logged',                emoji: '🍽️', label: '8:30 PM — Dinner' },
  { time: 1235, field: 'ashwagandha_taken',            emoji: '🌿', label: '8:35 PM — Ashwagandha' },
  { time: 1275, field: 'post_dinner_walk_completed',   emoji: '🚶', label: '9:15 PM — Post-Dinner Walk' },
  { time: 1410, field: 'hydration_cutoff_followed',    emoji: '💧', label: '11:30 PM — Hydration Cut-off' },
  { time: 1440, field: 'screen_curfew_followed',       emoji: '📴', label: '12:00 AM — Screen Curfew' },
];

// Returns up to 3 suggestions:
//   • any task whose scheduled time falls within ±30 min of now (done or not)
//   • any task that was scheduled 30–240 min ago and is still NOT done (overdue)
// Returns [] when nothing qualifies (panel is hidden entirely).
const getSuggestions = (log) => {
  const now = new Date();
  const raw = now.getHours() * 60 + now.getMinutes();
  // Shift past-midnight times so late-night tasks (≥1440) compare correctly
  const t = raw < 90 ? raw + 1440 : raw;

  const results = [];
  for (const task of TASK_SCHEDULE) {
    const diff = task.time - t; // negative = past, positive = future
    if (diff >= -30 && diff <= 30) {
      // Within the ±30 min window — show regardless of completion
      results.push({ ...task, diff, kind: diff >= 0 ? 'upcoming' : 'current' });
    } else if (diff < -30 && diff >= -240 && !log[task.field]) {
      // Overdue (30–240 min ago) and still not ticked off
      results.push({ ...task, diff, kind: 'overdue' });
    }
  }

  // Sort: current (just passed) first → upcoming (soon) → overdue (missed)
  results.sort((a, b) => {
    const order = { current: 0, upcoming: 1, overdue: 2 };
    if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
    return Math.abs(a.diff) - Math.abs(b.diff);
  });

  return results.slice(0, 3);
};

// Info content for each task in TASK_SCHEDULE — used by the suggestion panel's ℹ buttons
const TASK_INFO_MAP = {
  shilajit_taken: {
    title: '🧪 Shilajit',
    desc: 'Take on a completely empty stomach in the morning. Empty stomach maximises fulvic acid absorption into the bloodstream.',
    steps: [
      'Pour 250 ml of warm (not boiling) water into a glass.',
      'Dissolve a pea-sized piece of Shilajit resin by stirring for 30 seconds.',
      'Drink immediately — on a completely empty stomach, before food or coffee.',
      'Wait at least 20 minutes before eating breakfast.',
      'Why warm water: it dissolves the resin fully and improves bioavailability compared to cold water.',
      'Why morning: Shilajit boosts mitochondrial energy production and sets a positive metabolic tone for the day.',
    ],
  },
  morning_meditation_completed: {
    title: '🧘 Morning Meditation',
    desc: 'This 20-minute window also lets the Shilajit & Creatine absorb before you eat.',
    steps: [
      'Find a quiet, comfortable sitting position — chair or floor, spine upright.',
      'Set a timer for 20 minutes. Place your phone face-down.',
      'Close your eyes. Breathe in slowly through your nose for 4 counts.',
      'Hold for 2 counts, then exhale through your mouth for 6 counts.',
      'When thoughts arise, acknowledge them and gently return to your breath. No judgment.',
      'When the timer ends, take one deep breath before opening your eyes.',
    ],
  },
  isabgul_taken: {
    title: '🌾 Isabgul (Psyllium Husk)',
    desc: 'A soluble fibre that slows glucose absorption and keeps you full through the morning.',
    steps: [
      'Measure 1 heaped teaspoon (about 5 g) of Isabgul husk.',
      'Add to a full glass (250 ml) of room-temperature water.',
      'Stir for 5 seconds, then drink it IMMEDIATELY — it turns into a thick gel within 60 seconds.',
      'Follow with another half-glass of plain water.',
      'Why: Do not let it sit — a thick gel is harder to swallow and less effective.',
    ],
  },
  breakfast_logged: {
    title: '🍳 Breakfast — Boiled Eggs & Fruit',
    desc: 'High-protein, low-effort breakfast. Takes about 12 minutes to make fresh. Choose hard or soft boiled based on your preference.',
    steps: [
      'Fill a small pot with enough cold water to fully cover 3 eggs. Bring to a rolling boil on high heat.',
      'Gently lower 3 whole eggs into the boiling water using a spoon.',
      'HARD BOILED (firm yolk): Set a timer for 9 minutes. Transfer eggs immediately to cold tap water for 2 minutes — this stops overcooking and makes peeling easier. Peel carefully and eat with a pinch of salt.',
      'SOFT BOILED (jammy, creamy yolk): Set a timer for exactly 6 minutes. Transfer eggs immediately to cold water for 1 minute only — just enough to stop cooking. Peel very gently under running water; the white is fully set but the yolk is soft, golden, and runny in the centre.',
      'Eat alongside 1 apple (sliced) or 1 banana for natural carbs and micronutrients.',
      'Protein note: 3 eggs give ~18 g of protein. If you want to hit 25–28 g, add 2 extra egg whites to the pot (they cook in 4–5 minutes) or eat a small katori of low-fat dahi (curd) alongside.',
    ],
  },
  rule_50_10_followed: {
    title: '🪑 50/10 Rule & Posture',
    desc: 'Sitting for 50+ minutes raises cortisol and compresses the spine. This breaks the damage.',
    steps: [
      'Set a repeating timer on your phone for every 50 minutes.',
      'When it goes off: stand up, walk out of the room, pace for 10 full minutes.',
      'Each time you stand up: step into a doorway, place your hands on the frame at shoulder height, and lean forward gently until you feel your chest open. Hold for 30 seconds.',
      'While sitting: feet flat on the floor, screen at eye level, lower back supported.',
      'Keep your 1-litre water bottle on the desk — refill it every time you return from a break.',
    ],
  },
  kegels_completed: {
    title: '🔄 Pelvic Floor Exercises (Kegels)',
    desc: 'Invisible exercise you can do sitting at your desk. 3 sets, anytime between 9 AM and 4 PM.',
    steps: [
      'Sit normally in your chair. No one will know you are doing this.',
      'Identify the muscles: imagine you are stopping yourself from urinating mid-stream. Those are your pelvic floor muscles.',
      'Contract those muscles firmly. Hold for 5 seconds. Relax for 5 seconds. That is 1 rep.',
      'Do 10–15 reps. Rest 60 seconds. Repeat for 3 sets.',
      'Benefit: improves urinary control, pelvic floor strength, core stability, and erectile function over time. Note: Kegels do not directly raise testosterone — their benefit is pelvic floor health and blood flow to the pelvic region.',
    ],
  },
  acv_taken: {
    title: '🥤 Apple Cider Vinegar (ACV) Drink',
    desc: 'Taken 15 minutes before lunch, ACV blunts the blood sugar spike from rice.',
    steps: [
      'Pour 250 ml of water into a glass.',
      'Add exactly 1 tablespoon (15 ml) of Apple Cider Vinegar — use one with "the mother" (cloudy appearance).',
      'Stir briefly. Drink through a straw to protect tooth enamel from the acid.',
      'Do not drink undiluted ACV — it will damage your oesophagus and teeth.',
      'Drink this 10–15 minutes before your meal for maximum effect on blood sugar.',
      'Immediately after finishing: rinse your mouth with a full glass of plain water to wash away acid residue from your teeth and gums.',
    ],
  },
  lunch_logged: {
    title: '🍱 Daily Lunch Preparation',
    desc: 'Prepare fresh each morning before work. Total active time: ~30 minutes.',
    steps: [
      'Rice: Rinse 150 g (1.5 katori) of white rice under cold water until clear. Add 225 ml water, bring to a boil, reduce to lowest heat, cover, and simmer for 12–15 minutes until all water is absorbed. This gives you enough carbs to fuel your 7 PM workout.',
      'Masoor Dal: Rinse ½ cup of red lentils (masoor dal) until water runs clear. Boil with 1 cup water, ½ tsp turmeric, and salt to taste for 15–18 minutes until a very thick paste forms. Tadka: heat 1 tsp mustard oil in a small pan, add 1 dried red chilli and 3 crushed garlic cloves for 15 seconds, then pour over the dal and mix.',
      'Protein: Pat 150 g chicken breast (about the size of your palm) or 2 medium fish pieces dry with a paper towel. Rub with salt, ¼ tsp turmeric, and a squeeze of lemon. Sear in a hot pan with 1 tsp oil — chicken: 6–7 min each side; fish: 4–5 min each side — until golden and cooked through.',
      'Side: Slice 1 cucumber.',
      'Pack rice, dal, protein, and cucumber into separate airtight lunch containers. Refrigerate until you leave for work.',
    ],
  },
  multivitamin_taken: {
    title: '💊 Multivitamin & Omega-3',
    desc: 'Take with the last bites of your meal — fat from food improves Omega-3 absorption.',
    steps: [
      'Take 1 Multivitamin tablet. Swallow with a full glass of water.',
      'Take 1 Omega-3 capsule (your triple-strength / 3x formula). A 3x capsule contains ~900 mg EPA+DHA — equivalent to 3 standard capsules — which is a clinically meaningful daily dose for inflammation, joint recovery, and heart health.',
      'Do not take on an empty stomach — the fat-soluble vitamins (A, D, E, K) in the multivitamin need dietary fat to be absorbed properly.',
      'Why Omega-3: reduces exercise-related inflammation, supports joint recovery, and improves insulin sensitivity over time.',
    ],
  },
  afternoon_snack_logged: {
    title: '☕ 4:00 PM Energy Snack',
    desc: 'A clean bridge between lunch and your 7 PM workout. Keep it minimal — this is not a meal.',
    steps: [
      'Option A (recommended at 4 PM): Brew 1 cup of black tea (cha, no sugar or with minimal sugar). Light, natural caffeine that wears off by bedtime.',
      'Option B — Pre-workout coffee: If you want a proper caffeine boost for your 7 PM workout, save the black coffee for 5:30–6:00 PM (45–60 minutes before training). Coffee at 4 PM is too early to benefit the workout and may still affect sleep for caffeine-sensitive people.',
      'Option C (no caffeine): Squeeze half a lemon into 250 ml cold water with a pinch of salt (Lebur Jol). Sugar-free, refreshing, and replenishes electrolytes.',
      'Eat exactly 5–6 whole almonds or 4–5 walnuts alongside. These provide healthy fats and keep hunger away until post-workout dinner.',
      'Do not eat more than this — the goal is to bridge the gap to dinner, not to have a full snack.',
      'In summer or on very hot days: skip caffeine entirely and have Lebur Jol with 1–2 extra glasses of water before your workout.',
    ],
  },
  whey_protein_taken: {
    title: '🥛 Post-Workout Whey + Creatine',
    desc: 'Take both within 45 minutes of finishing your workout. Post-workout is the scientifically optimal window for creatine uptake — muscles are primed to absorb nutrients.',
    steps: [
      'Measure 1 level scoop of Whey Protein Concentrate or Isolate.',
      'Add 250–300 ml of cold water to a shaker bottle.',
      'Add the protein powder AND exactly 5 g (1 level teaspoon) of Creatine Monohydrate.',
      'Seal the shaker and shake vigorously for 10–15 seconds until fully dissolved.',
      'Drink immediately. Do not let it sit — protein becomes lumpy and creatine loses potency.',
      'Why post-workout creatine: insulin sensitivity is elevated post-exercise, driving creatine into muscle cells more efficiently than at any other time of day.',
      'On Sunday (rest day): still take both — muscle protein synthesis peaks 24–48 hours after Saturday\'s burnout. Rest day protein and creatine are equally important.',
    ],
  },
  dinner_logged: {
    title: '🍽️ High-Protein Dinner Preparation',
    desc: 'Zero starchy carbs. High protein, high fibre from vegetables. Cook fresh nightly — takes 15 minutes.',
    steps: [
      'Take 200 g chicken breast (roughly the size of your full hand, slightly thicker than your palm) or 3 medium fish pieces from the fridge. Dinner protein is larger than lunch because this is your post-workout recovery meal. Pat completely dry with a paper towel — moisture prevents browning.',
      'Season both sides generously: salt, a pinch of black pepper, ¼ tsp turmeric, and a squeeze of lemon.',
      'Heat a non-stick or cast-iron pan on HIGH heat for 90 seconds. Add 1 tsp oil — it should shimmer immediately.',
      'Chicken: sear 6–7 minutes per side without moving it, until the top surface looks opaque. Fish: 4–5 minutes per side.',
      'While protein cooks, steam vegetables: add broccoli florets, green beans, or spinach to a covered pot with 3 tbsp water. Steam on medium heat for 3–4 minutes until tender-crisp.',
      'Plate and eat immediately. No rice, no bread, no roti.',
    ],
  },
  ashwagandha_taken: {
    title: '🌿 Ashwagandha AF-43 (600 mg)',
    desc: 'Take immediately after finishing dinner — fat and protein in the meal improve absorption and prevent stomach upset.',
    steps: [
      'Take 1 capsule of Ashwagandha AF-43 600 mg immediately after your last bite of dinner.',
      'Swallow with a full glass of water.',
      'Why with dinner: Ashwagandha is fat-soluble — the fat and protein in your meal significantly improve bioavailability compared to taking it on an empty stomach.',
      'Why evening: Ashwagandha lowers cortisol and has a mild calming effect. Taking it at night supports your night meditation, improves sleep quality, and maximises overnight recovery.',
      'Do NOT take with coffee or stimulants — caffeine counteracts the cortisol-lowering effect.',
      'Consistency matters more than timing: missing one day is fine, but aim for 7 days a week. Benefits (reduced stress, improved strength, better sleep) build over 4–8 weeks of daily use.',
    ],
  },
  post_dinner_walk_completed: {
    title: '🚶 Post-Dinner Walk',
    desc: 'Walking after a high-protein meal dramatically improves glucose clearance and digestion.',
    steps: [
      'Head outside within 15 minutes of finishing dinner.',
      'Walk at a brisk pace — arms should be swinging, breathing slightly elevated.',
      'Target 30 minutes continuous walking (roughly 3,000 steps).',
      'No phone scrolling while walking. Focus on your breath or the environment.',
      'On bad weather days: march in place at home for 30 minutes or do 15 minutes of slow pacing indoors.',
    ],
  },
  hydration_cutoff_followed: {
    title: '💧 Hydration Cut-off',
    desc: 'Stopping fluid intake 1 hour before sleep prevents you from waking up to urinate.',
    steps: [
      'Finish your last glass of water by 11:30 PM.',
      'Make sure your water goal (4 litres) is complete before this point.',
      'A small sip to take supplements or pills is fine — not a full glass.',
      'If you wake up in the night feeling thirsty, you are not drinking enough during the day.',
    ],
  },
  screen_curfew_followed: {
    title: '📴 Screen Curfew & Night Meditation',
    desc: 'Blue light suppresses melatonin for up to 2 hours. Screens off by midnight for 12:30 AM sleep.',
    steps: [
      'At 12:00 AM exactly: lock your phone, turn off your monitors.',
      'Set your phone alarm for 7:30 AM and place it across the room (forces you out of bed).',
      'Sit in a comfortable position in dim or no light.',
      'Close your eyes. Do a body scan: mentally relax each part from feet upward — feet, calves, thighs, abdomen, chest, shoulders, neck, face.',
      'Continue slow breathing for 15–20 minutes until you feel genuinely drowsy.',
      'Lie down and sleep by 12:30 AM for a full 7-hour sleep cycle ending at 7:30 AM.',
    ],
  },
};

// Returns info for a suggestion-panel ℹ button. scheduled_workout_completed is dynamic.
const getInfoForField = (field, todayWorkout) => {
  if (field === 'scheduled_workout_completed') {
    return {
      title: `🏋️ ${todayWorkout.day}: ${todayWorkout.focus}`,
      desc: todayWorkout.day === 'Sunday'
        ? 'Today is your rest day. No training needed.'
        : `Today is ${todayWorkout.day}. Follow the steps below in order.`,
      steps: todayWorkout.steps,
    };
  }
  return TASK_INFO_MAP[field];
};

// Fuzzy filter: matches books that contain all query chars in order
const fuzzyFilter = (books, query) => {
  if (!query.trim()) return books;
  const q = query.toLowerCase();
  return books
    .filter(book => {
      const b = book.toLowerCase();
      if (b.includes(q)) return true;
      let qi = 0;
      for (let i = 0; i < b.length && qi < q.length; i++) {
        if (b[i] === q[qi]) qi++;
      }
      return qi === q.length;
    })
    .sort((a, b) => {
      const al = a.toLowerCase(), bl = b.toLowerCase();
      if (al.startsWith(q) && !bl.startsWith(q)) return -1;
      if (!al.startsWith(q) && bl.startsWith(q)) return 1;
      if (al.includes(q) && !bl.includes(q)) return -1;
      if (!al.includes(q) && bl.includes(q)) return 1;
      return 0;
    });
};

const TaskRow = ({ id, label, checked, onChange, onInfoClick, isInfoActive }) => (
  <div className="task-row">
    <div className="task-header">
      <label className="task-label">
        <input type="checkbox" checked={checked} onChange={() => onChange(id)} />
        <span className="task-title-text">{label}</span>
      </label>
      <button
        className={`info-btn ${isInfoActive ? 'active-info' : ''}`}
        onClick={(e) => { e.preventDefault(); onInfoClick(); }}
        title="Show execution steps"
      >
        {isInfoActive ? '✕' : 'ℹ'}
      </button>
    </div>
  </div>
);

export default function DailyTracker({ onSync }) {
  const todayWorkout = getTodayWorkout();

  const BLANK_LOG = {
    water_liters: 0, shilajit_taken: false, creatine_taken: false, isabgul_taken: false,
    breakfast_logged: false, rule_50_10_followed: false, lunch_logged: false,
    afternoon_snack_logged: false, dinner_logged: false, ashwagandha_taken: false,
    morning_meditation_completed: false, acv_taken: false, multivitamin_taken: false,
    omega3_taken: false, whey_protein_taken: false, post_dinner_walk_completed: false,
    kegels_completed: false, scheduled_workout_completed: false,
    hydration_cutoff_followed: false, screen_curfew_followed: false,
    book_name: '', book_finished: false, weight_kg: null,
  };

  const [log, setLog] = useState(BLANK_LOG);
  const [activeDetail, setActiveDetail] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  // Book autocomplete state
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [readingOpen, setReadingOpen] = useState(false);
  const [bookSaved, setBookSaved] = useState(false);
  // Weight card — controlled input with explicit submit
  const [weightInput, setWeightInput] = useState('');
  const [weightSaved, setWeightSaved] = useState(false);
  const savedWeightRef = useRef(null); // last value confirmed in DB
  // Re-render every minute so suggestion panel and clock recompute
  const [, setTick] = useState(0);
  // Bump to re-trigger the fetch effect (e.g. at 5 AM day boundary)
  const [fetchKey, setFetchKey] = useState(0);
  const waterSyncTimer = useRef(null);
  const weightSyncTimer = useRef(null);
  const syncFailTimer = useRef(null);
  const loadedForDate = useRef(null);
  // Schedule (or re-schedule) notifications whenever the log changes
  useEffect(() => { scheduleNotifications(log); }, [log]);

  // Clean up notification timers on unmount
  useEffect(() => () => clearNotificationTimers(), []);

  useEffect(() => {
    const t = setInterval(() => {
      setTick(n => n + 1);
      // Auto-reset when the effective date advances past 5 AM
      if (loadedForDate.current && loadedForDate.current !== getEffectiveDate()) {
        loadedForDate.current = null;
        setFetchKey(k => k + 1);
      }
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const effectiveDate = getEffectiveDate();
    const cached = getTodayLog();
    if (cached) {
      loadedForDate.current = effectiveDate;
      setLog(cached);
      return;
    }

    // New day — reset to blank defaults immediately so stale data doesn't linger
    setLog(BLANK_LOG);

    const controller = new AbortController();
    fetch(`/.netlify/functions/daily-log?date=${effectiveDate}`, { signal: controller.signal, headers: getAuthHeader() })
      .then(safeJson)
      .then(data => {
        loadedForDate.current = effectiveDate;
        if (data && Object.keys(data).length > 0) {
          setTodayLog(data);
          setLog(data);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error("Failed to load today's log", err);
      });

    return () => controller.abort();
  }, [fetchKey]);

  // Sync weightInput when log loads/reloads from DB (only if different from what we have)
  useEffect(() => {
    if (log.weight_kg != null && log.weight_kg !== savedWeightRef.current) {
      savedWeightRef.current = log.weight_kg;
      setWeightInput(String(log.weight_kg));
    }
  }, [log.weight_kg]);

  // Show a "Sync failed" toast for 5 seconds
  const showSyncFail = () => {
    setSyncFailed(true);
    clearTimeout(syncFailTimer.current);
    syncFailTimer.current = setTimeout(() => setSyncFailed(false), 5000);
  };

  const handleToggle = async (field) => {
    const updatedLog = { ...log, [field]: !log[field] };
    setLog(updatedLog);
    setTodayLog(updatedLog);
    try {
      const res = await fetch('/.netlify/functions/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...updatedLog, log_date: getEffectiveDate() }),
      });
      if (!res.ok) showSyncFail();
    } catch {
      showSyncFail();
    }
  };

  // Debounce water saves — only flush to DB 1 s after the last tap
  const flushWater = (latestLog) => {
    clearTimeout(waterSyncTimer.current);
    waterSyncTimer.current = setTimeout(() => {
      fetch('/.netlify/functions/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...latestLog, log_date: getEffectiveDate() }),
      }).catch(() => showSyncFail());
    }, 1000);
  };

  // Explicit weight save — only calls DB if value actually changed
  const handleWeightSave = async () => {
    const parsed = parseFloat(weightInput);
    if (isNaN(parsed) || parsed <= 0) return;          // invalid — skip
    if (parsed === savedWeightRef.current) return;      // unchanged — skip DB call

    savedWeightRef.current = parsed;
    const updatedLog = { ...log, weight_kg: parsed };
    setLog(updatedLog);
    setTodayLog(updatedLog);

    // Flash saved indicator
    setWeightSaved(true);
    setTimeout(() => setWeightSaved(false), 2000);

    try {
      const res = await fetch('/.netlify/functions/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...updatedLog, log_date: getEffectiveDate() }),
      });
      if (!res.ok) showSyncFail();
    } catch {
      showSyncFail();
    }
  };

  const addWater = () => {
    const newVal = Math.min(parseFloat(((log.water_liters || 0) * 10 + 10) / 10).toFixed(1), 4.0);
    const updatedLog = { ...log, water_liters: newVal };
    setLog(updatedLog);
    setTodayLog(updatedLog);
    flushWater(updatedLog);
  };

  const removeWater = () => {
    const newVal = Math.max(parseFloat(((log.water_liters || 0) * 10 - 10) / 10).toFixed(1), 0);
    const updatedLog = { ...log, water_liters: newVal };
    setLog(updatedLog);
    setTodayLog(updatedLog);
    flushWater(updatedLog);
  };

  // ── Book suggestions fetch ────────────────────────────────────────────────
  useEffect(() => {
    // Load from localStorage if cached within the last hour
    try {
      const raw = localStorage.getItem('lt_books');
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Array.isArray(data) && Date.now() - ts < 5 * 60 * 1000) {
          setBookSuggestions(data);
          return;
        }
      }
    } catch {}
    // Cache miss or expired — fetch from DB
    fetch('/.netlify/functions/daily-log?books=true', { headers: getAuthHeader() })
      .then(safeJson)
      .then(data => {
        if (Array.isArray(data)) {
          setBookSuggestions(data);
          try { localStorage.setItem('lt_books', JSON.stringify({ data, ts: Date.now() })); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // ── Book handlers ─────────────────────────────────────────────────────────
  const saveBook = (latestLog) => {
    fetch('/.netlify/functions/daily-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ ...latestLog, log_date: getEffectiveDate() }),
    })
      .then(() => {
        // Refresh book suggestions so new title appears in dropdown immediately
        if (latestLog.book_name && latestLog.book_name.trim()) {
          fetch('/.netlify/functions/daily-log?books=true', { headers: getAuthHeader() })
            .then(safeJson)
            .then(data => {
              if (Array.isArray(data)) {
                setBookSuggestions(data);
                try { localStorage.setItem('lt_books', JSON.stringify({ data, ts: Date.now() })); } catch {}
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  };

  const handleBookChange = (value) => {
    const updatedLog = { ...log, book_name: value };
    setLog(updatedLog);
    setTodayLog(updatedLog);
    // No DB save on every keystroke — only on explicit save (Enter / button / dropdown select)
    if (value.trim()) {
      setFilteredBooks(fuzzyFilter(bookSuggestions, value));
      setShowBookDropdown(true);
    } else {
      setFilteredBooks(bookSuggestions);
      setShowBookDropdown(bookSuggestions.length > 0);
    }
  };

  const handleBookSave = () => {
    const updatedLog = { ...log };
    setTodayLog(updatedLog);
    saveBook(updatedLog);
    setShowBookDropdown(false);
    setBookSaved(true);
    setTimeout(() => setBookSaved(false), 2500);
  };

  const handleBookSelect = (name) => {
    const updatedLog = { ...log, book_name: name };
    setLog(updatedLog);
    setTodayLog(updatedLog);
    saveBook(updatedLog);
    setShowBookDropdown(false);
  };

  const handleBookFinished = () => {
    const updatedLog = { ...log, book_finished: !log.book_finished };
    setLog(updatedLog);
    setTodayLog(updatedLog);
    fetch('/.netlify/functions/daily-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ ...updatedLog, log_date: getEffectiveDate() }),
    }).catch(() => {});
  };

  // ── Sync handler ──────────────────────────────────────────────────────────
  const handleSync = () => {
    setSyncing(true);
    setFetchKey(k => k + 1);
    // Re-fetch book suggestions from books table
    fetch('/.netlify/functions/daily-log?books=true', { headers: getAuthHeader() })
      .then(safeJson)
      .then(data => {
        if (Array.isArray(data)) {
          setBookSuggestions(data);
          try { localStorage.setItem('lt_books', JSON.stringify({ data, ts: Date.now() })); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setSyncing(false));
    // Notify App to clear cache + bump syncKey so HistoryLog also re-fetches all
    if (onSync) onSync();
  };

  // steps is an optional array — renders as a numbered list in the modal
  const showInfo = (id, title, desc, steps = []) => {
    if (activeDetail?.id === id) setActiveDetail(null);
    else setActiveDetail({ id, title, desc, steps });
  };

  // Derived display values — recomputed each minute via tick state
  const _now = new Date();
  const _isLateNight = _now.getHours() < 5;
  const dtWeekday = _now.toLocaleDateString('en-US', { weekday: 'long' });
  const dtDate    = _now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const dtTime    = _now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="section-container">

      {/* ── Date / Time Header ──────────────────────────── */}
      <div className="dt-header">
        <div className="dt-left">
          <span className="dt-weekday">{dtWeekday}</span>
          <span className="dt-date">{dtDate}</span>
        </div>
        <div className="dt-right">
          <span className="dt-time">{dtTime}</span>
          {_isLateNight && <span className="dt-late-tag">Logging for yesterday</span>}
          <button className="sync-btn" onClick={handleSync} title="Sync with database" disabled={syncing}>
            <span className={syncing ? 'sync-spinning' : ''}>↻</span>
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>

      {/* ── Water Card ──────────────────────────────────── */}
      <div className={`card water-card${log.water_liters >= 4 ? ' water-card-full' : ''}`}>
        <div className="water-visual-row">

          {/* Animated water bottle */}
          <div className={`wbt-outer${log.water_liters >= 4 ? ' wbt-full' : ''}`}>
            <div className="wbt-neck">
              <div className="wbt-cap" />
            </div>
            <div className="wbt-body">
              <div
                className="wbt-fill-wrap"
                style={{ height: `${(log.water_liters / 4) * 100}%` }}
              >
                <div className="wbt-wave-a" />
                <div className="wbt-wave-b" />
                <div className="wbt-water" />
                {log.water_liters > 0 && (
                  <>
                    <div className="wbt-bub wbt-bub1" />
                    <div className="wbt-bub wbt-bub2" />
                    <div className="wbt-bub wbt-bub3" />
                  </>
                )}
              </div>
              <div className="wbt-marks">
                <span className="wbt-mark" style={{ bottom: '75%' }}>3L</span>
                <span className="wbt-mark" style={{ bottom: '50%' }}>2L</span>
                <span className="wbt-mark" style={{ bottom: '25%' }}>1L</span>
              </div>
              <div className="wbt-shine" />
            </div>
          </div>

          {/* Right panel: stats + buttons */}
          <div className="water-right-panel">
            <div className="water-stat-block">
              <div className="water-liters-num">
                {Math.round(parseFloat(log.water_liters || 0))}
                <span className="water-of-goal"> / 4L</span>
                {log.water_liters >= 4 && (
                  <span className="water-goal-badge">✓ Goal Complete</span>
                )}
              </div>
              <div className="water-stat-label">Hydration Today</div>
            </div>
            <p className="water-tip">Drink from a 1L bottle. Finish before 11:30 PM cut-off.</p>
            <div className="water-btns">
              <button
                className="water-btn-remove"
                onClick={removeWater}
                disabled={log.water_liters <= 0}
                aria-label="Remove 1 litre"
              >
                −1L
              </button>
              <button
                className="water-btn-add"
                onClick={addWater}
                disabled={log.water_liters >= 4}
                aria-label="Add 1 litre"
              >
                +1L
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Sync failed toast ───────────────────────────── */}
      {syncFailed && (
        <div className="sync-fail-toast">⚠️ Sync failed — check your connection</div>
      )}

      {/* ── Book saved toast ────────────────────────────── */}
      {bookSaved && <div className="book-toast">📚 Book saved!</div>}

      {/* ── Weight Card ─────────────────────────────────── */}
      <div className="card weight-card-inline">
        <span className="weight-card-icon">⚖️</span>
        <span className="weight-card-label">Body Weight</span>
        {weightSaved && <span className="weight-saved-badge">✓ Saved</span>}
        <input
          type="number"
          className="weight-input"
          placeholder="-- kg"
          step="0.1"
          min="30"
          max="300"
          value={weightInput}
          onChange={e => setWeightInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleWeightSave(); } }}
        />
        <span className="weight-unit">kg</span>
        <button
          className={`weight-submit-btn${weightSaved ? ' weight-submit-btn--saved' : ''}`}
          onClick={handleWeightSave}
          title="Save weight"
        >
          ✓
        </button>
      </div>

      {/* ── Reading Today Card ──────────────────────────── */}
      <div className="card reading-card">
        <div className="reading-header" onClick={() => setReadingOpen(o => !o)} style={{ cursor: 'pointer' }}>
          <span>📚</span>
          <h3>Reading Today?</h3>
          <span className="reading-toggle">{readingOpen ? '▲' : '▼'}</span>
        </div>
        {readingOpen && (
          <>
            <div className="reading-input-wrap">
              <input
                type="text"
                className="reading-input"
                placeholder="Enter book title…"
                value={log.book_name || ''}
                autoComplete="off"
                onChange={e => handleBookChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleBookSave(); } }}
                onFocus={() => {
                  const val = (log.book_name || '').trim();
                  setFilteredBooks(val ? fuzzyFilter(bookSuggestions, val) : bookSuggestions);
                  setShowBookDropdown(bookSuggestions.length > 0);
                }}
                onBlur={() => setTimeout(() => setShowBookDropdown(false), 150)}
              />
              <button className="book-save-btn" onMouseDown={handleBookSave} title="Save book">✓</button>
              {showBookDropdown && filteredBooks.length > 0 && (
                <ul className="book-dropdown">
                  {filteredBooks.map((b, i) => (
                    <li key={i} onMouseDown={() => handleBookSelect(b)}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
            <label className="reading-finished">
              <input
                type="checkbox"
                checked={!!log.book_finished}
                onChange={handleBookFinished}
              />
              <span>Finished this book today</span>
            </label>
          </>
        )}
      </div>

      {/* ── Smart Suggestions Panel ─────────────────────── */}
      {(() => {
        const suggestions = getSuggestions(log);
        if (suggestions.length === 0) return null;
        return (
          <div className="suggestions-panel">
            <div className="suggestions-heading">
              <span>📋 Now &amp; Upcoming</span>
              <button
                className="suggestions-toggle"
                onClick={() => setShowSuggestions(v => !v)}
              >
                {showSuggestions ? 'Hide' : `Show (${suggestions.length})`}
              </button>
            </div>
            {showSuggestions && suggestions.map(s => (
              <div
                key={s.field}
                className={[
                  'suggestion-item',
                  s.kind === 'overdue' ? 'suggestion-overdue' : '',
                  log[s.field] ? 'suggestion-done' : '',
                ].join(' ').trim()}
              >
                <span className="suggestion-emoji">{s.emoji}</span>
                <div className="suggestion-content">
                  <div className="suggestion-label">{s.label}</div>
                  {s.kind === 'overdue' && (
                    <span className="suggestion-missed-tag">Missed</span>
                  )}
                </div>
                <button
                  className={`info-btn suggestion-info-btn${activeDetail?.id === s.field ? ' active-info' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const info = getInfoForField(s.field, todayWorkout);
                    if (info) showInfo(s.field, info.title, info.desc, info.steps);
                  }}
                  title="Show steps"
                >
                  {activeDetail?.id === s.field ? '✕' : 'ℹ'}
                </button>
                <label className="suggestion-check" title="Mark complete">
                  <input
                    type="checkbox"
                    checked={!!log[s.field]}
                    onChange={() => handleToggle(s.field)}
                  />
                </label>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="grid-stack">

        {/* ── Morning ─────────────────────────────────── */}
        <h3>🌅 Morning Launch (7:30 AM – 9:00 AM)</h3>

        <TaskRow
          id="shilajit_taken" label="🧪 7:30 AM — Shilajit (empty stomach)"
          checked={log.shilajit_taken} onChange={handleToggle}
          onInfoClick={() => showInfo('shilajit_taken', '🧪 Shilajit',
            'Take on a completely empty stomach in the morning before food or coffee.',
            [
              'Pour 250 ml of warm (not boiling) water into a glass.',
              'Dissolve a pea-sized piece of Shilajit resin by stirring for 30 seconds.',
              'Drink immediately — before food or coffee. Wait 20 minutes before eating.',
              'Why warm water: it dissolves the resin fully and improves bioavailability.',
              'Why morning: Shilajit boosts mitochondrial energy and sets a positive metabolic tone for the day.',
              'Note: Creatine is now taken post-workout at 8 PM (with Whey Protein) for better muscle uptake.',
            ])}
          isInfoActive={activeDetail?.id === 'shilajit_taken'}
        />

        <TaskRow
          id="morning_meditation_completed" label="🧘 7:45 AM — Morning Meditation (20 min)"
          checked={log.morning_meditation_completed} onChange={handleToggle}
          onInfoClick={() => showInfo('morning_meditation_completed', '🧘 Morning Meditation',
            'This 20-minute window lets the Shilajit absorb before you eat.',
            [
              'Find a quiet, comfortable sitting position — chair or floor, spine upright.',
              'Set a timer for 20 minutes. Place your phone face-down.',
              'Close your eyes. Breathe in slowly through your nose for 4 counts.',
              'Hold for 2 counts, then exhale through your mouth for 6 counts.',
              'When thoughts arise, acknowledge them and gently return to your breath. No judgment.',
              'When the timer ends, take one deep breath before opening your eyes.',
            ])}
          isInfoActive={activeDetail?.id === 'morning_meditation_completed'}
        />

        <TaskRow
          id="isabgul_taken" label="🌾 8:15 AM — Isabgul Psyllium Husk"
          checked={log.isabgul_taken} onChange={handleToggle}
          onInfoClick={() => showInfo('isabgul_taken', '🌾 Isabgul (Psyllium Husk)',
            'A soluble fibre that slows glucose absorption and keeps you full through the morning.',
            [
              'Measure 1 heaped teaspoon (about 5 g) of Isabgul husk.',
              'Add to a full glass (250 ml) of room-temperature water.',
              'Stir for 5 seconds, then drink it IMMEDIATELY — it turns into a thick gel within 60 seconds.',
              'Follow with another half-glass of plain water.',
              'Why: Do not let it sit — a thick gel is harder to swallow and less effective.',
            ])}
          isInfoActive={activeDetail?.id === 'isabgul_taken'}
        />

        <TaskRow
          id="breakfast_logged" label="🍳 8:30 AM — 3 Boiled Eggs & Fruit"
          checked={log.breakfast_logged} onChange={handleToggle}
          onInfoClick={() => showInfo('breakfast_logged', '🍳 Breakfast — Boiled Eggs & Fruit',
            'High-protein, low-effort breakfast. Takes about 12 minutes to make fresh.',
            [
              'Fill a small pot with enough cold water to fully cover 3 eggs.',
              'Bring to a rolling boil on high heat.',
              'Gently lower 3 whole eggs into the boiling water using a spoon.',
              'Set a timer for exactly 9 minutes for firm, fully set yolks.',
              'Transfer eggs immediately to cold tap water for 2 minutes (stops overcooking and makes peeling easier).',
              'Peel and eat with a pinch of salt.',
              'Eat alongside 1 apple (sliced) or 1 banana.',
            ])}
          isInfoActive={activeDetail?.id === 'breakfast_logged'}
        />

        {/* ── Mid-Day ─────────────────────────────────── */}
        <h3>🖥️ Work & Mid-Day (9:00 AM – 4:00 PM)</h3>

        <TaskRow
          id="rule_50_10_followed" label="🪑 Desk Habit — 50/10 Rule & Posture"
          checked={log.rule_50_10_followed} onChange={handleToggle}
          onInfoClick={() => showInfo('rule_50_10_followed', '🪑 50/10 Rule & Posture',
            'Sitting for 50+ minutes raises cortisol and compresses the spine. This breaks the damage.',
            [
              'Set a repeating timer on your phone for every 50 minutes.',
              'When it goes off: stand up, walk out of the room, pace for 10 full minutes.',
              'Each time you stand up: step into a doorway, place your hands on the frame at shoulder height, and lean forward gently until you feel your chest open. Hold for 30 seconds.',
              'While sitting: feet flat on the floor, screen at eye level, lower back supported.',
              'Keep your 1-litre water bottle on the desk — refill it every time you return from a break.',
            ])}
          isInfoActive={activeDetail?.id === 'rule_50_10_followed'}
        />

        <TaskRow
          id="kegels_completed" label="🔄 Desk Habit — Pelvic Floor (Kegels)"
          checked={log.kegels_completed} onChange={handleToggle}
          onInfoClick={() => showInfo('kegels_completed', '🔄 Pelvic Floor Exercises (Kegels)',
            'Invisible exercise you can do sitting at your desk. 3 sets, anytime between 9 AM and 4 PM.',
            [
              'Sit normally in your chair. No one will know you are doing this.',
              'Identify the muscles: imagine you are stopping yourself from urinating mid-stream. Those are your pelvic floor muscles.',
              'Contract those muscles firmly. Hold for 5 seconds. Relax for 5 seconds. That is 1 rep.',
              'Do 10–15 reps. Rest 60 seconds. Repeat for 3 sets.',
              'Benefit: improves urinary control, core stability, and testosterone output over time.',
            ])}
          isInfoActive={activeDetail?.id === 'kegels_completed'}
        />

        <TaskRow
          id="acv_taken" label="🥤 1:00 PM — ACV Pre-Lunch Drink"
          checked={log.acv_taken} onChange={handleToggle}
          onInfoClick={() => showInfo('acv_taken', '🥤 Apple Cider Vinegar (ACV) Drink',
            'Taken 15 minutes before lunch, ACV blunts the blood sugar spike from rice.',
            [
              'Pour 250 ml of water into a glass.',
              'Add exactly 1 tablespoon (15 ml) of Apple Cider Vinegar — use one with "the mother" (cloudy appearance).',
              'Stir briefly. Drink through a straw to protect tooth enamel from the acid.',
              'Do not drink undiluted ACV — it will damage your oesophagus and teeth.',
              'Drink this 10–15 minutes before your meal for maximum effect on blood sugar.',
            ])}
          isInfoActive={activeDetail?.id === 'acv_taken'}
        />

        <TaskRow
          id="lunch_logged" label="🍱 1:15 PM — Office Lunch (Rice, Dal & Protein)"
          checked={log.lunch_logged} onChange={handleToggle}
          onInfoClick={() => showInfo('lunch_logged', '🍱 Daily Lunch Preparation',
            'Prepare fresh each morning before work. Total active time: ~30 minutes.',
            [
              'Rice: Rinse 100 g (1 small katori) of white rice under cold water until clear. Add 150 ml water, bring to a boil, reduce to lowest heat, cover, and simmer for 12–15 minutes until all water is absorbed.',
              'Masoor Dal: Rinse ½ cup of red lentils (masoor dal) until water runs clear. Boil with 1 cup water, ½ tsp turmeric, and salt to taste for 15–18 minutes until a very thick paste forms. Tadka: heat 1 tsp mustard oil in a small pan, add 1 dried red chilli and 3 crushed garlic cloves for 15 seconds, then pour over the dal and mix.',
              'Protein: Pat 150 g chicken breast or 2 fish pieces dry with a paper towel. Rub with salt, ¼ tsp turmeric, and a squeeze of lemon. Sear in a hot pan with 1 tsp oil — chicken: 6–7 min each side; fish: 4–5 min each side — until golden and cooked through.',
              'Side: Slice 1 cucumber.',
              'Pack rice, dal, protein, and cucumber into separate airtight lunch containers. Refrigerate until you leave for work.',
            ])}
          isInfoActive={activeDetail?.id === 'lunch_logged'}
        />

        <TaskRow
          id="multivitamin_taken" label="💊 1:45 PM — Multivitamin & Omega-3"
          checked={log.multivitamin_taken} onChange={handleToggle}
          onInfoClick={() => showInfo('multivitamin_taken', '💊 Multivitamin & Omega-3',
            'Take with the last bites of your meal — fat from food improves Omega-3 absorption.',
            [
              'Take 1 Multivitamin tablet. Swallow with a full glass of water.',
              'Take 1 Omega-3 Fish Oil capsule (1000 mg). Swallow with water.',
              'Do not take on an empty stomach — the fat-soluble vitamins (A, D, E, K) in the multi need dietary fat to be absorbed.',
              'Why Omega-3: reduces inflammation, supports joint recovery, and improves insulin sensitivity.',
            ])}
          isInfoActive={activeDetail?.id === 'multivitamin_taken'}
        />

        <TaskRow
          id="afternoon_snack_logged" label="☕ 4:00 PM — Black Coffee & Almonds"
          checked={log.afternoon_snack_logged} onChange={handleToggle}
          onInfoClick={() => showInfo('afternoon_snack_logged', '☕ 4:00 PM Energy Snack',
            'A clean pre-evening energy boost. Keep it minimal — this is not a meal.',
            [
              'Option A: Brew 1 cup of black coffee (no sugar, no milk). Drink within 20 minutes of brewing.',
              'Option B: Squeeze half a lemon into 250 ml cold water with a pinch of salt (Lebur Jol). Sugar-free and refreshing.',
              'Eat exactly 5–6 whole almonds or 4–5 walnuts alongside.',
              'Do not eat more than this — the goal is to bridge the gap to dinner, not to have a full snack.',
              'Avoid caffeine after 5:00 PM — it will compromise your sleep quality.',
            ])}
          isInfoActive={activeDetail?.id === 'afternoon_snack_logged'}
        />

        {/* ── Evening ─────────────────────────────────── */}
        <h3>🏋️ Evening Session (7:00 PM – 10:00 PM)</h3>

        <TaskRow
          id="scheduled_workout_completed"
          label={`🏋️ 7:00 PM — ${todayWorkout.day === 'Sunday' ? 'Rest Day' : `Workout: ${todayWorkout.focus}`}`}
          checked={log.scheduled_workout_completed}
          onChange={handleToggle}
          onInfoClick={() => showInfo(
            'scheduled_workout_completed',
            `🏋️ ${todayWorkout.day}: ${todayWorkout.focus}`,
            todayWorkout.day === 'Sunday'
              ? 'Today is your rest day. No training needed.'
              : `Today is ${todayWorkout.day}. Follow the steps below in order.`,
            todayWorkout.steps,
          )}
          isInfoActive={activeDetail?.id === 'scheduled_workout_completed'}
        />

        <TaskRow
          id="whey_protein_taken" label="🥛 8:00 PM — Post-Workout Whey Protein"
          checked={log.whey_protein_taken} onChange={handleToggle}
          onInfoClick={() => showInfo('whey_protein_taken', '🥛 Post-Workout Whey Protein',
            'The anabolic window: consume within 45 minutes of finishing your workout.',
            [
              'Measure 1 level scoop of Whey Protein Concentrate or Isolate.',
              'Add 250–300 ml of cold water to a shaker bottle.',
              'Add the protein powder, seal, and shake vigorously for 10 seconds.',
              'Drink immediately. Do not let it sit — it becomes lumpy.',
              'Use water, not milk. Milk slows absorption; water is faster post-workout.',
              'Skip on Sunday (rest day) unless you genuinely feel you need it.',
            ])}
          isInfoActive={activeDetail?.id === 'whey_protein_taken'}
        />

        <TaskRow
          id="dinner_logged" label="🍽️ 8:30 PM — High-Protein Dinner"
          checked={log.dinner_logged} onChange={handleToggle}
          onInfoClick={() => showInfo('dinner_logged', '🍽️ High-Protein Dinner Preparation',
            'Zero starchy carbs. High protein, high fibre from vegetables. Cook fresh nightly — takes 15 minutes.',
            [
              'Take 150 g chicken breast or 2 fish pieces from the fridge. Pat completely dry with a paper towel (moisture prevents browning).',
              'Season both sides generously: salt, a pinch of black pepper, ¼ tsp turmeric, and a squeeze of lemon.',
              'Heat a non-stick or cast-iron pan on HIGH heat for 90 seconds. Add 1 tsp oil — it should shimmer immediately.',
              'Chicken: sear 6–7 minutes per side without moving it, until the top surface looks opaque. Fish: 4–5 minutes per side.',
              'While protein cooks, steam vegetables: add broccoli florets, green beans, or spinach to a covered pot with 3 tbsp water. Steam on medium heat for 3–4 minutes until tender-crisp.',
              'Plate and eat immediately. No rice, no bread, no roti.',
            ])}
          isInfoActive={activeDetail?.id === 'dinner_logged'}
        />

        <TaskRow
          id="ashwagandha_taken" label="🌿 8:35 PM — Ashwagandha AF-43 600mg"
          checked={log.ashwagandha_taken} onChange={handleToggle}
          onInfoClick={() => showInfo('ashwagandha_taken', '🌿 Ashwagandha AF-43 (600 mg)',
            'Take immediately after finishing dinner — fat and protein in the meal improve absorption and prevent stomach upset.',
            TASK_INFO_MAP.ashwagandha_taken.steps)}
          isInfoActive={activeDetail?.id === 'ashwagandha_taken'}
        />

        <TaskRow
          id="post_dinner_walk_completed" label="🚶 9:15 PM — Post-Dinner Walk (30 min)"
          checked={log.post_dinner_walk_completed} onChange={handleToggle}
          onInfoClick={() => showInfo('post_dinner_walk_completed', '🚶 Post-Dinner Walk',
            'Walking after a high-protein meal dramatically improves glucose clearance and digestion.',
            [
              'Head outside within 15 minutes of finishing dinner.',
              'Walk at a brisk pace — arms should be swinging, breathing slightly elevated.',
              'Target 30 minutes continuous walking (roughly 3,000 steps).',
              'No phone scrolling while walking. Focus on your breath or the environment.',
              'On bad weather days: march in place at home for 30 minutes or do 15 minutes of slow pacing indoors.',
            ])}
          isInfoActive={activeDetail?.id === 'post_dinner_walk_completed'}
        />

        {/* ── Night ───────────────────────────────────── */}
        <h3>🌙 Wind-Down (11:30 PM – 12:30 AM)</h3>

        <TaskRow
          id="hydration_cutoff_followed" label="💧 11:30 PM — Hydration Cut-off"
          checked={log.hydration_cutoff_followed} onChange={handleToggle}
          onInfoClick={() => showInfo('hydration_cutoff_followed', '💧 Hydration Cut-off',
            'Stopping fluid intake 1 hour before sleep prevents you from waking up to urinate.',
            [
              'Finish your last glass of water by 11:30 PM.',
              'Make sure your water goal (4 litres) is complete before this point.',
              'A small sip to take supplements or pills is fine — not a full glass.',
              'If you wake up in the night feeling thirsty, you are not drinking enough during the day.',
            ])}
          isInfoActive={activeDetail?.id === 'hydration_cutoff_followed'}
        />

        <TaskRow
          id="screen_curfew_followed" label="📴 12:00 AM — Screen Curfew & Night Meditation"
          checked={log.screen_curfew_followed} onChange={handleToggle}
          onInfoClick={() => showInfo('screen_curfew_followed', '📴 Screen Curfew & Night Meditation',
            'Blue light suppresses melatonin for up to 2 hours. Screens off by midnight for 12:30 AM sleep.',
            [
              'At 12:00 AM exactly: lock your phone, turn off your monitors.',
              'Set your phone alarm for 7:30 AM and place it across the room (forces you out of bed).',
              'Sit in a comfortable position in dim or no light.',
              'Close your eyes. Do a body scan: mentally relax each part from feet upward — feet, calves, thighs, abdomen, chest, shoulders, neck, face.',
              'Continue slow breathing for 15–20 minutes until you feel genuinely drowsy.',
              'Lie down and sleep by 12:30 AM for a full 7-hour sleep cycle ending at 7:30 AM.',
            ])}
          isInfoActive={activeDetail?.id === 'screen_curfew_followed'}
        />

      </div>

      {/* ── Info Modal ──────────────────────────────────── */}
      {activeDetail && (
        <div className="detailed-info-overlay" onClick={() => setActiveDetail(null)}>
          <div className="detailed-info-box" onClick={e => e.stopPropagation()}>
            <div className="detailed-info-header">
              <h3>Execution Guide</h3>
              <button className="close-btn" onClick={() => setActiveDetail(null)}>✕</button>
            </div>
            <h4>{activeDetail.title}</h4>
            {activeDetail.desc && <p>{activeDetail.desc}</p>}
            {activeDetail.steps?.length > 0 && (
              <ol className="detail-steps">
                {activeDetail.steps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
