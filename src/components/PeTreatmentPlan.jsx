import React, { useState } from 'react';
import '../styles/PeTreatmentPlan.css';

const todayKey = () => new Date().toISOString().split('T')[0];

const loadKegels = () => {
  try {
    return JSON.parse(localStorage.getItem(`lt_pe_kegel_${todayKey()}`)) ||
      { reverse: [false, false, false], standard: [false, false, false] };
  } catch { return { reverse: [false, false, false], standard: [false, false, false] }; }
};

const Badge = ({ type }) => {
  const map = {
    '✅': ['pe-badge--green',  '✅ RCT / Meta-analysis'],
    '⚠️': ['pe-badge--amber',  '⚠️ Moderate evidence'],
    '💬': ['pe-badge--blue',   '💬 Clinical consensus'],
  };
  const [cls, label] = map[type] || ['', type];
  return <span className={`pe-badge ${cls}`}>{label}</span>;
};

const PhaseCard = ({ id, label, title, weeks, color, isActive, isOpen, onToggle, children }) => (
  <div className={`pe-phase-card ${isActive ? 'pe-phase-card--active' : ''}`} style={{ '--phase-color': color }}>
    <button className="pe-phase-header" onClick={onToggle}>
      <div className="pe-phase-header__left">
        <span className="pe-phase-label" style={{ color }}>{label}</span>
        <span className="pe-phase-title">{title}</span>
        {isActive && <span className="pe-active-pill">NOW</span>}
      </div>
      <div className="pe-phase-header__right">
        <span className="pe-phase-weeks">{weeks}</span>
        <span className="pe-phase-chevron">{isOpen ? '▲' : '▼'}</span>
      </div>
    </button>
    {isOpen && <div className="pe-phase-body">{children}</div>}
  </div>
);

const ExerciseCard = ({ title, purpose, badge, technique, reps }) => (
  <div className="pe-exercise-card">
    <div className="pe-exercise-header">
      <h4>{title}</h4>
      <Badge type={badge} />
    </div>
    <p className="pe-exercise-purpose"><em>Purpose: {purpose}</em></p>
    <h5>Technique</h5>
    <ol>{technique.map((s, i) => <li key={i}>{s}</li>)}</ol>
    <div className="pe-exercise-reps">Reps: {reps}</div>
  </div>
);

const ResearchBasis = ({ items }) => (
  <div className="pe-research">
    <h5>Research Basis</h5>
    <ul>{items.map((r, i) => <li key={i}>{r}</li>)}</ul>
  </div>
);

