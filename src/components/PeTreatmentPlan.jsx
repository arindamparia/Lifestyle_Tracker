import React, { useState } from 'react';
import '../styles/PeTreatmentPlan.css';

const todayKey = () => new Date().toISOString().split('T')[0];

const loadKegels = () => {
  try {
    return JSON.parse(localStorage.getItem(`lt_pe_kegel_${todayKey()}`)) ||
      { reverse: [false, false, false], standard: [false, false, false] };
  } catch { return { reverse: [false, false, false], standard: [false, false, false] }; }
};

const PHASES = [
  {
    id: 0,
    title: "Phase 0 (Week 0) - Baseline Reset",
    focus: "Stop reinforcing the old neuromuscular reflex and determine your starting point.",
    guidelines: [
      { label: "🛑 Hard Reset", desc: "Stop prone masturbation immediately (cold turkey). Any return to prone technique resets progress." },
      { label: "⏱️ Baseline Test", desc: "Masturbate normally (in a standard position like lying on your back) and time your IELT (time from start to climax)." },
      { label: "🧘‍♂️ Floor Assessment", desc: "Identify your pelvic floor type. If you feel constant tension or tightness in your perineum, you have a hypertonic (tight) floor. You must focus primarily on Reverse Kegels to relax it." }
    ]
  },
  {
    id: 1,
    title: "Phase 1 (Week 1–3) - Establishing Control",
    focus: "Your nervous system is currently wired to tense up and climax quickly. This phase is about learning to recognize that tension and stopping before the point of no return.",
    guidelines: [
      { label: "🧘‍♂️ Daily Routine", desc: "Complete 3 sets of Reverse Kegels (pushing out gently as if to pee) and Standard Kegels (pulling up). Hold each for 3-5 seconds. (Prioritize reverse kegels to relax the floor)." },
      { label: "🛑 Solo Stop-Start", desc: "Masturbate without lubrication. Aim for 10-15 minutes total. Crucially: stop ALL stimulation the moment you feel tension rising (level 7/10 arousal). Wait 30-60 seconds for the urge to subside completely, then resume." }
    ]
  },
  {
    id: 2,
    title: "Phase 2 (Week 3–6) - Expanding the Window",
    focus: "Train the nervous system to endure longer periods of stimulation without spiking to the point of no return.",
    guidelines: [
      { label: "🧘‍♂️ Daily Routine", desc: "Continue your daily Kegel sets to build muscle memory." },
      { label: "⏳ Expanding Time", desc: "During solo sessions, actively try to increase the continuous stimulation time between stops." },
      { label: "🎯 Goal", desc: "Aim for 10-15 min sessions with 4-6 controlled stops, ensuring your pelvic floor remains completely relaxed during stimulation." }
    ]
  },
  {
    id: 3,
    title: "Phase 3 (Week 6–8) - Advanced Solo Control",
    focus: "Simulate higher intensity and friction to pressure-test your new muscle control.",
    guidelines: [
      { label: "🧴 Introduce Lube", desc: "Use lubrication to increase friction and simulate more intense stimulation." },
      { label: "⏳ Strict Relaxation", desc: "Focus heavily on maintaining a completely relaxed pelvic floor. The lube will make it harder to resist clenching." },
      { label: "🎯 Goal", desc: "Aim for longer sessions (15-20 mins) with fewer stops required to maintain control." }
    ]
  },
  {
    id: 4,
    title: "Phase 4 (Week 8–12) - Solo Mastery",
    focus: "Ensure your control is absolute, regardless of physical position or intensity.",
    guidelines: [
      { label: "🔄 Positional Variance", desc: "Practice in different physical positions (e.g., standing, kneeling). Relaxation should not be dependent on lying down." },
      { label: "🌬️ Active Deployment", desc: "Actively deploy reverse kegels DURING continuous stimulation to physically force the pelvic floor to relax when you feel it start to tense up." },
      { label: "📈 Escalation", desc: "Gradually increase the speed and intensity of stimulation while maintaining absolute control over the muscle." }
    ]
  },
  {
    id: 5,
    title: "Escalation (Week 12+)",
    focus: "Review your progress.",
    guidelines: [
      { label: "📊 Reassess", desc: "Review your stop-start logs over the last 12 weeks. Has your control improved?" },
      { label: "👨‍⚕️ Next Steps", desc: "If you have strictly followed the protocol and seen no improvement, consider consulting a pelvic floor physiotherapist or urologist for pharmacological assistance." }
    ]
  }
];

