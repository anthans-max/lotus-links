import { useState, useEffect } from "react";

const FontInjector = () => {
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap";
    document.head.appendChild(l);
  }, []);
  return null;
};

const GS = () => (
  <style>{`
    :root {
      --bg: #0a120a;
      --surface: #132013;
      --surface2: #1a2e1a;
      --surface3: #203020;
      --border: rgba(255,255,255,0.07);
      --border2: rgba(255,255,255,0.12);
      --forest: #0d3d1a;
      --gold: #c8a84b;
      --gold-light: #e6c96a;
      --gold-dim: rgba(200,168,75,0.15);
      --gold-border: rgba(200,168,75,0.3);
      --green-bright: #4CAF50;
      --green-dim: rgba(76,175,80,0.15);
      --text: #f0ede6;
      --text-muted: rgba(240,237,230,0.55);
      --text-dim: rgba(240,237,230,0.28);
      --over: #d4a017;
      --over-dim: rgba(212,160,23,0.18);
      --over-border: rgba(212,160,23,0.38);
      --fd: 'Playfair Display', Georgia, serif;
      --fb: 'Outfit', sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow-x: hidden; -webkit-text-size-adjust: 100%; }
    body { background: var(--bg); color: var(--text); font-family: var(--fb); }

    @keyframes fadeUp { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
    @keyframes fadeIn { from{opacity:0;} to{opacity:1;} }
    @keyframes pop { 0%{transform:scale(1);} 40%{transform:scale(1.18);} 100%{transform:scale(1);} }
    @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
    @keyframes slideUp { from{opacity:0;transform:translateY(40px);} to{opacity:1;transform:translateY(0);} }
    @keyframes confetti { 0%{opacity:1;transform:translateY(0) rotate(0deg);} 100%{opacity:0;transform:translateY(80px) rotate(720deg);} }
    @keyframes checkPop { 0%{transform:scale(0);opacity:0;} 60%{transform:scale(1.3);} 100%{transform:scale(1);opacity:1;} }
    @keyframes spin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }

    .fade-up { animation: fadeUp 0.5s ease forwards; }
    .fade-in { animation: fadeIn 0.4s ease forwards; }
    .pop { animation: pop 0.3s ease; }

    /* Phone shell */
    .phone {
      max-width: 390px;
      margin: 0 auto;
      min-height: 100vh;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    /* Tap buttons */
    .tap { -webkit-tap-highlight-color: transparent; cursor: pointer; user-select: none; }

    /* Score stepper button */
    .step-btn {
      width: 64px; height: 64px;
      border-radius: 50%; border: none;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.75rem; font-weight: 300;
      cursor: pointer; transition: all 0.15s;
      -webkit-tap-highlight-color: transparent;
      flex-shrink: 0;
    }
    .step-btn:active { transform: scale(0.9); }
    .step-minus { background: var(--over-dim); color: var(--over); border: 1.5px solid var(--over-border); }
    .step-minus:hover { background: rgba(212,160,23,0.28); }
    .step-plus  { background: rgba(76,175,80,0.15); color: var(--green-bright); border: 1.5px solid rgba(76,175,80,0.3); }
    .step-plus:hover  { background: rgba(76,175,80,0.25); }

    /* Score display */
    .score-display {
      width: 100px; height: 100px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column;
      font-family: var(--fd); font-size: 3rem; font-weight: 600;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    /* Hole pill nav */
    .hole-pill {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.78rem; font-weight: 500;
      cursor: pointer; transition: all 0.2s; flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
      font-family: var(--fb);
    }
    .hole-pill.done { background: var(--gold); color: #0a120a; }
    .hole-pill.active { background: var(--surface2); border: 2px solid var(--gold); color: var(--gold); }
    .hole-pill.todo { background: var(--surface2); border: 1px solid var(--border2); color: var(--text-dim); }

    /* Submit button */
    .submit-btn {
      width: 100%; padding: 1.1rem; border: none; border-radius: 8px;
      background: linear-gradient(135deg, var(--gold), #8a6a1e);
      color: #0a120a; font-family: var(--fb); font-weight: 600;
      font-size: 1rem; letter-spacing: 0.05em;
      cursor: pointer; transition: all 0.2s;
      -webkit-tap-highlight-color: transparent;
      min-height: 56px;
    }
    .submit-btn:active { transform: scale(0.98); }
    .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .submit-btn.outline {
      background: none; border: 1.5px solid var(--gold-border);
      color: var(--gold);
    }
    .submit-btn.ghost {
      background: var(--surface2); color: var(--text-muted);
      border: 1px solid var(--border2);
    }

    /* Relative-to-par label */
    .par-label {
      font-size: 0.72rem; letter-spacing: 0.15em; text-transform: uppercase;
      font-family: var(--fb); font-weight: 500;
      padding: 0.2rem 0.6rem; border-radius: 20px;
    }

    /* PIN input */
    .pin-digit {
      width: 56px; height: 68px;
      background: var(--surface2); border: 1.5px solid var(--border2);
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-family: var(--fd); font-size: 2rem; color: var(--text);
      transition: all 0.2s;
    }
    .pin-digit.filled { border-color: var(--gold); }
    .pin-digit.active { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-dim); }

    /* Keypad */
    .keypad-btn {
      height: 64px; border-radius: 8px;
      background: var(--surface2); border: 1px solid var(--border);
      color: var(--text); font-family: var(--fd); font-size: 1.5rem;
      cursor: pointer; transition: all 0.15s; display: flex;
      align-items: center; justify-content: center;
      -webkit-tap-highlight-color: transparent;
    }
    .keypad-btn:active { background: var(--surface3); transform: scale(0.96); }
    .keypad-btn.delete { color: var(--text-muted); font-size: 1.6rem; font-family: var(--fb); }
    .keypad-btn.gold { background: linear-gradient(135deg, var(--gold), #8a6a1e); color: #0a120a; font-size: 1rem; font-weight: 600; font-family: var(--fb); letter-spacing: 0.05em; }
    .keypad-btn.gold:active { opacity: 0.85; }

    /* Progress bar */
    .progress-track { height: 4px; background: var(--surface2); border-radius: 2px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--gold), var(--green-bright)); transition: width 0.5s ease; }

    /* Summary row */
    .summary-row {
      display: grid; grid-template-columns: 28px 1fr 40px 40px 60px;
      align-items: center; gap: 0.5rem;
      padding: 0.6rem 0; border-bottom: 1px solid var(--border);
    }

    /* Confetti particle */
    .confetti-p {
      position: absolute; width: 8px; height: 8px; border-radius: 2px;
      animation: confetti 1.2s ease forwards;
    }
  `}</style>
);

