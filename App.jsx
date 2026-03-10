import { useState, useEffect, useRef, useCallback } from "react";

const SB = "https://xpvgofrtikbfvyxihviz.supabase.co";
const KEY = "sb_publishable_QPLaxQw-b5CYZSizS_7P4Q_5uMemWVq";
const MEDIA = `${SB}/storage/v1/object/public/family-journal`;
const RX_EMOJIS = ["❤️","😂","😢","🥰","👏","🎉"];
const FAMILY_NAMES = ["Brandon","Jacky","Grandma","Grandpa"];
const EMOJI = {Milestone:"🌟",Funny:"😂",Quote:"💬",First:"🎉",Health:"💚",Memory:"📸",Other:"✨"};
const A_CLR = {Brandon:"#5b8fb9",Jacky:"#c97b8b",Grandma:"#9b7fc4",Grandpa:"#6aab7b"};
const KID_WASH = {
  Gabby:{bg:"linear-gradient(135deg,#fff5f7 0%,#ffe8ed 30%,#fff0f5 100%)",border:"#f5d5dc"},
  Madelyn:{bg:"linear-gradient(135deg,#f5f3ff 0%,#ede8ff 30%,#f8f5ff 100%)",border:"#ddd4f0"},
  Both:{bg:"linear-gradient(135deg,#fff5f7 0%,#f0ecff 100%)",border:"#e8d8ee"},
  Family:{bg:"linear-gradient(135deg,#fffcf0 0%,#fff5e0 30%,#fffaf0 100%)",border:"#f0e4c8"},
};
const S = "'Quicksand',sans-serif";
const sbH = {apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"};
const sbPost=(p,b)=>fetch(`${SB}/rest/v1/${p}`,{method:"POST",headers:{...sbH,Prefer:"return=representation"},body:JSON.stringify(b)});
const sbDel=p=>fetch(`${SB}/rest/v1/${p}`,{method:"DELETE",headers:sbH});
const gN=()=>{try{return sessionStorage.getItem("jN")||null}catch{return null}};
const sN=n=>{try{sessionStorage.setItem("jN",n)}catch{}};

function Reactions({mid,rx,onR}){
  const[showEmojis,setShowEmojis]=useState(false);
  const[showNames,setShowNames]=useState(false);
  const[pendingEmoji,setPending]=useState(null);
  const[pop,setPop]=useState(false);
  const pressTimer=useRef(null);const ref=useRef(null);

  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target)){setShowEmojis(false);setShowNames(false)}};document.addEventListener("mousedown",h);document.addEventListener("touchstart",h);return()=>{document.removeEventListener("mousedown",h);document.removeEventListener("touchstart",h)}},[]);

  const g={};(rx||[]).forEach(r=>{if(!g[r.emoji])g[r.emoji]={c:0,a:[],my:false};g[r.emoji].c++;g[r.emoji].a.push(r.author);if(r.author===gN())g[r.emoji].my=true});

  const doReact=async(emoji,author)=>{setShowEmojis(false);setShowNames(false);setPending(null);const ex=(rx||[]).find(r=>r.emoji===emoji&&r.author===author);if(ex){await sbDel(`reactions?id=eq.${ex.id}`)}else{await sbPost("reactions",{moment_id:mid,author,emoji})}onR()};
  const startReact=emoji=>{const name=gN();if(name){doReact(emoji,name)}else{setPending(emoji);setShowNames(true);setShowEmojis(false)}};
  const pickName=name=>{sN(name);if(pendingEmoji)doReact(pendingEmoji,name);setShowNames(false)};

  const dn=()=>{pressTimer.current=setTimeout(()=>{setShowEmojis(true);pressTimer.current=null},2000)};
  const up=()=>{if(pressTimer.current){clearTimeout(pressTimer.current);pressTimer.current=null;setPop(true);setTimeout(()=>setPop(false),350);startReact("❤️")}};
  const lv=()=>{if(pressTimer.current){clearTimeout(pressTimer.current);pressTimer.current=null}};

  const h=g["❤️"];const my=h?.my;const oth=Object.entries(g).filter(([e])=>e!=="❤️");
  return(
    <div style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"12px",flexWrap:"wrap"}} ref={ref}>
      <div style={{position:"relative"}}>
        <button className={`heart-btn ${pop?"heart-pop":""}`} onMouseDown={dn} onMouseUp={up} onMouseLeave={lv} onTouchStart={dn} onTouchEnd={up} style={{opacity:my?1:0.3}}>{my?"❤️":"🤍"}{h&&h.c>0&&<span style={{position:"relative",top:"-2px",fontSize:"10px",fontFamily:S,fontWeight:800,color:"#c97b8b",marginLeft:"2px"}}>{h.c}</span>}</button>
        {showEmojis&&<div className="popup-f">{RX_EMOJIS.map(e=><button key={e} className="emoji-opt-f" onClick={()=>startReact(e)}>{e}</button>)}</div>}
        {showNames&&<div className="popup-f" style={{flexDirection:"column",gap:0,padding:"6px 4px",minWidth:"120px"}}><div style={{fontSize:"10px",fontFamily:S,fontWeight:700,color:"#c4a8ae",letterSpacing:"1px",textTransform:"uppercase",padding:"4px 10px 6px",textAlign:"center"}}>Who's this?</div>{FAMILY_NAMES.map(n=><button key={n} className="name-opt" onClick={()=>pickName(n)} style={{color:A_CLR[n]||"#6b5560"}}>{n}</button>)}</div>}
      </div>
      {oth.map(([emoji,data])=><button key={emoji} onClick={()=>startReact(emoji)} title={data.a.join(", ")} style={{display:"flex",alignItems:"center",gap:"3px",padding:"4px 12px",borderRadius:"18px",border:data.my?"2px solid #c97b8b":"1.5px solid #ede5dc",background:data.my?"#fff5f7":"rgba(255,255,255,0.7)",cursor:"pointer",fontSize:"15px",transition:"all 0.15s",fontFamily:S}}><span>{emoji}</span><span style={{fontSize:"11px",fontWeight:700,color:data.my?"#c97b8b":"#b8a0a5"}}>{data.c}</span></button>)}
    </div>
  );
}

