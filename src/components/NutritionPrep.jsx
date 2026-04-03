import React, { useState, useEffect, useRef } from 'react';
import '../styles/NutritionPrep.css';
import { getAuthHeader } from '../auth';
import { encryptData, decryptData } from '../cache';

// ── Week key: always the most recent Saturday (YYYY-MM-DD) ───────────────────
// Week = Saturday → Friday (per user's definition)
const getWeekKey = () => {
  const now = new Date();
  const day = now.getDay();           // 0=Sun … 6=Sat
  const daysSinceSat = (day + 1) % 7; // Sat→0, Sun→1, … Fri→6
  const sat = new Date(now);
  sat.setDate(now.getDate() - daysSinceSat);
  return sat.toISOString().slice(0, 10); // YYYY-MM-DD
};

const LS_KEY = 'lst_grocery_v2';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Read localStorage state for the current week key
const loadLocalState = (weekKey) => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = decryptData(raw, LS_KEY);
    if (!parsed) return null;
    return parsed.wk === weekKey ? parsed : null; // null = wrong week or missing
  } catch { return null; }
};

const saveLocal = (weekKey, checkedSet) => {
  try {
    localStorage.setItem(LS_KEY, encryptData({ wk: weekKey, items: [...checkedSet], ts: Date.now() }));
  } catch {}
};