// ── DATA ─────────────────────────────────────────────────────────────────────
const HOLES = [
  { n:1, par:3, yds:110, tip:"Aim for the center — bunker left" },
  { n:2, par:3, yds:150, tip:"Longest hole. Use your best ball flight" },
  { n:3, par:3, yds:90,  tip:"Short and tight. Accuracy over power" },
  { n:4, par:3, yds:130, tip:"Flag is tucked right today" },
  { n:5, par:3, yds:100, tip:"Elevated green — club up one" },
  { n:6, par:3, yds:90,  tip:"Wind often left-to-right here" },
  { n:7, par:3, yds:105, tip:"Two-tier green — read the slope" },
  { n:8, par:3, yds:120, tip:"Water short-left. Safe play = center" },
  { n:9, par:3, yds:60,  tip:"Shortest hole! Great birdie chance ⛳" },
  { n:10, par:3, yds:105, tip:"Finishing hole — go for it!" },
];

const GROUPS = [
  { id: "G1", name: "Group 1 — Team Eagle",   pin: "1234", chaperone: "Ms. Rivera",  players: ["Aiden L.","Maya P.","Ethan R.","Sofia K."] },
  { id: "G2", name: "Group 2 — Team Birdie",  pin: "2345", chaperone: "Mr. Johnson", players: ["Liam T.","Olivia M.","Noah B.","Emma S."] },
  { id: "G3", name: "Group 3 — Team Fairway", pin: "3456", chaperone: "Ms. Patel",   players: ["Lucas H.","Ava W.","Mason D.","Isabella C."] },
];

