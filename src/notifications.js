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

/**
 * Show a notification.
 * - App is VISIBLE → dispatch a custom DOM event so the React app can show
 *   an in-app toast instead of an intrusive OS popup.
 * - App is BACKGROUNDED → fire a real OS notification via the Service Worker
 *   (required on Android; falls back to new Notification() on desktop).
 */
async function notify(task) {
  if (document.visibilityState === 'visible') {
    // In-app toast: let the React layer handle display
    window.dispatchEvent(new CustomEvent('lt:notify', {
      detail: { title: task.title, body: task.body },
    }));
    return;
  }

  const opts = {
    body:               task.body,
    icon:               '/icon.svg',
    badge:              '/icon.svg',
    tag:                `lt-${task.field ?? task.id}`,
    renotify:           false,
    requireInteraction: task.important,
    silent:             false,
  };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(task.title, opts);
    } else {
      new Notification(task.title, opts);
    }
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
 * Calculates the next Unix timestamp (ms) for a task to fire.
 *
 * Rules:
 *  - If the scheduled time already passed today → schedule tomorrow
 *  - If the task is already completed in today's log → schedule tomorrow
 *  - For daysOfWeek-restricted tasks → advance to the next valid weekday
 *  - Returns null if no valid day found within 7 days
 */
function getNextTriggerTimestamp(task, log) {
  const now = new Date();

  const candidate = new Date(now);
  candidate.setHours(Math.floor(task.minuteOfDay / 60), task.minuteOfDay % 60, 0, 0);

  const alreadyPassed    = candidate.getTime() <= now.getTime();
  const alreadyCompleted = task.field && log?.[task.field];

  if (alreadyPassed || alreadyCompleted) {
    candidate.setDate(candidate.getDate() + 1);
    // Re-apply the time on the new day
    candidate.setHours(Math.floor(task.minuteOfDay / 60), task.minuteOfDay % 60, 0, 0);
  }

  // For day-restricted tasks (e.g. weekend restocks), advance to the next matching weekday
  if (task.daysOfWeek) {
    for (let i = 0; i < 7; i++) {
      if (task.daysOfWeek.includes(candidate.getDay())) break;
      candidate.setDate(candidate.getDate() + 1);
    }
    if (!task.daysOfWeek.includes(candidate.getDay())) return null; // guard
  }

  return candidate.getTime();
}

/**
 * Schedule notifications — two paths depending on browser support:
 *
 * PATH A — Notification Triggers API (showTrigger):
 *   Chrome with chrome://flags/#enable-experimental-web-platform-features, or
 *   future stable Chrome once the API ships. The OS itself fires each alert at
 *   the exact timestamp — JS does not need to be running at all.
 *
 * PATH B — 60-second setInterval fallback (all other browsers):
 *   Aligns to the wall-clock minute and polls every 60 s. Works in foreground
 *   and recent-background tabs on Android/desktop.
 *
 * Safe to call repeatedly — always clears previous timers/triggers first.
 */
export async function scheduleNotifications(log) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const hasSW       = 'serviceWorker' in navigator;
  const hasTriggers = typeof TimestampTrigger !== 'undefined' &&
                      'showTrigger' in Notification.prototype;

  if (hasSW && hasTriggers) {
    // ── Path A: OS-native scheduling via Notification Triggers API ───────────
    // No polling needed — clear any running fallback intervals
    clearNotificationTimers();

    try {
      const reg = await navigator.serviceWorker.ready;
      for (const task of TASKS) {
        const ts = getNextTriggerTimestamp(task, log);
        if (ts === null) continue;

        // showNotification with same tag overwrites any existing scheduled alert
        await reg.showNotification(task.title, {
          body:               task.body,
          icon:               '/icon.svg',
          badge:              '/icon.svg',
          tag:                `lt-${task.field ?? task.id}`,
          requireInteraction: !!task.important,
          silent:             false,
          showTrigger:        new TimestampTrigger(ts),
        });
      }
    } catch { /* SW unavailable — silently skip */ }
    return;
  }

  // ── Path B: 60-second interval fallback ──────────────────────────────────
  if (_interval)   { clearInterval(_interval);  _interval   = null; }
  if (_alignTimer) { clearTimeout(_alignTimer); _alignTimer = null; }

  // Check immediately — catches the case where app opened right at scheduled time
  checkAndNotify(log);

  // Align to the next exact wall-clock minute, then tick every 60 s
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

// ── PWA install welcome notification ─────────────────────────────────────────

async function sendWelcomeNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = {
    body:               "Let's reshape your body and habits together — one day at a time. 🔥",
    icon:               '/icon.svg',
    badge:              '/icon.svg',
    tag:                'lt-welcome',
    requireInteraction: false,
    silent:             false,
  };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification('Welcome to LifeStyle Tracker! 💪', opts);
    } else {
      new Notification('Welcome to LifeStyle Tracker! 💪', opts);
    }
    localStorage.setItem('lt_pwa_welcomed', '1');
  } catch {}
}

// Fire once when the user installs the PWA (Add to Home Screen)
if (!localStorage.getItem('lt_pwa_welcomed')) {
  window.addEventListener('appinstalled', () => {
    // Small delay so the app has time to fully open after install
    setTimeout(sendWelcomeNotification, 3000);
  });
}
