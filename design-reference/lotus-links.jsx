import { useState, useRef, useEffect } from "react";

const FontInjector = () => {
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Mono:wght@300;400&display=swap";
    document.head.appendChild(l);
  }, []);
  return null;
};

const GS = () => (
  <style>{`
    :root {
      --bg: #0a120a;
      --bg2: #0f1a0f;
      --surface: #132013;
      --surface2: #1a2e1a;
      --surface3: #203020;
      --border: rgba(255,255,255,0.06);
      --border2: rgba(255,255,255,0.1);
      --green: #1a5c2a;
      --green-light: #2d8c45;
      --forest: #0d3d1a;
      --gold: #c8a84b;
      --gold-light: #e6c96a;
      --gold-dim: rgba(200,168,75,0.15);
      --gold-border: rgba(200,168,75,0.25);
      --text: #f0ede6;
      --text-muted: rgba(240,237,230,0.55);
      --text-dim: rgba(240,237,230,0.28);
      --red: #c0392b;
      --blue: #2980b9;
      --fd: 'Playfair Display', Georgia, serif;
      --fb: 'Crimson Pro', Georgia, serif;
      --fm: 'DM Mono', monospace;
      --nav: 60px;
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:var(--bg);color:var(--text);font-family:var(--fb);overflow-x:hidden;-webkit-text-size-adjust:100%;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:var(--bg);}
    ::-webkit-scrollbar-thumb{background:var(--gold-dim);border-radius:2px;}

    @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
    @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.45;}}
    @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
    @keyframes shimmer{0%{background-position:-200% center;}100%{background-position:200% center;}}
    @keyframes countUp{from{opacity:0;transform:scale(0.8);}to{opacity:1;transform:scale(1);}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}
    @keyframes trophy{0%,100%{transform:scale(1) rotate(-3deg);}50%{transform:scale(1.08) rotate(3deg);}}

    .fade-up{animation:fadeUp 0.6s ease forwards;}
    .fade-in{animation:fadeIn 0.4s ease forwards;}
    .spin{animation:spin 1s linear infinite;}
    .pulse{animation:pulse 2s ease-in-out infinite;}
    .trophy-anim{animation:trophy 2s ease-in-out infinite;}

    /* ── Buttons ── */
    .btn{border:none;cursor:pointer;font-family:var(--fb);transition:all 0.2s;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:0.4rem;-webkit-tap-highlight-color:transparent;white-space:nowrap;}
    .btn-gold{background:linear-gradient(135deg,var(--gold),#8a6a1e);color:#0a120a;font-weight:600;font-size:0.8rem;letter-spacing:0.1em;text-transform:uppercase;border-radius:1px;padding:0.75rem 1.5rem;}
    .btn-gold:hover{background:linear-gradient(135deg,var(--gold-light),var(--gold));transform:translateY(-1px);box-shadow:0 6px 20px rgba(200,168,75,0.3);}
    .btn-outline{background:none;border:1px solid var(--gold-border);color:var(--gold);font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;border-radius:1px;padding:0.75rem 1.5rem;}
    .btn-outline:hover{border-color:var(--gold);background:var(--gold-dim);}
    .btn-ghost{background:none;border:1px solid var(--border2);color:var(--text-muted);font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;border-radius:1px;padding:0.6rem 1rem;}
    .btn-ghost:hover{border-color:var(--border2);color:var(--text);}
    .btn-sm{padding:0.45rem 0.875rem;font-size:0.72rem;min-height:36px;}
    .btn-icon{background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);border-radius:50%;width:36px;height:36px;padding:0;font-size:1rem;flex-shrink:0;}
    .btn-icon:hover{border-color:var(--gold-border);color:var(--gold);}

    /* ── Cards & Inputs ── */
    .card{background:var(--surface);border:1px solid var(--border);border-radius:2px;padding:1.25rem;}
    .card-gold{border-color:var(--gold-border);background:linear-gradient(135deg,var(--surface) 0%,rgba(200,168,75,0.04) 100%);}
    .input{background:var(--surface2);border:1px solid var(--border2);border-radius:1px;color:var(--text);font-family:var(--fb);font-size:0.95rem;padding:0.75rem 1rem;width:100%;outline:none;transition:border-color 0.2s;min-height:44px;-webkit-appearance:none;}
    .input:focus{border-color:var(--gold);}
    .input::placeholder{color:var(--text-dim);}
    select.input{cursor:pointer;}
    .label{font-size:0.68rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.4rem;font-family:var(--fm);}
    .section-tag{font-size:0.68rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--gold);font-family:var(--fm);}
    .section-title{font-family:var(--fd);font-size:clamp(1.75rem,5vw,2.5rem);font-weight:400;line-height:1.1;color:var(--text);}
    .divider{width:100%;height:1px;background:var(--border);}
    .gold-divider{width:60px;height:2px;background:linear-gradient(90deg,var(--gold),transparent);margin:0.75rem 0;}

    /* ── Badges & Tags ── */
    .badge{display:inline-flex;align-items:center;gap:0.3rem;border-radius:1px;font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.2rem 0.5rem;font-family:var(--fm);}
    .badge-gold{background:var(--gold-dim);color:var(--gold);border:1px solid var(--gold-border);}
    .badge-green{background:rgba(45,140,69,0.15);color:#4CAF50;border:1px solid rgba(45,140,69,0.25);}
    .badge-red{background:rgba(192,57,43,0.15);color:#e74c3c;border:1px solid rgba(192,57,43,0.25);}
    .badge-blue{background:rgba(41,128,185,0.12);color:#5dade2;border:1px solid rgba(41,128,185,0.22);}
    .badge-gray{background:rgba(255,255,255,0.05);color:var(--text-muted);border:1px solid var(--border2);}

    /* ── Grids ── */
    .g2{display:grid;grid-template-columns:1fr;gap:1rem;}
    .g3{display:grid;grid-template-columns:1fr;gap:1rem;}
    .g4{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;}
    @media(min-width:640px){.g2{grid-template-columns:1fr 1fr;}.g3{grid-template-columns:1fr 1fr;}}
    @media(min-width:900px){.g3{grid-template-columns:repeat(3,1fr);}.g4{grid-template-columns:repeat(4,1fr);}}

    /* ── Nav ── */
    .nav-tab{background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:var(--fm);font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-muted);padding:0 1rem;height:var(--nav);transition:all 0.2s;-webkit-tap-highlight-color:transparent;}
    .nav-tab:hover{color:var(--text);}
    .nav-tab.act{color:var(--gold);border-bottom-color:var(--gold);}

    /* ── Hamburger ── */
    .hbg{background:none;border:none;cursor:pointer;padding:0.5rem;min-height:44px;min-width:44px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;-webkit-tap-highlight-color:transparent;}
    .hbg span{display:block;width:22px;height:1.5px;background:var(--text-muted);transition:all 0.25s;transform-origin:center;}
    .hbg.open span:nth-child(1){transform:rotate(45deg) translate(4.5px,4.5px);}
    .hbg.open span:nth-child(2){opacity:0;transform:scaleX(0);}
    .hbg.open span:nth-child(3){transform:rotate(-45deg) translate(4.5px,-4.5px);}

    /* ── Mobile drawer ── */
    .mob-drawer{position:fixed;top:var(--nav);left:0;right:0;background:rgba(10,18,10,0.97);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);z-index:99;padding:0.5rem 1.25rem 1.25rem;animation:slideDown 0.2s ease;}
    .mob-item{display:flex;align-items:center;padding:0;border:none;border-bottom:1px solid var(--border);font-size:1rem;color:var(--text-muted);cursor:pointer;min-height:50px;background:none;font-family:var(--fb);width:100%;text-align:left;transition:color 0.2s;-webkit-tap-highlight-color:transparent;}
    .mob-item:last-of-type{border-bottom:none;}
    .mob-item:hover,.mob-item.act{color:var(--gold);}

    /* ── Pill scroll nav ── */
    .pill-row{display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
    .pill-row::-webkit-scrollbar{display:none;}
    .pill{background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:0.4rem 0.875rem;font-size:0.7rem;color:var(--text-muted);cursor:pointer;white-space:nowrap;transition:all 0.2s;min-height:36px;display:flex;align-items:center;font-family:var(--fm);letter-spacing:0.08em;-webkit-tap-highlight-color:transparent;}
    .pill.act{background:var(--gold-dim);border-color:var(--gold-border);color:var(--gold);}

    /* ── Leaderboard ── */
    .lb-row{display:grid;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--border);transition:background 0.15s;cursor:default;}
    .lb-row:hover{background:rgba(255,255,255,0.02);}
    .lb-row.leader{background:linear-gradient(90deg,rgba(200,168,75,0.08),transparent);}
    .lb-row:last-child{border-bottom:none;}
    .pos-badge{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--fm);font-size:0.7rem;flex-shrink:0;}
    .pos-1{background:linear-gradient(135deg,#c8a84b,#8a6a1e);color:#0a120a;font-weight:600;}
    .pos-2{background:rgba(192,192,192,0.2);color:#c0c0c0;border:1px solid rgba(192,192,192,0.3);}
    .pos-3{background:rgba(205,127,50,0.2);color:#cd7f32;border:1px solid rgba(205,127,50,0.3);}
    .pos-n{background:var(--surface2);color:var(--text-dim);border:1px solid var(--border);}

    /* ── Scorecard ── */
    .sc-table{width:100%;border-collapse:collapse;font-family:var(--fm);font-size:0.72rem;}
    .sc-table th{background:var(--forest);color:var(--gold);padding:0.5rem 0.6rem;text-align:center;font-weight:400;letter-spacing:0.1em;white-space:nowrap;}
    .sc-table td{padding:0.45rem 0.6rem;text-align:center;border-bottom:1px solid var(--border);color:var(--text-muted);}
    .sc-table tr:hover td{background:rgba(255,255,255,0.02);}
    .sc-birdie{color:#4CAF50;font-weight:600;}
    .sc-eagle{color:#e6c96a;font-weight:700;}
    .sc-bogey{color:#e74c3c;}
    .sc-par{color:var(--text-muted);}

    /* ── Form step ── */
    .step-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--fm);font-size:0.7rem;flex-shrink:0;transition:all 0.3s;}
    .step-dot.done{background:linear-gradient(135deg,var(--gold),#8a6a1e);color:#0a120a;}
    .step-dot.active{background:var(--surface3);border:1px solid var(--gold);color:var(--gold);}
    .step-dot.todo{background:var(--surface2);border:1px solid var(--border);color:var(--text-dim);}

    /* ── Chat ── */
    .chat-ai{background:var(--surface2);border:1px solid var(--border);border-radius:12px 12px 12px 0;padding:0.75rem 1rem;font-size:0.9rem;line-height:1.65;max-width:90%;align-self:flex-start;}
    .chat-user{background:var(--gold-dim);border:1px solid var(--gold-border);border-radius:12px 12px 0 12px;padding:0.75rem 1rem;font-size:0.9rem;line-height:1.65;max-width:85%;align-self:flex-end;}

    /* ── Desktop/mobile helpers ── */
    .dt{display:none;}
    @media(min-width:768px){.dt{display:flex;}.mob-toggle{display:none!important;}}

    /* ── Misc ── */
    .section{padding:2.5rem 1.25rem;max-width:1100px;margin:0 auto;width:100%;}
    @media(min-width:640px){.section{padding:3.5rem 2rem;}}
    .trophy-icon{font-size:3rem;display:block;text-align:center;}
    .score-under{color:#4CAF50;font-family:var(--fm);}
    .score-over{color:#e74c3c;font-family:var(--fm);}
    .score-even{color:var(--text-muted);font-family:var(--fm);}
    a{color:inherit;text-decoration:none;}
  `}</style>
);