function ShareBtn({m}){const[cp,setCp]=useState(false);const share=async()=>{const e=EMOJI[m.type]||"✨";const d=new Date(m.created_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});const txt=`${e} ${m.kid}: "${m.text}" - ${m.author}, ${d}`;const u="https://henes-family-journal.vercel.app";if(navigator.share){try{await navigator.share({text:txt,url:u});return}catch{}}try{await navigator.clipboard.writeText(`${txt}\n${u}`);setCp(true);setTimeout(()=>setCp(false),2000)}catch{}};return(<button onClick={share} title="Share" style={{background:"none",border:"none",cursor:"pointer",fontSize:"14px",padding:"4px",opacity:0.3,transition:"opacity 0.2s"}} onMouseEnter={e=>e.target.style.opacity="0.7"} onMouseLeave={e=>e.target.style.opacity="0.3"}>{cp?"✅":"↗"}</button>);}

function Confetti({active}){if(!active)return null;const colors=["#ff6b6b","#feca57","#48dbfb","#ff9ff3","#54a0ff","#5f27cd","#01a3a4","#f368e0"];const ps=Array.from({length:40},(_,i)=>({id:i,left:Math.random()*100,delay:Math.random()*0.5,dur:1.5+Math.random()*1.5,color:colors[i%colors.length],size:4+Math.random()*6,rot:Math.random()*360}));return(<div style={{position:"absolute",top:0,left:0,right:0,bottom:0,pointerEvents:"none",overflow:"hidden",borderRadius:"24px",zIndex:2}}>{ps.map(p=><div key={p.id} style={{position:"absolute",left:`${p.left}%`,top:"-10px",width:`${p.size}px`,height:`${p.size*1.4}px`,background:p.color,borderRadius:"1px",animation:`confettiFall ${p.dur}s ${p.delay}s ease-out forwards`,transform:`rotate(${p.rot}deg)`,opacity:0}}/>)}</div>);}

