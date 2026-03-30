/**
 * Browser Notifications — minute-interval polling instead of long setTimeout.
 *
 * WHY: setTimeout with multi-hour delays is throttled/frozen by every modern
 * browser for inactive tabs and PWAs. A 60-second setInterval aligned to the
 * clock minute is the only reliable approach without a backend push service.
 *
 * HOW:
 *  - On load: align to the next wall-clock minute, then tick every 60 s
 *  - Each tick: compare current minute-of-day against task schedule
 *  - ±1 min tolerance absorbs any interval drift
 *  - _notifiedToday Set prevents re-firing the same task twice in one day
 *  - Daily reset via localStorage date key
 */

const TASKS = [
  {
    minuteOfDay: 450,
    field: 'shilajit_taken',
    title: '🧪 Shilajit — Right Now',
    body: 'Empty stomach. Dissolve in warm water and drink before anything else.',
    important: false,
  },
  {
    minuteOfDay: 465,
    field: 'morning_meditation_completed',
    title: '🧘 Sit Down and Breathe',
    body: '20 minutes. Phone face-down. This sets the tone for everything today.',
    important: false,
  },
  {
    minuteOfDay: 495,
    field: 'isabgul_taken',
    title: '🌾 Isabgul Husk',
    body: 'Mix in water and drink immediately — before it turns into gel.',
    important: false,
  },
  {
    minuteOfDay: 510,
    field: 'breakfast_logged',
    title: '🍳 Breakfast Time',
    body: 'Boiled eggs + fruit. Eat before 9 AM — protein first, always.',
    important: false,
  },
  {
    minuteOfDay: 540,
    field: 'rule_50_10_followed',
    title: '🪑 Start Your 50-Minute Timer',
    body: 'Set it now. Walk when it rings. Your spine will thank you.',
    important: false,
  },
  {
    minuteOfDay: 720,
    field: 'kegels_completed',
    title: '💪 Kegel Reminder',
    body: '3 sets × 10-15 reps right now. Silent, invisible, takes 90 seconds.',
    important: false,
  },
  {
    minuteOfDay: 780,
    field: 'acv_taken',
    title: '🥤 ACV — Drink It Now',
    body: '1 tbsp in water, 15 minutes before lunch. Blunts your blood sugar spike.',
    important: false,
  },
  {
    minuteOfDay: 795,
    field: 'lunch_logged',
    title: '🍱 Lunch Time',
    body: 'Rice, dal, protein. Chew slowly — give it 20 minutes.',
    important: false,
  },
  {
    minuteOfDay: 825,
    field: 'multivitamin_taken',
    title: '💊 Multivitamin',
    body: 'Take it right after your last bite — absorption is best with food.',
    important: false,
  },
  {
    minuteOfDay: 826,
    field: 'omega3_taken',
    title: '🐟 Omega-3 Capsule',
    body: 'Triple-strength fish oil now. Take with food for best absorption.',
    important: false,
  },
  {
    minuteOfDay: 960,
    field: 'afternoon_snack_logged',
    title: '☕ Afternoon Fuel',
    body: 'Black coffee or tea + 5 almonds. No sugar. You\'re 3 hours from the workout.',
    important: false,
  },
  {
    minuteOfDay: 1140,
    field: 'scheduled_workout_completed',
    title: '🏋️ Workout — Let\'s Go',
    body: 'The hardest part is lacing up. You\'ve already done that a hundred times.',
    important: true,
  },
  {
    minuteOfDay: 1200,
    field: 'whey_protein_taken',
    title: '🥛 Post-Workout Window Open',
    body: 'Whey + 5g creatine in the next 45 min. Muscle repair starts now.',
    important: false,
  },
  {
    minuteOfDay: 1230,
    field: 'dinner_logged',
    title: '🍽️ Dinner',
    body: 'High-protein, zero starchy carbs. Chicken or fish + vegetables. Cook fresh.',
    important: false,
  },
  {
    minuteOfDay: 1245,
    field: 'ashwagandha_taken',
    title: '🌿 Ashwagandha',
    body: 'Take your 600mg capsule right after the last bite of dinner.',
    important: false,
  },
  {
    minuteOfDay: 1275,
    field: 'post_dinner_walk_completed',
    title: '🚶 Walk It Off',
    body: '30 minutes outside. Clears lactic acid, aids protein absorption, calms the mind.',
    important: false,
  },
  {
    minuteOfDay: 1410,
    field: 'hydration_cutoff_followed',
    title: '💧 Last Glass of Water',
    body: 'Drink now and stop. This prevents 3 AM bathroom trips.',
    important: false,
  },
  {
    minuteOfDay: 1440,
    field: 'screen_curfew_followed',
    title: '📴 Screens Off — Sleep Protocol',
    body: '15 minutes of night meditation, then lights out. 7 hours starts now.',
    important: true,
  },

  // ── Weekend restock reminders (daysOfWeek: 6=Sat, 0=Sun) ─────────────────
  {
    id:          'restock_sat',
    field:       null,              // not tied to a log field — fires unconditionally
    minuteOfDay: 600,               // 10:00 AM Saturday
    daysOfWeek:  [6],
    title:       '🛒 Grocery Day',
    body:        'Stock up: eggs, chicken, fish, dal, rice, vegetables, almonds. New week starts Monday.',
    important:   false,
  },
  {
    id:          'restock_sun',
    field:       null,
    minuteOfDay: 660,               // 11:00 AM Sunday
    daysOfWeek:  [0],
    title:       '🛒 Last Chance to Restock',
    body:        'Week starts tomorrow. Check: eggs, chicken, fish, psyllium husk, ACV, almonds.',
    important:   false,
  },
];

