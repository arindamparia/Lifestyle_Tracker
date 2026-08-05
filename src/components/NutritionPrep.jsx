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
  const syncSequence = useRef(0);
  const isDirty = useRef(false);

  // ── Load from DB on mount — skip if cache is fresh (< 5 min old) ────────
  useEffect(() => {
    const local = loadLocalState(weekKey);
    const isFresh = local?.ts && (Date.now() - local.ts) < CACHE_TTL_MS;
    if (isFresh) {
      setDbLoading(false);
      return;
    }

    fetch(`/api/daily-log?grocery=${weekKey}`, {
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

  // ── Listen for real-time grocery updates ─────────────────────────────────
  useEffect(() => {
    const handleSync = (e) => {
      // Ignore if this client is currently mid-interaction
      if (isDirty.current) return;
      
      if (e.detail.week_start === weekKey) {
        // Compare arrays to prevent identical state updates
        const freshItems = e.detail.checked_items || [];
        setChecked(prev => {
          if (prev.size === freshItems.length && freshItems.every(i => prev.has(i))) {
            return prev; // unchanged
          }
          const freshSet = new Set(freshItems);
          saveLocal(weekKey, freshSet);
          return freshSet;
        });
      }
    };
    window.addEventListener('grocery_sync', handleSync);
    return () => window.removeEventListener('grocery_sync', handleSync);
  }, [weekKey]);

  // ── Debounced DB save (500 ms after last toggle) ─────────────────────────
  const flushToDb = (nextSet) => {
    clearTimeout(syncTimer.current);
    const currentSeq = ++syncSequence.current;
    
    syncTimer.current = setTimeout(() => {
      isDirty.current = false;
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      if (window.pusherSocketId) {
        headers['X-Socket-ID'] = window.pusherSocketId;
      }
      
      fetch('/api/daily-log', {
        method: 'POST',
        headers,
        body: JSON.stringify({ grocery_week: weekKey, grocery_checked: [...nextSet] }),
      }).catch(() => {});
    }, 500);
  };

  const toggleItem = (key) => {
    isDirty.current = true;
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
    isDirty.current = true;
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
      meal: "Breakfast — 8:30 AM (High-Protein)",
      time: "~12 minutes",
      steps: [
        "Option 1 (Classic Boiled): Fill a small pot with cold water to fully cover 3 eggs. Bring to rolling boil. 9 min for hard-boiled, 6 min for jammy soft-boiled. Transfer to cold water, peel, and eat with salt & black pepper.",
        "Option 2 (Dim Bhurji / Bengali Scramble): Beat 3 eggs with 1 chopped green chilli, a pinch of onion, salt, and ¼ tsp turmeric. Scramble in 1 tsp hot mustard oil for 2–3 minutes.",
        "Fruit & Fibre: Eat alongside 1 apple (sliced) or 1 banana.",
        "Protein note: 3 whole eggs = ~18 g protein. Add 2 extra boiled egg whites to easily hit 26 g protein.",
      ],
    },
    {
      icon: "🍱",
      meal: "Lunch — Bengali High-Protein Prep",
      time: "~30 minutes",
      steps: [
        "Rice: Rinse 100–120 g white rice (1 small katori). Boil with 1.5x water until absorbed.",
        "Recipe A (Murgi diye Masoor Dal): Boil ½ cup masoor dal with 150 g diced chicken breast, ½ tsp turmeric, and salt. Tadka in 1 tsp mustard oil with 1 dried red chilli, cumin seeds (jeera), and 3 crushed garlic cloves. Super high protein & comforting.",
        "Recipe B (Dimer Dal): Fry 2 boiled eggs lightly in mustard oil with a pinch of turmeric. Drop into thick simmering masoor dal with a garlic-jeera tadka.",
        "Recipe C (Classic Machher Jhol / Pan Sear): Season Rui/Katla with salt & turmeric. Sear 4–5 min each side in mustard oil with green chillies and kalonji (kalo jeere).",
        "Salad: Fresh sliced cucumber rounds with a squeeze of lemon.",
      ],
    },
    {
      icon: "🍽️",
      meal: "Dinner — 8:30 PM (Strict Zero-Starch)",
      time: "~15 minutes",
      steps: [
        "Protein (200 g Chicken Breast or 3 Fish pieces): Pat dry with paper towel. Season with salt, turmeric, crushed black pepper, and lemon juice.",
        "Cooking: Heat non-stick/cast iron pan on HIGH with 1 tsp mustard or olive oil. Sear chicken 6–7 min per side; fish 4–5 min per side until crisp and golden.",
        "Fibrous Veggies: Steam broccoli florets, french beans, and palak (spinach) with 3 tbsp water in a covered pot for 3–4 minutes.",
        "Zero-Carb Rule: Plate immediately with fresh cucumber or lemon wedge. No rice, no roti, no bread.",
      ],
    },
  ];

  return (
    <div className="section-container">
      <h2>Meal Preparation</h2>

      {dbLoading ? (
        <div className="global-loading-screen" style={{ marginTop: '40px' }}>
          <div className="spinner"></div>
          <p>Loading grocery list...</p>
        </div>
      ) : (
        <>
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
      </>
      )}
    </div>
  );
}