export default function NutritionPrep() {
  const weekKey = getWeekKey();
  const [checked, setChecked] = useState(() => {
    const local = loadLocalState(weekKey);
    return local ? new Set(local.items) : new Set();
  });
  const [dbLoading, setDbLoading] = useState(true);
  const syncTimer = useRef(null);

  // ── Load from DB on mount — skip if cache is fresh (< 5 min old) ────────
  useEffect(() => {
    const local = loadLocalState(weekKey);
    const isFresh = local?.ts && (Date.now() - local.ts) < CACHE_TTL_MS;
    if (isFresh) {
      setDbLoading(false);
      return;
    }

    fetch(`/.netlify/functions/daily-log?grocery=${weekKey}`, {
      headers: getAuthHeader(),
    })
      .then(r => r.json())
      .then(items => {
        if (Array.isArray(items)) {
          const fromDb = new Set(items);
          setChecked(fromDb);
          saveLocal(weekKey, fromDb);
        }
      })
      .catch(() => {/* network error — keep localStorage state */})
      .finally(() => setDbLoading(false));
  }, [weekKey]);

  // ── Debounced DB save (500 ms after last toggle) ─────────────────────────
  const flushToDb = (nextSet) => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      fetch('/.netlify/functions/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ grocery_week: weekKey, grocery_checked: [...nextSet] }),
      }).catch(() => {});
    }, 500);
  };

  const toggleItem = (key) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveLocal(weekKey, next);   // instant local persistence
      flushToDb(next);            // debounced DB sync
      return next;
    });
  };

  const resetList = () => {
    const empty = new Set();
    setChecked(empty);
    saveLocal(weekKey, empty);
    flushToDb(empty);
  };

  const groceries = [
    {
      category: "🥩 Proteins",
      items: [
        { key: "eggs",    label: "2–3 trays of Eggs (20–30 eggs)" },
        { key: "chicken", label: "1.5–2 kg boneless, skinless Chicken Breast" },
        { key: "fish",    label: "1 kg Rui or Katla fish (standard cut pieces)" },
      ],
    },
    {
      category: "🫙 Pantry Staples",
      items: [
        { key: "dal",     label: "1 kg Red Masoor Dal (red lentils)" },
        { key: "rice",    label: "1 kg White Rice (small grain)" },
        { key: "acv",     label: "1 bottle Apple Cider Vinegar (with the mother)" },
        { key: "oil",     label: "1 bottle Mustard Oil (shorsher tel)" },
        { key: "coffee",  label: "1 jar Black Coffee (instant or ground)" },
      ],
    },
    {
      category: "🥦 Fresh Produce",
      items: [
        { key: "cucumber", label: "7–10 Cucumbers" },
        { key: "lemon",    label: "10–12 Lemons" },
        { key: "fruit",    label: "7 Apples or 1 dozen Bananas" },
        { key: "veg",      label: "Broccoli, Spinach & Green Beans (large quantities)" },
      ],
    },
  ];

  const allItems = groceries.flatMap(cat => cat.items);
  const doneCount = allItems.filter(i => checked.has(i.key)).length;
  const totalCount = allItems.length;

  const dailyMeals = [
    {
      icon: "🍳",
      meal: "Breakfast — 8:30 AM",
      time: "~12 minutes",
      steps: [
        "Fill a small pot with enough cold water to fully cover 3 eggs. Bring to a rolling boil on high heat.",
        "Gently lower 3 whole eggs into the boiling water using a spoon.",
        "HARD BOILED (firm yolk) — timer: 9 minutes. Transfer immediately to cold tap water for 2 minutes. Peel and eat with a pinch of salt.",
        "SOFT BOILED (jammy, creamy yolk) — timer: 6 minutes exactly. Transfer immediately to cold water for 1 minute only. Peel gently under running water.",
        "Eat alongside 1 apple (sliced) or 1 banana.",
        "Protein note: 3 eggs = ~18 g protein. To reach 25–28 g, add 2 extra egg whites to the pot or have a small katori of low-fat dahi (curd).",
        "Prep tip: slice the fruit the night before to save morning time.",
      ],
    },
    {
      icon: "🍱",
      meal: "Lunch — Prepare Before Work",
      time: "~30 minutes",
      steps: [
        "Rice: Rinse 150 g (1.5 katori) of white rice under cold water until the water runs clear. Add 225 ml fresh water, bring to a boil, reduce to lowest heat, cover with a tight lid, and simmer for 12–15 minutes until all water is absorbed.",
        "Masoor Dal: Rinse ½ cup of red lentils until water runs clear. Boil in a pot with 1 cup water, ½ tsp turmeric, and salt to taste for 15–18 minutes until a very thick paste-like consistency forms. Tadka: heat 1 tsp mustard oil, add 1 dried red chilli and 3 crushed garlic cloves, fry for 15 seconds, pour over the dal.",
        "Protein — Chicken: Pat 150 g chicken breast completely dry. Season with salt, ¼ tsp turmeric, and a squeeze of lemon. Sear in a hot pan 6–7 minutes per side.",
        "Protein — Fish (alternative): Use 2 medium pieces of Rui or Katla. Same seasoning. Sear in hot mustard oil 4–5 minutes per side.",
        "Side: Slice 1 cucumber into rounds.",
        "Pack rice, dal, protein, and cucumber into separate airtight containers. Refrigerate until you leave for work.",
      ],
    },
    {
      icon: "🍽️",
      meal: "Dinner — 8:30 PM",
      time: "~15 minutes",
      steps: [
        "Take 200 g chicken breast or 3 medium pieces of Rui/Katla from the fridge. Pat completely dry with a paper towel.",
        "Season generously on both sides: salt, a pinch of black pepper, ¼ tsp turmeric, and a good squeeze of lemon.",
        "Heat a non-stick or cast-iron pan on HIGH heat for 90 seconds. Add 1 tsp oil — it should shimmer immediately.",
        "Chicken: sear 6–7 minutes per side without touching or moving it.",
        "Fish: sear 4–5 minutes per side. Fish is done when it flakes apart easily with a fork.",
        "While the protein cooks, steam vegetables: broccoli florets, green beans, or spinach with 3 tbsp water for 3–4 minutes.",
        "Plate and eat immediately. No rice, no bread, no roti. This is a zero-starch meal.",
      ],
    },
  ];

  return (
    <div className="section-container">
      <h2>Meal Preparation</h2>

      {/* ── Weekend Stocking ───────────────────────────── */}
      <div className="prep-section">
        <div className="grocery-header">
          <div>
            <h3>🛒 Weekend Stocking List</h3>
            <p className="subtitle">
              Buy every Saturday morning. Resets each week (Sat → Fri).
              {dbLoading
                ? <span className="grocery-sync-badge grocery-sync-badge--loading"> ⏳ Syncing…</span>
                : <span className="grocery-sync-badge"> ☁ Synced</span>
              }
            </p>
          </div>
          <div className="grocery-header-right">
            <div className="grocery-progress-pill">{doneCount}/{totalCount}</div>
            {doneCount > 0 && (
              <button className="grocery-reset-btn" onClick={resetList} title="Reset list">↺ Reset</button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="grocery-progress-bar-wrap">
          <div
            className="grocery-progress-bar-fill"
            style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
          />
        </div>

        <div className="grocery-grid">
          {groceries.map((cat, idx) => (
            <div key={idx} className="grocery-category">
              <h4>{cat.category}</h4>
              <ul className="grocery-checklist">
                {cat.items.map((item) => (
                  <li
                    key={item.key}
                    className={`grocery-item${checked.has(item.key) ? ' grocery-item--checked' : ''}`}
                    onClick={() => toggleItem(item.key)}
                  >
                    <span className="grocery-checkbox">
                      {checked.has(item.key) ? '✓' : ''}
                    </span>
                    <span className="grocery-item-label">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Daily Meal Preparation ─────────────────────── */}
      <div className="prep-section">
        <h3>📋 Daily Meal Preparation Guide</h3>
        <p className="subtitle">All three meals are cooked fresh every day. Follow these step-by-step instructions.</p>
        <div className="steps-container">
          {dailyMeals.map((block, idx) => (
            <div key={idx} className="meal-step-card">
              <div className="meal-step-header">
                <span className="meal-step-icon">{block.icon}</span>
                <div>
                  <h4>{block.meal}</h4>
                  <span className="meal-step-time">⏱ {block.time}</span>
                </div>
              </div>
              <ol className="meal-step-list">
                {block.steps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