const MOTIVATION = [
  "Consistency is the only bridge between your goal and your reality.",
  "Every small win adds up. You are literally rewiring your nervous system.",
  "Discipline today equals freedom tomorrow. Stick to the protocol.",
  "Don't measure progress by the day. Measure it by the phase.",
  "Relaxation is active, not passive. Keep breathing, keep pushing through."
];

export default function PeTreatmentPlan() {
  const [startDate, setStartDate] = useState(() => localStorage.getItem('lt_pe_start') || '');
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lt_pe_sessions')) || []; } catch { return []; }
  });
  const [kegels, setKegels] = useState(loadKegels);
  const [newSess, setNewSess] = useState({ duration: '', stops: '', difficulty: '', notes: '' });
  const [showSessions, setShowSessions] = useState(false);
  const [showTheory, setShowTheory] = useState(false);
  
  // Pick a stable random motivation for today
  const dailyMotivation = MOTIVATION[new Date().getDay() % MOTIVATION.length];

  const currentWeek = startDate
    ? Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / (7 * 86400000)))
    : null;

  let activePhase = PHASES[0];
  if (currentWeek !== null) {
    if (currentWeek >= 1 && currentWeek < 3) activePhase = PHASES[1];
    else if (currentWeek >= 3 && currentWeek < 6) activePhase = PHASES[2];
    else if (currentWeek >= 6 && currentWeek < 8) activePhase = PHASES[3];
    else if (currentWeek >= 8 && currentWeek <= 12) activePhase = PHASES[4];
    else if (currentWeek > 12) activePhase = PHASES[5];
  }

  const setStart = (date) => {
    setStartDate(date);
    localStorage.setItem('lt_pe_start', date);
  };

  const toggleKegel = (type, idx) => {
    const updated = { ...kegels, [type]: kegels[type].map((v, i) => i === idx ? !v : v) };
    setKegels(updated);
    localStorage.setItem(`lt_pe_kegel_${todayKey()}`, JSON.stringify(updated));
  };

  const addSession = () => {
    if (!newSess.duration || !newSess.stops) return;
    const s = {
      date: todayKey(),
      duration: Number(newSess.duration),
      stops: Number(newSess.stops),
      difficulty: Number(newSess.difficulty) || 5,
      notes: newSess.notes,
    };
    const updated = [s, ...sessions];
    setSessions(updated);
    localStorage.setItem('lt_pe_sessions', JSON.stringify(updated));
    setNewSess({ duration: '', stops: '', difficulty: '', notes: '' });
  };

  return (
    <div className="section-container pe-plan">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>PE Treatment Plan</h2>
      </div>

      <div className="pe-program-bar" style={{ marginBottom: '24px' }}>
        <div className="pe-program-bar__field">
          <label>Program Start Date</label>
          <input type="date" value={startDate} onChange={e => setStart(e.target.value)} />
        </div>
        {currentWeek !== null && (
          <div className="pe-program-bar__status">
            <div className="pe-week-badge">Week {currentWeek} / 12</div>
          </div>
        )}
      </div>

      {!startDate ? (
        <div className="warning-box" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <h4>Welcome to the 12-Week Reconditioning Program</h4>
          <p>Please select a Start Date above to calculate your current phase and view your daily instructions.</p>
        </div>
      ) : (
        <>
          {/* ── Motivational Banner ── */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(74,222,128,0.15) 0%, rgba(96,165,250,0.15) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontStyle: 'italic', color: '#e2e8f0', fontSize: '0.95rem' }}>
              "{dailyMotivation}"
            </p>
          </div>

          {/* ── Actionable Current Phase ── */}
          <div className="pe-root-card" style={{ background: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255,255,255,0.15)' }}>
            <h3 style={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              📍 Current Phase: {activePhase.title}
            </h3>
            
            {activePhase.focus && (
              <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginTop: '14px', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                <strong>Focus:</strong> {activePhase.focus}
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activePhase.guidelines.map((g, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '6px', fontSize: '0.9rem' }}>
                    {g.label}
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    {g.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Daily Kegel Tracker ── */}
          <div className="pe-phase-card pe-phase-card--active" style={{ '--phase-color': '#4ade80' }}>
            <div className="pe-phase-header" style={{ cursor: 'default' }}>
              <div className="pe-phase-header__left">
                <span className="pe-phase-label" style={{ color: '#4ade80' }}>Daily</span>
                <span className="pe-phase-title">Kegel Routine Tracker</span>
              </div>
            </div>
            <div className="pe-phase-body">
              <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '16px' }}>
                Check off your sets for today. (1 Set = 10 reps, 3-5 sec hold each).
              </p>
              
              <div className="pe-kegel-tracker">
                <div className="pe-kegel-row">
                  <div className="pe-kegel-label">
                    <strong>Reverse Kegels</strong>
                    <span>(Focus on pushing/relaxing)</span>
                  </div>
                  <div className="pe-kegel-checks">
                    {kegels.reverse.map((v, i) => (
                      <button key={i} className={`pe-kegel-btn ${v ? 'active' : ''}`} onClick={() => toggleKegel('reverse', i)}>
                        {v ? '✓' : i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pe-kegel-row">
                  <div className="pe-kegel-label">
                    <strong>Standard Kegels</strong>
                    <span>(Focus on contraction/pulling)</span>
                  </div>
                  <div className="pe-kegel-checks">
                    {kegels.standard.map((v, i) => (
                      <button key={i} className={`pe-kegel-btn ${v ? 'active' : ''}`} onClick={() => toggleKegel('standard', i)}>
                        {v ? '✓' : i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Session Logger ── */}
          <div className="pe-phase-card pe-phase-card--active" style={{ '--phase-color': '#60a5fa' }}>
            <div className="pe-phase-header" onClick={() => setShowSessions(!showSessions)} style={{ cursor: 'pointer' }}>
              <div className="pe-phase-header__left">
                <span className="pe-phase-label" style={{ color: '#60a5fa' }}>Log</span>
                <span className="pe-phase-title">Stop-Start Sessions</span>
              </div>
              <div className="pe-phase-header__right">
                <span className="pe-phase-chevron">{showSessions ? '▲' : '▼'}</span>
              </div>
            </div>
            {showSessions && (
              <div className="pe-phase-body">
                <div className="pe-logger-form">
                  <div className="pe-logger-field">
                    <label>Duration (mins)</label>
                    <input type="number" min="1" value={newSess.duration} onChange={e => setNewSess({ ...newSess, duration: e.target.value })} placeholder="15" />
                  </div>
                  <div className="pe-logger-field">
                    <label>Stops</label>
                    <input type="number" min="0" value={newSess.stops} onChange={e => setNewSess({ ...newSess, stops: e.target.value })} placeholder="4" />
                  </div>
                  <div className="pe-logger-field">
                    <label>Control (1-10)</label>
                    <input type="number" min="1" max="10" value={newSess.difficulty} onChange={e => setNewSess({ ...newSess, difficulty: e.target.value })} placeholder="5" />
                  </div>
                  <div className="pe-logger-field pe-logger-field--wide">
                    <label>Notes</label>
                    <input type="text" value={newSess.notes} onChange={e => setNewSess({ ...newSess, notes: e.target.value })} placeholder="Optional..." />
                  </div>
                  <button className="pe-log-btn" onClick={addSession}>Log Session</button>
                </div>

                {sessions.length > 0 && (
                  <div className="pe-sessions-table-wrap">
                    <table className="pe-sessions-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Duration</th>
                          <th>Stops</th>
                          <th>Control</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((s, i) => (
                          <tr key={i}>
                            <td>{s.date.slice(5)}</td>
                            <td>{s.duration}m</td>
                            <td>{s.stops}</td>
                            <td>{s.difficulty}/10</td>
                            <td className="pe-note-cell">{s.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* ── Optional Theory ── */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button className="action-btn-secondary" onClick={() => setShowTheory(!showTheory)}>
              {showTheory ? 'Hide Research Theory' : '📖 Read Research & Theory'}
            </button>
            {showTheory && (
              <div className="pe-disclaimer" style={{ marginTop: '16px', textAlign: 'left' }}>
                <p><strong>Root Cause:</strong> Prone masturbation conditions a hypersensitivity reflex via two mechanisms:</p>
                <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
                  <li><strong>Conditioned muscle memory</strong> — the brain learned to climax face-down with a tense core and clenched pelvic floor, mapping directly onto missionary position.</li>
                  <li><strong>Friction imbalance</strong> — dry or mattress-based stimulation creates far higher friction than vaginal sex. The nervous system becomes conditioned to intense pressure and fires prematurely under lower-friction conditions.</li>
                </ol>
                <p>The fix is systematic neurological and muscular reconditioning over 8–12 weeks. Does not replace a urologist or pelvic floor physiotherapist.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