export default function PeTreatmentPlan() {
  const [openPhase, setOpenPhase] = useState(0);
  const [startDate, setStartDate] = useState(() => localStorage.getItem('lt_pe_start') || '');
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lt_pe_sessions')) || []; } catch { return []; }
  });
  const [kegels, setKegels] = useState(loadKegels);
  const [newSess, setNewSess] = useState({ duration: '', stops: '', difficulty: '', notes: '' });
  const [showSessions, setShowSessions] = useState(false);

  const currentWeek = startDate
    ? Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / (7 * 86400000)))
    : null;

  const activePhaseIds = currentWeek !== null ? [
    currentWeek === 0 ? 0 : null,
    (currentWeek >= 1 && currentWeek <= 3) ? 1 : null,
    (currentWeek >= 2 && currentWeek <= 6) ? 2 : null,
    (currentWeek >= 4 && currentWeek <= 8) ? 3 : null,
    (currentWeek >= 6 && currentWeek <= 12) ? 4 : null,
    (currentWeek > 12) ? 'esc' : null,
  ].filter(v => v !== null) : [];

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

  const toggle = (id) => setOpenPhase(p => p === id ? null : id);

  const TIMELINE = [
    { week: 'Week 0',  milestone: 'Baseline IELT recorded, prone masturbation stopped' },
    { week: 'Wk 1–2', milestone: 'Pelvic floor exercises established, first solo stop-start sessions' },
    { week: 'Wk 3–4', milestone: 'Increase in time between stops during solo sessions' },
    { week: 'Wk 5–6', milestone: 'Consistent 10–15 min solo sessions with 4–6 controlled stops' },
    { week: 'Wk 6–8', milestone: 'Begin partner integration in low-tension positions' },
    { week: 'Wk 8–12', milestone: 'Missionary position with reverse kegel deployment' },
    { week: 'Wk 12+', milestone: 'Reassess; escalate to physio or pharmacology if needed' },
  ];

  return (
    <div className="section-container pe-plan">
      <h2>PE Treatment Plan</h2>

      {/* Disclaimer */}
      <div className="pe-disclaimer">
        ⚕️ Self-directed behavioral plan based on peer-reviewed research. Does not replace a urologist or pelvic floor physiotherapist. Ideally get a pelvic floor assessment first to confirm whether your floor is <strong>hypertonic</strong> (tight) or <strong>hypotonic</strong> (weak) — the exercise prescription differs for each.
      </div>

      {/* Evidence key */}
      <div className="pe-evidence-key">
        <Badge type="✅" />
        <Badge type="⚠️" />
        <Badge type="💬" />
      </div>

      {/* Program start */}
      <div className="pe-program-bar">
        <div className="pe-program-bar__field">
          <label>Program Start Date</label>
          <input type="date" value={startDate} onChange={e => setStart(e.target.value)} />
        </div>
        {currentWeek !== null && (
          <div className="pe-program-bar__status">
            <div className="pe-week-badge">Week {currentWeek} / 12</div>
            {activePhaseIds.length > 0 && (
              <div className="pe-active-label">
                Active: {activePhaseIds.map(p => p === 0 ? 'Phase 0' : p === 'esc' ? 'Escalation' : `Phase ${p}`).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Root Cause */}
      <div className="pe-root-card">
        <h3>Root Cause Summary</h3>
        <p>Prone masturbation conditions a hypersensitivity reflex via two mechanisms:</p>
        <ol>
          <li><strong>Conditioned muscle memory</strong> — the brain learned to climax face-down with a tense core and clenched pelvic floor, mapping directly onto missionary position.</li>
          <li><strong>Friction imbalance</strong> — dry or mattress-based stimulation creates far higher friction than vaginal sex. The nervous system becomes conditioned to intense pressure and fires prematurely under lower-friction conditions.</li>
        </ol>
        <p className="pe-root-card__note">The fix is not willpower — it is systematic neurological and muscular reconditioning over <strong>8–12 weeks</strong>.</p>
      </div>

      {/* ── Phase 0 ── */}
      <PhaseCard id={0} label="Phase 0" title="Baseline Self-Assessment" weeks="Week 0"
        color="#a0a0c0" isActive={activePhaseIds.includes(0)} isOpen={openPhase === 0} onToggle={() => toggle(0)}>

        <div className="pe-phase-actions">
          <div className="pe-action-item">
            <div className="pe-action-badge"><Badge type="✅" /></div>
            <div>
              <strong>Stop prone masturbation immediately (cold turkey).</strong>
              <p>Any return to prone technique resets progress. This is the hard reset.</p>
            </div>
          </div>
          <div className="pe-action-item">
            <div className="pe-action-badge"><Badge type="⚠️" /></div>
            <div>
              <strong>Time your baseline IELT.</strong>
              <p>Intravaginal Ejaculatory Latency Time — during solo sessions, time from first stimulation to ejaculation. Clinical PE is defined as &lt;1–2 minutes; healthy average is 5–7 minutes.</p>
            </div>
          </div>
          <div className="pe-action-item">
            <div className="pe-action-badge"><Badge type="⚠️" /></div>
            <div>
              <strong>Identify your pelvic floor type.</strong>
              <p>Try contracting the PC muscle (like stopping urine mid-stream) and consciously releasing it.</p>
              <ul>
                <li><strong>Persistent tightness or difficulty fully releasing</strong> → likely <strong>hypertonic</strong> (tight floor). Prioritise reverse kegels.</li>
                <li><strong>Contraction feels weak or absent</strong> → likely <strong>hypotonic</strong> (weak floor). Use standard kegel + reverse kegel combo.</li>
                <li>Most PE cases involve a hypertonic floor — do not assume without checking.</li>
              </ul>
            </div>
          </div>
        </div>
        <ResearchBasis items={['ISSM 2014 guidelines', 'Pastore et al. 2014']} />
      </PhaseCard>

      {/* ── Phase 1 ── */}
      <PhaseCard id={1} label="Phase 1" title="Pelvic Floor Retraining" weeks="Weeks 1–3 · Daily"
        color="#00b894" isActive={activePhaseIds.includes(1)} isOpen={openPhase === 1} onToggle={() => toggle(1)}>

        <p className="pe-phase-freq">3 sessions per day (AM / PM / EVE) — can be done anywhere, ~5 minutes each.</p>

        <ExerciseCard
          title="Reverse Kegel — Pelvic Floor Drop"
          badge="✅"
          purpose="Trains the active relaxation reflex that acts as a brake on ejaculation."
          technique={[
            'Lie on your back, knees bent, feet flat.',
            'Place one hand on your lower belly (below the navel).',
            'Inhale deeply through the nose — your belly should expand outward, pushing your hand up. Your chest should not rise.',
            'As the belly expands, consciously let the perineum (area between scrotum and anus) drop and release downward. Think of the first moment of beginning to urinate.',
            'This is an active expansion, not passive relaxation — you are mechanically extending the pelvic floor via diaphragmatic pressure.',
            'Exhale slowly. Repeat.',
          ]}
          reps="10–15 reps × 3 sessions per day. Do not push or strain — just practice releasing tension."
        />

        <ExerciseCard
          title="Standard Kegel — Pelvic Floor Contraction"
          badge="✅"
          purpose="Builds motor awareness and control of the PC muscle so you can voluntarily relax it during arousal."
          technique={[
            'Contract the PC muscle upward and inward (as if stopping urine mid-stream). Do not clench your glutes or thighs.',
            'Hold for 2–5 seconds initially, building to 8–10 seconds.',
            'Release fully — a complete drop is as important as the contraction.',
          ]}
          reps="10 reps of timed holds × 3 sessions per day."
        />

        <div className="pe-rule-box">
          <h5>Breathing Rule</h5>
          <p>Never hold your breath during either exercise. Diaphragmatic breathing mechanically drives the reverse kegel — the descent of the diaphragm relaxes the pelvic floor via fascial tension. Belly breathing is also effective as a real-time brake during sex.</p>
        </div>

        <ResearchBasis items={[
          'Pastore et al. (2014): 12-week PFMT study, 40 patients — 82.5% gained ejaculatory control, mean IELT rose from ~40s to 146s. ✅',
          'PMC12516947 (2024): Both lifelong and acquired PE groups showed significant IELT improvement after 8 weeks of structured PFMT. ✅',
          'Systematic review (PubMed 2018): Kegel exercises resolve PE in 55–83% of cases. ✅',
        ]} />

        {/* Daily kegel tracker */}
        <div className="pe-kegel-tracker">
          <h5>Today's Pelvic Floor Sessions</h5>
          {[
            { key: 'reverse', label: 'Reverse Kegel (drop)', color: '#00b894' },
            { key: 'standard', label: 'Standard Kegel (hold)', color: '#6C5CE7' },
          ].map(({ key, label, color }) => (
            <div key={key} className="pe-kegel-row">
              <span className="pe-kegel-label">{label}</span>
              <div className="pe-kegel-checks">
                {['AM', 'PM', 'EVE'].map((slot, i) => (
                  <button
                    key={slot}
                    className={`pe-kegel-btn ${kegels[key][i] ? 'pe-kegel-btn--done' : ''}`}
                    onClick={() => toggleKegel(key, i)}
                  >
                    {kegels[key][i] ? '✓' : slot}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PhaseCard>

      {/* ── Phase 2 ── */}
      <PhaseCard id={2} label="Phase 2" title="Stop-Start Desensitization" weeks="Weeks 2–6 · 3×/week"
        color="#6C5CE7" isActive={activePhaseIds.includes(2)} isOpen={openPhase === 2} onToggle={() => toggle(2)}>

        <p className="pe-phase-freq">3 sessions per week. Continue Phase 1 pelvic floor work daily alongside this.</p>

        <div className="pe-rule-box">
          <h5>Setup</h5>
          <ul>
            <li><strong>Use water-based lubricant every session.</strong> Reduces excess friction, moves conditions closer to intercourse, eliminates a confound so your nervous system adapts to realistic input.</li>
            <li><strong>No prone technique.</strong> Supine (on your back), hand only.</li>
          </ul>
        </div>

        <div className="pe-exercise-card">
          <h4>Protocol</h4>
          <ol>
            <li><strong>Climb to 7/10 arousal</strong> — stimulate at moderate pace to approximately 7 out of 10 on your subjective arousal scale.
              <div className="pe-callout">⚠️ Target 7/10, not 8/10. Most men with PE are very close to the point of no return (PONR) at 8/10, leaving insufficient reaction time. The PONR (9–10/10) is where ejaculation becomes physiologically involuntary.</div>
            </li>
            <li><strong>Stop all stimulation</strong> — remove your hand completely.</li>
            <li><strong>Execute 3–4 reverse kegels</strong> — breathe into your belly, drop the pelvic floor, breathe steadily until arousal returns to 3–4/10.</li>
            <li><strong>Repeat 4–6 cycles</strong>, then allow finish.</li>
            <li><strong>Log each session:</strong> total duration, number of stops, subjective difficulty (1–10). Over weeks, the time between stops will lengthen — this is your primary progress metric.</li>
          </ol>
        </div>

        <div className="pe-exercise-card">
          <div className="pe-exercise-header">
            <h4>Optional Upgrade (Week 4+): Squeeze Technique</h4>
            <Badge type="⚠️" />
          </div>
          <p>At your 7/10 threshold, instead of only stopping, firmly squeeze the glans (head) between thumb and forefinger for 10–20 seconds before releasing. Masters & Johnson's squeeze technique can be layered on as a stronger brake once stop-start is established.</p>
        </div>

        <ResearchBasis items={[
          'Stop-start technique (Semans, 1956) is endorsed by EAU 2024, AUA/SMSNA 2022, and ISSM 2014 guidelines. ✅',
          'PLOS One RCT (2023, PMC10414676): Stop-start significantly increased IELT and eliminated PE symptoms. Stop-start combined with sphincter control training outperformed stop-start alone. ✅',
        ]} />
      </PhaseCard>

      {/* ── Phase 3 ── */}
      <PhaseCard id={3} label="Phase 3" title="Cognitive & Anxiety Decoupling" weeks="Weeks 4–8 · Ongoing"
        color="#fd79a8" isActive={activePhaseIds.includes(3)} isOpen={openPhase === 3} onToggle={() => toggle(3)}>

        <div className="pe-callout pe-callout--warn">
          This phase is often skipped. It is not optional. A 2025 meta-analysis of 15 RCTs (1,243 patients) identified anxiety and attentional misfocus as <strong>independent physiological drivers</strong> of PE — not just psychological overlay.
        </div>

        <div className="pe-exercise-card">
          <div className="pe-exercise-header">
            <h4>Redirect Attention Inward</h4>
            <Badge type="✅" />
          </div>
          <p>Men with PE characteristically overfocus on their partner's reactions and anticipate failure, activating sympathetic arousal (the state that accelerates ejaculation). During sessions:</p>
          <ul>
            <li>Actively redirect focus to your own body — breathing, pelvic floor tension level, arousal number.</li>
            <li>Practice during solo sessions first so it becomes automatic before applying with a partner.</li>
          </ul>
        </div>

        <div className="pe-exercise-card">
          <div className="pe-exercise-header">
            <h4>Drop the Time Goal</h4>
            <Badge type="✅" />
          </div>
          <p>Setting a "10–15 minute" target during partnered sex recreates performance anxiety, raising sympathetic tone and paradoxically worsening control. The AUA explicitly advises against keeping a time goal in mind during sex. Time improvement is a byproduct — arousal awareness and pelvic floor relaxation are the actual objectives.</p>
        </div>

        <div className="pe-exercise-card">
          <div className="pe-exercise-header">
            <h4>Body Tension Audit</h4>
            <Badge type="💬" />
          </div>
          <p>During sessions, actively scan and release:</p>
          <ul>
            <li><strong>Jaw</strong> — unclench</li>
            <li><strong>Shoulders</strong> — drop</li>
            <li><strong>Glutes</strong> — relax</li>
            <li><strong>Breath</strong> — never hold</li>
          </ul>
          <p>Whole-body tension propagates directly to pelvic floor tone. This is especially relevant in missionary position where supporting body weight creates full-body muscle activation.</p>
        </div>

        <ResearchBasis items={[
          'Li et al. (2025 meta-analysis, Andrology): CBT combined with SSRIs outperformed either alone across 15 RCTs, 1,243 patients. ✅',
          'Masters & Johnson sensate focus protocols: attentional redirection reduces sympathetic dominance during arousal. ✅',
        ]} />
      </PhaseCard>

      {/* ── Phase 4 ── */}
      <PhaseCard id={4} label="Phase 4" title="Partner Integration" weeks="Weeks 6–12"
        color="#fdcb6e" isActive={activePhaseIds.includes(4)} isOpen={openPhase === 4} onToggle={() => toggle(4)}>

        <p className="pe-phase-freq">Goal: Transfer the solo-trained skill to partnered sex.</p>

        <div className="pe-exercise-card">
          <div className="pe-exercise-header">
            <h4>Insertion Protocol</h4>
            <Badge type="⚠️" />
          </div>
          <ol>
            <li>Insert slowly.</li>
            <li><strong>Pause 30–60 seconds before thrusting.</strong> Give your nervous system time to acclimate to a genuinely different stimulus — warmth, pressure, movement. The conditioned reflex was trained in a controlled, lower-stimulus context. Penetration is a new input requiring recalibration.</li>
            <li>Begin movement slowly. Depth and pace of thrusting are arousal multipliers — slower and shallower = more control.</li>
          </ol>
        </div>

        <div className="pe-exercise-card">
          <div className="pe-exercise-header">
            <h4>Real-Time Reverse Kegel Deployment</h4>
            <Badge type="✅" />
          </div>
          <p>At your 7/10 threshold during intercourse:</p>
          <ul>
            <li>Exhale slowly</li>
            <li>Drop the pelvic floor actively</li>
            <li>Reduce or pause movement</li>
          </ul>
          <p>This is the direct transfer of what you trained in Phase 2. It will feel harder than in solo practice — neural transfer to a new context (partner present, higher emotional arousal) takes several sessions. That is expected.</p>
        </div>

        <div className="pe-exercise-card">
          <div className="pe-exercise-header">
            <h4>Position Strategy</h4>
            <Badge type="💬" />
          </div>
          <p>Start partner sessions in positions that minimise body-weight tension:</p>
          <ul>
            <li><strong>Side-lying (spooning)</strong></li>
            <li><strong>Partner on top</strong></li>
          </ul>
          <p>Avoid starting with missionary. Missionary forces you to support your body weight, causing whole-body muscle tension that propagates to pelvic floor clenching. It is the hardest position for PE control — build confidence in lower-tension positions first, then graduate to missionary.</p>
        </div>

        <div className="pe-exercise-card">
          <div className="pe-exercise-header">
            <h4>Communication</h4>
            <Badge type="⚠️" />
          </div>
          <p>Open communication with your partner significantly reduces performance anxiety, which is an independent physiological risk factor for PE. Partners who understand what you are working on reduce pressure, which directly improves outcomes.</p>
        </div>

        <ResearchBasis items={[
          'EAU 2024 guidelines. ⚠️',
          'Masters & Johnson behavioral protocols. 💬',
        ]} />
      </PhaseCard>

      {/* ── Escalation ── */}
      <PhaseCard id="esc" label="Escalation" title="If 12 Weeks Is Insufficient" weeks="Week 12+"
        color="#e17055" isActive={activePhaseIds.includes('esc')} isOpen={openPhase === 'esc'} onToggle={() => toggle('esc')}>

        <p className="pe-phase-freq">Evidence-ranked next steps if you complete the full 12-week program without reaching satisfactory control.</p>

        {[
          {
            rank: '1',
            title: 'Pelvic Floor Physiotherapist',
            badge: '✅',
            text: 'The highest-yield clinical intervention. A physiotherapist can: assess actual resting tone (not self-reported), use biofeedback to confirm correct muscle targeting, apply electrostimulation if needed. Pastore (2024) retrospective, 154 patients: 91% gained ejaculatory control after supervised 12-week PFMT with biofeedback. 64% maintained control at 24 months; 56% at 36 months.',
          },
          {
            rank: '2',
            title: 'Dapoxetine (On-Demand SSRI)',
            badge: '✅',
            text: 'The only pharmacological agent with approval-class evidence for PE. Taken 1–3 hours before intercourse. Dapoxetine 30–60mg shows IELT improvement of 1.7–3× over placebo in RCTs. Best used as a bridge alongside behavioral training, not as a permanent standalone.',
          },
          {
            rank: '3',
            title: 'Topical Anesthetic (Lidocaine-Prilocaine)',
            badge: '✅',
            text: 'Lidocaine-prilocaine 5% cream or spray applied 20–30 minutes before intercourse reduces penile sensitivity. Effective but requires a condom to prevent partner numbing. EAU 2024 recommends as second-line when behavioral therapy alone is insufficient.',
          },
          {
            rank: '4',
            title: 'Sex Therapist / CBT (Professional)',
            badge: '✅',
            text: 'If performance anxiety is the dominant driver, structured CBT with a certified sex therapist outperforms self-directed techniques. Look for AASECT-certified practitioners.',
          },
        ].map(({ rank, title, badge, text }) => (
          <div key={rank} className="pe-escalation-item">
            <div className="pe-escalation-rank">{rank}</div>
            <div className="pe-escalation-body">
              <div className="pe-exercise-header">
                <h4>{title}</h4>
                <Badge type={badge} />
              </div>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </PhaseCard>

      {/* ── Stop-Start Session Logger ── */}
      <div className="pe-logger">
        <h3>Stop-Start Session Log</h3>
        <p className="pe-logger-note">Log each Phase 2 session. Tracking the trend in "stops required" is your primary progress metric.</p>

        <div className="pe-logger-form">
          <div className="pe-logger-field">
            <label>Duration (min)</label>
            <input type="number" min="1" max="120" placeholder="25"
              value={newSess.duration} onChange={e => setNewSess(s => ({ ...s, duration: e.target.value }))} />
          </div>
          <div className="pe-logger-field">
            <label>Stops required</label>
            <input type="number" min="0" max="20" placeholder="4"
              value={newSess.stops} onChange={e => setNewSess(s => ({ ...s, stops: e.target.value }))} />
          </div>
          <div className="pe-logger-field">
            <label>Difficulty (1–10)</label>
            <input type="number" min="1" max="10" placeholder="6"
              value={newSess.difficulty} onChange={e => setNewSess(s => ({ ...s, difficulty: e.target.value }))} />
          </div>
          <div className="pe-logger-field pe-logger-field--wide">
            <label>Notes</label>
            <input type="text" placeholder="Optional observations..."
              value={newSess.notes} onChange={e => setNewSess(s => ({ ...s, notes: e.target.value }))} />
          </div>
          <button className="pe-log-btn" onClick={addSession}>Log Session</button>
        </div>

        {sessions.length > 0 && (
          <div className="pe-sessions-history">
            <button className="pe-toggle-btn" onClick={() => setShowSessions(v => !v)}>
              {showSessions ? 'Hide' : 'Show'} History ({sessions.length} sessions)
            </button>
            {showSessions && (
              <div className="pe-sessions-table-wrap">
                <table className="pe-sessions-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Duration</th>
                      <th>Stops</th>
                      <th>Difficulty</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => (
                      <tr key={i}>
                        <td>{s.date}</td>
                        <td>{s.duration} min</td>
                        <td>{s.stops}</td>
                        <td>{s.difficulty}/10</td>
                        <td className="pe-notes-cell">{s.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Timeline ── */}
      <div className="pe-timeline-section">
        <h3>Realistic Timeline</h3>
        <div className="pe-callout pe-callout--info">
          The original plan's 4–8 week claim is optimistic. Clinical evidence uses <strong>12-week protocols</strong> for full effect. You are not failing if improvement at week 6 is partial — that is the expected trajectory.
        </div>
        <div className="timeline" style={{ marginTop: '18px' }}>
          {TIMELINE.map(({ week, milestone }, i) => {
            const weekNum = i;
            const isCurrent = currentWeek !== null &&
              ((weekNum === 0 && currentWeek === 0) ||
               (weekNum === 1 && currentWeek >= 1 && currentWeek <= 2) ||
               (weekNum === 2 && currentWeek >= 3 && currentWeek <= 4) ||
               (weekNum === 3 && currentWeek >= 5 && currentWeek <= 6) ||
               (weekNum === 4 && currentWeek >= 6 && currentWeek <= 8) ||
               (weekNum === 5 && currentWeek >= 8 && currentWeek <= 12) ||
               (weekNum === 6 && currentWeek > 12));
            return (
              <div key={i} className={`timeline-item${isCurrent ? ' timeline-item--active' : ''}`}>
                {isCurrent && <div className="timeline-active-pulse" />}
                <div className="timeline-time">{week}</div>
                <div className="timeline-content"><p>{milestone}</p></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── References ── */}
      <div className="pe-references">
        <h3>Key References</h3>
        <ul>
          <li>Pastore, A.L. et al. (2014). <em>Pelvic floor muscle rehabilitation for patients with lifelong premature ejaculation.</em> Therapeutic Advances in Urology, 6(3), 83–88.</li>
          <li>Li et al. (2025). <em>CBT combined with SSRIs for PE: systematic review and meta-analysis.</em> Andrology.</li>
          <li>Rodríguez et al. (2023). <em>Stop-start technique combined with sphincter control training for PE.</em> PLOS One, PMC10414676.</li>
          <li>Romano, L. et al. (2024). <em>Comparison of current international guidelines on premature ejaculation: 2024 update.</em> Diagnostics, 14(16), 1819.</li>
          <li>EAU Guidelines on Sexual and Reproductive Health (2024).</li>
          <li>AUA/SMSNA Guidelines on Premature Ejaculation (2022).</li>
          <li>ISSM Evidence-Based Definition and Guidelines (2014).</li>
        </ul>
      </div>
    </div>
  );
}