// ── DATA ─────────────────────────────────────────────────────────────────────
const PLAYERS = [
  { id:1, name:"James Worthington", hcp:8, skill:"70-80", team:"Eagles", role:"Captain", scores:[72,68,71,70] },
  { id:2, name:"Sarah Chen", hcp:12, skill:"80-90", team:"Eagles", role:"Player", scores:[84,81,79,82] },
  { id:3, name:"Marcus DeLeon", hcp:4, skill:"70-80", team:"Birdies", role:"Captain", scores:[69,71,68,72] },
  { id:4, name:"Patricia Walsh", hcp:18, skill:"80-90", team:"Birdies", role:"Player", scores:[88,85,87,83] },
  { id:5, name:"Robert Kim", hcp:0, skill:"70-80", team:"Eagles", role:"Player", scores:[70,67,69,68] },
  { id:6, name:"Diana Foster", hcp:14, skill:"80-90", team:"Fairways", role:"Captain", scores:[82,86,80,84] },
  { id:7, name:"Thomas Grey", hcp:22, skill:"90-100", team:"Fairways", role:"Player", scores:[95,92,90,88] },
  { id:8, name:"Amanda Pierce", hcp:6, skill:"70-80", team:"Birdies", role:"Player", scores:[74,76,73,75] },
];

const HOLES = [
  {hole:1,par:4,hdcp:7,yds:412},{hole:2,par:3,hdcp:15,yds:185},{hole:3,par:5,hdcp:1,yds:548},
  {hole:4,par:4,hdcp:11,yds:388},{hole:5,par:4,hdcp:3,yds:445},{hole:6,par:3,hdcp:17,yds:162},
  {hole:7,par:5,hdcp:5,yds:521},{hole:8,par:4,hdcp:13,yds:372},{hole:9,par:4,hdcp:9,yds:398},
  {hole:10,par:4,hdcp:8,yds:421},{hole:11,par:3,hdcp:16,yds:192},{hole:12,par:5,hdcp:2,yds:562},
  {hole:13,par:4,hdcp:10,yds:395},{hole:14,par:4,hdcp:4,yds:438},{hole:15,par:3,hdcp:18,yds:155},
  {hole:16,par:5,hdcp:6,yds:535},{hole:17,par:4,hdcp:12,yds:380},{hole:18,par:4,hdcp:14,yds:405},
];

const PLAYER_SCORES_18 = {
  1:[4,3,5,4,4,3,5,4,4,  4,3,5,4,5,3,5,4,4],
  3:[4,2,4,4,4,3,4,4,3,  4,3,4,4,4,2,5,4,4],
  5:[4,3,5,4,4,3,5,4,4,  4,3,5,4,4,3,5,4,3],
  8:[4,3,5,5,4,3,5,4,4,  5,3,5,4,4,3,5,4,4],
};

const SCORING_SYSTEMS = ["Stroke Play (Raw)","Stableford","Scramble","Four Ball","Foursome","Custom"];
const COURSE_TYPES = ["Real Course","Simulator (SIM)"];
const SKILL_LEVELS = ["70-80 (Low)","80-90 (Mid)","90-100 (High)","100+ (Beginner)"];
const TEAMS = ["Eagles","Birdies","Fairways","Pars"];

// ── Helpers ──────────────────────────────────────────────────────────────────
const totalScore = (p) => p.scores.reduce((a,b)=>a+b,0);
const parTotal = 72;
const relScore = (p) => { const t=totalScore(p); const avg=Math.round(t/p.scores.length); return avg-parTotal; };
const fmtScore = (s) => s===0?"E":s>0?`+${s}`:String(s);
const holeTotal = (arr) => arr.reduce((a,b)=>a+b,0);
const parForHoles = (holes) => holes.reduce((a,h)=>a+h.par,0);

