import React, { useState, useEffect, useRef } from 'react';
import '../styles/DailyTracker.css';
import '../styles/SmartSuggestions.css';
import '../styles/DailyTrackerHeader.css';
import { getTodayLog, setTodayLog, getEffectiveDate, getHistoryAsArray } from '../cache';
import { getAuthHeader, handleUnauthorized } from '../auth';
import { scheduleNotifications, clearNotificationTimers } from '../notifications';
import { 
  WORKOUT_ROTATION, 
  getTodayWorkout, 
  TASK_SCHEDULE, 
  getActiveTask, 
  getSuggestions, 
  TASK_INFO_MAP, 
  getInfoForField 
} from '../data/dailyTrackingData';

// Returns parsed JSON only when the response is actually JSON.
// Guards against Vite's HTML 404 fallback in local dev (no netlify dev running).
const safeJson = (res) => {
  if (res.status === 401) { handleUnauthorized(); return null; }
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  return res.json();
};











import TaskRow from './DailyTracker/TaskRow';
import SituationCard from './DailyTracker/SituationCard';
import WaterCard from './DailyTracker/WaterCard';
import ReadingCard from './DailyTracker/ReadingCard';

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
  const [syncCooldown, setSyncCooldown] = useState(false);
  const syncCooldownTimer = useRef(null);
  const [syncFailed, setSyncFailed] = useState(false);

  
  // Collapse toggle states with localStorage persistence
  const [weightOpen, setWeightOpen] = useState(() => {
    try { const val = localStorage.getItem('lt_dt_weight_open'); return val ? JSON.parse(val) : true; } catch { return true; }
  });
  const [waterOpen, setWaterOpen] = useState(() => {
    try { const val = localStorage.getItem('lt_dt_water_open'); return val ? JSON.parse(val) : true; } catch { return true; }
  });

  const toggleWeight = () => { const val = !weightOpen; setWeightOpen(val); localStorage.setItem('lt_dt_weight_open', JSON.stringify(val)); };
  const toggleWater = () => { const val = !waterOpen; setWaterOpen(val); localStorage.setItem('lt_dt_water_open', JSON.stringify(val)); };

  // Re-render every minute so suggestion panel and clock recompute
  const [, setTick] = useState(0);
  // Bump to re-trigger the fetch effect (e.g. at 5 AM day boundary)
  const [fetchKey, setFetchKey] = useState(0);
  const waterSyncTimer = useRef(null);
  const syncFailTimer = useRef(null);
  const loadedForDate = useRef(null);
  // Schedule (or re-schedule) notifications whenever the log changes.
  // Debounced 1.5 s so rapid water/weight edits don't thrash the interval.
  const notifDebounce = useRef(null);
  useEffect(() => {
    clearTimeout(notifDebounce.current);
    notifDebounce.current = setTimeout(() => scheduleNotifications(log), 1500);
  }, [log]);

  // Clean up on unmount
  useEffect(() => () => { clearNotificationTimers(); clearTimeout(notifDebounce.current); }, []);

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
      .finally(() => {
        setSyncing(false);
        // 30-second cooldown to prevent spam
        setSyncCooldown(true);
        clearTimeout(syncCooldownTimer.current);
        syncCooldownTimer.current = setTimeout(() => setSyncCooldown(false), 30_000);
      });
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
          <button className="sync-btn" onClick={handleSync} title="Sync with database" disabled={syncing || syncCooldown}>
            <span className={syncing ? 'sync-spinning' : ''}>↻</span>
            {syncing ? 'Syncing…' : syncCooldown ? 'Synced ✓' : 'Sync'}
          </button>
        </div>
      </div>

      {/* ── Now Pill ────────────────────────────────────── */}
      {(() => {
        const task = getActiveTask();
        if (!task) return null;
        const name = task.label.includes('—') ? task.label.split('—').pop().trim() : task.label;
        return (
          <div className="schedule-now-pill">
            <span className="schedule-now-dot" />
            Now: <strong>{task.emoji} {name}</strong>
          </div>
        );
      })()}

      {/* ── Current Situation (Weight Status) ───────────── */}
      <SituationCard log={log} weightOpen={weightOpen} toggleWeight={toggleWeight} />

      {/* ── Water Card ──────────────────────────────────── */}
      <WaterCard log={log} waterOpen={waterOpen} toggleWater={toggleWater} addWater={addWater} removeWater={removeWater} />

      {/* ── Sync failed toast ───────────────────────────── */}
      {syncFailed && (
        <div className="sync-fail-toast">⚠️ Sync failed — check your connection</div>
      )}

      {/* ── Reading Today Card ──────────────────────────── */}
      <ReadingCard log={log} setLog={setLog} />

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
          id="whey_protein_taken" label="🥛 8:00 PM — Whey + Creatine (post-workout)"
          checked={log.whey_protein_taken} onChange={handleToggle}
          onInfoClick={() => showInfo('whey_protein_taken', '🥛 Post-Workout Whey + Creatine',
            'Take both within 45 minutes of finishing your workout. Post-workout is the scientifically optimal window for creatine uptake — muscles are primed to absorb nutrients.',
            [
              'Measure 1 level scoop of Whey Protein Concentrate or Isolate.',
              'Add 250–300 ml of cold water to a shaker bottle.',
              'Add the protein powder AND exactly 5 g (1 level teaspoon) of Creatine Monohydrate.',
              'Seal the shaker and shake vigorously for 10–15 seconds until fully dissolved.',
              'Drink immediately. Do not let it sit — protein becomes lumpy and creatine loses potency.',
              'Why post-workout creatine: insulin sensitivity is elevated post-exercise, driving creatine into muscle cells more efficiently than at any other time of day.',
              "On Sunday (rest day): still take both — muscle protein synthesis peaks 24–48 hours after Saturday's burnout. Rest day protein and creatine are equally important.",
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
