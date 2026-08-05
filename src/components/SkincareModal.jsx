import React from 'react';
import { createPortal } from 'react-dom';
import '../styles/SkincareModal.css';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import { getEffectiveDate } from '../cache';

const GOLDEN_RULES = {
  "sunscreen-melt": {
    title: "1. The 60-Second Sunscreen Melt (Night Cleansing)",
    logic: "Re'equil SPF 50 is a heavy, matte, water-resistant formula. A quick splash leaves an invisible film of zinc and silicones, clogging pores over time.",
    execution: "Wet face with lukewarm water. Apply a coin-sized amount of the Minimalist Oat Wash. Using fingertips, gently massage in small circles across the entire face (hairline, jawline, nose) for a slow count to 60. Keep it moving, don't press hard. Rinse thoroughly."
  },
  "bone-dry": {
    title: "2. The Bone-Dry Serum Rule (Tuesday & Friday Mornings)",
    logic: "Damp skin pulls products deep into the skin very quickly. Applying 10% Vitamin C serum to damp skin pulls the acid in too aggressively, triggering redness and rashes.",
    execution: "After washing with C&P Soothing Wash, pat face with a clean towel until no visible water remains. Wait a full 2 minutes. The skin must feel 100% dry and bare. Apply 3-4 drops of Derma Co Serum, smooth it out, and wait another 60 seconds before applying Re'equil Cream."
  },
  "damp-seal": {
    title: "3. The 'Damp Seal' Moisture Rule (Face & Body)",
    logic: "Moisturizers trap existing water inside the skin; they don't add it. Waiting until completely dry leaves no hydration to trap.",
    execution: "Face (Non-Serum Days): Apply Re'equil Cream immediately after washing, while the face is still slightly damp.\n\nBody: After turning off the shower, lightly dab with a towel so you aren't dripping, but skin is visibly damp. Immediately massage C&P Body Crème all over to lock water in."
  },
  "spf-rule": {
    title: "4. The Two-Finger SPF Rule (Every Morning)",
    logic: "Under-applying sunscreen negates the SPF 50 rating, allowing UV damage that makes the Vitamin C serum useless.",
    execution: "Squeeze Re'equil SPF 50 in a straight line down the length of the index and middle fingers. Dot evenly across the forehead, cheeks, nose, chin, and neck. Blend immediately before the 'Dry Touch' formula sets."
  }
};

const SKINCARE_ROUTINE = {
  Monday: {
    AM: {
      Face: "C&P Soothing Wash (Ceramides) → Re'equil Cream (Ceramides + HA) → Re'equil SPF 50",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      Body: "C&P Coffee Scrub (Physical Exfoliant) → C&P Body Crème (Bergamot)",
      rules: ["damp-seal", "spf-rule"]
    },
    PM: {
      Face: "C&P AHA Wash (Glycolic Acid + Vit C) → Re'equil Cream (Ceramides + HA)",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      rules: ["damp-seal"]
    }
  },
  Tuesday: {
    AM: {
      Face: "C&P Soothing Wash (Ceramides) → Wait 2 mins → Derma Co Serum (10% Vit C + 5% Niacinamide) → Re'equil Cream → Re'equil SPF 50",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      Body: "Regular Soap / Gentle Wash",
      rules: ["bone-dry", "damp-seal", "spf-rule"]
    },
    PM: {
      Face: "Minimalist Oat Wash (B12 + 6.5% Oat) (60-sec massage) → Re'equil Cream (Ceramides + HA)",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      rules: ["sunscreen-melt", "damp-seal"]
    }
  },
  Wednesday: {
    AM: {
      Face: "C&P Soothing Wash (Ceramides) → Re'equil Cream (Ceramides + HA) → Re'equil SPF 50",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      Body: "C&P AHA/BHA Body Wash (Lactic + Salicylic Acid) → C&P Body Crème (Bergamot)",
      rules: ["damp-seal", "spf-rule"]
    },
    PM: {
      Face: "Minimalist Oat Wash (B12 + 6.5% Oat) (60-sec massage) → Re'equil Cream (Ceramides + HA)",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      rules: ["sunscreen-melt", "damp-seal"]
    }
  },
  Thursday: {
    AM: {
      Face: "C&P Soothing Wash (Ceramides) → Re'equil Cream (Ceramides + HA) → Re'equil SPF 50",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      Body: "Regular Soap / Gentle Wash",
      rules: ["damp-seal", "spf-rule"]
    },
    PM: {
      Face: "C&P PHA Wash (Mandelic + Lactobionic Acid) → Re'equil Cream (Ceramides + HA)",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      rules: ["damp-seal"]
    }
  },
  Friday: {
    AM: {
      Face: "C&P Soothing Wash (Ceramides) → Wait 2 mins → Derma Co Serum (10% Vit C + 5% Niacinamide) → Re'equil Cream → Re'equil SPF 50",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      Body: "Regular Soap / Gentle Wash",
      rules: ["bone-dry", "damp-seal", "spf-rule"]
    },
    PM: {
      Face: "Minimalist Oat Wash (B12 + 6.5% Oat) (60-sec massage) → Re'equil Cream (Ceramides + HA)",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      rules: ["sunscreen-melt", "damp-seal"]
    }
  },
  Saturday: {
    AM: {
      Face: "C&P Soothing Wash (Ceramides) → Re'equil Cream (Ceramides + HA) → Re'equil SPF 50",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      Body: "C&P AHA/BHA Body Wash (Lactic + Salicylic Acid) → C&P Body Crème (Bergamot)",
      rules: ["damp-seal", "spf-rule"]
    },
    PM: {
      Face: "Minimalist Oat Wash (B12 + 6.5% Oat) (60-sec massage) → Re'equil Cream (Ceramides + HA)",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      rules: ["sunscreen-melt", "damp-seal"]
    }
  },
  Sunday: {
    AM: {
      Face: "C&P Soothing Wash (Ceramides) → Re'equil Cream (Ceramides + HA) → Re'equil SPF 50",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      Body: "Regular Soap / Gentle Wash",
      rules: ["damp-seal", "spf-rule"]
    },
    PM: {
      Face: "Minimalist Oat Wash (B12 + 6.5% Oat) (60-sec massage) → Re'equil Cream (Ceramides + HA)",
      Lips: "C&P Lip Balm (Kojic Acid + SPF 50)",
      rules: ["sunscreen-melt", "damp-seal"]
    }
  }
};

