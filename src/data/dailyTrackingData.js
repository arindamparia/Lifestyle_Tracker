export const WORKOUT_ROTATION = {
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

export const getTodayWorkout = () => {
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return { day, ...(WORKOUT_ROTATION[day] || WORKOUT_ROTATION.Sunday) };
};

// ── Smart suggestion schedule ─────────────────────────────────────────────
// Each task with its scheduled minute-of-day (0 = midnight, 450 = 7:30 AM…)
// Used to compute the ±30-min window and the 4-hour overdue check.
export const TASK_SCHEDULE = [
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

// Returns the TASK_SCHEDULE entry that is currently active (start time passed,
// next task hasn't started yet). Used to render the "Now" pill in the header.
export const getActiveTask = () => {
  const now = new Date();
  const raw = now.getHours() * 60 + now.getMinutes();
  const t = raw < 90 ? raw + 1440 : raw; // shift past-midnight times
  for (let i = 0; i < TASK_SCHEDULE.length; i++) {
    const itemMins = TASK_SCHEDULE[i].time < 90 ? TASK_SCHEDULE[i].time + 1440 : TASK_SCHEDULE[i].time;
    const nextMins = i + 1 < TASK_SCHEDULE.length
      ? (TASK_SCHEDULE[i + 1].time < 90 ? TASK_SCHEDULE[i + 1].time + 1440 : TASK_SCHEDULE[i + 1].time)
      : 1440 + 90;
    if (t >= itemMins && t < nextMins) return TASK_SCHEDULE[i];
  }
  return null;
};

// Returns up to 3 suggestions:
//   • any task whose scheduled time falls within ±30 min of now (done or not)
//   • any task that was scheduled 30–240 min ago and is still NOT done (overdue)
// Returns [] when nothing qualifies (panel is hidden entirely).
export const getSuggestions = (log) => {
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
export const TASK_INFO_MAP = {
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
    desc: 'This 20-minute window also lets the Shilajit absorb before you eat.',
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

export const getInfoForField = (field, todayWorkout) => {
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