function WavePlayer({src}){const[playing,setP]=useState(false);const[progress,setPr]=useState(0);const[dur,setD]=useState(0);const a=useRef(null);const bars=26;const hs=useRef(Array.from({length:bars},()=>10+Math.random()*28)).current;useEffect(()=>{const au=a.current;if(!au)return;const u=()=>{setPr(au.currentTime/(au.duration||1));setD(au.duration||0)};const e=()=>{setP(false);setPr(0)};au.addEventListener("timeupdate",u);au.addEventListener("ended",e);au.addEventListener("loadedmetadata",()=>setD(au.duration));return()=>{au.removeEventListener("timeupdate",u);au.removeEventListener("ended",e)}},[]);const toggle=()=>{const au=a.current;if(!au)return;playing?au.pause():au.play();setP(!playing)};const seek=e=>{const r=e.currentTarget.getBoundingClientRect();if(a.current)a.current.currentTime=((e.clientX-r.left)/r.width)*a.current.duration};const fmt=s=>{if(!s)return"0:00";return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`};return(<div style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 16px",background:"rgba(201,123,139,0.06)",borderRadius:"18px",marginBottom:"14px",border:"1px solid rgba(201,123,139,0.1)"}}><audio ref={a} src={src} preload="metadata"/><button onClick={toggle} style={{width:"38px",height:"38px",borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#c97b8b,#b8a0d0)",color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",flexShrink:0,boxShadow:"0 2px 8px rgba(201,123,139,0.25)"}}>{playing?"⏸":"▶"}</button><div style={{flex:1}}><div onClick={seek} style={{display:"flex",alignItems:"center",gap:"1.5px",height:"34px",cursor:"pointer"}}>{hs.map((h,i)=><div key={i} style={{width:`${100/bars}%`,height:`${h}px`,background:i/bars<progress?"#c97b8b":"rgba(201,123,139,0.15)",borderRadius:"3px",transition:"background 0.1s,transform 0.15s",transform:playing&&i/bars<progress?"scaleY(1.12)":"scaleY(1)"}}/>)}</div><div style={{display:"flex",justifyContent:"space-between",marginTop:"2px"}}><span style={{fontSize:"10px",color:"#c4a8ae",fontFamily:S,fontWeight:600}}>{fmt(a.current?.currentTime)}</span><span style={{fontSize:"10px",color:"#c4a8ae",fontFamily:S,fontWeight:600}}>{fmt(dur)}</span></div></div></div>);}

function CalendarHeatmap({moments}){const today=new Date();const days=91;const cm={};moments.forEach(m=>{const d=new Date(m.created_at).toISOString().split("T")[0];cm[d]=(cm[d]||0)+1});const cells=[];for(let i=days-1;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const k=d.toISOString().split("T")[0];cells.push({date:k,count:cm[k]||0,label:d.toLocaleDateString("en-US",{month:"short",day:"numeric"})})}const clr=c=>c===0?"#f0e8e4":c<=2?"#fce4ec":c<=4?"#f48fb1":"#e91e63";return(<div style={{padding:"20px 24px"}}><div style={{fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",color:"#c4a8ae",fontFamily:S,fontWeight:700,marginBottom:"12px"}}>🌱 Growing every day</div><div style={{display:"flex",flexWrap:"wrap",gap:"3px"}}>{cells.map((c,i)=><div key={i} className="heatmap-cell-f" title={`${c.label}: ${c.count} moments`} style={{background:clr(c.count)}}/>)}</div><div style={{display:"flex",gap:"6px",marginTop:"8px",alignItems:"center"}}><span style={{fontSize:"10px",color:"#d0bfc3",fontFamily:S,fontWeight:600}}>Less</span>{[0,1,3,5].map(v=><div key={v} style={{width:"10px",height:"10px",borderRadius:"4px",background:clr(v)}}/>)}<span style={{fontSize:"10px",color:"#d0bfc3",fontFamily:S,fontWeight:600}}>More</span></div></div>);}

function GalleryView({moments}){const[sel,setSel]=useState(null);const wm=moments.filter(m=>m.primary_media_path&&(m.primary_media_path.endsWith(".jpg")||m.primary_media_path.endsWith(".jpeg")||m.primary_media_path.endsWith(".png")||m.primary_media_path.endsWith(".mp4")));if(!wm.length)return<div style={{padding:"60px",textAlign:"center",color:"#d0bfc3",fontFamily:S,fontWeight:600}}>No photos or videos yet 📷</div>;return(<><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"6px",padding:"16px 0"}}>{wm.map(m=>{const u=`${MEDIA}/${m.primary_media_path}`;const isV=m.primary_media_path.endsWith(".mp4");return(<div key={m.id} className="gallery-item-f" onClick={()=>setSel(m)}>{isV?(<><video src={u} preload="metadata"/><div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(201,123,139,0.7)",borderRadius:"50%",width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"14px",backdropFilter:"blur(4px)"}}>▶</div></>):(<img src={u} alt=""/>)}</div>)})}</div>{sel&&(<div className="lightbox-f" onClick={()=>setSel(null)}>{sel.primary_media_path.endsWith(".mp4")?(<video controls autoPlay playsInline style={{maxWidth:"100%",maxHeight:"70vh",borderRadius:"20px"}} onClick={e=>e.stopPropagation()}><source src={`${MEDIA}/${sel.primary_media_path}`} type="video/mp4"/></video>):(<img src={`${MEDIA}/${sel.primary_media_path}`} style={{maxWidth:"100%",maxHeight:"70vh",borderRadius:"20px"}} alt=""/>)}<div style={{color:"white",marginTop:"20px",textAlign:"center",maxWidth:"480px"}}>{!(sel.text.startsWith("[")&&sel.text.endsWith("]"))&&<div style={{fontSize:"20px",lineHeight:1.5,fontFamily:"'Caveat',cursive"}}>"{sel.text}"</div>}<div style={{fontSize:"12px",color:"rgba(255,255,255,0.5)",marginTop:"8px",fontFamily:S,fontWeight:600}}>{sel.author} · {new Date(sel.created_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div></div></div>)}</>);}

export default function App(){
  const[moments,setM]=useState([]);const[reactions,setRx]=useState([]);const[loading,setL]=useState(true);
  const[typeF,setTF]=useState("all");const[kidF,setKF]=useState("all");
  const[search,setSe]=useState("");const[aiMode,setAi]=useState(false);const[aiR,setAiR]=useState(null);const[aiL,setAiL]=useState(false);
  const[view,setV]=useState("timeline");const[favs,setFavs]=useState(()=>{try{return JSON.parse(sessionStorage.getItem("faves")||"[]")}catch{return[]}});
  const[showFav,setSF]=useState(false);const[selMo,setSelMo]=useState("all");const sTimer=useRef(null);

  const fetchM=()=>fetch(`${SB}/rest/v1/moments?order=created_at.desc&limit=500`,{headers:sbH}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setM(d)}).catch(console.error);
  const fetchR=()=>fetch(`${SB}/rest/v1/reactions?order=created_at.asc`,{headers:sbH}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setRx(d)}).catch(console.error);
  useEffect(()=>{Promise.all([fetchM(),fetchR()]).finally(()=>setL(false))},[]);
  const toggleFav=id=>{const n=favs.includes(id)?favs.filter(f=>f!==id):[...favs,id];setFavs(n);try{sessionStorage.setItem("faves",JSON.stringify(n))}catch{}};
  const doAi=useCallback(async q=>{if(!q.trim()){setAiR(null);return}setAiL(true);try{const r=await fetch("/api/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:q,moments:moments.map(m=>({id:m.id,kid:m.kid,type:m.type,text:m.text,author:m.author,created_at:m.created_at}))})});const d=await r.json();setAiR(d.ids||[])}catch{setAiR(null)}setAiL(false)},[moments]);
  const handleSearch=v=>{setSe(v);if(aiMode){clearTimeout(sTimer.current);sTimer.current=setTimeout(()=>doAi(v),800)}};

  const filtered=moments.filter(m=>{if(typeF!=="all"&&m.type!==typeF)return false;if(kidF!=="all"&&m.kid!==kidF)return false;if(showFav&&!favs.includes(m.id))return false;if(selMo!=="all"&&new Date(m.created_at).toISOString().substring(0,7)!==selMo)return false;if(aiMode&&aiR)return aiR.includes(m.id);if(!aiMode&&search.trim()){const q=search.toLowerCase();if(!`${m.text} ${m.author} ${m.kid} ${m.type} ${(m.tags||[]).join(" ")}`.toLowerCase().includes(q))return false}return true});

  const types=[...new Set(moments.map(m=>m.type))];const kids=[...new Set(moments.map(m=>m.kid))];
  const months=[...new Set(moments.map(m=>new Date(m.created_at).toISOString().substring(0,7)))].sort().reverse();
  const stats={total:moments.length,byKid:moments.reduce((a,m)=>({...a,[m.kid]:(a[m.kid]||0)+1}),{}),byAuthor:moments.reduce((a,m)=>({...a,[m.author]:(a[m.author]||0)+1}),{}),withMedia:moments.filter(m=>m.primary_media_path).length};
  const today=new Date();const otd=moments.filter(m=>{const d=new Date(m.created_at);return d.getMonth()===today.getMonth()&&d.getDate()===today.getDate()&&d.getFullYear()<today.getFullYear()});
  const grp=items=>{const g={};items.forEach(m=>{const k=new Date(m.created_at).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});if(!g[k])g[k]=[];g[k].push(m)});return g};
  const grouped=grp(filtered);const fmtMo=m=>{const[y,mo]=m.split("-");return new Date(y,mo-1).toLocaleDateString("en-US",{month:"long",year:"numeric"})};const getRx=id=>reactions.filter(r=>r.moment_id===id);

  return(
    <div style={{minHeight:"100vh",background:"#faf8f5",fontFamily:"'Caveat',cursive"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Quicksand:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}body{background:#faf8f5;-webkit-font-smoothing:antialiased}
        @keyframes bloomIn{from{opacity:0;transform:scale(0.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes confettiFall{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(400px) rotate(720deg)}}
        @keyframes heartPop{0%{transform:scale(1)}25%{transform:scale(1.4)}50%{transform:scale(0.9)}100%{transform:scale(1)}}
        @keyframes pickerIn{from{opacity:0;transform:translateY(6px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        .bloom{animation:bloomIn 0.5s ease-out forwards;opacity:0}
        .heart-pop{animation:heartPop 0.3s ease-out}
        .petal-card{border-radius:24px;padding:24px;position:relative;overflow:hidden;transition:transform 0.3s,box-shadow 0.3s;box-shadow:0 1px 4px rgba(0,0,0,0.03),0 4px 14px rgba(0,0,0,0.02)}.petal-card:hover{transform:translateY(-3px);box-shadow:0 6px 24px rgba(0,0,0,0.06)}
        .petal-btn{padding:8px 18px;border-radius:24px;cursor:pointer;font-size:13px;font-family:${S};font-weight:600;border:2px solid #ede5dc;background:white;color:#9b8a78;transition:all 0.2s}.petal-btn:hover{border-color:#d4bfb0;color:#6b5d50}.petal-btn.on{border-color:#c97b8b;background:#fff5f7;color:#c97b8b}
        .view-btn{width:38px;height:38px;border-radius:14px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;border:2px solid #ede5dc;background:white}.view-btn:hover{border-color:#d4bfb0;background:#fef8f5}.view-btn.on{border-color:#c97b8b;background:#fff5f7}
        .search-f{width:100%;padding:14px 18px 14px 44px;border:2px solid #ede5dc;border-radius:28px;font-size:16px;font-family:'Caveat',cursive;background:white;outline:none;color:#5c4a4f;transition:border-color 0.2s,box-shadow 0.2s}.search-f:focus{border-color:#d4bfb0;box-shadow:0 0 0 4px rgba(201,123,139,0.06)}
        .tag-f{font-size:10px;font-family:${S};font-weight:600;padding:3px 10px;border-radius:12px;background:rgba(255,255,255,0.6);color:#b8a0a5}
        .popup-f{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);background:white;border-radius:18px;padding:8px 10px;box-shadow:0 8px 28px rgba(0,0,0,0.1);display:flex;gap:2px;z-index:20;border:1px solid #f0e5e8;animation:pickerIn 0.2s ease-out}.popup-f::after{content:'';position:absolute;bottom:-5px;left:50%;transform:translateX(-50%) rotate(45deg);width:10px;height:10px;background:white;border-right:1px solid #f0e5e8;border-bottom:1px solid #f0e5e8}
        .emoji-opt-f{width:38px;height:38px;border:none;background:transparent;border-radius:10px;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;transition:background 0.1s,transform 0.1s}.emoji-opt-f:hover{background:#fff5f7;transform:scale(1.12)}.emoji-opt-f:active{transform:scale(0.95)}
        .name-opt{padding:8px 14px;border:none;background:transparent;border-radius:10px;cursor:pointer;font-size:13px;font-family:${S};font-weight:600;color:#6b5560;transition:background 0.1s;white-space:nowrap}.name-opt:hover{background:#fff5f7}
        .heart-btn{background:none;border:none;cursor:pointer;font-size:20px;padding:2px;transition:transform 0.15s,opacity 0.2s;user-select:none;-webkit-tap-highlight-color:transparent}
        .gallery-item-f{aspect-ratio:1;border-radius:16px;overflow:hidden;cursor:pointer;position:relative;background:#f5eff0;transition:transform 0.2s,box-shadow 0.2s}.gallery-item-f:hover{transform:scale(1.03);box-shadow:0 6px 20px rgba(0,0,0,0.08)}.gallery-item-f img,.gallery-item-f video{width:100%;height:100%;object-fit:cover}
        .lightbox-f{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(92,74,79,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px;cursor:pointer;animation:fadeIn 0.2s;backdrop-filter:blur(8px)}
        .heatmap-cell-f{width:13px;height:13px;border-radius:4px;cursor:pointer;transition:transform 0.1s}.heatmap-cell-f:hover{transform:scale(1.4)}
      `}</style>

      <div style={{padding:"52px 24px 36px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-30px",left:"-50px",width:"300px",height:"300px",borderRadius:"50%",background:"radial-gradient(ellipse,rgba(244,180,190,0.18) 0%,transparent 70%)",filter:"blur(20px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"20px",right:"-40px",width:"260px",height:"260px",borderRadius:"50%",background:"radial-gradient(ellipse,rgba(180,190,244,0.12) 0%,transparent 70%)",filter:"blur(20px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"-20px",left:"30%",width:"220px",height:"220px",borderRadius:"50%",background:"radial-gradient(ellipse,rgba(244,220,180,0.12) 0%,transparent 70%)",filter:"blur(20px)",pointerEvents:"none"}}/>
        <div style={{position:"relative"}}>
          <div style={{fontSize:"14px",fontFamily:S,fontWeight:700,letterSpacing:"4px",textTransform:"uppercase",color:"#c97b8b",marginBottom:"8px",opacity:0.7}}>est. 2024 & 2026</div>
          <h1 style={{fontSize:"52px",fontWeight:700,color:"#5c4a4f",marginBottom:"6px"}}>Gabby & Maddy Memories</h1>
          <p style={{fontSize:"18px",color:"#b8a0a5",fontFamily:S,fontWeight:500}}>{stats.total} little moments saved</p>
          <div style={{display:"flex",justifyContent:"center",gap:"10px",marginTop:"20px",flexWrap:"wrap",fontFamily:S}}>
            {Object.entries(stats.byKid).map(([k,n])=><div key={k} style={{background:"rgba(255,255,255,0.7)",borderRadius:"24px",padding:"7px 18px",fontSize:"13px",fontWeight:600,border:"1px solid rgba(201,123,139,0.15)",backdropFilter:"blur(4px)"}}>{k}: {n}</div>)}
            {Object.entries(stats.byAuthor).map(([a,n])=><div key={a} style={{background:"rgba(255,255,255,0.7)",borderRadius:"24px",padding:"7px 18px",fontSize:"13px",fontWeight:600,border:"1px solid rgba(201,123,139,0.15)",color:A_CLR[a]||"#9b8a78"}}>{a}: {n}</div>)}
          </div>
        </div>
      </div>

      <div style={{background:"white",padding:"14px 24px",borderBottom:"1px solid #f5ede8",display:"flex",gap:"8px",alignItems:"center"}}>
        <div style={{position:"relative",flex:1}}>
          <input className="search-f" type="text" placeholder={aiMode?"Ask anything: 'when did Gabby first sing?'":"Find a memory..."} value={search} onChange={e=>handleSearch(e.target.value)} style={aiMode?{borderColor:"#c97b8b",background:"#fff8f6"}:{}}/>
          <span style={{position:"absolute",left:"16px",top:"50%",transform:"translateY(-50%)",fontSize:"16px",opacity:0.35}}>{aiMode?"🤖":"🔍"}</span>
          {aiL&&<span style={{position:"absolute",right:"16px",top:"50%",transform:"translateY(-50%)",fontSize:"12px",fontFamily:S,fontWeight:700,color:"#c97b8b"}}>thinking...</span>}
        </div>
        <button className={`view-btn ${aiMode?"on":""}`} onClick={()=>{setAi(!aiMode);setAiR(null);setSe("")}}>🤖</button>
        <button className={`view-btn ${view==="timeline"?"on":""}`} onClick={()=>setV("timeline")}>📋</button>
        <button className={`view-btn ${view==="gallery"?"on":""}`} onClick={()=>setV("gallery")}>🖼</button>
        <button className={`view-btn ${showFav?"on":""}`} onClick={()=>setSF(!showFav)}>⭐</button>
      </div>

      <div style={{display:"flex",gap:"8px",padding:"12px 24px",overflowX:"auto",background:"white",borderBottom:"1px solid #f5ede8"}}>
        <button className={`petal-btn ${kidF==="all"?"on":""}`} onClick={()=>setKF("all")}>All Kids</button>
        {kids.map(k=><button key={k} className={`petal-btn ${kidF===k?"on":""}`} onClick={()=>setKF(k)}>{k}</button>)}
        <div style={{width:"1px",background:"#ede5dc",margin:"0 4px",flexShrink:0}}/>
        <button className={`petal-btn ${typeF==="all"?"on":""}`} onClick={()=>setTF("all")}>All Types</button>
        {types.map(t=><button key={t} className={`petal-btn ${typeF===t?"on":""}`} onClick={()=>setTF(t)}>{EMOJI[t]||""} {t}</button>)}
      </div>

      {months.length>1&&(<div style={{display:"flex",gap:"8px",padding:"10px 24px",overflowX:"auto",background:"#fefcfa",borderBottom:"1px solid #f5ede8"}}><button className={`petal-btn ${selMo==="all"?"on":""}`} onClick={()=>setSelMo("all")}>All Time</button>{months.map(m=><button key={m} className={`petal-btn ${selMo===m?"on":""}`} onClick={()=>setSelMo(m)}>{fmtMo(m)}</button>)}</div>)}

      {view==="timeline"&&<CalendarHeatmap moments={moments}/>}

      {view==="timeline"&&otd.length>0&&(<div style={{maxWidth:"640px",margin:"0 auto",padding:"16px 16px 0"}}><div style={{background:"linear-gradient(135deg,#fffcf0,#fff5e0)",borderRadius:"22px",padding:"18px 22px",border:"1.5px solid #f5e4c0"}}><div style={{fontSize:"12px",letterSpacing:"2px",textTransform:"uppercase",color:"#d4a030",fontFamily:S,fontWeight:700,marginBottom:"10px"}}>✨ On this day</div>{otd.map(m=><div key={m.id} style={{fontSize:"18px",color:"#5c4a4f",marginBottom:"6px",lineHeight:1.4}}>"{m.text}" <span style={{fontFamily:S,fontSize:"12px",color:"#c4a8ae",fontWeight:600}}>- {m.author}, {new Date(m.created_at).getFullYear()}</span></div>)}</div></div>)}

      <div style={{maxWidth:"640px",margin:"0 auto",padding:"28px 16px"}}>
        {loading?<div style={{textAlign:"center",padding:"80px",color:"#d0bfc3",fontFamily:S,fontWeight:600}}>Picking flowers...</div>
        :view==="gallery"?<GalleryView moments={filtered}/>
        :filtered.length===0?<div style={{textAlign:"center",padding:"80px",color:"#d0bfc3",fontFamily:S,fontWeight:600}}>{aiMode&&search?"No matches found. Try asking differently!":search?"No memories match.":showFav?"No favorites yet. Tap ⭐ on a memory!":"No moments yet. Send one to the bot!"}</div>
        :(<div style={{position:"relative",paddingLeft:"32px"}}>
            <div style={{position:"absolute",left:"11px",top:0,bottom:0,width:"2px",background:"linear-gradient(to bottom,#c97b8b,#ddd4f0,#f0e4c8)",borderRadius:"1px"}}/>
            {Object.entries(grouped).map(([date,items])=>(<div key={date} style={{marginBottom:"36px"}}><div style={{display:"flex",alignItems:"center",marginBottom:"18px",marginLeft:"-32px"}}><div style={{width:"22px",height:"22px",borderRadius:"50%",background:"linear-gradient(135deg,#c97b8b,#dbb0bb)",border:"3px solid #faf8f5",flexShrink:0,zIndex:1,boxShadow:"0 2px 6px rgba(201,123,139,0.2)"}}/><div style={{fontSize:"12px",letterSpacing:"2.5px",textTransform:"uppercase",color:"#c4a8ae",fontFamily:S,fontWeight:700,marginLeft:"14px"}}>{date}</div></div>
              <div style={{display:"flex",flexDirection:"column",gap:"18px"}}>{items.map((m,idx)=>(<div key={m.id} className="bloom" style={{animationDelay:`${idx*0.08}s`,position:"relative"}}><div style={{position:"absolute",left:"-27px",top:"26px",width:"10px",height:"10px",borderRadius:"50%",background:"#dbb0bb",border:"2.5px solid #faf8f5",zIndex:1}}/><Card m={m} faved={favs.includes(m.id)} onFav={()=>toggleFav(m.id)} reactions={getRx(m.id)} onReact={fetchR}/></div>))}</div></div>))}
          </div>)}
      </div>
      <div style={{textAlign:"center",padding:"40px",fontSize:"20px",color:"#e0d0d5"}}>made with ❤️ by the Henes family</div>
    </div>
  );
}

