import React from 'react';

export default function NutritionPrep() {
  const groceries = [
    { category: "Meats & Proteins", items: ["2-3 trays of Eggs (20-30 eggs)", "1.5-2 kg boneless skinless Chicken Breast", "1 kg Rui or Katla fish (standard pieces)"] },
    { category: "Pantry Staples", items: ["1 kg Red Masoor Dal", "1 bottle Apple Cider Vinegar (with the mother)", "1 bottle Mustard Oil (shorsher tel)", "1 jar Black Coffee"] },
    { category: "Fresh Produce", items: ["7-10 Cucumbers", "10-12 Lemons", "7 Apples or 1 doz Bananas", "Heavy amounts of Spinach, Green Beans & Broccoli"] }
  ];

  const mealPrepSteps = [
    { 
      step: "Step 1: Prep the Produce", 
      actions: [
        "Wash all cucumbers, green beans, and broccoli.",
        "Chop the cucumbers into slices. Chop the beans and broccoli into bite-sized pieces.",
        "Store them in large, airtight Tupperware containers in the fridge."
      ] 
    },
    { 
      step: "Step 2: Boil the Eggs", 
      actions: [
        "Place 12-15 eggs in a large pot of water. Bring to rolling boil.",
        "Turn off heat, cover, let sit for 10 minutes.",
        "Transfer to ice water, peel, and store in a bowl in fridge. Morning breakfasts are ready."
      ] 
    },
    { 
      step: "Step 3: Make the Office Masoor Dal (Dry Recipe)", 
      actions: [
        "Wash 1 large cup of Masoor Dal until clear.",
        "Boil in pot with 1.5 cups water, ½ tsp turmeric, and salt until it forms a very thick paste.",
        "Tadka: Heat 1 tsp mustard oil. Drop 1 dried red chili, ½ tsp kalo jeere, 3 chopped garlic cloves. Fry 15s.",
        "Pour oil over dal, mix, and divide into 4-5 small leak-proof office containers."
      ] 
    },
    { 
      step: "Step 4: Marinate the Proteins", 
      actions: [
        "Wash chicken breasts and fish.",
        "Toss in large bowl with lemon juice, salt, turmeric, and pinch of red chili powder.",
        "Store separately in fridge.",
        "Daily Execution: Sear 150g chicken or 2 pieces of fish in a hot pan with a drop of oil for 5-7 mins/side nightly."
      ] 
    }
  ];

  return (
    <div className="section-container">
      <h2>Weekend Guide</h2>

      <div className="prep-section">
        <h3>🛒 The Weekend Stocking List</h3>
        <p className="subtitle">Buy these exact quantities on Saturday or Sunday morning to fuel Monday-Friday.</p>
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

      <div className="prep-section step-section">
        <h3>🍳 Sunday Meal Prep (60-90 Mins)</h3>
        <p className="subtitle">Prevents diet breaks during busy coding days.</p>
        <div className="steps-container">
          {mealPrepSteps.map((stepBlock, idx) => (
            <div key={idx} className="meal-step-card">
              <h4>{stepBlock.step}</h4>
              <ul>
                {stepBlock.actions.map((act, i) => <li key={i}>{act}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