// ── useIsMobile ───────────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [m,setM]=useState(typeof window!=="undefined"?window.innerWidth<640:false);
  useEffect(()=>{const h=()=>setM(window.innerWidth<640);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return m;
};

// ── NAV ───────────────────────────────────────────────────────────────────────
const TABS=[{k:"dashboard",l:"Dashboard"},{k:"setup",l:"Tournament Setup"},{k:"players",l:"Players & Teams"},{k:"leaderboard",l:"Leaderboard"},{k:"results",l:"Results"}];

const Nav = ({page,go}) => {
  const [open,setOpen]=useState(false);
  const nav=(k)=>{go(k);setOpen(false);};
  return (
    <>
      <nav style={{position:"sticky",top:0,zIndex:100,height:"var(--nav)",background:"rgba(10,18,10,0.95)",backdropFilter:"blur(14px)",borderBottom:"1px solid var(--border)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 1.25rem",height:"100%",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem",cursor:"pointer"}} onClick={()=>nav("dashboard")}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,var(--gold),#5a3e10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",flexShrink:0}}>⛳</div>
            <div>
              <div style={{fontFamily:"var(--fd)",fontSize:"1rem",fontWeight:600,color:"var(--text)",lineHeight:1}}>Lotus Links</div>
              <div style={{fontSize:"0.58rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--gold)",fontFamily:"var(--fm)"}}>Tournament Platform</div>
            </div>
          </div>
          <div className="dt" style={{gap:0}}>
            {TABS.map(t=><button key={t.k} className={`nav-tab ${page===t.k?"act":""}`} onClick={()=>nav(t.k)}>{t.l}</button>)}
          </div>
          <button className="btn btn-gold btn-sm dt" onClick={()=>nav("setup")} style={{fontSize:"0.68rem"}}>+ New Tournament</button>
          <button className={`hbg mob-toggle ${open?"open":""}`} onClick={()=>setOpen(o=>!o)}><span/><span/><span/></button>
        </div>
      </nav>
      {open&&(
        <div className="mob-drawer mob-toggle">
          {TABS.map(t=><button key={t.k} className={`mob-item ${page===t.k?"act":""}`} onClick={()=>nav(t.k)}>{t.l}</button>)}
          <button className="btn btn-gold" style={{width:"100%",marginTop:"0.875rem"}} onClick={()=>nav("setup")}>+ New Tournament</button>
        </div>
      )}
    </>
  );
};

// ── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = ({go}) => {
  const mob=useIsMobile();
  const sorted=[...PLAYERS].sort((a,b)=>relScore(a)-relScore(b));
  const leader=sorted[0];
  return (
    <div className="section">
      {/* Hero */}
      <div style={{position:"relative",background:"linear-gradient(135deg,var(--forest) 0%,var(--surface) 100%)",border:"1px solid var(--gold-border)",borderRadius:2,padding:mob?"1.5rem":"2.5rem",marginBottom:"1.5rem",overflow:"hidden",animation:"fadeUp 0.6s ease"}}>
        <div style={{position:"absolute",top:0,right:0,width:"40%",height:"100%",background:"radial-gradient(ellipse at right,rgba(200,168,75,0.08),transparent)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-20,right:-20,fontSize:"8rem",opacity:0.04,pointerEvents:"none",userSelect:"none"}}>⛳</div>
        <span className="section-tag">2024 Corporate Championship</span>
        <div className="gold-divider"/>
        <h1 style={{fontFamily:"var(--fd)",fontSize:mob?"clamp(1.75rem,7vw,2.5rem)":"clamp(2rem,4vw,3.25rem)",fontWeight:400,color:"var(--text)",marginBottom:"0.5rem",lineHeight:1.1}}>
          Pebble Beach Invitational<br/><em style={{color:"var(--gold)",fontStyle:"italic"}}>Corporate Classic</em>
        </h1>
        <p style={{fontSize:"0.9rem",color:"var(--text-muted)",marginBottom:"1.5rem",lineHeight:1.6}}>
          Pebble Beach Golf Links · Oct 14–16, 2024 · Stroke Play · 18 Holes
        </p>
        <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
          <button className="btn btn-gold" onClick={()=>go("leaderboard")}>View Leaderboard →</button>
          <button className="btn btn-outline" onClick={()=>go("setup")}>Manage Tournament</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="g4" style={{marginBottom:"1.5rem"}}>
        {[
          {label:"Registered Players",value:"8",sub:"3 teams",icon:"👤"},
          {label:"Rounds Completed",value:"4",sub:"of 4 scheduled",icon:"🏌️"},
          {label:"Current Leader",value:leader.name.split(" ")[0],sub:fmtScore(relScore(leader)),icon:"🏆"},
          {label:"Scoring System",value:"Stroke Play",sub:"with handicaps",icon:"📊"},
        ].map((s,i)=>(
          <div key={i} className="card" style={{animation:`fadeUp 0.6s ease ${i*0.08}s both`}}>
            <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>{s.icon}</div>
            <div className="label">{s.label}</div>
            <div style={{fontFamily:"var(--fd)",fontSize:"1.4rem",fontWeight:400,color:"var(--text)",lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:"0.75rem",color:"var(--text-muted)",marginTop:"0.2rem"}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Mini leaderboard + schedule */}
      <div className="g2">
        <div className="card card-gold">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <div>
              <div className="label">Live Leaderboard</div>
              <div style={{fontFamily:"var(--fd)",fontSize:"1.1rem",color:"var(--text)"}}>Top Players</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>go("leaderboard")}>Full →</button>
          </div>
          {sorted.slice(0,5).map((p,i)=>{
            const rel=relScore(p);
            return (
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.6rem 0",borderBottom:i<4?"1px solid var(--border)":"none"}}>
                <div className={`pos-badge pos-${i+1<=3?i+1:"n"}`}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.9rem",color:"var(--text)"}}>{p.name}</div>
                  <div style={{fontSize:"0.7rem",color:"var(--text-dim)",fontFamily:"var(--fm)"}}>{p.team}</div>
                </div>
                <div style={{fontFamily:"var(--fm)",fontSize:"0.9rem"}} className={rel<0?"score-under":rel>0?"score-over":"score-even"}>{fmtScore(rel)}</div>
              </div>
            );
          })}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
          {/* Schedule */}
          <div className="card">
            <div className="label" style={{marginBottom:"0.75rem"}}>Tournament Schedule</div>
            {[
              {round:"Round 1",date:"Oct 14",status:"complete",score:"72"},
              {round:"Round 2",date:"Oct 15",status:"complete",score:"68"},
              {round:"Round 3",date:"Oct 15",status:"complete",score:"71"},
              {round:"Round 4",date:"Oct 16",status:"live",score:"—"},
            ].map((r,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.6rem 0",borderBottom:i<3?"1px solid var(--border)":"none"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:r.status==="live"?"#4CAF50":r.status==="complete"?"var(--gold)":"var(--surface3)",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.85rem",color:"var(--text)"}}>{r.round}</div>
                  <div style={{fontSize:"0.7rem",color:"var(--text-dim)",fontFamily:"var(--fm)"}}>{r.date}</div>
                </div>
                <span className={`badge ${r.status==="live"?"badge-green":r.status==="complete"?"badge-gold":"badge-gray"}`}>
                  {r.status==="live"?"● LIVE":r.status==="complete"?"✓ Done":"Upcoming"}
                </span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="card">
            <div className="label" style={{marginBottom:"0.75rem"}}>Quick Actions</div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
              {[
                {label:"Enter Scores",icon:"✏️",fn:()=>go("leaderboard")},
                {label:"Manage Players",icon:"👥",fn:()=>go("players")},
                {label:"View Results",icon:"🏆",fn:()=>go("results")},
                {label:"Tournament Settings",icon:"⚙️",fn:()=>go("setup")},
              ].map(a=>(
                <button key={a.label} className="btn btn-ghost" style={{justifyContent:"flex-start",gap:"0.6rem",width:"100%"}} onClick={a.fn}>
                  <span>{a.icon}</span>{a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── SETUP ────────────────────────────────────────────────────────────────────
const Setup = () => {
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({
    leagueName:"Acme Corp Golf League",logo:"",primaryColor:"#1a5c2a",
    tournName:"Pebble Beach Invitational",courseType:"Real Course",
    course:"Pebble Beach Golf Links",scoring:"Stroke Play (Raw)",
    useHandicap:true,holes:"18",format:"Shotgun",notes:"",
    loginRequired:false,authMethod:"Google",
  });
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const mob=useIsMobile();

  const STEPS=["League","Tournament","Course","Format","Review"];

  return (
    <div className="section">
      <span className="section-tag">Admin Panel</span>
      <div className="gold-divider"/>
      <h2 className="section-title" style={{marginBottom:"2rem"}}>Tournament Setup</h2>

      {/* Step progress */}
      <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:"2rem",overflowX:"auto",paddingBottom:4}}>
        {STEPS.map((s,i)=>(
          <div key={s} style={{display:"flex",alignItems:"center",flexShrink:0}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.3rem",cursor:"pointer"}} onClick={()=>setStep(i)}>
              <div className={`step-dot ${i<step?"done":i===step?"active":"todo"}`}>
                {i<step?"✓":i+1}
              </div>
              <div style={{fontSize:"0.58rem",letterSpacing:"0.1em",textTransform:"uppercase",color:i===step?"var(--gold)":"var(--text-dim)",fontFamily:"var(--fm)",whiteSpace:"nowrap"}}>{s}</div>
            </div>
            {i<STEPS.length-1&&<div style={{width:mob?24:48,height:1,background:i<step?"var(--gold)":"var(--border)",margin:"0 0.5rem",marginBottom:"1.2rem",flexShrink:0}}/>}
          </div>
        ))}
      </div>

      <div className="card card-gold" style={{animation:"fadeIn 0.3s ease"}}>
        {step===0&&(
          <div style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
            <div style={{fontFamily:"var(--fd)",fontSize:"1.25rem",color:"var(--text)",marginBottom:"0.25rem"}}>League Information</div>
            <div><div className="label">League Name</div><input className="input" value={form.leagueName} onChange={e=>upd("leagueName",e.target.value)}/></div>
            <div><div className="label">League Administrator Email</div><input className="input" placeholder="admin@company.com"/></div>
            <div><div className="label">Brand Color</div>
              <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
                <input type="color" value={form.primaryColor} onChange={e=>upd("primaryColor",e.target.value)} style={{width:44,height:44,border:"1px solid var(--border2)",borderRadius:1,background:"none",cursor:"pointer",padding:2}}/>
                <input className="input" value={form.primaryColor} onChange={e=>upd("primaryColor",e.target.value)} style={{flex:1}}/>
              </div>
            </div>
            <div><div className="label">Upload League Logo</div>
              <div style={{border:"1px dashed var(--border2)",borderRadius:1,padding:"1.5rem",textAlign:"center",cursor:"pointer",color:"var(--text-dim)",fontSize:"0.85rem"}}>
                ⊕ Click to upload logo (PNG, SVG)
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <input type="checkbox" id="login" checked={form.loginRequired} onChange={e=>upd("loginRequired",e.target.checked)} style={{width:18,height:18,accentColor:"var(--gold)",cursor:"pointer"}}/>
              <label htmlFor="login" style={{fontSize:"0.9rem",color:"var(--text-muted)",cursor:"pointer"}}>Require players to log in</label>
            </div>
            {form.loginRequired&&(
              <div><div className="label">Authentication Method</div>
                <select className="input" value={form.authMethod} onChange={e=>upd("authMethod",e.target.value)}>
                  {["Google","Email/Password","Facebook","Google + Email"].map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {step===1&&(
          <div style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
            <div style={{fontFamily:"var(--fd)",fontSize:"1.25rem",color:"var(--text)",marginBottom:"0.25rem"}}>Tournament Details</div>
            <div><div className="label">Tournament Name</div><input className="input" value={form.tournName} onChange={e=>upd("tournName",e.target.value)}/></div>
            <div className="g2">
              <div><div className="label">Start Date</div><input type="date" className="input" defaultValue="2024-10-14"/></div>
              <div><div className="label">End Date</div><input type="date" className="input" defaultValue="2024-10-16"/></div>
            </div>
            <div><div className="label">Course Type</div>
              <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
                {COURSE_TYPES.map(c=>(
                  <button key={c} className={`btn ${form.courseType===c?"btn-gold":"btn-ghost"}`} onClick={()=>upd("courseType",c)}>{c}</button>
                ))}
              </div>
            </div>
            <div><div className="label">Tournament Type</div>
              <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
                {["One-Time","Seasonal","Annual"].map(t=>(
                  <button key={t} className={`btn btn-ghost btn-sm ${t==="One-Time"?"":""}`} onClick={()=>{}}>{t}</button>
                ))}
              </div>
            </div>
            <div><div className="label">Tournament Notes / Description</div>
              <textarea className="input" style={{height:80,resize:"none"}} placeholder="Add tournament description, special rules, or notes for participants…" value={form.notes} onChange={e=>upd("notes",e.target.value)}/>
            </div>
          </div>
        )}

        {step===2&&(
          <div style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
            <div style={{fontFamily:"var(--fd)",fontSize:"1.25rem",color:"var(--text)",marginBottom:"0.25rem"}}>Course Configuration</div>
            <div><div className="label">Course Name</div>
              <input className="input" value={form.course} onChange={e=>upd("course",e.target.value)} placeholder="Search or enter course name…"/>
              <div style={{fontSize:"0.75rem",color:"var(--text-dim)",marginTop:"0.3rem",fontFamily:"var(--fm)"}}>↳ Course data will be pulled from public databases where available</div>
            </div>
            <div className="g2">
              <div><div className="label">Tee Selection</div>
                <select className="input"><option>Blue (Championship)</option><option>White (Member)</option><option>Red (Forward)</option><option>Black (Tips)</option></select>
              </div>
              <div><div className="label">Holes to Play</div>
                <select className="input" value={form.holes} onChange={e=>upd("holes",e.target.value)}>
                  <option value="18">18 Holes (Full)</option><option value="9f">Front 9</option><option value="9b">Back 9</option><option value="custom">Custom Selection</option>
                </select>
              </div>
            </div>
            {/* Hole-by-hole preview */}
            <div>
              <div className="label" style={{marginBottom:"0.75rem"}}>Course Preview (Auto-Loaded)</div>
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                <table className="sc-table" style={{minWidth:480}}>
                  <thead><tr><th>Hole</th><th>Par</th><th>Hdcp</th><th>Yds (Blue)</th></tr></thead>
                  <tbody>
                    {HOLES.slice(0,9).map(h=>(
                      <tr key={h.hole}>
                        <td style={{color:"var(--gold)"}}>{h.hole}</td>
                        <td>{h.par}</td><td style={{color:"var(--text-dim)"}}>{h.hdcp}</td><td>{h.yds}</td>
                      </tr>
                    ))}
                    <tr style={{background:"var(--forest)"}}><td style={{color:"var(--gold)",fontWeight:600}}>OUT</td><td style={{color:"var(--gold)"}}>36</td><td>—</td><td style={{color:"var(--gold)"}}>3,031</td></tr>
                  </tbody>
                </table>
              </div>
              <div style={{fontSize:"0.72rem",color:"var(--text-dim)",marginTop:"0.4rem",fontFamily:"var(--fm)"}}>Back 9 + manual entry available in full version</div>
            </div>
          </div>
        )}

        {step===3&&(
          <div style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
            <div style={{fontFamily:"var(--fd)",fontSize:"1.25rem",color:"var(--text)",marginBottom:"0.25rem"}}>Scoring & Format</div>
            <div><div className="label">Scoring System</div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                {SCORING_SYSTEMS.map(s=>(
                  <button key={s} className={`btn ${form.scoring===s?"btn-gold":"btn-ghost"}`} style={{justifyContent:"flex-start"}} onClick={()=>upd("scoring",s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <input type="checkbox" id="hdcp" checked={form.useHandicap} onChange={e=>upd("useHandicap",e.target.checked)} style={{width:18,height:18,accentColor:"var(--gold)",cursor:"pointer"}}/>
              <label htmlFor="hdcp" style={{fontSize:"0.9rem",color:"var(--text-muted)",cursor:"pointer"}}>Apply handicap adjustments (raw scores always preserved)</label>
            </div>
            <div><div className="label">Round Format</div>
              <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
                {["Shotgun Start","Tee Times","Best Ball"].map(f=>(
                  <button key={f} className={`btn ${form.format===f?"btn-gold":"btn-ghost"}`} onClick={()=>upd("format",f)}>{f}</button>
                ))}
              </div>
            </div>
            <div className="g2">
              <div><div className="label">FedEx Cup Points</div>
                <select className="input"><option>Disabled</option><option>Standard Points</option><option>Custom Points</option></select>
              </div>
              <div><div className="label">Live Scoring</div>
                <select className="input"><option>In-App (Live)</option><option>Post-Round Entry</option><option>Scorecard Upload</option></select>
              </div>
            </div>
          </div>
        )}

        {step===4&&(
          <div style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
            <div style={{fontFamily:"var(--fd)",fontSize:"1.25rem",color:"var(--text)",marginBottom:"0.25rem"}}>Review & Launch</div>
            {[
              {label:"League",value:form.leagueName},
              {label:"Tournament",value:form.tournName},
              {label:"Course Type",value:form.courseType},
              {label:"Course",value:form.course},
              {label:"Scoring",value:form.scoring},
              {label:"Handicap Adjusted",value:form.useHandicap?"Yes — raw scores preserved":"No"},
              {label:"Round Format",value:form.format},
              {label:"Login Required",value:form.loginRequired?`Yes — ${form.authMethod}`:"No"},
            ].map(r=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.6rem 0",borderBottom:"1px solid var(--border)"}}>
                <div className="label" style={{marginBottom:0}}>{r.label}</div>
                <div style={{fontSize:"0.9rem",color:"var(--text)",textAlign:"right",maxWidth:"60%"}}>{r.value}</div>
              </div>
            ))}
            <button className="btn btn-gold" style={{width:"100%",padding:"1rem",fontSize:"0.85rem",marginTop:"0.5rem"}}>
              🏌️ Launch Tournament
            </button>
          </div>
        )}

        {/* Step nav */}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:"1.5rem",paddingTop:"1rem",borderTop:"1px solid var(--border)"}}>
          <button className="btn btn-ghost" disabled={step===0} onClick={()=>setStep(s=>s-1)} style={{opacity:step===0?0.3:1}}>← Back</button>
          {step<STEPS.length-1
            ? <button className="btn btn-gold" onClick={()=>setStep(s=>s+1)}>Continue →</button>
            : null}
        </div>
      </div>
    </div>
  );
};

// ── PLAYERS & TEAMS ───────────────────────────────────────────────────────────
const Players = () => {
  const [activeTeam,setActiveTeam]=useState("All");
  const [showAdd,setShowAdd]=useState(false);
  const [newP,setNewP]=useState({name:"",hcp:"",skill:"70-80 (Low)",team:"Eagles"});
  const [players,setPlayers]=useState(PLAYERS);
  const mob=useIsMobile();

  const teams=["All",...TEAMS];
  const filtered=activeTeam==="All"?players:players.filter(p=>p.team===activeTeam);

  const addPlayer=()=>{
    if(!newP.name)return;
    setPlayers(pp=>[...pp,{id:pp.length+1,name:newP.name,hcp:parseInt(newP.hcp)||0,skill:newP.skill.split(" ")[0],team:newP.team,role:"Player",scores:[]}]);
    setShowAdd(false);setNewP({name:"",hcp:"",skill:"70-80 (Low)",team:"Eagles"});
  };

  return (
    <div className="section">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"1rem",marginBottom:"1.5rem"}}>
        <div>
          <span className="section-tag">Roster Management</span>
          <div className="gold-divider"/>
          <h2 className="section-title">Players & Teams</h2>
        </div>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm">⬇ Import CSV</button>
          <button className="btn btn-gold btn-sm" onClick={()=>setShowAdd(true)}>+ Add Player</button>
        </div>
      </div>

      {/* Team filter */}
      <div className="pill-row" style={{marginBottom:"1.25rem"}}>
        {teams.map(t=><button key={t} className={`pill ${activeTeam===t?"act":""}`} onClick={()=>setActiveTeam(t)}>{t}</button>)}
      </div>

      {/* Add player form */}
      {showAdd&&(
        <div className="card card-gold" style={{marginBottom:"1.25rem",animation:"fadeUp 0.3s ease"}}>
          <div style={{fontFamily:"var(--fd)",fontSize:"1.1rem",color:"var(--text)",marginBottom:"1rem"}}>Add New Player</div>
          <div className="g2" style={{marginBottom:"1rem"}}>
            <div><div className="label">Full Name</div><input className="input" placeholder="John Smith" value={newP.name} onChange={e=>setNewP(p=>({...p,name:e.target.value}))}/></div>
            <div><div className="label">Handicap Index</div><input className="input" type="number" placeholder="0–36" value={newP.hcp} onChange={e=>setNewP(p=>({...p,hcp:e.target.value}))}/></div>
            <div><div className="label">Skill Level</div>
              <select className="input" value={newP.skill} onChange={e=>setNewP(p=>({...p,skill:e.target.value}))}>
                {SKILL_LEVELS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div><div className="label">Team</div>
              <select className="input" value={newP.team} onChange={e=>setNewP(p=>({...p,team:e.target.value}))}>
                {TEAMS.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:"0.5rem"}}>
            <button className="btn btn-gold" onClick={addPlayer}>Add Player</button>
            <button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Team cards */}
      {activeTeam==="All"?(
        <div className="g3">
          {TEAMS.map(team=>{
            const tp=players.filter(p=>p.team===team);
            const captain=tp.find(p=>p.role==="Captain");
            return (
              <div key={team} className="card" style={{borderTop:"2px solid var(--gold-border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.875rem"}}>
                  <div style={{fontFamily:"var(--fd)",fontSize:"1.1rem",color:"var(--text)"}}>{team}</div>
                  <span className="badge badge-gold">{tp.length} players</span>
                </div>
                {captain&&<div style={{fontSize:"0.75rem",color:"var(--text-dim)",fontFamily:"var(--fm)",marginBottom:"0.75rem"}}>CAPTAIN · {captain.name}</div>}
                {tp.map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.45rem 0",borderBottom:"1px solid var(--border)"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:"var(--surface3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.7rem",color:"var(--gold)",flexShrink:0,fontFamily:"var(--fm)"}}>
                      {p.name.split(" ").map(n=>n[0]).join("")}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.85rem",color:"var(--text)",lineHeight:1.2}}>{p.name}</div>
                      <div style={{fontSize:"0.65rem",color:"var(--text-dim)",fontFamily:"var(--fm)"}}>HCP {p.hcp} · {p.skill}</div>
                    </div>
                    <span className="badge badge-gray" style={{fontSize:"0.58rem"}}>{p.role}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ):(
        <div className="card">
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:480}}>
              <thead>
                <tr style={{borderBottom:"1px solid var(--border)"}}>
                  {["Player","Handicap","Skill Level","Role","Avg Score"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"0.5rem 0.75rem",fontSize:"0.65rem",letterSpacing:"0.15em",textTransform:"uppercase",color:"var(--text-dim)",fontFamily:"var(--fm)",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p=>(
                  <tr key={p.id} style={{borderBottom:"1px solid var(--border)"}}>
                    <td style={{padding:"0.65rem 0.75rem"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:"var(--surface3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.65rem",color:"var(--gold)",flexShrink:0,fontFamily:"var(--fm)"}}>{p.name.split(" ").map(n=>n[0]).join("")}</div>
                        <div style={{fontSize:"0.875rem",color:"var(--text)"}}>{p.name}</div>
                      </div>
                    </td>
                    <td style={{padding:"0.65rem 0.75rem",fontFamily:"var(--fm)",fontSize:"0.85rem",color:"var(--text-muted)"}}>{p.hcp}</td>
                    <td style={{padding:"0.65rem 0.75rem",fontSize:"0.8rem",color:"var(--text-muted)"}}>{p.skill}</td>
                    <td style={{padding:"0.65rem 0.75rem"}}><span className={`badge ${p.role==="Captain"?"badge-gold":"badge-gray"}`}>{p.role}</span></td>
                    <td style={{padding:"0.65rem 0.75rem",fontFamily:"var(--fm)",fontSize:"0.85rem",color:"var(--text-muted)"}}>{p.scores.length?Math.round(p.scores.reduce((a,b)=>a+b,0)/p.scores.length):"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── LEADERBOARD ───────────────────────────────────────────────────────────────
const Leaderboard = () => {
  const [view,setView]=useState("overall");
  const [editMode,setEditMode]=useState(false);
  const [editScores,setEditScores]=useState({});
  const mob=useIsMobile();

  const sorted=[...PLAYERS].sort((a,b)=>{
    if(view==="r1")return a.scores[0]-b.scores[0];
    if(view==="r2")return a.scores[1]-b.scores[1];
    if(view==="r3")return a.scores[2]-b.scores[2];
    return totalScore(a)-totalScore(b);
  });

  const getScore=(p)=>{
    if(view==="r1")return p.scores[0];
    if(view==="r2")return p.scores[1];
    if(view==="r3")return p.scores[2];
    return totalScore(p);
  };

  const getRel=(p,sc)=>{
    const par=view==="overall"?parTotal*4:parTotal;
    return sc-par;
  };

  return (
    <div className="section">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"1rem",marginBottom:"1.5rem"}}>
        <div>
          <span className="section-tag">Live Scoring</span>
          <div className="gold-divider"/>
          <h2 className="section-title">Leaderboard</h2>
        </div>
        <div style={{display:"flex",gap:"0.5rem",alignItems:"center",flexWrap:"wrap"}}>
          <span className="badge badge-green pulse">● LIVE</span>
          <button className={`btn ${editMode?"btn-gold":"btn-ghost"} btn-sm`} onClick={()=>setEditMode(m=>!m)}>
            {editMode?"✓ Save Scores":"✏ Enter Scores"}
          </button>
        </div>
      </div>

      {/* Round tabs */}
      <div className="pill-row" style={{marginBottom:"1.25rem"}}>
        {[{k:"overall",l:"Overall"},{k:"r1",l:"Round 1"},{k:"r2",l:"Round 2"},{k:"r3",l:"Round 3"}].map(r=>(
          <button key={r.k} className={`pill ${view===r.k?"act":""}`} onClick={()=>setView(r.k)}>{r.l}</button>
        ))}
      </div>

      {/* Leaderboard table */}
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"44px 1fr auto auto",padding:"0.6rem 1rem",borderBottom:"2px solid var(--border)",background:"var(--forest)"}}>
          {["POS","PLAYER",view==="overall"?"TOTAL":"SCORE","vs PAR"].map(h=>(
            <div key={h} style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:"var(--gold)",fontFamily:"var(--fm)",textAlign:h==="POS"?"center":"left"}}>{h}</div>
          ))}
        </div>
        {sorted.map((p,i)=>{
          const sc=getScore(p);
          const rel=getRel(p,sc);
          return (
            <div key={p.id} className={`lb-row ${i===0?"leader":""}`} style={{gridTemplateColumns:"44px 1fr auto auto",animation:`fadeUp 0.5s ease ${i*0.05}s both`}}>
              <div style={{display:"flex",justifyContent:"center"}}><div className={`pos-badge pos-${i+1<=3?i+1:"n"}`}>{i+1}</div></div>
              <div>
                <div style={{fontSize:"0.95rem",color:"var(--text)",lineHeight:1.2}}>{p.name}</div>
                <div style={{fontSize:"0.68rem",color:"var(--text-dim)",fontFamily:"var(--fm)"}}>{p.team} · HCP {p.hcp}</div>
              </div>
              <div>
                {editMode&&view!=="overall"?(
                  <input type="number" style={{width:60,background:"var(--surface2)",border:"1px solid var(--gold-border)",borderRadius:1,color:"var(--text)",fontFamily:"var(--fm)",fontSize:"0.9rem",padding:"0.3rem 0.5rem",textAlign:"center",outline:"none"}}
                    defaultValue={sc} onChange={e=>setEditScores(s=>({...s,[`${p.id}-${view}`]:parseInt(e.target.value)}))}/>
                ):(
                  <div style={{fontFamily:"var(--fm)",fontSize:"1.1rem",color:"var(--text)",textAlign:"right"}}>{sc}</div>
                )}
              </div>
              <div style={{textAlign:"right"}}>
                <div className={rel<0?"score-under":rel>0?"score-over":"score-even"} style={{fontFamily:"var(--fm)",fontSize:"0.9rem",fontWeight:600}}>{fmtScore(rel)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scorecard for top player */}
      <div style={{marginTop:"1.5rem"}}>
        <div className="label" style={{marginBottom:"0.75rem"}}>Hole-by-Hole · {sorted[0].name}</div>
        <div className="card" style={{padding:0,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table className="sc-table" style={{minWidth:600}}>
            <thead>
              <tr>
                <th style={{textAlign:"left",paddingLeft:"0.875rem"}}>Hole</th>
                {HOLES.slice(0,9).map(h=><th key={h.hole}>{h.hole}</th>)}
                <th>OUT</th>
                {HOLES.slice(9).map(h=><th key={h.hole}>{h.hole}</th>)}
                <th>IN</th><th>TOT</th>
              </tr>
              <tr style={{background:"rgba(0,0,0,0.2)"}}>
                <th style={{textAlign:"left",paddingLeft:"0.875rem",color:"var(--text-dim)"}}>Par</th>
                {HOLES.slice(0,9).map(h=><th key={h.hole} style={{color:"var(--text-dim)"}}>{h.par}</th>)}
                <th style={{color:"var(--text-dim)"}}>{parForHoles(HOLES.slice(0,9))}</th>
                {HOLES.slice(9).map(h=><th key={h.hole} style={{color:"var(--text-dim)"}}>{h.par}</th>)}
                <th style={{color:"var(--text-dim)"}}>{parForHoles(HOLES.slice(9))}</th>
                <th style={{color:"var(--text-dim)"}}>{parForHoles(HOLES)}</th>
              </tr>
            </thead>
            <tbody>
              {[sorted[0],sorted[2]].filter(p=>PLAYER_SCORES_18[p.id]).map(p=>{
                const s18=PLAYER_SCORES_18[p.id]||[];
                const front=s18.slice(0,9),back=s18.slice(9);
                const getClass=(score,par)=>score<=par-2?"sc-eagle":score===par-1?"sc-birdie":score===par+1?"sc-bogey":score>par+1?"sc-bogey sc-double":"sc-par";
                return (
                  <tr key={p.id}>
                    <td style={{textAlign:"left",paddingLeft:"0.875rem",color:"var(--text-muted)"}}>{p.name.split(" ")[0]}</td>
                    {front.map((sc,i)=><td key={i} className={getClass(sc,HOLES[i].par)}>{sc}</td>)}
                    <td style={{fontWeight:600,color:"var(--text)"}}>{holeTotal(front)}</td>
                    {back.map((sc,i)=><td key={i} className={getClass(sc,HOLES[i+9].par)}>{sc}</td>)}
                    <td style={{fontWeight:600,color:"var(--text)"}}>{holeTotal(back)}</td>
                    <td style={{fontWeight:700,color:"var(--gold)"}}>{holeTotal(s18)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",marginTop:"0.75rem"}}>
          {[{c:"sc-eagle",l:"Eagle"},{"c":"sc-birdie",l:"Birdie"},{"c":"sc-par",l:"Par"},{"c":"sc-bogey",l:"Bogey"}].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
              <span className={x.c} style={{fontSize:"0.75rem",fontFamily:"var(--fm)"}}>●</span>
              <span style={{fontSize:"0.68rem",color:"var(--text-dim)",fontFamily:"var(--fm)",letterSpacing:"0.1em"}}>{x.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Message board stub */}
      <div className="card" style={{marginTop:"1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.875rem"}}>
          <div className="label">Message Board</div>
          <span className="badge badge-gray">3 messages</span>
        </div>
        {[
          {user:"James W.",msg:"Great round today everyone — see you on 10!",time:"2h ago"},
          {user:"Admin",msg:"Reminder: scorecards due by 6pm. Use the app or the template.",time:"3h ago"},
          {user:"Sarah C.",msg:"Does anyone know the local rule on hole 7?",time:"4h ago"},
        ].map((m,i)=>(
          <div key={i} style={{padding:"0.6rem 0",borderBottom:i<2?"1px solid var(--border)":"none"}}>
            <div style={{display:"flex",gap:"0.5rem",alignItems:"center",marginBottom:"0.2rem"}}>
              <span style={{fontSize:"0.78rem",color:"var(--gold)",fontFamily:"var(--fm)"}}>{m.user}</span>
              <span style={{fontSize:"0.65rem",color:"var(--text-dim)",fontFamily:"var(--fm)"}}>{m.time}</span>
            </div>
            <div style={{fontSize:"0.875rem",color:"var(--text-muted)",lineHeight:1.5}}>{m.msg}</div>
          </div>
        ))}
        <div style={{display:"flex",gap:"0.5rem",marginTop:"0.875rem"}}>
          <input className="input" style={{flex:1,fontSize:"0.875rem"}} placeholder="Post a message…"/>
          <button className="btn btn-gold btn-sm">Post</button>
        </div>
      </div>
    </div>
  );
};

// ── RESULTS ───────────────────────────────────────────────────────────────────
const Results = () => {
  const sorted=[...PLAYERS].sort((a,b)=>relScore(a)-relScore(b));
  const winner=sorted[0];
  const [chatOpen,setChatOpen]=useState(false);
  const [msgs,setMsgs]=useState([{role:"ai",text:"Welcome to the Lotus Links AI Caddy! Ask me anything about scoring formats, course rules, handicap calculations, or tournament strategy."}]);
  const [chatIn,setChatIn]=useState("");
  const [loading,setLoading]=useState(false);
  const chatEnd=useRef();
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const sendChat=async()=>{
    if(!chatIn.trim()||loading)return;
    const q=chatIn;setChatIn("");setLoading(true);
    setMsgs(m=>[...m,{role:"user",text:q},{role:"ai",text:""}]);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,stream:true,
          system:"You are the Lotus Links AI Caddy — a friendly, knowledgeable golf assistant built into a tournament management platform. You help corporate event organizers and golfers with: scoring format rules (Stableford, Scramble, Stroke Play, Four Ball, etc.), handicap calculations, course management tips, tournament formats, and general golf etiquette. Keep answers concise, warm, and authoritative. 2 paragraphs max.",
          messages:[...msgs.filter(m=>m.role!=="ai"||m.text).map(m=>({role:m.role==="ai"?"assistant":"user",content:m.text})),{role:"user",content:q}]})});
      const reader=res.body.getReader(),dec=new TextDecoder();let buf="";
      while(true){const{done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});
        const lines=buf.split("\n");buf=lines.pop();
        for(const line of lines){if(line.startsWith("data: ")){const j=line.slice(6).trim();if(j==="[DONE]")continue;
          try{const e=JSON.parse(j);if(e.type==="content_block_delta"&&e.delta?.type==="text_delta")
            setMsgs(m=>{const u=[...m];u[u.length-1]={role:"ai",text:u[u.length-1].text+e.delta.text};return u;});}catch(_){}
        }}
      }
    }catch(e){setMsgs(m=>{const u=[...m];u[u.length-1]={role:"ai",text:"Unable to connect. This works within Claude.ai."};return u;});}
    finally{setLoading(false);}
  };

  return (
    <div className="section">
      {/* Winner celebration */}
      <div style={{position:"relative",background:"linear-gradient(135deg,var(--forest) 0%,#0a1a10 50%,var(--forest) 100%)",border:"1px solid var(--gold-border)",borderRadius:2,padding:"3rem 1.5rem",textAlign:"center",marginBottom:"2rem",overflow:"hidden",animation:"fadeIn 0.6s ease"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center,rgba(200,168,75,0.1),transparent 70%)",pointerEvents:"none"}}/>
        {/* Confetti dots */}
        {[...Array(12)].map((_,i)=>(
          <div key={i} style={{position:"absolute",width:4,height:4,borderRadius:"50%",background:i%3===0?"var(--gold)":i%3===1?"#4CAF50":"white",opacity:0.4,left:`${10+i*7}%`,top:`${15+(i%3)*25}%`,animation:`pulse ${1+i*0.2}s ease-in-out infinite`}}/>
        ))}
        <div className="trophy-anim" style={{fontSize:"4rem",marginBottom:"1rem"}}>🏆</div>
        <div style={{fontFamily:"var(--fm)",fontSize:"0.7rem",letterSpacing:"0.3em",color:"var(--gold)",textTransform:"uppercase",marginBottom:"0.5rem"}}>2024 Champion</div>
        <h1 style={{fontFamily:"var(--fd)",fontSize:"clamp(2rem,8vw,3.5rem)",fontWeight:700,color:"var(--text)",marginBottom:"0.3rem",lineHeight:1.05}}>
          {winner.name}
        </h1>
        <div style={{fontFamily:"var(--fd)",fontSize:"1.25rem",fontStyle:"italic",color:"var(--gold)",marginBottom:"0.5rem"}}>
          Pebble Beach Invitational — Corporate Classic
        </div>
        <div style={{fontFamily:"var(--fm)",fontSize:"0.9rem",color:"var(--text-muted)",marginBottom:"1.5rem"}}>
          Team {winner.team} · Handicap {winner.hcp} · {fmtScore(relScore(winner))} overall
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:"1rem",flexWrap:"wrap"}}>
          <button className="btn btn-gold">📸 Share Results</button>
          <button className="btn btn-outline">⬇ Download Certificate</button>
        </div>
      </div>

      {/* Podium */}
      <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:"0.5rem",marginBottom:"2rem"}}>
        {[sorted[1],sorted[0],sorted[2]].map((p,i)=>{
          const pos=[2,1,3][i];
          const heights=[140,180,120];
          const colors=["rgba(192,192,192,0.2)","linear-gradient(135deg,rgba(200,168,75,0.3),rgba(200,168,75,0.05))","rgba(205,127,50,0.2)"];
          const labels=["🥈 2nd","🥇 1st","🥉 3rd"];
          return (
            <div key={p.id} style={{textAlign:"center",flex:1,maxWidth:180,animation:`fadeUp 0.6s ease ${i*0.1}s both`}}>
              <div style={{fontSize:"0.75rem",color:"var(--text-muted)",marginBottom:"0.3rem",fontFamily:"var(--fm)"}}>{p.name.split(" ")[0]}</div>
              <div style={{fontSize:"0.7rem",color:"var(--text-dim)",fontFamily:"var(--fm)",marginBottom:"0.5rem"}} className={relScore(p)<0?"score-under":relScore(p)>0?"score-over":"score-even"}>{fmtScore(relScore(p))}</div>
              <div style={{height:heights[i],background:colors[i],border:"1px solid var(--gold-border)",borderRadius:"2px 2px 0 0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem"}}>{labels[i]}</div>
            </div>
          );
        })}
      </div>

      {/* Full results */}
      <div className="g2" style={{marginBottom:"1.5rem"}}>
        <div className="card">
          <div className="label" style={{marginBottom:"0.875rem"}}>Final Standings</div>
          {sorted.map((p,i)=>{
            const rel=relScore(p);
            return (
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.6rem 0",borderBottom:i<sorted.length-1?"1px solid var(--border)":"none"}}>
                <div className={`pos-badge pos-${i+1<=3?i+1:"n"}`}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.875rem",color:"var(--text)"}}>{p.name}</div>
                  <div style={{fontSize:"0.65rem",color:"var(--text-dim)",fontFamily:"var(--fm)"}}>{p.team}</div>
                </div>
                <div className={rel<0?"score-under":rel>0?"score-over":"score-even"} style={{fontFamily:"var(--fm)",fontSize:"0.85rem",fontWeight:600}}>{fmtScore(rel)}</div>
              </div>
            );
          })}
        </div>

        {/* Photo upload + FedEx points */}
        <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
          <div className="card">
            <div className="label" style={{marginBottom:"0.75rem"}}>Tournament Photos</div>
            <div style={{border:"1px dashed var(--gold-border)",borderRadius:1,padding:"1.5rem",textAlign:"center",cursor:"pointer",color:"var(--text-dim)",fontSize:"0.85rem",marginBottom:"0.75rem"}}>
              📸 Upload tournament photos<br/><span style={{fontSize:"0.72rem",fontFamily:"var(--fm)",color:"var(--text-dim)"}}>JPG, PNG up to 10MB each</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.4rem"}}>
              {[...Array(3)].map((_,i)=>(
                <div key={i} style={{aspectRatio:"1",background:"var(--surface2)",borderRadius:1,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-dim)",fontSize:"1.5rem",border:"1px solid var(--border)"}}>🖼</div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="label" style={{marginBottom:"0.75rem"}}>FedEx Cup Points</div>
            {sorted.slice(0,5).map((p,i)=>{
              const pts=[500,300,200,150,100][i];
              return (
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.45rem 0",borderBottom:i<4?"1px solid var(--border)":"none"}}>
                  <span style={{fontSize:"0.7rem",color:"var(--text-dim)",fontFamily:"var(--fm)",width:16,textAlign:"center"}}>{i+1}</span>
                  <div style={{flex:1,fontSize:"0.82rem",color:"var(--text-muted)"}}>{p.name.split(" ")[0]}</div>
                  <span className="badge badge-gold">{pts} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Chat FAB */}
      <div style={{position:"fixed",bottom:"1.5rem",right:"1.5rem",zIndex:200}}>
        {chatOpen&&(
          <div style={{position:"absolute",bottom:"60px",right:0,width:320,background:"var(--surface)",border:"1px solid var(--gold-border)",borderRadius:4,overflow:"hidden",boxShadow:"0 16px 48px rgba(0,0,0,0.6)",animation:"fadeUp 0.3s ease"}}>
            <div style={{padding:"0.875rem 1rem",background:"var(--forest)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:"0.5rem"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,var(--gold),#5a3e10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",flexShrink:0}}>⛳</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.78rem",color:"var(--text)",fontFamily:"var(--fm)"}}>AI Caddy</div>
                <div style={{fontSize:"0.6rem",color:"var(--text-dim)",fontFamily:"var(--fm)"}}>Lotus Links · Powered by Claude</div>
              </div>
              <button className="btn" style={{background:"none",border:"none",color:"var(--text-muted)",fontSize:"1rem",padding:"0.25rem",minHeight:"auto"}} onClick={()=>setChatOpen(false)}>✕</button>
            </div>
            <div style={{height:240,overflowY:"auto",padding:"0.875rem",display:"flex",flexDirection:"column",gap:"0.75rem",WebkitOverflowScrolling:"touch"}}>
              {msgs.map((m,i)=>(
                <div key={i} className={m.role==="ai"?"chat-ai":"chat-user"} style={{animation:"fadeUp 0.3s ease",fontSize:"0.82rem"}}>
                  {m.role==="ai"&&<div style={{fontSize:"0.58rem",color:"var(--gold)",fontFamily:"var(--fm)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.25rem"}}>AI Caddy</div>}
                  {m.text||<span className="pulse" style={{color:"var(--text-dim)"}}>▍</span>}
                </div>
              ))}
              <div ref={chatEnd}/>
            </div>
            <div style={{padding:"0.6rem 0.875rem",borderTop:"1px solid var(--border)",display:"flex",gap:"0.4rem"}}>
              <input className="input" style={{flex:1,fontSize:"0.82rem",padding:"0.5rem 0.75rem",minHeight:36}} placeholder="Ask about scoring, rules, courses…" value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()}/>
              <button className="btn btn-gold" style={{padding:"0.5rem 0.75rem",minHeight:36,minWidth:36,fontSize:"0.8rem"}} onClick={sendChat} disabled={loading}>{loading?"…":"→"}</button>
            </div>
            <div style={{padding:"0 0.875rem 0.5rem"}}>
              <div className="pill-row">
                {["How does Stableford work?","Explain handicap","What's a scramble?"].map(s=>(
                  <button key={s} className="pill" style={{fontSize:"0.6rem",padding:"0.25rem 0.5rem",minHeight:28}} onClick={()=>setChatIn(s)}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        <button onClick={()=>setChatOpen(o=>!o)}
          style={{width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,var(--gold),#6a4e10)",border:"none",cursor:"pointer",fontSize:"1.4rem",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(200,168,75,0.4)",transition:"all 0.2s"}}
          className="animate-glow">
          {chatOpen?"✕":"⛳"}
        </button>
      </div>
    </div>
  );
};

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,setPage]=useState("dashboard");
  const go=(k)=>{setPage(k);setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50);};
  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",overflowX:"hidden"}}>
      <FontInjector/><GS/>
      <Nav page={page} go={go}/>
      {page==="dashboard"&&<Dashboard go={go}/>}
      {page==="setup"&&<Setup/>}
      {page==="players"&&<Players/>}
      {page==="leaderboard"&&<Leaderboard/>}
      {page==="results"&&<Results/>}
    </div>
  );
}