const parLabel = (score, par) => {
  const d = score - par;
  if (d <= -2) return { text:"Eagle 🦅", color:"#e6c96a", bg:"rgba(230,201,106,0.15)" };
  if (d === -1) return { text:"Birdie 🐦", color:"#4CAF50", bg:"rgba(76,175,80,0.15)" };
  if (d === 0)  return { text:"Par ✓",     color:"rgba(240,237,230,0.5)", bg:"rgba(255,255,255,0.06)" };
  if (d === 1)  return { text:"Bogey",      color:"#d4a017", bg:"rgba(212,160,23,0.15)" };
  if (d === 2)  return { text:"Double",     color:"#d4a017", bg:"rgba(212,160,23,0.15)" };
  return { text:`+${d}`, color:"#d4a017", bg:"rgba(212,160,23,0.15)" };
};

// ── SCREENS ───────────────────────────────────────────────────────────────────

// 1. PIN Entry
const PinScreen = ({ onSuccess }) => {
  const [pin, setPin] = useState([]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const press = (d) => {
    if (pin.length >= 4) return;
    const next = [...pin, d];
    setPin(next);
    setError(false);
    if (next.length === 4) {
      setTimeout(() => {
        const found = GROUPS.find(g => g.pin === next.join(""));
        if (found) { onSuccess(found); }
        else {
          setShake(true);
          setError(true);
          setPin([]);
          setTimeout(() => setShake(false), 500);
        }
      }, 150);
    }
  };

  const del = () => { setPin(p => p.slice(0, -1)); setError(false); };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:"2.5rem", animation:"fadeUp 0.5s ease" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:"0.75rem" }}>⛳</div>
        <div style={{ fontFamily:"var(--fd)", fontSize:"1.75rem", fontWeight:400, color:"var(--text)", marginBottom:"0.3rem" }}>Lotus Links</div>
        <div style={{ fontSize:"0.8rem", color:"var(--gold)", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:"0.75rem" }}>WISH Charter Golf · The Lakes</div>
        <div style={{ fontSize:"0.9rem", color:"var(--text-muted)", lineHeight:1.5 }}>Enter your group PIN to start scoring</div>
      </div>

      {/* PIN dots */}
      <div style={{ display:"flex", justifyContent:"center", gap:"0.75rem", marginBottom:"0.75rem", transform:shake?"translateX(-8px)":"none", transition:"transform 0.1s" }}>
        {[0,1,2,3].map(i => (
          <div key={i} className={`pin-digit ${i < pin.length ? "filled" : ""} ${i === pin.length ? "active" : ""}`}>
            {i < pin.length ? "●" : ""}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ textAlign:"center", color:"var(--over)", fontSize:"0.82rem", marginBottom:"0.75rem", animation:"fadeIn 0.2s ease" }}>
          Incorrect PIN — try again
        </div>
      )}

      <div style={{ fontSize:"0.72rem", color:"var(--text-dim)", textAlign:"center", marginBottom:"2rem", fontStyle:"italic" }}>
        Demo PINs: 1234 · 2345 · 3456
      </div>

      {/* Keypad */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.6rem", maxWidth:300, margin:"0 auto", width:"100%" }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} className="keypad-btn tap" onClick={() => press(String(n))}>{n}</button>
        ))}
        <button className="keypad-btn tap" style={{ fontSize:"1.4rem", opacity:0.5, cursor:"default" }} onClick={() => {}}>⛳</button>
        <button className="keypad-btn tap" onClick={() => press("0")}>0</button>
        <button className="keypad-btn delete tap" onClick={del}>⌫</button>
      </div>
    </div>
  );
};