// ── Internal state ────────────────────────────────────────────────────────────

let _interval   = null;   // the 60-second repeating timer
let _alignTimer = null;   // one-shot timer that aligns to the next wall-clock minute
const _notifiedToday = new Set(); // fields already notified this calendar day

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Clear the notified-today set when the calendar date changes. */
function maybeResetDaily() {
  const today = new Date().toDateString();
  if (localStorage.getItem('lt_notif_date') !== today) {
    _notifiedToday.clear();
    localStorage.setItem('lt_notif_date', today);
  }
}

/** Show a browser notification. Skips if app is in the foreground. */
function notify(task) {
  if (document.visibilityState === 'visible') return;
  try {
    new Notification(task.title, {
      body:              task.body,
      icon:              '/icon.svg',
      badge:             '/icon.svg',
      tag:               `lt-${task.field}`,   // collapses duplicate alerts
      renotify:          false,
      requireInteraction: task.important,       // high-priority stay until dismissed
      silent:            false,
    });
  } catch { /* permission revoked mid-session or unsupported */ }
}

/** Core check — fires any task whose scheduled minute matches right now. */
function checkAndNotify(log) {
  maybeResetDaily();

  const now        = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const dayOfWeek  = now.getDay(); // 0=Sun … 6=Sat

  for (const task of TASKS) {
    // Skip if restricted to specific days and today isn't one of them
    if (task.daysOfWeek && !task.daysOfWeek.includes(dayOfWeek)) continue;

    // Use field as dedup key; fall back to id for field-less tasks (e.g. restock)
    const key = task.field ?? task.id;

    if (task.field && log?.[task.field]) continue; // already completed today
    if (_notifiedToday.has(key))         continue; // already notified today

    // ±1 min tolerance absorbs any interval alignment drift
    if (Math.abs(task.minuteOfDay - currentMin) <= 1) {
      notify(task);
      _notifiedToday.add(key);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Request permission — must be called from a user gesture. */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return await Notification.requestPermission();
}

/**
 * Start the notification scheduler.
 *
 * Uses a 60-second interval aligned to the wall-clock minute — the ONLY
 * approach that survives browser tab throttling for long delays.
 *
 * Safe to call repeatedly — clears previous timers first.
 * Call whenever `log` changes so completed tasks are excluded immediately.
 */
export function scheduleNotifications(log) {
  // Clear any previous timers
  if (_interval)   { clearInterval(_interval);  _interval   = null; }
  if (_alignTimer) { clearTimeout(_alignTimer); _alignTimer = null; }

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Check immediately — catches the case where the app opened right at a scheduled time
  checkAndNotify(log);

  // Align the interval to the next exact minute boundary (e.g. HH:MM:00)
  // so checks always happen right at the scheduled time, not drifted
  const msToNextMinute = 60_000 - (Date.now() % 60_000);
  _alignTimer = setTimeout(() => {
    _alignTimer = null;
    checkAndNotify(log);
    _interval = setInterval(() => checkAndNotify(log), 60_000);
  }, msToNextMinute);
}

/** Stop all timers (call on app unmount). */
export function clearNotificationTimers() {
  if (_interval)   { clearInterval(_interval);  _interval   = null; }
  if (_alignTimer) { clearTimeout(_alignTimer); _alignTimer = null; }
}
