import React from 'react';

export default function NutritionPrep() {
  const groceries = [
    {
      category: "🥩 Proteins",
      items: [
        "2–3 trays of Eggs (20–30 eggs)",
        "1.5–2 kg boneless, skinless Chicken Breast",
        "1 kg Rui or Katla fish (standard cut pieces)",
      ],
    },
    {
      category: "🫙 Pantry Staples",
      items: [
        "1 kg Red Masoor Dal (red lentils)",
        "1 kg White Rice (small grain)",
        "1 bottle Apple Cider Vinegar (with the mother)",
        "1 bottle Mustard Oil (shorsher tel)",
        "1 jar Black Coffee (instant or ground)",
      ],
    },
    {
      category: "🥦 Fresh Produce",
      items: [
        "7–10 Cucumbers",
        "10–12 Lemons",
        "7 Apples or 1 dozen Bananas",
        "Broccoli, Spinach & Green Beans (large quantities)",
      ],
    },
  ];

  const dailyMeals = [
    {
      icon: "🍳",
      meal: "Breakfast — 8:30 AM",
      time: "~12 minutes",
      steps: [
        "Fill a small pot with enough cold water to fully cover 3 eggs.",
        "Bring to a rolling boil on high heat.",
        "Gently lower 3 whole eggs into the boiling water using a spoon.",
        "Set a timer for 9 minutes for firm, fully set yolks.",
        "When the timer goes off, transfer eggs to cold tap water for 2 minutes — this stops overcooking and makes peeling much easier.",
        "Peel and eat with a pinch of salt alongside 1 apple (sliced) or 1 banana.",
        "Prep tip: slice the fruit the night before to save time.",
      ],
    },
    {
      icon: "🍱",
      meal: "Lunch — Prepare Before Work",
      time: "~30 minutes",
      steps: [
        "Rice: Rinse 100 g (1 small katori) of white rice under cold water until the water runs clear. Add 150 ml fresh water, bring to a boil, reduce to lowest heat, cover with a tight lid, and simmer for 12–15 minutes until all water is absorbed. Remove from heat and let it steam for 5 minutes before opening.",
        "Masoor Dal: Rinse ½ cup of red lentils until water runs clear. Boil in a pot with 1 cup water, ½ tsp turmeric, and salt to taste. Stir occasionally and cook for 15–18 minutes until a very thick, paste-like consistency forms. Tadka: heat 1 tsp mustard oil in a small pan, add 1 dried red chilli and 3 crushed garlic cloves, fry for 15 seconds until fragrant, then pour immediately over the dal and mix.",
        "Protein — Chicken: Pat 150 g chicken breast completely dry with a paper towel. Season both sides with salt, ¼ tsp turmeric, and a squeeze of lemon. Heat a pan on high for 90 seconds, add 1 tsp oil. Sear chicken 6–7 minutes per side without moving it, until golden and cooked through.",
        "Protein — Fish (alternative): Use 2 pieces of Rui or Katla. Same seasoning. Sear in hot mustard oil for 4–5 minutes per side until golden.",
        "Side: Slice 1 cucumber into rounds.",
        "Pack rice, dal, protein, and cucumber into separate airtight containers. Refrigerate until you leave for work.",
      ],
    },
    {
      icon: "🍽️",
      meal: "Dinner — 8:30 PM",
      time: "~15 minutes",
      steps: [
        "Take 150 g chicken breast or 2 fish pieces from the fridge. Pat completely dry with a paper towel — moisture on the surface prevents browning and creates steam instead of a sear.",
        "Season generously on both sides: salt, a pinch of black pepper, ¼ tsp turmeric, and a good squeeze of lemon.",
        "Heat a non-stick or cast-iron pan on HIGH heat for 90 seconds. Add 1 tsp oil — it should shimmer immediately. The pan must be very hot before the protein goes in.",
        "Chicken: sear 6–7 minutes per side without touching or moving it, until the visible sides turn fully opaque before flipping.",
        "Fish: sear 4–5 minutes per side. Fish is done when it flakes apart easily with a fork.",
        "While the protein cooks, steam your vegetables: add broccoli florets, green beans, or spinach to a covered pot with 3 tbsp water. Steam on medium heat for 3–4 minutes until bright green and tender-crisp.",
        "Plate and eat immediately. No rice, no bread, no roti. This is a zero-starch meal.",
      ],
    },
  ];

  return (
    <div className="section-container">
      <h2>Meal Preparation</h2>

      {/* ── Weekend Stocking ───────────────────────────── */}
      <div className="prep-section">
        <h3>🛒 Weekend Stocking List</h3>
        <p className="subtitle">Buy these quantities every Saturday or Sunday morning to fuel the entire week.</p>
        <div className="grocery-grid">
          {groceries.map((cat, idx) => (
            <div key={idx} className="grocery-category">
              <h4>{cat.category}</h4>
              <ul>
                {cat.items.map((item, i) => <li key={i}>{item}</li>)}
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
