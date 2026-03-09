import { useState, useEffect, useRef, useCallback } from "react";

const SB = "https://xpvgofrtikbfvyxihviz.supabase.co";
const KEY = "sb_publishable_QPLaxQw-b5CYZSizS_7P4Q_5uMemWVq";
const MEDIA = `${SB}/storage/v1/object/public/family-journal`;
const REACTION_EMOJIS = ["❤️", "😂", "😢", "🥰", "👏", "🎉"];

const EMOJI = { Milestone:"🌟", Funny:"😂", Quote:"💬", First:"🎉", Health:"💚", Memory:"📸", Other:"✨" };
const AUTHOR_CLR = { Brandon:"#4a9eff", Jacky:"#e8836b", Mom:"#8b5cf6", Dad:"#10b981" };
const KID_BG = {
  Gabby: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)",
  Madelyn: "linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)",
  Both: "linear-gradient(135deg, #fce4ec 0%, #c5cae9 100%)",
  Family: "linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)",
};
const S = "'Helvetica Neue','Arial',sans-serif";

// ── Helpers ──
const sbHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const sbPost = (path, body) => fetch(`${SB}/rest/v1/${path}`, { method: "POST", headers: { ...sbHeaders, Prefer: "return=representation" }, body: JSON.stringify(body) });
const sbDelete = (path) => fetch(`${SB}/rest/v1/${path}`, { method: "DELETE", headers: sbHeaders });

function getName() {
  try { return sessionStorage.getItem("journalName") || null; } catch { return null; }
}
function setName(n) {
  try { sessionStorage.setItem("journalName", n); } catch {}
}

// ── Confetti ──
function Confetti({ active }) {
  if (!active) return null;
  const colors = ["#ff6b6b","#feca57","#48dbfb","#ff9ff3","#54a0ff","#5f27cd","#01a3a4","#f368e0"];
  const ps = Array.from({ length: 40 }, (_, i) => ({ id:i, left:Math.random()*100, delay:Math.random()*0.5, dur:1.5+Math.random()*1.5, color:colors[i%colors.length], size:4+Math.random()*6, rot:Math.random()*360 }));
  return (
    <div style={{ position:"absolute",top:0,left:0,right:0,bottom:0,pointerEvents:"none",overflow:"hidden",borderRadius:"16px",zIndex:2 }}>
      {ps.map(p=><div key={p.id} style={{ position:"absolute",left:`${p.left}%`,top:"-10px",width:`${p.size}px`,height:`${p.size*1.4}px`,background:p.color,borderRadius:"1px",animation:`confettiFall ${p.dur}s ${p.delay}s ease-out forwards`,transform:`rotate(${p.rot}deg)`,opacity:0 }}/>)}
      <style>{`@keyframes confettiFall{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(400px) rotate(720deg)}}`}</style>
    </div>
  );
}

// ── Waveform Audio Player ──
function WavePlayer({ src }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const bars = 24;
  const heights = useRef(Array.from({ length: bars }, () => 12 + Math.random() * 28)).current;
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const u = () => setProgress(a.currentTime / (a.duration || 1));
    const e = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", u); a.addEventListener("ended", e);
    return () => { a.removeEventListener("timeupdate", u); a.removeEventListener("ended", e); };
  }, []);
  const toggle = () => { const a=audioRef.current; if(!a)return; playing?a.pause():a.play(); setPlaying(!playing); };
  const seek = (e) => { const r=e.currentTarget.getBoundingClientRect(); if(audioRef.current) audioRef.current.currentTime=((e.clientX-r.left)/r.width)*audioRef.current.duration; };
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",background:"rgba(0,0,0,0.05)",borderRadius:"12px",marginBottom:"14px" }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle} style={{ width:"36px",height:"36px",borderRadius:"50%",border:"none",background:"#1a1a2e",color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",flexShrink:0 }}>{playing?"⏸":"▶"}</button>
      <div onClick={seek} style={{ flex:1,display:"flex",alignItems:"center",gap:"2px",height:"40px",cursor:"pointer" }}>
        {heights.map((h,i)=><div key={i} style={{ width:`${100/bars}%`,height:`${h}px`,background:i/bars<progress?"#e8836b":"rgba(0,0,0,0.15)",borderRadius:"2px",transition:"background 0.1s",transform:playing&&i/bars<progress?"scaleY(1.1)":"scaleY(1)" }}/>)}
      </div>
    </div>
  );
}

