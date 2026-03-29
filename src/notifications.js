/**
 * Browser Notifications — schedules Web Notifications for upcoming tasks.
 * No backend required. Timers are re-created each time scheduleNotifications()
 * is called (e.g. when the log changes or the app loads).
 */

const TASKS = [
  { minuteOfDay: 450,  field: 'shilajit_taken',              title: '🧪 Shilajit',                  body: 'Morning Shilajit — empty stomach, warm water' },
  { minuteOfDay: 465,  field: 'morning_meditation_completed', title: '🧘 Morning Meditation',         body: '20-minute meditation session' },
  { minuteOfDay: 495,  field: 'isabgul_taken',                title: '🌾 Isabgul Husk',               body: 'Take your psyllium husk now' },
  { minuteOfDay: 510,  field: 'breakfast_logged',             title: '🍳 Breakfast',                  body: 'Boiled eggs & fruit — fuel up' },
  { minuteOfDay: 540,  field: 'rule_50_10_followed',          title: '🪑 50/10 Desk Rule',            body: 'Start your first desk break timer' },
  { minuteOfDay: 780,  field: 'acv_taken',                    title: '🥤 ACV Pre-Lunch',              body: 'Drink ACV 15 minutes before lunch' },
  { minuteOfDay: 795,  field: 'lunch_logged',                 title: '🍱 Lunch Time',                 body: 'Rice, dal & protein' },
  { minuteOfDay: 960,  field: 'afternoon_snack_logged',       title: '☕ Afternoon Snack',            body: 'Black coffee/tea & almonds' },
  { minuteOfDay: 1140, field: 'scheduled_workout_completed',  title: '🏋️ Workout Time',              body: "Time to train — let's go" },
  { minuteOfDay: 1200, field: 'whey_protein_taken',           title: '🥛 Whey + Creatine',           body: 'Post-workout shake + 5g creatine now' },
  { minuteOfDay: 1230, field: 'dinner_logged',                title: '🍽️ Dinner Time',               body: 'High-protein, zero starchy carbs' },
  { minuteOfDay: 1275, field: 'post_dinner_walk_completed',   title: '🚶 Post-Dinner Walk',           body: '30-minute walk for digestion' },
  { minuteOfDay: 1410, field: 'hydration_cutoff_followed',    title: '💧 Hydration Cut-off',          body: 'Last glass of water by 11:30 PM' },
  { minuteOfDay: 1440, field: 'screen_curfew_followed',       title: '📴 Screen Curfew',              body: 'Screens off — start night meditation' },
];

let _timers = [];

function clearTimers() {
  _timers.forEach(clearTimeout);
  _timers = [];
}

/** ms until the given minute-of-day (next occurrence). */
function msUntil(minuteOfDay) {
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const todayMs = now.setHours(0, 0, 0, 0); // midnight of today
  const targetMs = todayMs + minuteOfDay * 60_000;
  // If it's already past today, schedule for tomorrow
  const diff = targetMs - Date.now();
  return diff > 0 ? diff : diff + 24 * 60 * 60_000;
}

/** Fire a browser notification (only when app is not in the foreground). */
function notify(title, body) {
  if (document.visibilityState === 'visible') return;
  try {
    new Notification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
    });
  } catch {}
}

/** Request permission. Call on an explicit user gesture. */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return await Notification.requestPermission();
}

/**
 * Schedule notifications for all tasks that aren't yet done.
 * Safe to call repeatedly — clears previous timers first.
 */
export function scheduleNotifications(log) {
  clearTimers();
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  for (const task of TASKS) {
    if (log[task.field]) continue; // already completed — skip
    const delay = msUntil(task.minuteOfDay);
    if (delay > 23 * 60 * 60_000) continue; // >23 h away — skip (avoid drift)
    const t = setTimeout(() => notify(task.title, task.body), delay);
    _timers.push(t);
  }
}

/** Stop all pending notification timers (e.g. on app unmount). */
export function clearNotificationTimers() {
  clearTimers();
}