export default function SkincareModal({ isOpen, onClose, period }) {
  useLockBodyScroll(isOpen);
  if (!isOpen) return null;
  // If period happens to be null while trying to render the content, fall back to AM safely
  const safePeriod = period || 'AM';

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const effectiveDate = getEffectiveDate();
  const [year, month, day] = effectiveDate.split('-');
  const dateObj = new Date(year, month - 1, day);
  const todayName = days[dateObj.getDay()];
  
  const isPM = safePeriod === 'PM';
  
  const activeRoutine = SKINCARE_ROUTINE[todayName][safePeriod];
  const themeClass = isPM ? 'theme-pm' : 'theme-am';
  const headerIcon = isPM ? '🌙' : '☀️';
  const headerTitle = isPM ? 'Evening Recovery' : 'Morning Protection';

  // Helper to format steps with arrows into nicely styled badges
  const renderSteps = (stepString) => {
    const parts = stepString.split('→').map(p => p.trim());
    return (
      <div className="sc-step-flow">
        {parts.map((part, idx) => (
          <React.Fragment key={idx}>
            <div className="sc-product-card">
              <span className="sc-dot"></span>
              <span className="sc-product-name">{part}</span>
            </div>
            {idx < parts.length - 1 && <div className="sc-arrow">↓</div>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10001 }}>
      <div className={`modal-content sc-modal ${themeClass}`} onClick={e => e.stopPropagation()}>
        
        {/* Decorative background glow */}
        <div className="sc-glow-blob top-left"></div>
        <div className="sc-glow-blob bottom-right"></div>
        
        <div className="sc-header">
          <div className="sc-header-text">
            <span className="sc-subtitle">{todayName} {period} Routine</span>
            <h2 className="sc-title">{headerIcon} {headerTitle}</h2>
          </div>
          <button className="sc-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="sc-body">
          {activeRoutine.Face && (
            <div className="sc-zone">
              <h3 className="sc-zone-title">👤 Face</h3>
              <div className="sc-zone-content">
                {renderSteps(activeRoutine.Face)}
              </div>
            </div>
          )}
          
          {activeRoutine.Lips && (
            <div className="sc-zone">
              <h3 className="sc-zone-title">👄 Lips</h3>
              <div className="sc-zone-content">
                {renderSteps(activeRoutine.Lips)}
              </div>
            </div>
          )}
          
          {activeRoutine.Body && (
            <div className="sc-zone">
              <h3 className="sc-zone-title">🚿 Body</h3>
              <div className="sc-zone-content">
                {renderSteps(activeRoutine.Body)}
              </div>
            </div>
          )}
          
          {activeRoutine.rules && activeRoutine.rules.length > 0 && (
            <div className="sc-zone golden-rules-zone">
              <h3 className="sc-zone-title rule-title">⚠️ Golden Rules</h3>
              <div className="sc-rules-container">
                {activeRoutine.rules.map(ruleId => {
                  const rule = GOLDEN_RULES[ruleId];
                  return (
                    <div key={ruleId} className="sc-rule-card">
                      <h4 className="sc-rule-header">{rule.title}</h4>
                      <p className="sc-rule-logic"><strong>The Logic:</strong> {rule.logic}</p>
                      <p className="sc-rule-execution"><strong>Execution:</strong> {rule.execution}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>,
    document.body
  );
}