// ── Calendar Heatmap ──
function CalendarHeatmap({ moments }) {
  const today = new Date(); const days = 91; const countMap = {};
  moments.forEach(m => { const d=new Date(m.created_at).toISOString().split("T")[0]; countMap[d]=(countMap[d]||0)+1; });
  const cells = []; for (let i=days-1;i>=0;i--) { const d=new Date(today); d.setDate(d.getDate()-i); const k=d.toISOString().split("T")[0]; cells.push({date:k,count:countMap[k]||0,label:d.toLocaleDateString("en-US",{month:"short",day:"numeric"})}); }
  const clr = c=>c===0?"#ebedf0":c<=2?"#fce4ec":c<=5?"#f48fb1":"#e91e63";
  return (
    <div style={{ padding:"20px 24px" }}>
      <div style={{ fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",color:"#999",fontFamily:S,fontWeight:600,marginBottom:"12px" }}>Activity (last 3 months)</div>
      <div style={{ display:"flex",flexWrap:"wrap",gap:"3px" }}>{cells.map((c,i)=><div key={i} title={`${c.label}: ${c.count} moments`} style={{ width:"12px",height:"12px",borderRadius:"2px",background:clr(c.count),cursor:"pointer" }}/>)}</div>
      <div style={{ display:"flex",gap:"8px",marginTop:"8px",alignItems:"center" }}>
        <span style={{ fontSize:"10px",color:"#999",fontFamily:S }}>Less</span>
        {[0,1,3,6].map(v=><div key={v} style={{ width:"10px",height:"10px",borderRadius:"2px",background:clr(v) }}/>)}
        <span style={{ fontSize:"10px",color:"#999",fontFamily:S }}>More</span>
      </div>
    </div>
  );
}

// ── Gallery View ──
function GalleryView({ moments }) {
  const [sel, setSel] = useState(null);
  const wm = moments.filter(m=>m.primary_media_path&&(m.primary_media_path.endsWith(".jpg")||m.primary_media_path.endsWith(".jpeg")||m.primary_media_path.endsWith(".png")||m.primary_media_path.endsWith(".mp4")));
  if (!wm.length) return <div style={{ padding:"40px",textAlign:"center",color:"#999",fontFamily:S }}>No photos or videos yet</div>;
  return (
    <>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"4px",padding:"16px 0" }}>
        {wm.map(m=>{const u=`${MEDIA}/${m.primary_media_path}`;const isV=m.primary_media_path.endsWith(".mp4");return(
          <div key={m.id} onClick={()=>setSel(m)} style={{ aspectRatio:"1",borderRadius:"8px",overflow:"hidden",cursor:"pointer",position:"relative",background:"#f0f0f0" }}>
            {isV?(<><video src={u} style={{width:"100%",height:"100%",objectFit:"cover"}} preload="metadata"/><div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(0,0,0,0.5)",borderRadius:"50%",width:"32px",height:"32px",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"14px"}}>▶</div></>):(<img src={u} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>)}
          </div>);})}
      </div>
      {sel&&(<div onClick={()=>setSel(null)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",padding:"20px",cursor:"pointer"}}>
        {sel.primary_media_path.endsWith(".mp4")?(<video controls autoPlay playsInline style={{maxWidth:"100%",maxHeight:"70vh",borderRadius:"12px"}}><source src={`${MEDIA}/${sel.primary_media_path}`} type="video/mp4"/></video>):(<img src={`${MEDIA}/${sel.primary_media_path}`} style={{maxWidth:"100%",maxHeight:"70vh",borderRadius:"12px"}} alt=""/>)}
        <div style={{color:"white",marginTop:"16px",textAlign:"center",maxWidth:"500px"}}><div style={{fontSize:"16px",lineHeight:1.5}}>"{sel.text}"</div><div style={{fontSize:"12px",color:"#999",marginTop:"8px",fontFamily:S}}>{sel.author} · {new Date(sel.created_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div></div>
      </div>)}
    </>
  );
}

// ── Reactions Component ──
function Reactions({ momentId, reactions, onReact }) {
  const [showPicker, setShowPicker] = useState(false);
  const name = getName();

  const grouped = {};
  (reactions || []).forEach(r => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, authors: [], mine: false };
    grouped[r.emoji].count++;
    grouped[r.emoji].authors.push(r.author);
    if (r.author === name) grouped[r.emoji].mine = true;
  });

  const handleReact = async (emoji) => {
    let author = getName();
    if (!author) {
      author = prompt("What's your name?");
      if (!author) return;
      setName(author.trim());
      author = author.trim();
    }
    setShowPicker(false);

    const existing = (reactions || []).find(r => r.emoji === emoji && r.author === author);
    if (existing) {
      await sbDelete(`reactions?id=eq.${existing.id}`);
    } else {
      await sbPost("reactions", { moment_id: momentId, author, emoji });
    }
    onReact();
  };

  return (
    <div style={{ display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",marginTop:"10px",position:"relative",zIndex:3 }}>
      {Object.entries(grouped).map(([emoji, data]) => (
        <button key={emoji} onClick={() => handleReact(emoji)} title={data.authors.join(", ")} style={{
          display:"flex",alignItems:"center",gap:"4px",padding:"4px 10px",borderRadius:"16px",
          border: data.mine ? "2px solid #e8836b" : "1px solid rgba(0,0,0,0.1)",
          background: data.mine ? "rgba(232,131,107,0.1)" : "rgba(255,255,255,0.6)",
          cursor:"pointer",fontSize:"14px",fontFamily:S,
        }}>
          <span>{emoji}</span>
          <span style={{ fontSize:"11px",fontWeight:600,color:"#555" }}>{data.count}</span>
        </button>
      ))}
      <div style={{ position:"relative" }}>
        <button onClick={() => setShowPicker(!showPicker)} style={{
          width:"28px",height:"28px",borderRadius:"50%",border:"1px dashed #ccc",background:"white",
          cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center",
          color:"#999",
        }}>+</button>
        {showPicker && (
          <div style={{
            position:"absolute",bottom:"36px",left:"50%",transform:"translateX(-50%)",
            background:"white",borderRadius:"12px",padding:"8px",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",
            display:"flex",gap:"4px",zIndex:10,
          }}>
            {REACTION_EMOJIS.map(e => (
              <button key={e} onClick={() => handleReact(e)} style={{
                width:"36px",height:"36px",border:"none",background:"transparent",borderRadius:"8px",
                cursor:"pointer",fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center",
              }}
              onMouseEnter={ev => ev.target.style.background = "#f0f0f0"}
              onMouseLeave={ev => ev.target.style.background = "transparent"}
              >{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Share Button ──
function ShareBtn({ moment }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const emoji = EMOJI[moment.type] || "✨";
    const date = new Date(moment.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const text = `${emoji} ${moment.kid} ${moment.type}: "${moment.text}" — ${moment.author}, ${date}`;
    const url = "https://henes-family-journal.vercel.app";

    if (navigator.share) {
      try { await navigator.share({ text, url }); return; } catch {}
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button onClick={share} title="Share this moment" style={{
      background:"none",border:"none",cursor:"pointer",fontSize:"16px",padding:"0",
      opacity:0.4,transition:"opacity 0.2s",
    }}
    onMouseEnter={e => e.target.style.opacity = "1"}
    onMouseLeave={e => e.target.style.opacity = "0.4"}
    >{copied ? "✅" : "↗"}</button>
  );
}

// ── Name Prompt (for first-time users) ──
function NamePrompt({ onSet }) {
  const [name, setN] = useState("");
  return (
    <div style={{ position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"white",borderRadius:"20px",padding:"32px",maxWidth:"340px",width:"100%",textAlign:"center" }}>
        <div style={{ fontSize:"32px",marginBottom:"12px" }}>👋</div>
        <div style={{ fontSize:"18px",fontWeight:600,marginBottom:"8px",fontFamily:S }}>Welcome to the Family Journal!</div>
        <div style={{ fontSize:"14px",color:"#666",marginBottom:"20px",fontFamily:S }}>What's your name?</div>
        <input type="text" value={name} onChange={e=>setN(e.target.value)} placeholder="Your name" style={{
          width:"100%",padding:"10px 16px",borderRadius:"12px",border:"1px solid #ddd",fontSize:"15px",fontFamily:S,
          textAlign:"center",outline:"none",marginBottom:"16px",
        }} onKeyDown={e => { if(e.key==="Enter"&&name.trim()){setName(name.trim());onSet();}}} />
        <button onClick={()=>{if(name.trim()){setName(name.trim());onSet();}}} style={{
          width:"100%",padding:"12px",borderRadius:"12px",border:"none",background:"#1a1a2e",color:"white",
          fontSize:"15px",fontFamily:S,fontWeight:600,cursor:"pointer",
        }}>Let's Go</button>
      </div>
    </div>
  );
}

// ── Main App ──
export default function App() {
  const [moments, setMoments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [kidFilter, setKidFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [view, setView] = useState("timeline");
  const [favorites, setFavorites] = useState(() => { try{return JSON.parse(sessionStorage.getItem("faves")||"[]")}catch{return[]} });
  const [showFaves, setShowFaves] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [needsName, setNeedsName] = useState(!getName());
  const searchTimer = useRef(null);

  const fetchMoments = () => fetch(`${SB}/rest/v1/moments?order=created_at.desc&limit=500`, { headers: sbHeaders }).then(r=>r.json()).then(d=>{if(Array.isArray(d))setMoments(d);}).catch(console.error);
  const fetchReactions = () => fetch(`${SB}/rest/v1/reactions?order=created_at.asc`, { headers: sbHeaders }).then(r=>r.json()).then(d=>{if(Array.isArray(d))setReactions(d);}).catch(console.error);

  useEffect(() => { Promise.all([fetchMoments(), fetchReactions()]).finally(()=>setLoading(false)); }, []);

  const refreshReactions = () => fetchReactions();

  const toggleFav = id => { const n=favorites.includes(id)?favorites.filter(f=>f!==id):[...favorites,id]; setFavorites(n); try{sessionStorage.setItem("faves",JSON.stringify(n))}catch{} };

  // AI Search
  const doAiSearch = useCallback(async (q) => {
    if (!q.trim()) { setAiResults(null); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, moments: moments.map(m => ({ id:m.id, kid:m.kid, type:m.type, text:m.text, author:m.author, created_at:m.created_at })) }),
      });
      const data = await res.json();
      setAiResults(data.ids || []);
    } catch { setAiResults(null); }
    setAiLoading(false);
  }, [moments]);

  const handleSearch = (val) => {
    setSearch(val);
    if (aiMode) {
      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => doAiSearch(val), 800);
    }
  };

  const filtered = moments.filter(m => {
    if (typeFilter!=="all" && m.type!==typeFilter) return false;
    if (kidFilter!=="all" && m.kid!==kidFilter) return false;
    if (showFaves && !favorites.includes(m.id)) return false;
    if (selectedMonth!=="all") { if(new Date(m.created_at).toISOString().substring(0,7)!==selectedMonth) return false; }
    if (aiMode && aiResults) return aiResults.includes(m.id);
    if (!aiMode && search.trim()) { const q=search.toLowerCase(); if(!`${m.text} ${m.author} ${m.kid} ${m.type} ${(m.tags||[]).join(" ")}`.toLowerCase().includes(q)) return false; }
    return true;
  });

  const types = [...new Set(moments.map(m=>m.type))];
  const kids = [...new Set(moments.map(m=>m.kid))];
  const months = [...new Set(moments.map(m=>new Date(m.created_at).toISOString().substring(0,7)))].sort().reverse();
  const stats = { total:moments.length, byKid:moments.reduce((a,m)=>({...a,[m.kid]:(a[m.kid]||0)+1}),{}), byAuthor:moments.reduce((a,m)=>({...a,[m.author]:(a[m.author]||0)+1}),{}), withMedia:moments.filter(m=>m.primary_media_path).length };
  const today = new Date();
  const onThisDay = moments.filter(m=>{const d=new Date(m.created_at);return d.getMonth()===today.getMonth()&&d.getDate()===today.getDate()&&d.getFullYear()<today.getFullYear();});
  const groupByDate = items=>{const g={};items.forEach(m=>{const k=new Date(m.created_at).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});if(!g[k])g[k]=[];g[k].push(m);});return g;};
  const grouped = groupByDate(filtered);
  const fmtMonth = m=>{const[y,mo]=m.split("-");return new Date(y,mo-1).toLocaleDateString("en-US",{month:"long",year:"numeric"});};

  const getReactionsForMoment = (id) => reactions.filter(r => r.moment_id === id);

  return (
    <div style={{ minHeight:"100vh",background:"#faf9f7",fontFamily:"'Georgia','Times New Roman',serif" }}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .card-anim{animation:slideUp 0.5s ease-out forwards;opacity:0}
      `}</style>

      {needsName && <NamePrompt onSet={() => setNeedsName(false)} />}

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)",padding:"48px 24px 28px",color:"white",textAlign:"center" }}>
        <div style={{ fontSize:"13px",letterSpacing:"4px",textTransform:"uppercase",color:"#e8836b",marginBottom:"8px",fontFamily:S }}>The Henes Family</div>
        <h1 style={{ fontSize:"38px",fontWeight:"400",margin:"0 0 6px",letterSpacing:"1px" }}>Memory Journal</h1>
        <div style={{ fontSize:"14px",opacity:0.5,fontFamily:S }}>{stats.total} moment{stats.total!==1?"s":""} captured{stats.withMedia?` · ${stats.withMedia} with media`:""}</div>
        <div style={{ display:"flex",justifyContent:"center",gap:"10px",marginTop:"20px",flexWrap:"wrap" }}>
          {Object.entries(stats.byKid).map(([k,n])=><Pill key={k} text={`${k}: ${n}`}/>)}
          {Object.entries(stats.byAuthor).map(([a,n])=><Pill key={a} text={`${a}: ${n}`} color={AUTHOR_CLR[a]} dim/>)}
        </div>
      </div>

      {/* Search + View Toggle */}
      <div style={{ background:"white",padding:"12px 24px",borderBottom:"1px solid #eee",display:"flex",gap:"8px",alignItems:"center" }}>
        <div style={{ position:"relative",flex:1 }}>
          <input type="text" placeholder={aiMode ? "Ask AI: 'when did Gabby first sing?'" : "Search memories..."} value={search} onChange={e=>handleSearch(e.target.value)} style={{ width:"100%",padding:"8px 12px 8px 32px",border: aiMode ? "2px solid #e8836b" : "1px solid #ddd",borderRadius:"20px",fontSize:"13px",fontFamily:S,outline:"none",background:aiMode?"#fff8f6":"#fafafa" }} />
          <span style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"14px",opacity:0.4 }}>{aiMode?"🤖":"🔍"}</span>
          {aiLoading && <span style={{ position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",fontSize:"12px",fontFamily:S,color:"#e8836b" }}>thinking...</span>}
        </div>
        <VBtn active={aiMode} onClick={()=>{setAiMode(!aiMode);setAiResults(null);setSearch("");}} label="🤖" title="AI Search" />
        <VBtn active={view==="timeline"} onClick={()=>setView("timeline")} label="📋" />
        <VBtn active={view==="gallery"} onClick={()=>setView("gallery")} label="🖼" />
        <VBtn active={showFaves} onClick={()=>setShowFaves(!showFaves)} label="❤️" />
      </div>

      {/* Filters */}
      <div style={{ display:"flex",gap:"8px",padding:"10px 24px",overflowX:"auto",background:"white",borderBottom:"1px solid #eee",fontFamily:S }}>
        <Fb active={kidFilter==="all"} onClick={()=>setKidFilter("all")} text="All Kids"/>
        {kids.map(k=><Fb key={k} active={kidFilter===k} onClick={()=>setKidFilter(k)} text={k}/>)}
        <div style={{ width:"1px",background:"#ddd",margin:"0 4px",flexShrink:0 }}/>
        <Fb active={typeFilter==="all"} onClick={()=>setTypeFilter("all")} text="All Types"/>
        {types.map(t=><Fb key={t} active={typeFilter===t} onClick={()=>setTypeFilter(t)} text={`${EMOJI[t]||""} ${t}`}/>)}
      </div>

      {/* Month Nav */}
      {months.length>1&&(
        <div style={{ display:"flex",gap:"8px",padding:"10px 24px",overflowX:"auto",background:"#fafafa",borderBottom:"1px solid #eee",fontFamily:S }}>
          <Fb active={selectedMonth==="all"} onClick={()=>setSelectedMonth("all")} text="All Time"/>
          {months.map(m=><Fb key={m} active={selectedMonth===m} onClick={()=>setSelectedMonth(m)} text={fmtMonth(m)}/>)}
        </div>
      )}

      {view==="timeline"&&<CalendarHeatmap moments={moments}/>}

      {/* On This Day */}
      {view==="timeline"&&onThisDay.length>0&&(
        <div style={{ maxWidth:"640px",margin:"0 auto",padding:"16px 16px 0" }}>
          <div style={{ background:"linear-gradient(135deg,#fff8e1,#ffecb3)",borderRadius:"16px",padding:"16px 20px",border:"1px solid #ffe082" }}>
            <div style={{ fontSize:"12px",letterSpacing:"2px",textTransform:"uppercase",color:"#f57f17",fontFamily:S,fontWeight:600,marginBottom:"8px" }}>✨ On This Day</div>
            {onThisDay.map(m=>(<div key={m.id} style={{ fontSize:"15px",color:"#333",marginBottom:"4px" }}>"{m.text}" — <span style={{ fontFamily:S,fontSize:"12px",color:"#999" }}>{m.author}, {new Date(m.created_at).getFullYear()}</span></div>))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth:"640px",margin:"0 auto",padding:"28px 16px" }}>
        {loading?<div style={{ textAlign:"center",padding:"60px 0",color:"#999",fontFamily:S }}>Loading memories...</div>
        :view==="gallery"?<GalleryView moments={filtered}/>
        :filtered.length===0?<div style={{ textAlign:"center",padding:"60px 0",color:"#999",fontFamily:S }}>{aiMode&&search?"No AI matches found. Try a different question.":search?"No moments match your search.":showFaves?"No favorites yet. Tap ❤️ on a card!":"No moments yet."}</div>
        :(
          <div style={{ position:"relative",paddingLeft:"28px" }}>
            <div style={{ position:"absolute",left:"10px",top:"0",bottom:"0",width:"2px",background:"linear-gradient(to bottom, #e8836b, #f8bbd0, #c5cae9)",borderRadius:"1px" }}/>
            {Object.entries(grouped).map(([date,items])=>(
              <div key={date} style={{ marginBottom:"32px" }}>
                <div style={{ display:"flex",alignItems:"center",marginBottom:"16px",marginLeft:"-28px" }}>
                  <div style={{ width:"20px",height:"20px",borderRadius:"50%",background:"#e8836b",border:"3px solid #faf9f7",flexShrink:0,zIndex:1 }}/>
                  <div style={{ fontSize:"12px",letterSpacing:"2px",textTransform:"uppercase",color:"#999",fontFamily:S,fontWeight:600,marginLeft:"12px" }}>{date}</div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
                  {items.map((m,idx)=>(
                    <div key={m.id} className="card-anim" style={{ animationDelay:`${idx*0.1}s`,position:"relative" }}>
                      <div style={{ position:"absolute",left:"-24px",top:"24px",width:"10px",height:"10px",borderRadius:"50%",background:"#f8bbd0",border:"2px solid #faf9f7",zIndex:1 }}/>
                      <Card m={m} faved={favorites.includes(m.id)} onFav={()=>toggleFav(m.id)} reactions={getReactionsForMoment(m.id)} onReact={refreshReactions} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ textAlign:"center",padding:"36px",color:"#ccc",fontSize:"12px",fontFamily:S }}>Gabby & Maddy's Memory Journal · Powered by love and a Telegram bot</div>
    </div>
  );
}

// ── Card ──
function Card({ m, faved, onFav, reactions, onReact }) {
  const time = new Date(m.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  const url = m.primary_media_path?`${MEDIA}/${m.primary_media_path}`:null;
  const isV = m.primary_media_path?.endsWith(".mp4")||m.primary_media_path?.endsWith(".mov");
  const isA = m.primary_media_path?.endsWith(".ogg")||m.primary_media_path?.endsWith(".mp3")||m.primary_media_path?.endsWith(".oga");
  const isI = m.primary_media_path?.endsWith(".jpg")||m.primary_media_path?.endsWith(".jpeg")||m.primary_media_path?.endsWith(".png")||m.primary_media_path?.endsWith(".webp");
  const isM = m.type==="Milestone";
  const [conf, setConf] = useState(false);
  useEffect(()=>{if(isM){setConf(true);const t=setTimeout(()=>setConf(false),3000);return()=>clearTimeout(t);}},[]);

  return (
    <div style={{ background:KID_BG[m.kid]||"white",borderRadius:"16px",padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflow:"hidden",position:"relative" }}>
      {isM&&<Confetti active={conf}/>}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px",position:"relative",zIndex:3 }}>
        <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
          <span style={{ fontSize:"22px" }}>{EMOJI[m.type]||"✨"}</span>
          <span style={{ fontSize:"11px",letterSpacing:"1px",textTransform:"uppercase",color:"#1a1a2e",opacity:0.55,fontWeight:600,fontFamily:S }}>{m.kid} · {m.type}</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
          <ShareBtn moment={m} />
          <button onClick={onFav} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"18px",padding:"0",opacity:faved?1:0.3,transition:"opacity 0.2s" }}>{faved?"❤️":"🤍"}</button>
          <span style={{ fontSize:"11px",fontFamily:S,color:"#999" }}>{time}</span>
        </div>
      </div>
      <div style={{ fontSize:m.type==="Quote"?"20px":"17px",lineHeight:1.6,color:"#1a1a2e",marginBottom:"14px",fontStyle:m.type==="Quote"?"italic":"normal",position:"relative",zIndex:3 }}>
        {m.text.startsWith("[")&&m.text.endsWith("]")?null:m.type==="Quote"?<span style={{fontFamily:"'Georgia',serif"}}>❝ {m.text} ❞</span>:`"${m.text}"`}
      </div>
      {isV&&url&&<div style={{marginBottom:"14px",borderRadius:"12px",overflow:"hidden"}}><video controls playsInline preload="metadata" style={{width:"100%",borderRadius:"12px",maxHeight:"400px",background:"#000"}}><source src={url} type="video/mp4"/></video></div>}
      {isI&&url&&<div style={{marginBottom:"14px",borderRadius:"12px",overflow:"hidden"}}><img src={url} alt={m.text} style={{width:"100%",borderRadius:"12px",maxHeight:"400px",objectFit:"cover"}}/></div>}
      {isA&&url&&<WavePlayer src={url}/>}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"8px",position:"relative",zIndex:3 }}>
        <span style={{ fontSize:"12px",fontFamily:S,fontWeight:600,color:AUTHOR_CLR[m.author]||"#666" }}>{m.author}</span>
        <div style={{ display:"flex",gap:"4px",flexWrap:"wrap" }}>{Array.isArray(m.tags)&&m.tags.slice(0,3).map((t,i)=><Tg key={i} text={t}/>)}</div>
      </div>
      <Reactions momentId={m.id} reactions={reactions} onReact={onReact} />
    </div>
  );
}

function Fb({active,onClick,text}){return<button onClick={onClick} style={{padding:"6px 14px",borderRadius:"20px",cursor:"pointer",whiteSpace:"nowrap",border:active?"2px solid #1a1a2e":"1px solid #ddd",background:active?"#1a1a2e":"white",color:active?"white":"#666",fontSize:"12px",fontFamily:S,fontWeight:active?600:400}}>{text}</button>}
function Pill({text,color,dim}){return<div style={{background:dim?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.1)",borderRadius:"20px",padding:"6px 16px",fontSize:"13px",fontFamily:S,color:color||"white"}}>{text}</div>}
function Tg({text}){return<span style={{fontSize:"10px",fontFamily:S,background:"rgba(0,0,0,0.07)",borderRadius:"10px",padding:"3px 8px",color:"#777"}}>{text}</span>}
function VBtn({active,onClick,label,title}){return<button onClick={onClick} title={title} style={{width:"36px",height:"36px",borderRadius:"10px",border:active?"2px solid #1a1a2e":"1px solid #ddd",background:active?"#1a1a2e":"white",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center"}}>{label}</button>}