// 2. Group Confirm
const GroupConfirm = ({ group, onStart, onBack }) => (
  <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"2rem 1.5rem", animation:"fadeUp 0.4s ease" }}>
    <button onClick={onBack} style={{ background:"none", border:"none", color:"var(--text-muted)", fontSize:"0.85rem", cursor:"pointer", alignSelf:"flex-start", marginBottom:"1.5rem", padding:0, display:"flex", alignItems:"center", gap:"0.4rem", fontFamily:"var(--fb)" }}>← Back</button>

    <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center" }}>
      <div style={{ background:"linear-gradient(135deg,var(--forest),var(--surface))", border:"1px solid var(--gold-border)", borderRadius:12, padding:"1.75rem", marginBottom:"1.5rem", textAlign:"center" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:"1rem" }}>👋</div>
        <div style={{ fontFamily:"var(--fd)", fontSize:"1.5rem", color:"var(--text)", marginBottom:"0.4rem" }}>Welcome, {group.chaperone}!</div>
        <div style={{ fontSize:"0.8rem", color:"var(--gold)", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:"1.25rem" }}>{group.name}</div>
        <div style={{ background:"var(--surface2)", borderRadius:8, padding:"1rem", marginBottom:"1rem" }}>
          <div style={{ fontSize:"0.68rem", color:"var(--text-dim)", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:"0.6rem", fontFamily:"var(--fb)" }}>Your Players</div>
          {group.players.map((p,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.6rem", padding:"0.35rem 0", borderBottom: i < group.players.length-1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:"var(--surface3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", color:"var(--gold)", flexShrink:0, fontFamily:"var(--fb)" }}>
                {p.split(" ").map(n=>n[0]).join("")}
              </div>
              <div style={{ fontSize:"0.9rem", color:"var(--text-muted)" }}>{p}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:"0.8rem", color:"var(--text-muted)", lineHeight:1.6 }}>
          Scramble format · 10 holes · The Lakes at El Segundo<br/>
          <span style={{ color:"var(--text-dim)", fontSize:"0.72rem" }}>You'll enter one team score per hole</span>
        </div>
      </div>
      <button className="submit-btn" onClick={onStart}>Start Scoring →</button>
    </div>
  </div>
);

// 3. Score Entry (main screen)
const ScoreEntry = ({ group, scores, setScores, onFinish }) => {
  const [hole, setHole] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [justSaved, setJustSaved] = useState(false);

  const h = HOLES[hole];
  const score = scores[hole] ?? h.par; // default to par
  const rel = score - h.par;
  const pLabel = parLabel(score, h.par);
  const completed = scores.filter(s => s !== null && s !== undefined).length;

  const setScore = (val) => {
    const clamped = Math.max(1, Math.min(10, val));
    const next = [...scores];
    next[hole] = clamped;
    setScores(next);
    setAnimKey(k => k + 1);
  };

  const saveAndNext = () => {
    // ensure current hole saved
    if (scores[hole] === undefined || scores[hole] === null) {
      const next = [...scores];
      next[hole] = h.par;
      setScores(next);
    }
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
      if (hole < HOLES.length - 1) {
        setHole(h2 => h2 + 1);
      } else {
        onFinish();
      }
    }, 600);
  };

  const goToHole = (i) => { setHole(i); };

  const currentScore = scores[hole] ?? h.par;
  const totalScore = scores.reduce((a,s) => a + (s ?? 0), 0);
  const totalPar = HOLES.slice(0, completed).reduce((a,h2) => a + h2.par, 0);
  const totalRel = totalScore - totalPar;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      {/* Top bar */}
      <div style={{ padding:"1rem 1.25rem 0.75rem", borderBottom:"1px solid var(--border)", background:"var(--surface)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem" }}>
          <div>
            <div style={{ fontFamily:"var(--fd)", fontSize:"0.95rem", color:"var(--text)" }}>{group.name.split("—")[1]?.trim()}</div>
            <div style={{ fontSize:"0.68rem", color:"var(--text-dim)", letterSpacing:"0.1em" }}>{group.chaperone}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"0.65rem", color:"var(--text-dim)", letterSpacing:"0.12em", textTransform:"uppercase" }}>Total</div>
            <div style={{ fontFamily:"var(--fd)", fontSize:"1.1rem", color: totalRel < 0 ? "#4CAF50" : totalRel > 0 ? "var(--over)" : "var(--text-muted)" }}>
              {completed === 0 ? "—" : totalRel === 0 ? "E" : totalRel > 0 ? `+${totalRel}` : totalRel}
            </div>
          </div>
        </div>
        {/* Progress */}
        <div className="progress-track">
          <div className="progress-fill" style={{ width:`${(completed/HOLES.length)*100}%` }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:"0.3rem" }}>
          <div style={{ fontSize:"0.62rem", color:"var(--text-dim)" }}>{completed}/{HOLES.length} holes</div>
          <div style={{ fontSize:"0.62rem", color:"var(--gold)" }}>{Math.round((completed/HOLES.length)*100)}% complete</div>
        </div>
      </div>

      {/* Hole pill navigator */}
      <div style={{ padding:"0.75rem 1.25rem", borderBottom:"1px solid var(--border)", overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        <div style={{ display:"flex", gap:"0.4rem", minWidth:"max-content" }}>
          {HOLES.map((h2, i) => (
            <button key={i} className={`hole-pill tap ${scores[i] !== null && scores[i] !== undefined ? "done" : i === hole ? "active" : "todo"}`}
              onClick={() => goToHole(i)}>
              {i+1}
            </button>
          ))}
        </div>
      </div>

      {/* Main scoring area */}
      <div style={{ flex:1, padding:"1.25rem", display:"flex", flexDirection:"column", gap:"1rem" }}>

        {/* Hole info card */}
        <div style={{ background:"linear-gradient(135deg,var(--forest),var(--surface2))", border:"1px solid var(--gold-border)", borderRadius:10, padding:"1rem 1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"0.65rem", color:"var(--gold)", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:"0.2rem" }}>Hole {h.n}</div>
            <div style={{ fontFamily:"var(--fd)", fontSize:"2rem", fontWeight:600, color:"var(--text)", lineHeight:1 }}>{h.n}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"0.62rem", color:"var(--text-dim)", letterSpacing:"0.12em", textTransform:"uppercase" }}>Par</div>
            <div style={{ fontFamily:"var(--fd)", fontSize:"2rem", color:"var(--text)" }}>{h.par}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"0.62rem", color:"var(--text-dim)", letterSpacing:"0.12em", textTransform:"uppercase" }}>Yards</div>
            <div style={{ fontFamily:"var(--fd)", fontSize:"2rem", color:"var(--text)" }}>{h.yds}</div>
          </div>
          <div style={{ textAlign:"right", maxWidth:100 }}>
            <div style={{ fontSize:"0.62rem", color:"var(--text-dim)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"0.25rem" }}>Caddy Tip</div>
            <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", lineHeight:1.4, fontStyle:"italic" }}>{h.tip}</div>
          </div>
        </div>

        {/* Score stepper */}
        <div style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:12, padding:"1.5rem 1rem" }}>
          <div style={{ fontSize:"0.7rem", color:"var(--text-dim)", letterSpacing:"0.18em", textTransform:"uppercase", textAlign:"center", marginBottom:"1.25rem" }}>
            Team Score — Scramble
          </div>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.5rem" }}>
            {/* Minus */}
            <button className="step-btn step-minus tap" onClick={() => setScore(currentScore - 1)}>−</button>

            {/* Score display */}
            <div key={animKey} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"0.5rem", animation:"pop 0.25s ease" }}>
              <div className="score-display" style={{
                background: rel < 0 ? "rgba(76,175,80,0.12)" : rel > 0 ? "var(--over-dim)" : "var(--surface2)",
                border: rel < 0 ? "2px solid rgba(76,175,80,0.35)" : rel > 0 ? "2px solid var(--over-border)" : "2px solid var(--border2)",
                color: rel < 0 ? "#4CAF50" : rel > 0 ? "var(--over)" : "var(--text)",
              }}>
                {currentScore}
              </div>
              {/* Par relative label */}
              <div className="par-label" style={{ background:pLabel.bg, color:pLabel.color }}>
                {pLabel.text}
              </div>
            </div>

            {/* Plus */}
            <button className="step-btn step-plus tap" onClick={() => setScore(currentScore + 1)}>+</button>
          </div>

          {/* Quick score buttons */}
          <div style={{ display:"flex", justifyContent:"center", gap:"0.5rem", marginTop:"1.25rem", flexWrap:"wrap" }}>
            {[h.par-1, h.par, h.par+1, h.par+2].filter(v=>v>0&&v<=8).map(v => (
              <button key={v} onClick={() => setScore(v)} style={{
                minWidth:52, height:40, borderRadius:6,
                background: currentScore===v ? (v<h.par?"rgba(76,175,80,0.25)":v===h.par?"var(--surface3)":"var(--over-dim)") : "var(--surface2)",
                border: currentScore===v ? (v<h.par?"1.5px solid rgba(76,175,80,0.5)":v===h.par?"1.5px solid var(--border2)":"1.5px solid var(--over-border)") : "1px solid var(--border)",
                color: currentScore===v ? (v<h.par?"#4CAF50":v===h.par?"var(--text)":"var(--over)") : "var(--text-muted)",
                fontFamily:"var(--fd)", fontSize:"1rem", cursor:"pointer",
                transition:"all 0.15s", WebkitTapHighlightColor:"transparent",
              }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Save & Next */}
        <button className="submit-btn" onClick={saveAndNext} style={{ position:"relative", overflow:"hidden" }}>
          {justSaved ? (
            <span style={{ display:"flex", alignItems:"center", gap:"0.5rem", animation:"checkPop 0.3s ease" }}>✓ Saved!</span>
          ) : hole === HOLES.length - 1 ? (
            "Review & Submit Scorecard 🏁"
          ) : (
            `Save Hole ${h.n} & Go to Hole ${h.n+1} →`
          )}
        </button>

        {/* Score so far mini strip */}
        {completed > 0 && (
          <div style={{ display:"flex", gap:"0.3rem", flexWrap:"wrap", justifyContent:"center" }}>
            {scores.map((s, i) => {
              if (s === null || s === undefined) return null;
              const d = s - HOLES[i].par;
              return (
                <div key={i} style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", fontFamily:"var(--fb)", fontWeight:600,
                  background: d<0?"rgba(76,175,80,0.2)":d===0?"var(--surface2)":"var(--over-dim)",
                  color: d<0?"#4CAF50":d===0?"var(--text-muted)":"var(--over)",
                  border: d<0?"1px solid rgba(76,175,80,0.3)":d===0?"1px solid var(--border)":"1px solid var(--over-border)",
                }}>
                  {i+1}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// 4. Review Screen
const ReviewScreen = ({ group, scores, onSubmit, onBack }) => {
  const totalScore = scores.reduce((a,s)=>a+(s??0),0);
  const totalPar = HOLES.reduce((a,h)=>a+h.par,0);
  const totalRel = totalScore - totalPar;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"1.5rem 1.25rem", animation:"fadeUp 0.4s ease" }}>
      <button onClick={onBack} style={{ background:"none", border:"none", color:"var(--text-muted)", fontSize:"0.85rem", cursor:"pointer", alignSelf:"flex-start", marginBottom:"1.25rem", padding:0, display:"flex", alignItems:"center", gap:"0.4rem", fontFamily:"var(--fb)" }}>← Edit Scores</button>

      <div style={{ fontFamily:"var(--fd)", fontSize:"1.4rem", color:"var(--text)", marginBottom:"0.25rem" }}>Review Scorecard</div>
      <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", marginBottom:"1.25rem" }}>{group.name} · {group.chaperone}</div>

      {/* Score summary hero */}
      <div style={{ background:"linear-gradient(135deg,var(--forest),var(--surface2))", border:"1px solid var(--gold-border)", borderRadius:10, padding:"1.25rem", textAlign:"center", marginBottom:"1rem" }}>
        <div style={{ fontSize:"0.68rem", color:"var(--gold)", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:"0.3rem" }}>Total Score</div>
        <div style={{ fontFamily:"var(--fd)", fontSize:"3.5rem", fontWeight:700, color:"var(--text)", lineHeight:1 }}>{totalScore}</div>
        <div style={{ fontFamily:"var(--fd)", fontSize:"1.25rem", color: totalRel<0?"#4CAF50":totalRel>0?"var(--over)":"var(--text-muted)", marginTop:"0.25rem" }}>
          {totalRel===0?"Even Par":totalRel>0?`+${totalRel} over par`:`${totalRel} under par`}
        </div>
      </div>

      {/* Hole-by-hole */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, marginBottom:"1rem", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 36px 36px 60px", padding:"0.5rem 0.875rem", background:"var(--forest)", gap:"0.5rem" }}>
          {["#","HOLE","PAR","SCORE",""].map((h,i)=>(
            <div key={i} style={{ fontSize:"0.6rem", letterSpacing:"0.15em", color:"var(--gold)", fontFamily:"var(--fb)", textAlign:i===0?"center":"left" }}>{h}</div>
          ))}
        </div>
        {HOLES.map((h,i)=>{
          const s=scores[i]??h.par;
          const d=s-h.par;
          const lbl=parLabel(s,h.par);
          return (
            <div key={i} className="summary-row" style={{ padding:"0.55rem 0.875rem" }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:"var(--surface2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", color:"var(--text-dim)", fontFamily:"var(--fb)" }}>{h.n}</div>
              <div style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>Hole {h.n} · {h.yds}y</div>
              <div style={{ fontSize:"0.85rem", color:"var(--text-dim)", textAlign:"center", fontFamily:"var(--fd)" }}>{h.par}</div>
              <div style={{ fontSize:"0.95rem", fontFamily:"var(--fd)", fontWeight:600, textAlign:"center", color:d<0?"#4CAF50":d>0?"var(--over)":"var(--text-muted)" }}>{s}</div>
              <div className="par-label" style={{ background:lbl.bg, color:lbl.color, fontSize:"0.6rem", padding:"0.15rem 0.4rem", textAlign:"center" }}>{lbl.text}</div>
            </div>
          );
        })}
        <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 36px 36px 60px", padding:"0.65rem 0.875rem", background:"var(--forest)", gap:"0.5rem", borderTop:"1px solid var(--border)" }}>
          <div/>
          <div style={{ fontSize:"0.72rem", color:"var(--gold)", fontWeight:600, fontFamily:"var(--fb)", letterSpacing:"0.1em" }}>TOTAL</div>
          <div style={{ fontSize:"0.85rem", color:"var(--text-dim)", textAlign:"center", fontFamily:"var(--fd)" }}>{totalPar}</div>
          <div style={{ fontSize:"1rem", fontFamily:"var(--fd)", fontWeight:700, textAlign:"center", color:totalRel<0?"#4CAF50":totalRel>0?"var(--over)":"var(--text-muted)" }}>{totalScore}</div>
          <div className="par-label" style={{ background:totalRel<0?"rgba(76,175,80,0.15)":totalRel>0?"var(--over-dim)":"var(--surface2)", color:totalRel<0?"#4CAF50":totalRel>0?"var(--over)":"var(--text-muted)", fontSize:"0.6rem", padding:"0.15rem 0.4rem", textAlign:"center" }}>
            {totalRel===0?"E":totalRel>0?`+${totalRel}`:totalRel}
          </div>
        </div>
      </div>

      <div style={{ fontSize:"0.78rem", color:"var(--text-dim)", textAlign:"center", marginBottom:"1rem", lineHeight:1.5, fontStyle:"italic" }}>
        Once submitted, scores go live on the leaderboard.<br/>Make sure everything looks right!
      </div>

      <button className="submit-btn" onClick={onSubmit} style={{ marginBottom:"0.6rem" }}>
        ✓ Submit Final Scorecard
      </button>
      <button className="submit-btn ghost" onClick={onBack}>
        ← Go Back & Edit
      </button>
    </div>
  );
};

// 5. Success Screen
const SuccessScreen = ({ group, scores, onReset }) => {
  const totalScore = scores.reduce((a,s)=>a+(s??0),0);
  const totalPar = HOLES.reduce((a,h)=>a+h.par,0);
  const totalRel = totalScore - totalPar;
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    const items = [...Array(18)].map((_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      color: i%4===0?"var(--gold)":i%4===1?"#4CAF50":i%4===2?"white":"#e6c96a",
      delay: `${Math.random()*0.5}s`,
      size: `${6+Math.random()*6}px`,
    }));
    setConfetti(items);
  }, []);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"2rem 1.5rem", textAlign:"center", animation:"fadeUp 0.5s ease", position:"relative", overflow:"hidden" }}>
      {/* Confetti */}
      {confetti.map(c => (
        <div key={c.id} className="confetti-p" style={{ left:c.left, top:"-10px", background:c.color, width:c.size, height:c.size, animationDelay:c.delay }} />
      ))}

      <div style={{ fontSize:"4rem", marginBottom:"1rem", animation:"pop 0.5s ease 0.2s both" }}>🏆</div>

      <div style={{ fontFamily:"var(--fd)", fontSize:"1.75rem", fontWeight:600, color:"var(--text)", marginBottom:"0.4rem" }}>
        Scorecard Submitted!
      </div>
      <div style={{ fontSize:"0.8rem", color:"var(--gold)", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:"1.5rem" }}>
        {group.name.split("—")[1]?.trim()}
      </div>

      <div style={{ background:"linear-gradient(135deg,var(--forest),var(--surface2))", border:"1px solid var(--gold-border)", borderRadius:12, padding:"1.5rem 2rem", marginBottom:"2rem", width:"100%" }}>
        <div style={{ fontSize:"0.68rem", color:"var(--text-dim)", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"0.5rem" }}>Final Score</div>
        <div style={{ fontFamily:"var(--fd)", fontSize:"4rem", fontWeight:700, color: totalRel<0?"#4CAF50":totalRel>0?"var(--over)":"var(--text)", lineHeight:1 }}>{totalScore}</div>
        <div style={{ fontFamily:"var(--fd)", fontSize:"1.1rem", color:"var(--text-muted)", marginTop:"0.4rem" }}>
          {totalRel===0?"Even par":totalRel<0?`${Math.abs(totalRel)} under par 🎉`:`${totalRel} over par`}
        </div>
      </div>

      <div style={{ fontSize:"0.9rem", color:"var(--text-muted)", lineHeight:1.7, marginBottom:"2rem" }}>
        Great job out there, {group.chaperone}!<br/>
        Scores are now live on the leaderboard. 🏌️
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem", width:"100%" }}>
        <button className="submit-btn outline" onClick={onReset}>
          ← Submit Another Group
        </button>
      </div>
    </div>
  );
};

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("pin"); // pin | confirm | scoring | review | success
  const [group, setGroup] = useState(null);
  const [scores, setScores] = useState(Array(10).fill(null));

  const handlePinSuccess = (g) => { setGroup(g); setScreen("confirm"); };
  const handleStart = () => { setScores(Array(10).fill(null)); setScreen("scoring"); };
  const handleFinish = () => setScreen("review");
  const handleSubmit = () => setScreen("success");
  const handleReset = () => { setGroup(null); setScores(Array(10).fill(null)); setScreen("pin"); };

  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"0" }}>
      <FontInjector />
      <GS />

      {/* Simulated phone frame on desktop */}
      <div className="phone" style={{ boxShadow:"0 32px 80px rgba(0,0,0,0.8)" }}>
        {/* Status bar */}
        <div style={{ height:44, background:"var(--surface)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 1.25rem", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <div style={{ width:20, height:20, borderRadius:"50%", background:"linear-gradient(135deg,var(--gold),#5a3e10)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.55rem" }}>⛳</div>
            <div style={{ fontFamily:"var(--fd)", fontSize:"0.78rem", color:"var(--text)" }}>Lotus Links</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
            <div style={{ fontSize:"0.62rem", color:"var(--text-dim)", fontFamily:"var(--fb)" }}>WISH Charter · The Lakes</div>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#4CAF50", animation:"pulse 2s ease-in-out infinite" }} />
          </div>
        </div>

        {/* Screen content */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          {screen==="pin"     && <PinScreen onSuccess={handlePinSuccess} />}
          {screen==="confirm" && <GroupConfirm group={group} onStart={handleStart} onBack={()=>setScreen("pin")} />}
          {screen==="scoring" && <ScoreEntry group={group} scores={scores} setScores={setScores} onFinish={handleFinish} />}
          {screen==="review"  && <ReviewScreen group={group} scores={scores} onSubmit={handleSubmit} onBack={()=>setScreen("scoring")} />}
          {screen==="success" && <SuccessScreen group={group} scores={scores} onReset={handleReset} />}
        </div>
      </div>
    </div>
  );
}