function Card({m,faved,onFav,reactions,onReact}){
  const time=new Date(m.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  const url=m.primary_media_path?`${MEDIA}/${m.primary_media_path}`:null;
  const isV=m.primary_media_path?.endsWith(".mp4")||m.primary_media_path?.endsWith(".mov");
  const isA=m.primary_media_path?.endsWith(".ogg")||m.primary_media_path?.endsWith(".mp3")||m.primary_media_path?.endsWith(".oga");
  const isI=m.primary_media_path?.endsWith(".jpg")||m.primary_media_path?.endsWith(".jpeg")||m.primary_media_path?.endsWith(".png")||m.primary_media_path?.endsWith(".webp");
  const isM=m.type==="Milestone";const hide=m.text.startsWith("[")&&m.text.endsWith("]");
  const[conf,setConf]=useState(false);const wash=KID_WASH[m.kid]||KID_WASH.Family;
  useEffect(()=>{if(isM){setConf(true);const t=setTimeout(()=>setConf(false),3000);return()=>clearTimeout(t)}},[]);

  return(<div className="petal-card" style={{background:wash.bg,border:`1.5px solid ${wash.border}`}}>
    {isM&&<Confetti active={conf}/>}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px",position:"relative",zIndex:3}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px"}}><span style={{fontSize:"22px"}}>{EMOJI[m.type]||"✨"}</span><div><span style={{fontSize:"15px",fontFamily:S,fontWeight:700,color:"#6b5560"}}>{m.kid}</span><span style={{fontSize:"12px",fontFamily:S,fontWeight:600,color:"#c4a8ae",marginLeft:"6px"}}>{m.type}</span></div></div>
      <div style={{display:"flex",alignItems:"center",gap:"6px"}}><ShareBtn m={m}/><button onClick={onFav} style={{background:"none",border:"none",cursor:"pointer",fontSize:"16px",padding:"4px",opacity:faved?1:0.25,transition:"opacity 0.2s"}}>{faved?"⭐":"☆"}</button><span style={{fontSize:"11px",fontFamily:S,color:"#d0bfc3",fontWeight:600}}>{time}</span></div>
    </div>
    {!hide&&(<div style={{fontSize:m.type==="Quote"?"24px":"20px",lineHeight:1.5,color:"#4a3a3f",marginBottom:"14px",fontStyle:m.type==="Quote"?"italic":"normal",position:"relative",zIndex:3}}>{m.type==="Quote"?<>❝ {m.text} ❞</>:`"${m.text}"`}</div>)}
    {isV&&url&&<div style={{marginBottom:"14px",borderRadius:"18px",overflow:"hidden"}}><video controls playsInline preload="metadata" style={{width:"100%",borderRadius:"18px",maxHeight:"400px",background:"#f5eff0"}}><source src={url} type="video/mp4"/></video></div>}
    {isI&&url&&<div style={{marginBottom:"14px",borderRadius:"18px",overflow:"hidden",border:`1px solid ${wash.border}`}}><img src={url} alt="" style={{width:"100%",borderRadius:"18px",maxHeight:"400px",objectFit:"cover"}}/></div>}
    {isA&&url&&<WavePlayer src={url}/>}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"8px",position:"relative",zIndex:3}}><span style={{fontSize:"13px",fontFamily:S,fontWeight:700,color:A_CLR[m.author]||"#888"}}>{m.author}</span><div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>{Array.isArray(m.tags)&&m.tags.slice(0,3).map((t,i)=><span key={i} className="tag-f" style={{border:`1px solid ${wash.border}`}}>{t}</span>)}</div></div>
    <Reactions mid={m.id} rx={reactions} onR={onReact}/>
  </div>);
}
