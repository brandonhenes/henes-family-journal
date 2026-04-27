import { useState, useEffect, useRef, useCallback } from "react";

const SB = "https://xpvgofrtikbfvyxihviz.supabase.co";
const KEY = "sb_publishable_QPLaxQw-b5CYZSizS_7P4Q_5uMemWVq";
const MEDIA = `${SB}/storage/v1/object/public/family-journal`;
const RX_EMOJIS = ["❤️","😂","😢","🥰","👏","🎉"];
const FAMILY_NAMES = ["Brandon","Jacky","Grandma","Grandpa"];
const EMOJI = {Milestone:"🌟",Funny:"😂",Quote:"💬",First:"🎉",Health:"💚",Memory:"📸",Other:"✨"};
const A_CLR = {Brandon:"#5b8fb9",Jacky:"#c97b8b",Grandma:"#9b7fc4",Grandpa:"#6aab7b"};
const KID_WASH = {
  Gabby:{bg:"#fffdfb",border:"#ece4dc"},
  Madelyn:{bg:"#fffdfb",border:"#ece4dc"},
  Both:{bg:"#fffdfb",border:"#ece4dc"},
  Family:{bg:"#fffdfb",border:"#ece4dc"},
};
const BIRTHDAYS={Gabby:new Date("2024-07-01"),Madelyn:new Date("2026-07-01")};
const S = "'Source Sans 3',sans-serif";
const SERIF = "'Lora','Georgia',serif";
const sbH = {apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"};
const sbPost=(p,b)=>fetch(`${SB}/rest/v1/${p}`,{method:"POST",headers:{...sbH,Prefer:"return=representation"},body:JSON.stringify(b)});
const sbDel=p=>fetch(`${SB}/rest/v1/${p}`,{method:"DELETE",headers:sbH});
const sbPatch=(p,b)=>fetch(`${SB}/rest/v1/${p}`,{method:"PATCH",headers:{...sbH,Prefer:"return=representation"},body:JSON.stringify(b)});
const gN=()=>{try{return sessionStorage.getItem("jN")||null}catch{return null}};
const sN=n=>{try{sessionStorage.setItem("jN",n)}catch{}};

/* ---- Download helper ---- */
const downloadMedia=async(url,toast)=>{
  try{
    const res=await fetch(url);const blob=await res.blob();
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    const ext=url.split(".").pop().split("?")[0]||"jpg";
    const name=`henes-memory-${Date.now()}.${ext}`;
    a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    if(toast)toast("Saved to downloads","💾");
  }catch{if(toast)toast("Download failed","❌")}
};

/* ---- Helpers ---- */
const ageAt=(kid,date)=>{const b=BIRTHDAYS[kid];if(!b)return null;const d=new Date(date);const mo=((d.getFullYear()-b.getFullYear())*12)+(d.getMonth()-b.getMonth());if(mo<0)return null;if(mo<24)return `${mo}mo`;return `${Math.floor(mo/12)}y ${mo%12}mo`};

// Manual photo groups + soft suggestions (no auto-bunching)
const isVideoPath=p=>p?.endsWith(".mp4")||p?.endsWith(".mov");
const isAudioPath=p=>p?.endsWith(".ogg")||p?.endsWith(".mp3")||p?.endsWith(".oga");
const isImagePath=p=>p?.endsWith(".jpg")||p?.endsWith(".jpeg")||p?.endsWith(".png")||p?.endsWith(".webp");
const isMediaMoment=m=>!!m?.primary_media_path&&(isImagePath(m.primary_media_path)||isVideoPath(m.primary_media_path));
const mTime=m=>new Date(m.created_at).getTime();
const sortAsc=(a,b)=>mTime(a)-mTime(b);
const sortDesc=(a,b)=>mTime(b)-mTime(a);
const dateLabelFor=ts=>new Date(ts).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
const fmtRange=ms=>{
  if(!ms?.length)return "";
  const a=[...ms].sort(sortAsc);
  const first=new Date(a[0].created_at);
  const last=new Date(a[a.length-1].created_at);
  const f=first.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  const l=last.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  return f===l?f:`${f} - ${l}`;
};
const defaultGroupTitle=ms=>{
  if(!ms?.length)return "Photo group";
  const sorted=[...ms].sort(sortAsc);
  const kid=sorted.every(m=>m.kid===sorted[0].kid)?sorted[0].kid:"Family";
  const d=new Date(sorted[0].created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"});
  return `${kid} photos · ${d}`;
};
const makeSuggestionKey=ms=>[...ms].map(m=>m.id).sort().join("|");
const groupByDate=entities=>{
  const g={};
  entities.forEach(e=>{const k=dateLabelFor(e.timestamp);if(!g[k])g[k]=[];g[k].push(e)});
  return g;
};

const generateSoftSuggestions=(items,dismissedKeys=new Set())=>{
  const media=[...items].filter(isMediaMoment).sort(sortAsc);
  const out=[];let cur=[];
  const flush=()=>{if(cur.length>=2){const key=makeSuggestionKey(cur);if(!dismissedKeys.has(key))out.push({key,moments:[...cur].sort(sortAsc),timestamp:mTime(cur[0])})}cur=[]};
  media.forEach(m=>{
    if(!cur.length){cur=[m];return}
    const prev=cur[cur.length-1];
    const sameAuthor=m.author===cur[0].author;
    const sameKid=m.kid===cur[0].kid;
    const sameDay=new Date(m.created_at).toDateString()===new Date(cur[0].created_at).toDateString();
    const gap=mTime(m)-mTime(prev);
    if(sameAuthor&&sameKid&&sameDay&&gap>=0&&gap<180000){cur.push(m)}else{flush();cur=[m]}
  });
  flush();
  return out;
};

const buildTimelineEntities=({moments,filtered,momentGroups,groupItems,dismissedKeys})=>{
  const allById=new Map(moments.map(m=>[m.id,m]));
  const filteredIds=new Set(filtered.map(m=>m.id));
  const groupedMomentIds=new Set(groupItems.map(i=>i.moment_id));
  const groupEntities=momentGroups.map(g=>{
    const items=groupItems.filter(i=>i.group_id===g.id).sort((a,b)=>(a.position??0)-(b.position??0));
    const ms=items.map(i=>allById.get(i.moment_id)).filter(Boolean);
    if(!ms.length)return null;
    if(!ms.some(m=>filteredIds.has(m.id)))return null;
    const cover=ms.find(m=>m.id===g.cover_moment_id)||ms[0];
    const first=[...ms].sort(sortAsc)[0];
    return{kind:"group",id:`group-${g.id}`,group:g,moments:ms,cover,timestamp:mTime(first)};
  }).filter(Boolean);

  const ungrouped=filtered.filter(m=>!groupedMomentIds.has(m.id));
  const suggestions=generateSoftSuggestions(ungrouped,dismissedKeys).map(s=>({kind:"suggestion",id:`suggestion-${s.key}`,suggestion:s,timestamp:s.timestamp}));
  const momentEntities=ungrouped.map(m=>({kind:"moment",id:m.id,moment:m,timestamp:mTime(m)}));

  return[...groupEntities,...momentEntities,...suggestions].sort((a,b)=>b.timestamp-a.timestamp);
};

/* ---- Toast system ---- */
let toastId=0;
function useToast(){
  const[toasts,setToasts]=useState([]);
  const show=useCallback((msg,emoji="")=>{const id=++toastId;setToasts(t=>[...t,{id,msg,emoji}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2200)},[]);
  return{toasts,show};
}
function ToastContainer({toasts}){
  return(<div style={{position:"fixed",bottom:"24px",left:"50%",transform:"translateX(-50%)",zIndex:2000,display:"flex",flexDirection:"column-reverse",gap:"8px",pointerEvents:"none"}}>
    {toasts.map(t=>(<div key={t.id} className="toast-in" style={{background:"#5c4a4f",color:"white",padding:"10px 20px",borderRadius:"24px",fontSize:"14px",fontFamily:S,fontWeight:600,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",gap:"8px",whiteSpace:"nowrap",backdropFilter:"blur(8px)"}}>{t.emoji&&<span style={{fontSize:"16px"}}>{t.emoji}</span>}{t.msg}</div>))}
  </div>);
}

/* ---- Progressive image (blur-up) ---- */
function ProgressiveImage({src,alt="",style={},className="",onClick}){
  const[loaded,setLoaded]=useState(false);const[err,setErr]=useState(false);
  return(<div style={{position:"relative",overflow:"hidden",borderRadius:style.borderRadius||"18px"}} className={className} onClick={onClick}>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#f5eff0 0%,#ede5e8 50%,#f0e8ec 100%)",transition:"opacity 0.4s ease",opacity:loaded?0:1,zIndex:1}}><div className="shimmer-overlay" style={{position:"absolute",inset:0}}/></div>
    {!err?<img src={src} alt={alt} onLoad={()=>setLoaded(true)} onError={()=>setErr(true)} style={{...style,opacity:loaded?1:0,transition:"opacity 0.4s ease"}}/>
    :<div style={{...style,display:"flex",alignItems:"center",justifyContent:"center",background:"#f5eff0",color:"#d0bfc3",fontSize:"13px",fontFamily:S,fontWeight:600,minHeight:"120px"}}>📷 Couldn't load</div>}
  </div>);
}

/* ---- Skeleton loading ---- */
function SkeletonCard({delay=0}){const wash=["#fff5f7","#f5f3ff","#fffcf0"][Math.floor(Math.random()*3)];return(
  <div className="bloom" style={{animationDelay:`${delay}s`,borderRadius:"24px",padding:"24px",background:wash,border:"1.5px solid #f0e8e4",overflow:"hidden",position:"relative"}}>
    <div className="shimmer-overlay" style={{position:"absolute",inset:0,zIndex:1}}/>
    <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"16px"}}><div style={{width:"22px",height:"22px",borderRadius:"50%",background:"#ede5dc"}}/><div style={{width:"80px",height:"12px",borderRadius:"6px",background:"#ede5dc"}}/><div style={{marginLeft:"auto",width:"40px",height:"10px",borderRadius:"5px",background:"#ede5dc"}}/></div>
    <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"16px"}}><div style={{width:"100%",height:"14px",borderRadius:"7px",background:"#ede5dc"}}/><div style={{width:"85%",height:"14px",borderRadius:"7px",background:"#ede5dc"}}/><div style={{width:"60%",height:"14px",borderRadius:"7px",background:"#ede5dc"}}/></div>
    <div style={{width:"140px",height:"100px",borderRadius:"14px",background:"#ede5dc",marginBottom:"14px"}}/><div style={{display:"flex",gap:"8px"}}><div style={{width:"50px",height:"10px",borderRadius:"5px",background:"#ede5dc"}}/><div style={{width:"40px",height:"18px",borderRadius:"9px",background:"#ede5dc"}}/></div>
  </div>);}
function SkeletonTimeline(){return(
  <div style={{position:"relative",paddingLeft:"32px"}}><div style={{position:"absolute",left:"11px",top:0,bottom:0,width:"2px",background:"linear-gradient(to bottom,#ede5dc,#f0e8e4)",borderRadius:"1px"}}/>
    <div style={{display:"flex",alignItems:"center",marginBottom:"18px",marginLeft:"-32px"}}><div style={{width:"22px",height:"22px",borderRadius:"50%",background:"#ede5dc",border:"3px solid #faf8f5",flexShrink:0,zIndex:1}}/><div style={{width:"180px",height:"12px",borderRadius:"6px",background:"#ede5dc",marginLeft:"14px"}}/></div>
    <div style={{display:"flex",flexDirection:"column",gap:"18px"}}>{[0,1,2].map(i=><div key={i} style={{position:"relative"}}><div style={{position:"absolute",left:"-27px",top:"26px",width:"10px",height:"10px",borderRadius:"50%",background:"#ede5dc",border:"2.5px solid #faf8f5",zIndex:1}}/><SkeletonCard delay={i*0.12}/></div>)}</div>
  </div>);}

/* ---- Reactions ---- */
function Reactions({mid,rx,onR,toast}){
  const[showEmojis,setShowEmojis]=useState(false);const[showNames,setShowNames]=useState(false);const[pendingEmoji,setPending]=useState(null);const[pop,setPop]=useState(false);
  const pressTimer=useRef(null);const ref=useRef(null);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target)){setShowEmojis(false);setShowNames(false)}};document.addEventListener("mousedown",h);document.addEventListener("touchstart",h);return()=>{document.removeEventListener("mousedown",h);document.removeEventListener("touchstart",h)}},[]);
  const g={};(rx||[]).forEach(r=>{if(!g[r.emoji])g[r.emoji]={c:0,a:[],my:false};g[r.emoji].c++;g[r.emoji].a.push(r.author);if(r.author===gN())g[r.emoji].my=true});
  const doReact=async(emoji,author)=>{setShowEmojis(false);setShowNames(false);setPending(null);const ex=(rx||[]).find(r=>r.emoji===emoji&&r.author===author);if(ex){await sbDel(`reactions?id=eq.${ex.id}`);toast("Removed","👋")}else{await sbPost("reactions",{moment_id:mid,author,emoji});toast("Reacted!",emoji)}onR()};
  const startReact=emoji=>{const name=gN();if(name){doReact(emoji,name)}else{setPending(emoji);setShowNames(true);setShowEmojis(false)}};
  const pickName=name=>{sN(name);toast(`Hi ${name}!`,"👋");if(pendingEmoji)doReact(pendingEmoji,name);setShowNames(false)};
  const dn=()=>{pressTimer.current=setTimeout(()=>{setShowEmojis(true);pressTimer.current=null},2000)};
  const up=()=>{if(pressTimer.current){clearTimeout(pressTimer.current);pressTimer.current=null;setPop(true);setTimeout(()=>setPop(false),350);startReact("❤️")}};
  const lv=()=>{if(pressTimer.current){clearTimeout(pressTimer.current);pressTimer.current=null}};
  const h=g["❤️"];const my=h?.my;const oth=Object.entries(g).filter(([e])=>e!=="❤️");
  return(<div style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"12px",flexWrap:"wrap"}} ref={ref}>
    <div style={{position:"relative"}}><button className={`heart-btn ${pop?"heart-pop":""}`} onMouseDown={dn} onMouseUp={up} onMouseLeave={lv} onTouchStart={dn} onTouchEnd={up} style={{opacity:my?1:0.3}}>{my?"❤️":"🤍"}{h&&h.c>0&&<span style={{position:"relative",top:"-2px",fontSize:"10px",fontFamily:S,fontWeight:800,color:"#c97b8b",marginLeft:"2px"}}>{h.c}</span>}</button>
      {showEmojis&&<div className="popup-f">{RX_EMOJIS.map(e=><button key={e} className="emoji-opt-f" onClick={()=>startReact(e)}>{e}</button>)}</div>}
      {showNames&&<div className="popup-f" style={{flexDirection:"column",gap:0,padding:"6px 4px",minWidth:"120px"}}><div style={{fontSize:"10px",fontFamily:S,fontWeight:700,color:"#c4a8ae",letterSpacing:"1px",textTransform:"uppercase",padding:"4px 10px 6px",textAlign:"center"}}>Who's this?</div>{FAMILY_NAMES.map(n=><button key={n} className="name-opt" onClick={()=>pickName(n)} style={{color:A_CLR[n]||"#6b5560"}}>{n}</button>)}</div>}
    </div>
    {oth.map(([emoji,data])=><button key={emoji} onClick={()=>startReact(emoji)} title={data.a.join(", ")} style={{display:"flex",alignItems:"center",gap:"3px",padding:"4px 12px",borderRadius:"18px",border:data.my?"2px solid #c97b8b":"1.5px solid #ede5dc",background:data.my?"#fff5f7":"rgba(255,255,255,0.7)",cursor:"pointer",fontSize:"15px",transition:"all 0.15s",fontFamily:S}}><span>{emoji}</span><span style={{fontSize:"11px",fontWeight:700,color:data.my?"#c97b8b":"#b8a0a5"}}>{data.c}</span></button>)}
  </div>);
}

function ShareBtn({m,toast}){const[cp,setCp]=useState(false);const share=async()=>{const e=EMOJI[m.type]||"✨";const d=new Date(m.created_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});const txt=`${e} ${m.kid}: "${m.text}" - ${m.author}, ${d}`;const u="https://henes-family-journal.vercel.app";if(navigator.share){try{await navigator.share({text:txt,url:u});toast("Shared!","↗");return}catch{}}try{await navigator.clipboard.writeText(`${txt}\n${u}`);setCp(true);toast("Copied to clipboard","📋");setTimeout(()=>setCp(false),2000)}catch{}};return(<button onClick={share} title="Share" style={{background:"none",border:"none",cursor:"pointer",fontSize:"14px",padding:"4px",opacity:0.3,transition:"opacity 0.2s"}} onMouseEnter={e=>e.target.style.opacity="0.7"} onMouseLeave={e=>e.target.style.opacity="0.3"}>{cp?"✅":"↗"}</button>);}

function Confetti({active}){if(!active)return null;const colors=["#ff6b6b","#feca57","#48dbfb","#ff9ff3","#54a0ff","#5f27cd","#01a3a4","#f368e0"];const ps=Array.from({length:40},(_,i)=>({id:i,left:Math.random()*100,delay:Math.random()*0.5,dur:1.5+Math.random()*1.5,color:colors[i%colors.length],size:4+Math.random()*6,rot:Math.random()*360}));return(<div style={{position:"absolute",top:0,left:0,right:0,bottom:0,pointerEvents:"none",overflow:"hidden",borderRadius:"24px",zIndex:2}}>{ps.map(p=><div key={p.id} style={{position:"absolute",left:`${p.left}%`,top:"-10px",width:`${p.size}px`,height:`${p.size*1.4}px`,background:p.color,borderRadius:"1px",animation:`confettiFall ${p.dur}s ${p.delay}s ease-out forwards`,transform:`rotate(${p.rot}deg)`,opacity:0}}/>)}</div>);}

function WavePlayer({src}){const[playing,setP]=useState(false);const[progress,setPr]=useState(0);const[dur,setD]=useState(0);const a=useRef(null);const bars=26;const hs=useRef(Array.from({length:bars},()=>10+Math.random()*28)).current;useEffect(()=>{const au=a.current;if(!au)return;const u=()=>{setPr(au.currentTime/(au.duration||1));setD(au.duration||0)};const e=()=>{setP(false);setPr(0)};au.addEventListener("timeupdate",u);au.addEventListener("ended",e);au.addEventListener("loadedmetadata",()=>setD(au.duration));return()=>{au.removeEventListener("timeupdate",u);au.removeEventListener("ended",e)}},[]);const toggle=()=>{const au=a.current;if(!au)return;playing?au.pause():au.play();setP(!playing)};const seek=e=>{const r=e.currentTarget.getBoundingClientRect();if(a.current)a.current.currentTime=((e.clientX-r.left)/r.width)*a.current.duration};const fmt=s=>{if(!s)return"0:00";return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`};return(<div style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 16px",background:"rgba(201,123,139,0.06)",borderRadius:"18px",marginBottom:"14px",border:"1px solid rgba(201,123,139,0.1)"}}><audio ref={a} src={src} preload="metadata"/><button onClick={toggle} style={{width:"38px",height:"38px",borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#c97b8b,#b8a0d0)",color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",flexShrink:0,boxShadow:"0 2px 8px rgba(201,123,139,0.25)"}}>{playing?"⏸":"▶"}</button><div style={{flex:1}}><div onClick={seek} style={{display:"flex",alignItems:"center",gap:"1.5px",height:"34px",cursor:"pointer"}}>{hs.map((h,i)=><div key={i} style={{width:`${100/bars}%`,height:`${h}px`,background:i/bars<progress?"#c97b8b":"rgba(201,123,139,0.15)",borderRadius:"3px",transition:"background 0.1s,transform 0.15s",transform:playing&&i/bars<progress?"scaleY(1.12)":"scaleY(1)"}}/>)}</div><div style={{display:"flex",justifyContent:"space-between",marginTop:"2px"}}><span style={{fontSize:"10px",color:"#c4a8ae",fontFamily:S,fontWeight:600}}>{fmt(a.current?.currentTime)}</span><span style={{fontSize:"10px",color:"#c4a8ae",fontFamily:S,fontWeight:600}}>{fmt(dur)}</span></div></div></div>);}

function CalendarHeatmap({moments}){const today=new Date();const days=91;const cm={};moments.forEach(m=>{const d=new Date(m.created_at).toISOString().split("T")[0];cm[d]=(cm[d]||0)+1});const cells=[];for(let i=days-1;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const k=d.toISOString().split("T")[0];cells.push({date:k,count:cm[k]||0,label:d.toLocaleDateString("en-US",{month:"short",day:"numeric"})})}const clr=c=>c===0?"#f0e8e4":c<=2?"#fce4ec":c<=4?"#f48fb1":"#e91e63";return(<div style={{padding:"20px 24px"}}><div style={{fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",color:"#c4a8ae",fontFamily:S,fontWeight:700,marginBottom:"12px"}}>🌱 Growing every day</div><div style={{display:"flex",flexWrap:"wrap",gap:"3px"}}>{cells.map((c,i)=><div key={i} className="heatmap-cell-f" title={`${c.label}: ${c.count} moments`} style={{background:clr(c.count)}}/>)}</div><div style={{display:"flex",gap:"6px",marginTop:"8px",alignItems:"center"}}><span style={{fontSize:"10px",color:"#d0bfc3",fontFamily:S,fontWeight:600}}>Less</span>{[0,1,3,5].map(v=><div key={v} style={{width:"10px",height:"10px",borderRadius:"4px",background:clr(v)}}/>)}<span style={{fontSize:"10px",color:"#d0bfc3",fontFamily:S,fontWeight:600}}>More</span></div></div>);}

function GalleryView({moments,onImageClick}){const wm=moments.filter(m=>m.primary_media_path&&(m.primary_media_path.endsWith(".jpg")||m.primary_media_path.endsWith(".jpeg")||m.primary_media_path.endsWith(".png")||m.primary_media_path.endsWith(".mp4")));if(!wm.length)return<EmptyState type="gallery"/>;return(<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"6px",padding:"16px 0"}}>{wm.map(m=>{const u=`${MEDIA}/${m.primary_media_path}`;const isV=m.primary_media_path.endsWith(".mp4");return(<div key={m.id} className="gallery-item-f" onClick={()=>onImageClick({url:u,isVideo:isV,moment:m})}>{isV?(<VideoThumbnail src={u} style={{width:"100%",height:"100%"}}/>):(<ProgressiveImage src={u} style={{width:"100%",height:"100%",objectFit:"cover"}} />)}</div>)})}</div>);}

/* ---- #3 Milestones timeline ---- */
function MilestonesView({moments}){
  const ms=moments.filter(m=>m.type==="Milestone"||m.type==="First").sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  if(!ms.length)return<EmptyState type="empty"/>;
  const kidColors={Gabby:"#c97b8b",Madelyn:"#9b7fc4",Both:"#d4a030",Family:"#6aab7b"};
  return(<div className="view-crossfade" style={{position:"relative",paddingLeft:"40px"}}>
    <div style={{position:"absolute",left:"18px",top:0,bottom:0,width:"3px",background:"linear-gradient(to bottom,#c97b8b,#ddd4f0,#f0e4c8)",borderRadius:"2px"}}/>
    {ms.map((m,i)=>{const age=ageAt(m.kid,m.created_at);const clr=kidColors[m.kid]||"#c97b8b";const d=new Date(m.created_at);
      return(<div key={m.id} className="bloom" style={{animationDelay:`${i*0.06}s`,marginBottom:"28px",position:"relative"}}>
        <div style={{position:"absolute",left:"-34px",top:"8px",width:"28px",height:"28px",borderRadius:"50%",background:clr,border:"3px solid #faf8f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",zIndex:2,boxShadow:`0 2px 8px ${clr}40`}}>{m.type==="First"?"🎉":"🌟"}</div>
        <div style={{background:"white",borderRadius:"20px",padding:"20px 22px",border:`2px solid ${clr}20`,boxShadow:`0 2px 12px ${clr}10`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}><span style={{fontSize:"12px",fontFamily:S,fontWeight:700,color:clr,textTransform:"uppercase",letterSpacing:"1px"}}>{m.kid}</span>{age&&<span style={{fontSize:"11px",fontFamily:S,fontWeight:600,color:"#c4a8ae",background:"#f5eff0",borderRadius:"10px",padding:"2px 8px"}}>{age}</span>}</div>
            <span style={{fontSize:"11px",fontFamily:S,fontWeight:600,color:"#d0bfc3"}}>{d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
          </div>
          <div style={{fontSize:"18px",lineHeight:1.5,color:"#4a3a3f",fontWeight:500}}>{m.text}</div>
          <div style={{fontSize:"12px",fontFamily:S,fontWeight:600,color:A_CLR[m.author]||"#888",marginTop:"8px"}}>{m.author}</div>
        </div>
      </div>);})}
  </div>);
}

function EmptyState({type}){
  const configs={empty:{icon:"📖",title:"No moments yet",sub:"Send a photo or message to the Telegram bot to get started!",accent:"#c97b8b"},search:{icon:"🔍",title:"No memories match",sub:"Try a different search term",accent:"#b8a0d0"},ai:{icon:"🤖",title:"No matches found",sub:"Try asking differently, like 'when did Gabby first walk?'",accent:"#c97b8b"},fav:{icon:"⭐",title:"No favorites yet",sub:"Tap the star on any memory to save it here",accent:"#d4a030"},gallery:{icon:"📷",title:"No photos or videos yet",sub:"Send a photo to the bot and it'll show up here",accent:"#c97b8b"}};
  const c=configs[type]||configs.empty;
  return(<div style={{textAlign:"center",padding:"60px 20px"}} className="view-crossfade">
    <div className="empty-icon" style={{fontSize:"48px",marginBottom:"16px",display:"inline-block"}}>{c.icon}</div>
    <div className="empty-float" style={{display:"inline-block",marginBottom:"20px"}}><svg width="120" height="80" viewBox="0 0 120 80" fill="none"><rect x="10" y="20" width="40" height="50" rx="8" fill={c.accent} opacity="0.08" stroke={c.accent} strokeWidth="1.5" strokeOpacity="0.2"/><rect x="30" y="10" width="40" height="50" rx="8" fill={c.accent} opacity="0.12" stroke={c.accent} strokeWidth="1.5" strokeOpacity="0.25" transform="rotate(6 50 35)"/><rect x="50" y="18" width="40" height="50" rx="8" fill={c.accent} opacity="0.06" stroke={c.accent} strokeWidth="1.5" strokeOpacity="0.15" transform="rotate(-4 70 43)"/><circle cx="50" cy="35" r="8" fill={c.accent} opacity="0.15"/><path d="M20 55 L30 42 L40 48 L55 30 L70 50" stroke={c.accent} strokeWidth="1.5" strokeOpacity="0.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
    <div style={{fontSize:"18px",fontWeight:700,color:"#5c4a4f",fontFamily:S,marginBottom:"8px"}}>{c.title}</div>
    <div style={{fontSize:"14px",color:"#c4a8ae",fontFamily:S,fontWeight:500,maxWidth:"280px",margin:"0 auto",lineHeight:1.5}}>{c.sub}</div>
  </div>);
}

/* ---- Lightbox with pinch-zoom, swipe nav, audio support ---- */
function Lightbox({data,onClose,mediaList,onNavigate,toast}){
  const touchStart=useRef(null);const idx=mediaList?mediaList.findIndex(x=>x.url===data.url):-1;
  const hasPrev=idx>0;const hasNext=idx<mediaList.length-1;
  const goPrev=()=>{if(hasPrev){setZoom(1);setPan({x:0,y:0});onNavigate(mediaList[idx-1])}};
  const goNext=()=>{if(hasNext){setZoom(1);setPan({x:0,y:0});onNavigate(mediaList[idx+1])}};
  const[zoom,setZoom]=useState(1);const[pan,setPan]=useState({x:0,y:0});
  const pinchStart=useRef(null);const zoomStart=useRef(1);const panStart=useRef({x:0,y:0});const dragging=useRef(false);const dragOrigin=useRef({x:0,y:0});const imgRef=useRef(null);
  useEffect(()=>{setZoom(1);setPan({x:0,y:0})},[data.url]);
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();if(e.key==="ArrowLeft")goPrev();if(e.key==="ArrowRight")goNext()};window.addEventListener("keydown",h);document.body.style.overflow="hidden";return()=>{window.removeEventListener("keydown",h);document.body.style.overflow=""};},[onClose,idx]);
  const onWheel=e=>{e.stopPropagation();e.preventDefault();setZoom(z=>Math.min(5,Math.max(1,z-(e.deltaY*0.002))))};
  const getDist=ts=>Math.hypot(ts[0].clientX-ts[1].clientX,ts[0].clientY-ts[1].clientY);
  const onTouchStartL=e=>{if(e.touches.length===2){e.preventDefault();pinchStart.current=getDist(e.touches);zoomStart.current=zoom;touchStart.current=null}else if(e.touches.length===1&&zoom<=1){touchStart.current=e.touches[0].clientX;pinchStart.current=null}else if(e.touches.length===1&&zoom>1){dragging.current=true;dragOrigin.current={x:e.touches[0].clientX-pan.x,y:e.touches[0].clientY-pan.y};touchStart.current=null;pinchStart.current=null}};
  const onTouchMoveL=e=>{if(e.touches.length===2&&pinchStart.current!==null){e.preventDefault();const dist=getDist(e.touches);const newZoom=Math.min(5,Math.max(1,zoomStart.current*(dist/pinchStart.current)));setZoom(newZoom);if(newZoom<=1)setPan({x:0,y:0})}else if(e.touches.length===1&&dragging.current&&zoom>1){e.preventDefault();setPan({x:e.touches[0].clientX-dragOrigin.current.x,y:e.touches[0].clientY-dragOrigin.current.y})}};
  const onTouchEndL=e=>{if(pinchStart.current!==null){pinchStart.current=null;if(zoom<=1.05){setZoom(1);setPan({x:0,y:0})}return}if(dragging.current){dragging.current=false;return}if(touchStart.current!==null&&e.changedTouches.length>0){const diff=e.changedTouches[0].clientX-touchStart.current;touchStart.current=null;if(Math.abs(diff)>60){diff>0?goPrev():goNext()}}};
  const lastTap=useRef(0);const onDoubleTap=e=>{const now=Date.now();if(now-lastTap.current<300){e.stopPropagation();if(zoom>1){setZoom(1);setPan({x:0,y:0})}else setZoom(2.5)}lastTap.current=now};
  const onMouseDown=e=>{if(zoom>1){dragging.current=true;dragOrigin.current={x:e.clientX-pan.x,y:e.clientY-pan.y};e.preventDefault()}};
  const onMouseMove=e=>{if(dragging.current&&zoom>1)setPan({x:e.clientX-dragOrigin.current.x,y:e.clientY-dragOrigin.current.y})};
  const onMouseUp=()=>{dragging.current=false};
  const handleBackdropClick=e=>{if(zoom>1){setZoom(1);setPan({x:0,y:0})}else onClose()};

  const{url,isVideo,isAudio,moment:m}=data;
  const navBtn={position:"absolute",top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,0.12)",border:"none",color:"white",fontSize:"28px",width:"48px",height:"48px",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",transition:"background 0.2s,opacity 0.2s",zIndex:1001,fontFamily:"sans-serif"};
  const counter=mediaList&&mediaList.length>1?`${idx+1} / ${mediaList.length}`:null;
  const isZoomed=zoom>1;

  return(<div className="lightbox-f" onClick={handleBackdropClick} onTouchStart={onTouchStartL} onTouchMove={onTouchMoveL} onTouchEnd={onTouchEndL} style={{touchAction:"none"}}>
    <button onClick={e=>{e.stopPropagation();onClose()}} style={{position:"absolute",top:"16px",right:"16px",background:"rgba(255,255,255,0.15)",border:"none",color:"white",fontSize:"22px",width:"44px",height:"44px",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",backdropFilter:"blur(4px)",transition:"background 0.2s,opacity 0.2s",zIndex:1001,opacity:isZoomed?0.3:1}} onMouseEnter={e=>e.target.style.background="rgba(255,255,255,0.3)"} onMouseLeave={e=>e.target.style.background="rgba(255,255,255,0.15)"}>✕</button>
      {!isAudio&&!isZoomed&&<button onClick={e=>{e.stopPropagation();downloadMedia(url,toast)}} style={{position:"absolute",top:"16px",right:"72px",background:"rgba(255,255,255,0.15)",border:"none",color:"white",fontSize:"18px",width:"44px",height:"44px",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",backdropFilter:"blur(4px)",transition:"background 0.2s",zIndex:1001}} onMouseEnter={e=>e.target.style.background="rgba(255,255,255,0.3)"} onMouseLeave={e=>e.target.style.background="rgba(255,255,255,0.15)"} title="Download">💾</button>}
    {hasPrev&&!isZoomed&&<button onClick={e=>{e.stopPropagation();goPrev()}} style={{...navBtn,left:"12px"}} onMouseEnter={e=>e.target.style.background="rgba(255,255,255,0.25)"} onMouseLeave={e=>e.target.style.background="rgba(255,255,255,0.12)"}>‹</button>}
    {hasNext&&!isZoomed&&<button onClick={e=>{e.stopPropagation();goNext()}} style={{...navBtn,right:"12px"}} onMouseEnter={e=>e.target.style.background="rgba(255,255,255,0.25)"} onMouseLeave={e=>e.target.style.background="rgba(255,255,255,0.12)"}>›</button>}
    <div key={url} style={{animation:"scaleIn 0.25s ease-out"}} onWheel={!isVideo&&!isAudio?onWheel:undefined} onClick={e=>e.stopPropagation()}>
      {isAudio?(
        <div style={{background:"rgba(255,255,255,0.08)",borderRadius:"24px",padding:"32px 28px",minWidth:"320px",maxWidth:"400px",backdropFilter:"blur(12px)"}}>
          <div style={{fontSize:"48px",textAlign:"center",marginBottom:"16px"}}>🎙</div>
          <audio controls autoPlay src={url} style={{width:"100%",borderRadius:"12px",filter:"invert(1) hue-rotate(180deg)",opacity:0.9}} />
        </div>
      ):isVideo?(
        <video controls autoPlay playsInline style={{maxWidth:"92vw",maxHeight:"70vh",borderRadius:"20px"}}><source src={url} type="video/mp4"/></video>
      ):(
        <img ref={imgRef} src={url} alt="" onClick={onDoubleTap} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} draggable={false} style={{maxWidth:"92vw",maxHeight:"75vh",objectFit:"contain",borderRadius:"12px",cursor:isZoomed?"grab":"zoom-in",transform:`scale(${zoom}) translate(${pan.x/zoom}px,${pan.y/zoom}px)`,transition:dragging.current?"none":"transform 0.15s ease-out",userSelect:"none",WebkitUserDrag:"none"}}/>
      )}
    </div>
    {isZoomed&&<div style={{position:"absolute",bottom:"20px",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.5)",borderRadius:"16px",padding:"4px 14px",fontSize:"11px",fontFamily:S,fontWeight:700,color:"rgba(255,255,255,0.6)",backdropFilter:"blur(4px)",pointerEvents:"none"}}>{Math.round(zoom*100)}%</div>}
    {!isZoomed&&<div onClick={e=>e.stopPropagation()} style={{color:"white",marginTop:"16px",textAlign:"center",maxWidth:"480px"}}>
      {counter&&<div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",fontFamily:S,fontWeight:700,marginBottom:"6px",letterSpacing:"1px"}}>{counter}</div>}
      {m&&!(m.text.startsWith("[")&&m.text.endsWith("]"))&&(<><div style={{fontSize:"20px",lineHeight:1.5,fontFamily:S}}>"{m.text}"</div><div style={{fontSize:"12px",color:"rgba(255,255,255,0.5)",marginTop:"8px",fontFamily:S,fontWeight:600}}>{m.author} · {new Date(m.created_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div></>)}
    </div>}
  </div>);
}

/* ---- #6 Media carousel for clustered moments ---- */
function MediaCarousel({items,onImageClick,onEdit,toast}){
  const[idx,setIdx]=useState(0);
  const[editing,setEditing]=useState(false);
  const[editText,setEditText]=useState("");
  const touchX=useRef(null);
  const all=items.filter(m=>m.primary_media_path).map(m=>{const u=`${MEDIA}/${m.primary_media_path}`;const isV=m.primary_media_path?.endsWith(".mp4")||m.primary_media_path?.endsWith(".mov");const isI=m.primary_media_path?.endsWith(".jpg")||m.primary_media_path?.endsWith(".jpeg")||m.primary_media_path?.endsWith(".png")||m.primary_media_path?.endsWith(".webp");return{url:u,isVideo:isV,isImage:isI,moment:m}});
  if(!all.length)return null;
  const cur=all[idx];
  const curMoment=cur.moment;
  const curHide=curMoment.text.startsWith("[")&&curMoment.text.endsWith("]");
  const goPrev=(e)=>{if(e)e.stopPropagation();if(editing)return;if(idx>0)setIdx(idx-1)};
  const goNext=(e)=>{if(e)e.stopPropagation();if(editing)return;if(idx<all.length-1)setIdx(idx+1)};
  const onTouchStart=e=>{touchX.current=e.touches[0].clientX};
  const onTouchEnd=e=>{if(touchX.current===null||editing)return;const diff=e.changedTouches[0].clientX-touchX.current;touchX.current=null;if(Math.abs(diff)>50){diff>0?goPrev():goNext()}};
  const navBtn={position:"absolute",top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"none",color:"white",fontSize:"22px",width:"36px",height:"36px",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",transition:"background 0.2s",zIndex:3,fontFamily:"sans-serif",padding:0};

  const startEdit=()=>{setEditText(curMoment.text);setEditing(true)};
  const saveEdit=()=>{if(editText.trim()&&editText!==curMoment.text){onEdit(curMoment.id,editText.trim())}setEditing(false)};
  const cancelEdit=()=>{setEditText("");setEditing(false)};

  return(<div style={{marginBottom:"14px"}}>
    {/* Per-photo caption */}
    {!curHide&&(editing?(
      <div style={{marginBottom:"12px"}}>
        <textarea className="edit-area" value={editText} onChange={e=>setEditText(e.target.value)} autoFocus/>
        <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
          <button onClick={saveEdit} style={{padding:"6px 16px",borderRadius:"16px",border:"none",background:"#c97b8b",color:"white",fontSize:"13px",fontFamily:"'Source Sans 3',sans-serif",fontWeight:600,cursor:"pointer"}}>Save</button>
          <button onClick={cancelEdit} style={{padding:"6px 16px",borderRadius:"16px",border:"1.5px solid #ede5dc",background:"white",color:"#9b8a78",fontSize:"13px",fontFamily:"'Source Sans 3',sans-serif",fontWeight:600,cursor:"pointer"}}>Cancel</button>
        </div>
      </div>
    ):(
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px",marginBottom:"12px"}}>
        <div style={{fontSize:"17px",lineHeight:1.6,color:"#4a3a3f",flex:1}}>{`"${curMoment.text}"`}</div>
        {onEdit&&<button onClick={startEdit} title="Edit this caption" style={{background:"none",border:"none",cursor:"pointer",fontSize:"13px",padding:"4px",opacity:0.3,transition:"opacity 0.2s",flexShrink:0}} onMouseEnter={e=>e.target.style.opacity="0.7"} onMouseLeave={e=>e.target.style.opacity="0.3"}>✏️</button>}
      </div>
    ))}
    <div style={{borderRadius:"18px",overflow:"hidden",position:"relative"}} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="clickable-media" onClick={()=>onImageClick({url:cur.url,isVideo:cur.isVideo,moment:cur.moment})}>
        {cur.isVideo?<VideoThumbnail src={cur.url}/>:<ProgressiveImage src={cur.url} style={{width:"100%",borderRadius:"18px",maxHeight:"400px",objectFit:"cover"}}/>}
      </div>
      {all.length>1&&<div style={{position:"absolute",top:"10px",right:"10px",background:"rgba(0,0,0,0.5)",borderRadius:"12px",padding:"2px 10px",fontSize:"11px",fontFamily:"'Source Sans 3',sans-serif",fontWeight:700,color:"white",backdropFilter:"blur(4px)",pointerEvents:"none"}}>{idx+1}/{all.length}</div>}
      {all.length>1&&idx>0&&<button onClick={goPrev} style={{...navBtn,left:"10px"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.7)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.5)"}>‹</button>}
      {all.length>1&&idx<all.length-1&&<button onClick={goNext} style={{...navBtn,right:"10px"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.7)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.5)"}>›</button>}
    </div>
    {all.length>1&&<div style={{display:"flex",justifyContent:"center",gap:"6px",marginTop:"10px"}}>
      {all.map((_,i)=><button key={i} onClick={(e)=>{e.stopPropagation();setIdx(i)}} style={{width:i===idx?"20px":"8px",height:"8px",borderRadius:"4px",border:"none",background:i===idx?"#c97b8b":"#ede5dc",cursor:"pointer",transition:"all 0.2s",padding:0}}/>)}
    </div>}
  </div>);
}

/* ---- Manual group editor modal ---- */
function GroupEditModal({mode="edit",group=null,initialMomentIds=[],initialTitle="",moments=[],availableMoments=[],onClose,onSave,onDelete,onCaptionEdit,toast}){
  const byId=new Map(moments.map(m=>[m.id,m]));
  const initialIds=initialMomentIds.filter(id=>byId.has(id));
  const[title,setTitle]=useState(initialTitle||group?.title||defaultGroupTitle(initialIds.map(id=>byId.get(id))));
  const[order,setOrder]=useState(initialIds);
  const[coverId,setCoverId]=useState(group?.cover_moment_id||initialIds[0]||null);
  const[dragId,setDragId]=useState(null);
  const[showAdd,setShowAdd]=useState(false);
  const[previewUrl,setPreviewUrl]=useState(null);
  const[addIds,setAddIds]=useState([]);
  const ordered=order.map(id=>byId.get(id)).filter(Boolean);
  const cover=ordered.find(m=>m.id===coverId)||ordered[0]||null;
  const unused=availableMoments.filter(m=>isMediaMoment(m)&&!order.includes(m.id)).sort(sortDesc);

  const move=(id,dir)=>setOrder(prev=>{const i=prev.indexOf(id);const j=i+dir;if(i<0||j<0||j>=prev.length)return prev;const n=[...prev];[n[i],n[j]]=[n[j],n[i]];return n});
  const remove=id=>setOrder(prev=>{const n=prev.filter(x=>x!==id);if(coverId===id)setCoverId(n[0]||null);return n});
  const dropOn=targetId=>{if(!dragId||dragId===targetId)return;setOrder(prev=>{const n=prev.filter(id=>id!==dragId);const idx=n.indexOf(targetId);n.splice(idx,0,dragId);return n});setDragId(null)};
  const addSelected=()=>{setOrder(prev=>[...prev,...addIds.filter(id=>!prev.includes(id))]);if(!coverId&&addIds[0])setCoverId(addIds[0]);setAddIds([]);setShowAdd(false)};
  const editCaption=m=>{const next=window.prompt("Edit caption",m.text);if(next&&next.trim()&&next.trim()!==m.text)onCaptionEdit(m.id,next.trim())};
  const save=()=>{if(order.length<2){toast("Choose at least 2 photos for a group","📚");return}onSave({mode,group,title:title.trim()||defaultGroupTitle(ordered),coverId:coverId||order[0],momentIds:order})};

  return(<div style={{position:"fixed",inset:0,background:"rgba(92,74,79,0.55)",zIndex:1600,display:"flex",alignItems:"center",justifyContent:"center",padding:"18px",backdropFilter:"blur(6px)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fffdfb",borderRadius:"26px",width:"min(680px,100%)",maxHeight:"88vh",overflow:"auto",boxShadow:"0 18px 60px rgba(70,50,55,0.22)",border:"1.5px solid #f0e5e8"}}>
      <div style={{position:"sticky",top:0,background:"rgba(255,253,251,0.96)",backdropFilter:"blur(8px)",zIndex:2,padding:"22px 24px 14px",borderBottom:"1px solid #f5ede8",borderRadius:"26px 26px 0 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
          <div>
            <div style={{fontSize:"12px",letterSpacing:"2px",textTransform:"uppercase",fontFamily:S,fontWeight:800,color:"#c97b8b"}}>{mode==="create"?"Create Photo Group":"Edit Photo Group"}</div>
            <div style={{fontSize:"13px",fontFamily:S,fontWeight:600,color:"#c4a8ae",marginTop:"4px"}}>{ordered[0]?.kid||"Family"} · {ordered[0]?.author||gN()||"Family"} · {ordered.length} photos {ordered.length?`· ${new Date(ordered[0].created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`:""}</div>
          </div>
          <button onClick={onClose} style={{width:"38px",height:"38px",borderRadius:"50%",border:"none",background:"#f8f0f2",color:"#9b8a78",fontSize:"18px",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{marginTop:"16px"}}>
          <label style={{display:"block",fontSize:"11px",letterSpacing:"1.5px",textTransform:"uppercase",fontFamily:S,fontWeight:800,color:"#c4a8ae",marginBottom:"6px"}}>Title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Block tower night" style={{width:"100%",padding:"13px 16px",border:"2px solid #ede5dc",borderRadius:"18px",fontSize:"16px",fontFamily:S,color:"#4a3a3f",outline:"none",background:"white"}}/>
        </div>
      </div>

      <div style={{padding:"20px 24px 24px"}}>
        {cover&&<div style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",background:"#fff8f6",border:"1.5px solid #f0e5e8",borderRadius:"18px",marginBottom:"16px"}}>
          <div style={{width:"54px",height:"54px",borderRadius:"14px",overflow:"hidden",flexShrink:0}}>
            {isVideoPath(cover.primary_media_path)?<VideoThumbnail src={`${MEDIA}/${cover.primary_media_path}`} style={{width:"100%",height:"100%"}}/>:<ProgressiveImage src={`${MEDIA}/${cover.primary_media_path}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"12px",fontFamily:S,fontWeight:800,color:"#c97b8b"}}>Cover photo</div>
            <div style={{fontSize:"14px",fontFamily:S,fontWeight:600,color:"#6b5560",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{cover.text?.startsWith("[")?"Untitled photo":cover.text}</div>
          </div>
        </div>}

        <div style={{fontSize:"11px",letterSpacing:"1.5px",textTransform:"uppercase",fontFamily:S,fontWeight:800,color:"#c4a8ae",marginBottom:"10px"}}>Photos</div>
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {ordered.map((m,i)=>{const isCover=(coverId||ordered[0]?.id)===m.id;return(
            <div key={m.id} draggable onDragStart={()=>setDragId(m.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>dropOn(m.id)} onDragEnd={()=>setDragId(null)} style={{display:"grid",gridTemplateColumns:"38px 120px 1fr",gap:"12px",alignItems:"center",padding:"12px",borderRadius:"18px",background:dragId===m.id?"#fff5f7":"white",border:`1.5px solid ${isCover?"#c97b8b":"#f0e8e4"}`}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px"}}>
                <button title="Drag to reorder" style={{border:"none",background:"transparent",cursor:"grab",fontSize:"20px",color:"#c4a8ae",lineHeight:1,padding:"2px"}}>☰</button>
                <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                  <button onClick={()=>move(m.id,-1)} disabled={i===0} style={{border:"none",background:"#f8f0f2",color:i===0?"#ddd":"#9b8a78",borderRadius:"8px",width:"24px",height:"22px",fontSize:"12px",fontWeight:700,cursor:i===0?"default":"pointer"}}>↑</button>
                  <button onClick={()=>move(m.id,1)} disabled={i===ordered.length-1} style={{border:"none",background:"#f8f0f2",color:i===ordered.length-1?"#ddd":"#9b8a78",borderRadius:"8px",width:"24px",height:"22px",fontSize:"12px",fontWeight:700,cursor:i===ordered.length-1?"default":"pointer"}}>↓</button>
                </div>
              </div>
              <div onClick={()=>setPreviewUrl(`${MEDIA}/${m.primary_media_path}`)} style={{width:"120px",height:"120px",borderRadius:"14px",overflow:"hidden",background:"#f5eff0",cursor:"zoom-in",position:"relative"}}>
                {isVideoPath(m.primary_media_path)?<VideoThumbnail src={`${MEDIA}/${m.primary_media_path}`} style={{width:"100%",height:"100%"}}/>:<ProgressiveImage src={`${MEDIA}/${m.primary_media_path}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
                <div style={{position:"absolute",bottom:"6px",right:"6px",background:"rgba(0,0,0,0.5)",color:"white",borderRadius:"8px",padding:"2px 8px",fontSize:"10px",fontFamily:S,fontWeight:700,backdropFilter:"blur(4px)"}}>Tap to enlarge</div>
              </div>
              <div style={{minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
                  <span style={{fontSize:"13px",fontFamily:S,fontWeight:800,color:"#9b8a78"}}>{i+1}</span>
                  {isCover&&<span style={{fontSize:"10px",fontFamily:S,fontWeight:800,color:"white",background:"#c97b8b",borderRadius:"12px",padding:"2px 8px"}}>Cover</span>}
                  <span style={{marginLeft:"auto",fontSize:"11px",fontFamily:S,fontWeight:700,color:"#d0bfc3"}}>{new Date(m.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span>
                </div>
                <div style={{fontSize:"14px",lineHeight:1.4,color:"#4a3a3f",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{m.text?.startsWith("[")?"Untitled photo":m.text}</div>
                <div style={{display:"flex",gap:"10px",flexWrap:"wrap",marginTop:"10px"}}>
                  {!isCover&&<button onClick={()=>setCoverId(m.id)} style={{border:"none",background:"transparent",color:"#c97b8b",fontSize:"12px",fontFamily:S,fontWeight:700,cursor:"pointer",padding:0}}>Set cover</button>}
                  <button onClick={()=>editCaption(m)} style={{border:"none",background:"transparent",color:"#9b8a78",fontSize:"12px",fontFamily:S,fontWeight:700,cursor:"pointer",padding:0}}>Edit caption</button>
                  <button onClick={()=>remove(m.id)} style={{border:"none",background:"transparent",color:"#c97b8b",fontSize:"12px",fontFamily:S,fontWeight:700,cursor:"pointer"}}>Remove</button>
                </div>
              </div>
            </div>
          )})}
        </div>

        <div style={{marginTop:"16px",display:"flex",gap:"10px",flexWrap:"wrap"}}>
          <button onClick={()=>setShowAdd(!showAdd)} style={{padding:"9px 16px",borderRadius:"18px",border:"1.5px solid #ede5dc",background:"white",color:"#9b8a78",fontSize:"13px",fontFamily:S,fontWeight:700,cursor:"pointer"}}>{showAdd?"Close add photos":"Add more photos"}</button>
          {mode==="edit"&&<button onClick={()=>onDelete(group)} style={{padding:"9px 16px",borderRadius:"18px",border:"1.5px solid rgba(201,123,139,0.25)",background:"#fff8f6",color:"#c97b8b",fontSize:"13px",fontFamily:S,fontWeight:700,cursor:"pointer"}}>Ungroup all</button>}
        </div>

        {showAdd&&<div style={{marginTop:"14px",padding:"14px",borderRadius:"18px",background:"#fef8f5",border:"1.5px solid #f0e8e4"}}>
          <div style={{fontSize:"12px",fontFamily:S,fontWeight:800,color:"#9b8a78",marginBottom:"10px"}}>{unused.length?`Add photos to this group`:"No available ungrouped photos"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:"8px",maxHeight:"320px",overflow:"auto"}}>
            {unused.map(m=>{const on=addIds.includes(m.id);return(
              <button key={m.id} onClick={()=>setAddIds(ids=>on?ids.filter(id=>id!==m.id):[...ids,m.id])} style={{border:`2px solid ${on?"#c97b8b":"transparent"}`,borderRadius:"14px",padding:0,overflow:"hidden",background:"white",height:"110px",position:"relative",cursor:"pointer"}}>
                {isVideoPath(m.primary_media_path)?<VideoThumbnail src={`${MEDIA}/${m.primary_media_path}`} style={{width:"100%",height:"100%"}}/>:<ProgressiveImage src={`${MEDIA}/${m.primary_media_path}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
                {on&&<span style={{position:"absolute",top:"6px",right:"6px",width:"22px",height:"22px",borderRadius:"50%",background:"#c97b8b",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:800}}>✓</span>}
              </button>
            )})}
          </div>
          {addIds.length>0&&<button onClick={addSelected} style={{marginTop:"12px",width:"100%",padding:"10px 16px",borderRadius:"18px",border:"none",background:"#c97b8b",color:"white",fontSize:"13px",fontFamily:S,fontWeight:800,cursor:"pointer"}}>Add {addIds.length} selected</button>}
        </div>}

        <div style={{position:"sticky",bottom:"0",background:"linear-gradient(to top,#fffdfb 75%,rgba(255,253,251,0))",paddingTop:"22px",marginTop:"18px",display:"flex",gap:"10px",justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"11px 18px",borderRadius:"20px",border:"1.5px solid #ede5dc",background:"white",color:"#9b8a78",fontSize:"14px",fontFamily:S,fontWeight:700,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} style={{padding:"11px 20px",borderRadius:"20px",border:"none",background:"#c97b8b",color:"white",fontSize:"14px",fontFamily:S,fontWeight:800,cursor:"pointer",boxShadow:"0 5px 16px rgba(201,123,139,0.22)"}}>{mode==="create"?"Create group":"Save order"}</button>
        </div>
      </div>
    </div>
    {previewUrl&&<div onClick={()=>setPreviewUrl(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1700,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",cursor:"zoom-out",backdropFilter:"blur(8px)"}}>
      <button onClick={e=>{e.stopPropagation();setPreviewUrl(null)}} style={{position:"absolute",top:"16px",right:"16px",background:"rgba(255,255,255,0.15)",border:"none",color:"white",fontSize:"22px",width:"44px",height:"44px",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",backdropFilter:"blur(4px)"}}>✕</button>
      {previewUrl.endsWith(".mp4")||previewUrl.endsWith(".mov")?<video controls autoPlay playsInline src={previewUrl} style={{maxWidth:"92vw",maxHeight:"85vh",borderRadius:"16px"}}/>:<img src={previewUrl} alt="" style={{maxWidth:"92vw",maxHeight:"85vh",objectFit:"contain",borderRadius:"12px"}}/>}
    </div>}
  </div>);
}

/* ---- Saved manual group card ---- */
function GroupCard({group,moments,onImageClick,onEditGroup,onEditCaption,toast}){
  const ordered=[...moments].sort((a,b)=>(a.__position??0)-(b.__position??0));
  const cover=ordered.find(m=>m.id===group.cover_moment_id)||ordered[0];
  const wash=KID_WASH[cover?.kid]||KID_WASH.Family;
  const title=group.title||defaultGroupTitle(ordered);
  return(<div className="petal-card" style={{background:wash.bg,border:`1.5px solid ${wash.border}`}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",marginBottom:"12px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:0}}>
        <span style={{fontSize:"22px"}}>📚</span>
        <div style={{minWidth:0}}>
          <div style={{fontSize:"15px",fontFamily:S,fontWeight:800,color:"#6b5560",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{cover?.kid||"Family"} Photo Group</div>
          <div style={{fontSize:"12px",fontFamily:S,fontWeight:700,color:"#c4a8ae"}}>{ordered.length} photos · {fmtRange(ordered)}</div>
        </div>
      </div>
      <button onClick={()=>onEditGroup(group)} style={{padding:"7px 12px",borderRadius:"16px",border:"1.5px solid #ede5dc",background:"white",color:"#9b8a78",fontSize:"12px",fontFamily:S,fontWeight:800,cursor:"pointer",flexShrink:0}}>Edit group</button>
    </div>
    <div style={{fontFamily:SERIF,fontSize:"22px",lineHeight:1.3,color:"#3d2a30",fontWeight:500,marginBottom:"14px"}}>{title}</div>
    <MediaCarousel items={ordered} onImageClick={onImageClick} onEdit={onEditCaption} toast={toast}/>
    <div style={{display:"flex",gap:"6px",overflowX:"auto",paddingBottom:"2px",marginTop:"-2px"}}>
      {ordered.slice(0,8).map((m)=><div key={m.id} style={{width:"42px",height:"42px",borderRadius:"12px",overflow:"hidden",border:m.id===cover?.id?"2px solid #c97b8b":"2px solid rgba(255,255,255,0.7)",flexShrink:0,background:"#f5eff0"}}>
        {isVideoPath(m.primary_media_path)?<VideoThumbnail src={`${MEDIA}/${m.primary_media_path}`} style={{width:"100%",height:"100%"}}/>:<ProgressiveImage src={`${MEDIA}/${m.primary_media_path}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
      </div>)}
      {ordered.length>8&&<div style={{width:"42px",height:"42px",borderRadius:"12px",background:"rgba(255,255,255,0.7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontFamily:S,fontWeight:800,color:"#9b8a78",flexShrink:0}}>+{ordered.length-8}</div>}
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",marginTop:"14px"}}>
      <span style={{fontSize:"13px",fontFamily:S,fontWeight:800,color:A_CLR[cover?.author]||"#888"}}>{cover?.author||"Family"}</span>
      <span style={{fontSize:"11px",fontFamily:S,fontWeight:700,color:"#d0bfc3"}}>Manual group</span>
    </div>
  </div>);
}

/* ---- Soft auto-suggestion card ---- */
function SuggestionCard({suggestion,onReview,onDismiss}){
  const ms=suggestion.moments||[];
  if(ms.length<2)return null;
  const first=ms[0];
  const wash=KID_WASH[first.kid]||KID_WASH.Family;
  return(<div className="petal-card" style={{background:"linear-gradient(135deg,#fffdf7 0%,#fff8ec 100%)",border:"1.5px solid #f0e4c8"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",marginBottom:"12px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
        <span style={{fontSize:"22px"}}>✨</span>
        <div>
          <div style={{fontSize:"15px",fontFamily:S,fontWeight:800,color:"#6b5560"}}>Suggested photo group</div>
          <div style={{fontSize:"12px",fontFamily:S,fontWeight:700,color:"#c4a8ae"}}>{ms.length} photos from {first.author} · {fmtRange(ms)}</div>
        </div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(ms.length,4)},1fr)`,gap:"6px",marginBottom:"14px"}}>
      {ms.slice(0,4).map(m=><div key={m.id} style={{height:"76px",borderRadius:"14px",overflow:"hidden",background:"#f5eff0",border:`1.5px solid ${wash.border}`}}>
        {isVideoPath(m.primary_media_path)?<VideoThumbnail src={`${MEDIA}/${m.primary_media_path}`} style={{width:"100%",height:"100%"}}/>:<ProgressiveImage src={`${MEDIA}/${m.primary_media_path}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
      </div>)}
    </div>
    <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
      <button onClick={()=>onReview(suggestion)} style={{padding:"9px 16px",borderRadius:"18px",border:"none",background:"#c97b8b",color:"white",fontSize:"13px",fontFamily:S,fontWeight:800,cursor:"pointer"}}>Review & group</button>
      <button onClick={()=>onDismiss(suggestion)} style={{padding:"9px 16px",borderRadius:"18px",border:"1.5px solid #ede5dc",background:"white",color:"#9b8a78",fontSize:"13px",fontFamily:S,fontWeight:800,cursor:"pointer"}}>Keep separate</button>
    </div>
  </div>);
}

function SelectionBar({count,onGroup,onClear,onCancel}){
  return(<div style={{position:"sticky",top:"0",zIndex:50,background:"rgba(255,253,251,0.96)",backdropFilter:"blur(8px)",borderBottom:"1px solid #f5ede8",padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{width:"min(640px,100%)",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
      <span style={{fontSize:"13px",fontFamily:S,fontWeight:800,color:"#6b5560",marginRight:"auto"}}>{count} selected</span>
      <button onClick={onGroup} disabled={count<2} style={{padding:"8px 14px",borderRadius:"18px",border:"none",background:count>=2?"#c97b8b":"#ede5dc",color:count>=2?"white":"#c4a8ae",fontSize:"13px",fontFamily:S,fontWeight:800,cursor:count>=2?"pointer":"default"}}>Group selected</button>
      <button onClick={onClear} style={{padding:"8px 14px",borderRadius:"18px",border:"1.5px solid #ede5dc",background:"white",color:"#9b8a78",fontSize:"13px",fontFamily:S,fontWeight:800,cursor:"pointer"}}>Clear</button>
      <button onClick={onCancel} style={{padding:"8px 14px",borderRadius:"18px",border:"1.5px solid #ede5dc",background:"white",color:"#9b8a78",fontSize:"13px",fontFamily:S,fontWeight:800,cursor:"pointer"}}>Cancel</button>
    </div>
  </div>);
}

/* ---- Main App ---- */
export default function App(){
  const[moments,setM]=useState([]);const[reactions,setRx]=useState([]);const[comments,setCm]=useState([]);const[loading,setL]=useState(true);
  const[groups,setGroups]=useState([]);const[groupItems,setGroupItems]=useState([]);const[dismissals,setDismissals]=useState([]);
  const[selectMode,setSelectMode]=useState(false);const[selectedIds,setSelectedIds]=useState([]);
  const[groupModal,setGroupModal]=useState(null);
  const[typeF,setTF]=useState("all");const[kidF,setKF]=useState("all");
  const[search,setSe]=useState("");const[aiMode,setAi]=useState(false);const[aiR,setAiR]=useState(null);const[aiL,setAiL]=useState(false);
  const[view,setV]=useState("timeline");const[favs,setFavs]=useState(()=>{try{return JSON.parse(sessionStorage.getItem("faves")||"[]")}catch{return[]}});
  const[showFav,setSF]=useState(false);const[selMo,setSelMo]=useState("all");const sTimer=useRef(null);
  const[lightbox,setLightbox]=useState(null);
  const{toasts,show:toast}=useToast();
  const[visibleCount,setVC]=useState(20);const sentinelRef=useRef(null);

  useEffect(()=>{const el=sentinelRef.current;if(!el)return;const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting)setVC(v=>v+15)},{rootMargin:"200px"});obs.observe(el);return()=>obs.disconnect()},[loading,view]);
  useEffect(()=>{setVC(20)},[typeF,kidF,search,aiR,showFav,selMo,view,groups.length,groupItems.length,dismissals.length]);

  const fetchM=()=>fetch(`${SB}/rest/v1/moments?order=created_at.desc&limit=500`,{headers:sbH}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setM(d)}).catch(console.error);
  const fetchR=()=>fetch(`${SB}/rest/v1/reactions?order=created_at.asc`,{headers:sbH}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setRx(d)}).catch(console.error);
  const fetchC=()=>fetch(`${SB}/rest/v1/comments?order=created_at.asc`,{headers:sbH}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setCm(d)}).catch(console.error);
  const fetchG=()=>fetch(`${SB}/rest/v1/moment_groups?order=created_at.desc`,{headers:sbH}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setGroups(d)}).catch(()=>setGroups([]));
  const fetchGI=()=>fetch(`${SB}/rest/v1/moment_group_items?order=position.asc`,{headers:sbH}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setGroupItems(d)}).catch(()=>setGroupItems([]));
  const fetchD=()=>fetch(`${SB}/rest/v1/moment_group_suggestion_dismissals?select=*`,{headers:sbH}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setDismissals(d)}).catch(()=>setDismissals([]));
  const refreshGroups=()=>Promise.all([fetchG(),fetchGI(),fetchD()]);
  useEffect(()=>{Promise.all([fetchM(),fetchR(),fetchC(),fetchG(),fetchGI(),fetchD()]).finally(()=>setL(false))},[]);
  const toggleFav=id=>{const n=favs.includes(id)?favs.filter(f=>f!==id):[...favs,id];setFavs(n);try{sessionStorage.setItem("faves",JSON.stringify(n))}catch{};const added=!favs.includes(id);toast(added?"Saved to favorites":"Removed from favorites",added?"⭐":"💫")};
  const doAi=useCallback(async q=>{if(!q.trim()){setAiR(null);return}setAiL(true);try{const r=await fetch("/api/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:q,moments:moments.map(m=>({id:m.id,kid:m.kid,type:m.type,text:m.text,author:m.author,created_at:m.created_at}))})});const d=await r.json();setAiR(d.ids||[])}catch{setAiR(null)}setAiL(false)},[moments]);
  const handleSearch=v=>{setSe(v);if(aiMode){clearTimeout(sTimer.current);sTimer.current=setTimeout(()=>doAi(v),800)}};

  // #5 Edit support
  const updateMoment=async(id,text)=>{try{await sbPatch(`moments?id=eq.${id}`,{text});toast("Updated!","✏️");fetchM()}catch{toast("Couldn't save","❌")}};

  const filtered=moments.filter(m=>{if(typeF!=="all"&&m.type!==typeF)return false;if(kidF!=="all"&&m.kid!==kidF)return false;if(showFav&&!favs.includes(m.id))return false;if(selMo!=="all"&&new Date(m.created_at).toISOString().substring(0,7)!==selMo)return false;if(aiMode&&aiR)return aiR.includes(m.id);if(!aiMode&&search.trim()){const q=search.toLowerCase();if(!`${m.text} ${m.author} ${m.kid} ${m.type} ${(m.tags||[]).join(" ")}`.toLowerCase().includes(q))return false}return true});

  const types=[...new Set(moments.map(m=>m.type))];const kids=[...new Set(moments.map(m=>m.kid))];
  const months=[...new Set(moments.map(m=>new Date(m.created_at).toISOString().substring(0,7)))].sort().reverse();
  const stats={total:moments.length,byKid:moments.reduce((a,m)=>({...a,[m.kid]:(a[m.kid]||0)+1}),{}),byAuthor:moments.reduce((a,m)=>({...a,[m.author]:(a[m.author]||0)+1}),{}),withMedia:moments.filter(m=>m.primary_media_path).length};
  const today=new Date();const otd=moments.filter(m=>{const d=new Date(m.created_at);return d.getMonth()===today.getMonth()&&d.getDate()===today.getDate()&&d.getFullYear()<today.getFullYear()});
  const fmtMo=m=>{const[y,mo]=m.split("-");return new Date(y,mo-1).toLocaleDateString("en-US",{month:"long",year:"numeric"})};const getRx=id=>reactions.filter(r=>r.moment_id===id);const getCm=id=>comments.filter(c=>c.moment_id===id);
  const dismissedKeys=new Set(dismissals.map(d=>d.suggestion_key));
  const timelineEntities=buildTimelineEntities({moments,filtered,momentGroups:groups,groupItems,dismissedKeys});
  const visibleEntities=timelineEntities.slice(0,visibleCount);
  const grouped=groupByDate(visibleEntities);
  const hasMore=visibleCount<timelineEntities.length;
  const groupedMomentIds=new Set(groupItems.map(i=>i.moment_id));
  const availableUngrouped=moments.filter(m=>isMediaMoment(m)&&!groupedMomentIds.has(m.id));

  const toggleSelected=id=>setSelectedIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);
  const clearSelection=()=>setSelectedIds([]);
  const cancelSelection=()=>{setSelectMode(false);setSelectedIds([])};
  const openCreateGroup=(ids,title="")=>{
    const clean=[...new Set(ids)].map(id=>moments.find(m=>m.id===id)).filter(isMediaMoment).sort(sortAsc);
    if(clean.length<2){toast("Choose at least 2 photos","📚");return}
    setGroupModal({mode:"create",initialMomentIds:clean.map(m=>m.id),initialTitle:title||defaultGroupTitle(clean)});
  };
  const openEditGroup=group=>{
    const ids=groupItems.filter(i=>i.group_id===group.id).sort((a,b)=>(a.position??0)-(b.position??0)).map(i=>i.moment_id);
    setGroupModal({mode:"edit",group,initialMomentIds:ids,initialTitle:group.title||""});
  };

  const saveGroup=async({mode,group,title,coverId,momentIds})=>{
    try{
      if(mode==="create"){
        const createdBy=gN()||moments.find(m=>m.id===momentIds[0])?.author||"Family";
        const gr=await sbPost("moment_groups",{title,cover_moment_id:coverId,created_by:createdBy});
        if(!gr.ok)throw new Error(await gr.text());
        const gd=await gr.json();const newGroup=gd?.[0];
        if(!newGroup?.id)throw new Error("Group was not returned");
        const rows=momentIds.map((id,i)=>({group_id:newGroup.id,moment_id:id,position:i}));
        const ir=await sbPost("moment_group_items",rows);
        if(!ir.ok)throw new Error(await ir.text());
        toast("Photo group created","📚");
      }else{
        const pr=await sbPatch(`moment_groups?id=eq.${group.id}`,{title,cover_moment_id:coverId,updated_at:new Date().toISOString()});
        if(!pr.ok)throw new Error(await pr.text());
        const dr=await sbDel(`moment_group_items?group_id=eq.${group.id}`);
        if(!dr.ok)throw new Error(await dr.text());
        const rows=momentIds.map((id,i)=>({group_id:group.id,moment_id:id,position:i}));
        const ir=await sbPost("moment_group_items",rows);
        if(!ir.ok)throw new Error(await ir.text());
        toast("Group saved","✅");
      }
      setGroupModal(null);cancelSelection();await refreshGroups();
    }catch(e){console.error(e);toast("Couldn't save group","❌")}
  };

  const deleteGroup=async(group)=>{
    if(!group?.id)return;
    const ok=window.confirm("Ungroup all photos? This will not delete any photos.");
    if(!ok)return;
    try{const r=await sbDel(`moment_groups?id=eq.${group.id}`);if(!r.ok)throw new Error(await r.text());toast("Photos ungrouped","📚");setGroupModal(null);await refreshGroups()}catch(e){console.error(e);toast("Couldn't ungroup","❌")}
  };

  const dismissSuggestion=async(suggestion)=>{
    try{
      const r=await sbPost("moment_group_suggestion_dismissals",{suggestion_key:suggestion.key,dismissed_by:gN()||null});
      if(!r.ok&&r.status!==409)throw new Error(await r.text());
      toast("Kept separate","👌");fetchD();
    }catch(e){console.error(e);toast("Couldn't dismiss","❌")}
  };

  // #4 Include audio in mediaList for lightbox swipe
  const mediaList=filtered.filter(m=>m.primary_media_path).map(m=>{const u=`${MEDIA}/${m.primary_media_path}`;const isV=m.primary_media_path?.endsWith(".mp4")||m.primary_media_path?.endsWith(".mov");const isA=m.primary_media_path?.endsWith(".ogg")||m.primary_media_path?.endsWith(".mp3")||m.primary_media_path?.endsWith(".oga");return{url:u,isVideo:isV,isAudio:isA,moment:m}});
  const openLightbox=data=>setLightbox(data);

  return(
    <div style={{minHeight:"100vh",background:"#faf8f5",fontFamily:"'Source Sans 3',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}body{background:#faf8f5;-webkit-font-smoothing:antialiased}
        @keyframes bloomIn{from{opacity:0;transform:scale(0.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        @keyframes confettiFall{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(400px) rotate(720deg)}}
        @keyframes heartPop{0%{transform:scale(1)}25%{transform:scale(1.4)}50%{transform:scale(0.9)}100%{transform:scale(1)}}
        @keyframes pickerIn{from{opacity:0;transform:translateY(6px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes toastIn{from{opacity:0;transform:translateY(16px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes emptyBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes emptyFloat{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
        @keyframes dotPulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
        .bloom{animation:bloomIn 0.5s ease-out forwards;opacity:0}
        .heart-pop{animation:heartPop 0.3s ease-out}
        .toast-in{animation:toastIn 0.25s ease-out}
        .empty-icon{animation:emptyBounce 2s ease-in-out infinite}
        .empty-float{animation:emptyFloat 3s ease-in-out infinite}
        .shimmer-overlay{overflow:hidden}.shimmer-overlay::after{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.4) 50%,transparent 100%);animation:shimmer 1.8s ease-in-out infinite}
        .petal-card{border-radius:14px;padding:22px;position:relative;overflow:hidden;transition:transform 0.3s,box-shadow 0.3s;box-shadow:0 1px 2px rgba(0,0,0,0.02)}.petal-card:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(0,0,0,0.04)}
        .petal-btn{padding:8px 18px;border-radius:24px;cursor:pointer;font-size:13px;font-family:${S};font-weight:600;border:2px solid #ede5dc;background:white;color:#9b8a78;transition:all 0.2s}.petal-btn:hover{border-color:#d4bfb0;color:#6b5d50}.petal-btn.on{border-color:#c97b8b;background:#fff5f7;color:#c97b8b}
        .view-btn{width:38px;height:38px;border-radius:14px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;border:2px solid #ede5dc;background:white}.view-btn:hover{border-color:#d4bfb0;background:#fef8f5}.view-btn.on{border-color:#c97b8b;background:#fff5f7}
        .search-f{width:100%;padding:14px 18px 14px 44px;border:2px solid #ede5dc;border-radius:28px;font-size:16px;font-family:'Source Sans 3',sans-serif;background:white;outline:none;color:#5c4a4f;transition:border-color 0.2s,box-shadow 0.2s}.search-f:focus{border-color:#d4bfb0;box-shadow:0 0 0 4px rgba(201,123,139,0.06)}
        .tag-f{font-size:10px;font-family:${S};font-weight:600;padding:3px 10px;border-radius:12px;background:rgba(255,255,255,0.6);color:#b8a0a5}
        .popup-f{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);background:white;border-radius:18px;padding:8px 10px;box-shadow:0 8px 28px rgba(0,0,0,0.1);display:flex;gap:2px;z-index:20;border:1px solid #f0e5e8;animation:pickerIn 0.2s ease-out}.popup-f::after{content:'';position:absolute;bottom:-5px;left:50%;transform:translateX(-50%) rotate(45deg);width:10px;height:10px;background:white;border-right:1px solid #f0e5e8;border-bottom:1px solid #f0e5e8}
        .emoji-opt-f{width:38px;height:38px;border:none;background:transparent;border-radius:10px;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;transition:background 0.1s,transform 0.1s}.emoji-opt-f:hover{background:#fff5f7;transform:scale(1.12)}.emoji-opt-f:active{transform:scale(0.95)}
        .name-opt{padding:8px 14px;border:none;background:transparent;border-radius:10px;cursor:pointer;font-size:13px;font-family:${S};font-weight:600;color:#6b5560;transition:background 0.1s;white-space:nowrap}.name-opt:hover{background:#fff5f7}
        .heart-btn{background:none;border:none;cursor:pointer;font-size:20px;padding:2px;transition:transform 0.15s,opacity 0.2s;user-select:none;-webkit-tap-highlight-color:transparent}
        .gallery-item-f{aspect-ratio:1;border-radius:16px;overflow:hidden;cursor:pointer;position:relative;background:#f5eff0;transition:transform 0.2s,box-shadow 0.2s}.gallery-item-f:hover{transform:scale(1.03);box-shadow:0 6px 20px rgba(0,0,0,0.08)}.gallery-item-f img,.gallery-item-f video{width:100%;height:100%;object-fit:cover}
        .lightbox-f{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(92,74,79,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px;cursor:pointer;animation:fadeIn 0.2s;backdrop-filter:blur(8px)}
        .heatmap-cell-f{width:13px;height:13px;border-radius:4px;cursor:pointer;transition:transform 0.1s}.heatmap-cell-f:hover{transform:scale(1.4)}
        .clickable-media{cursor:zoom-in;transition:transform 0.2s,box-shadow 0.2s}.clickable-media:hover{transform:scale(1.02);box-shadow:0 4px 16px rgba(0,0,0,0.1)}
        .sticky-date{position:sticky;top:0;z-index:10;padding:10px 0 10px 0;margin:-10px 0 8px -32px;background:#faf8f5}
        .sticky-date::after{content:'';position:absolute;bottom:0;left:32px;right:0;height:1px;background:linear-gradient(to right,rgba(201,123,139,0.15),transparent 80%)}
        .view-crossfade{animation:fadeIn 0.3s ease-out}
        .edit-area{width:100%;border:2px solid #c97b8b;border-radius:14px;padding:12px;font-size:16px;font-family:'Source Sans 3',sans-serif;background:#fff8f6;outline:none;resize:vertical;min-height:60px;color:#4a3a3f;line-height:1.5}
      `}</style>

      <div style={{padding:"56px 24px 32px",textAlign:"center"}}>
        <div style={{fontSize:"11px",fontFamily:S,fontWeight:500,letterSpacing:"3px",textTransform:"uppercase",color:"#b08a94",marginBottom:"14px"}}>Est. 2024 &amp; 2026</div>
        <h1 style={{fontFamily:SERIF,fontSize:"52px",fontWeight:400,color:"#3d2a30",letterSpacing:"-0.5px",lineHeight:1.05,marginBottom:"2px"}}>Gabby &amp; Maddy</h1>
        <div style={{fontFamily:SERIF,fontSize:"52px",fontWeight:400,fontStyle:"italic",color:"#3d2a30",letterSpacing:"-0.5px",lineHeight:1.05}}>Memories</div>
        <div style={{width:"40px",height:"1px",background:"#d4a5b0",margin:"22px auto"}}/>
        <p style={{fontSize:"13px",color:"#a68a90",fontFamily:S,fontWeight:500,letterSpacing:"0.3px"}}>{stats.total} moments · {Object.keys(stats.byAuthor).length} voices</p>
        <div style={{display:"flex",justifyContent:"center",gap:"6px",marginTop:"22px",flexWrap:"wrap",fontFamily:S}}>
          {Object.entries(stats.byKid).map(([k,n])=><div key={k} style={{borderRadius:"14px",padding:"4px 12px",fontSize:"11px",fontWeight:500,letterSpacing:"0.5px",border:"0.5px solid #e8dfd6",color:"#7d6b62"}}>{k}: {n}</div>)}
          {Object.entries(stats.byAuthor).map(([a,n])=><div key={a} style={{borderRadius:"14px",padding:"4px 12px",fontSize:"11px",fontWeight:500,letterSpacing:"0.5px",border:"0.5px solid #e8dfd6",color:A_CLR[a]||"#7d6b62"}}>{a}: {n}</div>)}
        </div>
      </div>

      <div style={{background:"white",padding:"14px 24px",borderBottom:"1px solid #f5ede8",display:"flex",gap:"8px",alignItems:"center"}}>
        <div style={{position:"relative",flex:1}}>
          <input className="search-f" type="text" placeholder={aiMode?"Ask anything: 'when did Gabby first sing?'":"Find a memory..."} value={search} onChange={e=>handleSearch(e.target.value)} style={aiMode?{borderColor:"#c97b8b",background:"#fff8f6"}:{}}/>
          <span style={{position:"absolute",left:"16px",top:"50%",transform:"translateY(-50%)",fontSize:"16px",opacity:0.35}}>{aiMode?"🤖":"🔍"}</span>
          {aiL&&<span style={{position:"absolute",right:"16px",top:"50%",transform:"translateY(-50%)",fontSize:"12px",fontFamily:S,fontWeight:700,color:"#c97b8b"}}>thinking...</span>}
        </div>
        <button title="AI Search" className={`view-btn ${aiMode?"on":""}`} onClick={()=>{setAi(!aiMode);setAiR(null);setSe("")}}>🤖</button>
        <button title="Timeline" className={`view-btn ${view==="timeline"?"on":""}`} onClick={()=>setV("timeline")}>📋</button>
        <button title="Gallery" className={`view-btn ${view==="gallery"?"on":""}`} onClick={()=>setV("gallery")}>🖼</button>
        <button title="Milestones" className={`view-btn ${view==="milestones"?"on":""}`} onClick={()=>setV("milestones")}>🏆</button>
        <button title="Favorites" className={`view-btn ${showFav?"on":""}`} onClick={()=>setSF(!showFav)}>⭐</button>
        <button title="Select photos to group" className={`view-btn ${selectMode?"on":""}`} onClick={()=>{setSelectMode(!selectMode);setSelectedIds([]);setV("timeline")}}>✅</button>
      </div>

      <div style={{display:"flex",gap:"8px",padding:"12px 24px",overflowX:"auto",background:"white",borderBottom:"1px solid #f5ede8"}}>
        <button className={`petal-btn ${kidF==="all"?"on":""}`} onClick={()=>setKF("all")}>All Kids</button>
        {kids.map(k=><button key={k} className={`petal-btn ${kidF===k?"on":""}`} onClick={()=>setKF(k)}>{k}</button>)}
        <div style={{width:"1px",background:"#ede5dc",margin:"0 4px",flexShrink:0}}/>
        <button className={`petal-btn ${typeF==="all"?"on":""}`} onClick={()=>setTF("all")}>All Types</button>
        {types.map(t=><button key={t} className={`petal-btn ${typeF===t?"on":""}`} onClick={()=>setTF(t)}>{EMOJI[t]||""} {t}</button>)}
      </div>

      {months.length>1&&(<div style={{display:"flex",gap:"8px",padding:"10px 24px",overflowX:"auto",background:"#fefcfa",borderBottom:"1px solid #f5ede8"}}><button className={`petal-btn ${selMo==="all"?"on":""}`} onClick={()=>setSelMo("all")}>All Time</button>{months.map(m=><button key={m} className={`petal-btn ${selMo===m?"on":""}`} onClick={()=>setSelMo(m)}>{fmtMo(m)}</button>)}</div>)}

      {selectMode&&<SelectionBar count={selectedIds.length} onGroup={()=>openCreateGroup(selectedIds)} onClear={clearSelection} onCancel={cancelSelection}/>}
      {view==="timeline"&&<CalendarHeatmap moments={moments}/>}

      {view==="timeline"&&otd.length>0&&(<div style={{maxWidth:"640px",margin:"0 auto",padding:"16px 16px 0"}}><div style={{background:"linear-gradient(135deg,#fffcf0,#fff5e0)",borderRadius:"22px",padding:"18px 22px",border:"1.5px solid #f5e4c0"}}><div style={{fontSize:"12px",letterSpacing:"2px",textTransform:"uppercase",color:"#d4a030",fontFamily:S,fontWeight:700,marginBottom:"10px"}}>✨ On this day</div>{otd.map(m=><div key={m.id} style={{fontSize:"18px",color:"#5c4a4f",marginBottom:"6px",lineHeight:1.4}}>"{m.text}" <span style={{fontFamily:S,fontSize:"12px",color:"#c4a8ae",fontWeight:600}}>- {m.author}, {new Date(m.created_at).getFullYear()}</span></div>)}</div></div>)}

      <div style={{maxWidth:"640px",margin:"0 auto",padding:"28px 16px"}}>
        <div key={view} className="view-crossfade">
        {loading?<SkeletonTimeline/>
        :view==="gallery"?<GalleryView moments={filtered} onImageClick={openLightbox}/>
        :view==="milestones"?<MilestonesView moments={filtered}/>
        :filtered.length===0?<EmptyState type={aiMode&&search?"ai":search?"search":showFav?"fav":"empty"}/>
        :(<div style={{position:"relative",paddingLeft:"32px"}}>
            <div style={{position:"absolute",left:"11px",top:0,bottom:0,width:"2px",background:"linear-gradient(to bottom,#c97b8b,#ddd4f0,#f0e4c8)",borderRadius:"1px"}}/>
            {Object.entries(grouped).map(([date,items])=>(
              <div key={date} style={{marginBottom:"36px"}}>
                <div className="sticky-date"><div style={{display:"flex",alignItems:"center"}}><div style={{width:"22px",height:"22px",borderRadius:"50%",background:"linear-gradient(135deg,#c97b8b,#dbb0bb)",border:"3px solid #faf8f5",flexShrink:0,zIndex:1,boxShadow:"0 2px 6px rgba(201,123,139,0.2)"}}/><div style={{fontSize:"12px",letterSpacing:"2.5px",textTransform:"uppercase",color:"#c4a8ae",fontFamily:S,fontWeight:700,marginLeft:"14px"}}>{date}</div></div></div>
                <div style={{display:"flex",flexDirection:"column",gap:"18px"}}>
                  {items.map((entry,idx)=>{
                    if(entry.kind==="group"){
                      const ordered=entry.moments.map(m=>{const gi=groupItems.find(i=>i.group_id===entry.group.id&&i.moment_id===m.id);return{...m,__position:gi?.position??0}});
                      return(<div key={entry.id} className="bloom" style={{animationDelay:`${idx*0.08}s`,position:"relative"}}><div style={{position:"absolute",left:"-27px",top:"26px",width:"10px",height:"10px",borderRadius:"50%",background:"#dbb0bb",border:"2.5px solid #faf8f5",zIndex:1}}/><GroupCard group={entry.group} moments={ordered} onImageClick={openLightbox} onEditGroup={openEditGroup} onEditCaption={updateMoment} toast={toast}/></div>);
                    }
                    if(entry.kind==="suggestion"){
                      return(<div key={entry.id} className="bloom" style={{animationDelay:`${idx*0.08}s`,position:"relative"}}><div style={{position:"absolute",left:"-27px",top:"26px",width:"10px",height:"10px",borderRadius:"50%",background:"#e8c76a",border:"2.5px solid #faf8f5",zIndex:1}}/><SuggestionCard suggestion={entry.suggestion} onReview={s=>openCreateGroup(s.moments.map(m=>m.id),defaultGroupTitle(s.moments))} onDismiss={dismissSuggestion}/></div>);
                    }
                    const m=entry.moment;
                    return(<div key={m.id} className="bloom" style={{animationDelay:`${idx*0.08}s`,position:"relative"}}><div style={{position:"absolute",left:"-27px",top:"26px",width:"10px",height:"10px",borderRadius:"50%",background:"#dbb0bb",border:"2.5px solid #faf8f5",zIndex:1}}/><Card m={m} extraMoments={[]} faved={favs.includes(m.id)} onFav={()=>toggleFav(m.id)} reactions={getRx(m.id)} onReact={fetchR} comments={getCm(m.id)} onComment={fetchC} onImageClick={openLightbox} toast={toast} onEdit={updateMoment} selectMode={selectMode} selected={selectedIds.includes(m.id)} onSelect={()=>toggleSelected(m.id)}/></div>);
                  })}
                </div>
              </div>
            ))}
          </div>)}
        {view==="timeline"&&hasMore&&<div ref={sentinelRef} style={{display:"flex",justifyContent:"center",padding:"24px"}}><div className="loading-dots" style={{display:"flex",gap:"6px",alignItems:"center"}}><span style={{fontSize:"12px",fontFamily:S,fontWeight:600,color:"#d0bfc3"}}>Loading more</span>{[0,1,2].map(i=><div key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:"#d0bfc3",animation:`dotPulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}</div></div>}
        </div>
      </div>
      <div style={{textAlign:"center",padding:"40px",fontSize:"20px",color:"#e0d0d5"}}>made with ❤️ by the Henes family</div>
      {groupModal&&<GroupEditModal mode={groupModal.mode} group={groupModal.group} initialMomentIds={groupModal.initialMomentIds} initialTitle={groupModal.initialTitle} moments={moments} availableMoments={availableUngrouped} onClose={()=>setGroupModal(null)} onSave={saveGroup} onDelete={deleteGroup} onCaptionEdit={updateMoment} toast={toast}/>}
      {lightbox&&<Lightbox data={lightbox} onClose={()=>setLightbox(null)} mediaList={mediaList} onNavigate={setLightbox} toast={toast}/>}
      <ToastContainer toasts={toasts}/>
    </div>
  );
}

/* ---- Video thumbnail ---- */
function VideoThumbnail({src,style={},onClick}){
  const[poster,setPoster]=useState(null);const[err,setErr]=useState(false);
  useEffect(()=>{const v=document.createElement("video");v.crossOrigin="anonymous";v.preload="metadata";v.muted=true;v.playsInline=true;v.onloadeddata=()=>{v.currentTime=Math.min(1,v.duration*0.1)};v.onseeked=()=>{try{const c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);setPoster(c.toDataURL("image/jpeg",0.7))}catch{setErr(true)}};v.onerror=()=>setErr(true);v.src=src;return()=>{v.src="";v.load()}},[src]);
  return(<div style={{position:"relative",borderRadius:"18px",overflow:"hidden",...style}} onClick={onClick}>
    {poster?<img src={poster} alt="" style={{width:"100%",borderRadius:"18px",maxHeight:"400px",objectFit:"cover",display:"block"}}/>:!err?<div style={{width:"100%",minHeight:"180px",background:"linear-gradient(135deg,#f5eff0 0%,#ede5e8 50%,#f0e8ec 100%)",borderRadius:"18px",position:"relative"}}><div className="shimmer-overlay" style={{position:"absolute",inset:0,borderRadius:"18px"}}/></div>:<div style={{width:"100%",minHeight:"180px",background:"#f5eff0",borderRadius:"18px",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#d0bfc3",fontSize:"13px",fontFamily:S,fontWeight:600}}>🎬 Video</span></div>}
    <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(92,74,79,0.6)",borderRadius:"50%",width:"48px",height:"48px",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"18px",backdropFilter:"blur(4px)",boxShadow:"0 4px 12px rgba(0,0,0,0.15)",transition:"background 0.2s",cursor:"pointer",zIndex:2}}>▶</div>
  </div>);
}

/* ---- Voice note preview (static, opens lightbox) ---- */
function VoicePreview({onClick}){
  const bars=26;const hs=useRef(Array.from({length:bars},()=>10+Math.random()*28)).current;
  return(<div onClick={onClick} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 16px",background:"rgba(201,123,139,0.06)",borderRadius:"18px",marginBottom:"14px",border:"1px solid rgba(201,123,139,0.1)",cursor:"pointer",transition:"background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(201,123,139,0.1)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(201,123,139,0.06)"}>
    <div style={{width:"38px",height:"38px",borderRadius:"50%",background:"linear-gradient(135deg,#c97b8b,#b8a0d0)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",flexShrink:0,boxShadow:"0 2px 8px rgba(201,123,139,0.25)"}}>▶</div>
    <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:"1.5px",height:"34px"}}>{hs.map((h,i)=><div key={i} style={{width:`${100/bars}%`,height:`${h}px`,background:"rgba(201,123,139,0.2)",borderRadius:"3px"}}/>)}</div>
      <div style={{fontSize:"10px",color:"#c4a8ae",fontFamily:S,fontWeight:600,marginTop:"2px"}}>Tap to play</div>
    </div>
  </div>);
}

/* ---- Comments ---- */
function Comments({mid,comments,onComment,toast}){
  const[show,setShow]=useState(false);
  const[text,setText]=useState("");
  const[showNames,setShowNames]=useState(false);
  const[posting,setPosting]=useState(false);
  const[confirmDel,setConfirmDel]=useState(null);
  const me=gN();

  const submit=async(author)=>{
    if(!text.trim())return;
    setPosting(true);setShowNames(false);
    try{await sbPost("comments",{moment_id:mid,author,text:text.trim()});setText("");toast("Comment added","💬");onComment()}catch{toast("Couldn't post","❌")}
    setPosting(false);
  };
  const handlePost=()=>{const name=gN();if(name){submit(name)}else{setShowNames(true)}};
  const pickName=(name)=>{sN(name);toast(`Hi ${name}!`,"👋");submit(name)};
  const deleteComment=async(id)=>{try{await sbDel(`comments?id=eq.${id}`);toast("Comment deleted","🗑");onComment()}catch{toast("Couldn't delete","❌")}setConfirmDel(null)};

  const count=comments.length;

  return(<div style={{marginTop:"12px",position:"relative",zIndex:3}}>
    <button onClick={()=>setShow(!show)} style={{background:"none",border:"none",cursor:"pointer",fontSize:"12px",fontFamily:S,fontWeight:600,color:"#c4a8ae",padding:"4px 0",transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color="#c97b8b"} onMouseLeave={e=>e.target.style.color="#c4a8ae"}>
      {count>0?`💬 ${count} comment${count!==1?"s":""}`:show?"Cancel":"💬 Comment"}
    </button>
    {show&&(<div style={{marginTop:"10px"}}>
      {comments.map(c=>{const t=new Date(c.created_at);const ago=Math.floor((Date.now()-t)/60000);const timeStr=ago<1?"just now":ago<60?`${ago}m ago`:ago<1440?`${Math.floor(ago/60)}h ago`:t.toLocaleDateString("en-US",{month:"short",day:"numeric"});const mine=me&&c.author===me;
        return(<div key={c.id} style={{display:"flex",gap:"10px",marginBottom:"10px",alignItems:"flex-start"}}>
          <div style={{width:"28px",height:"28px",borderRadius:"50%",background:A_CLR[c.author]||"#c4a8ae",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"11px",fontWeight:700,fontFamily:S,flexShrink:0}}>{c.author[0]}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <span style={{fontSize:"12px",fontFamily:S,fontWeight:700,color:A_CLR[c.author]||"#6b5560"}}>{c.author}</span>
              <span style={{fontSize:"10px",fontFamily:S,color:"#d0bfc3"}}>{timeStr}</span>
              {mine&&(confirmDel===c.id?(
                <span style={{marginLeft:"auto",display:"flex",gap:"4px",alignItems:"center"}}>
                  <button onClick={()=>deleteComment(c.id)} style={{background:"#c97b8b",color:"white",border:"none",borderRadius:"10px",padding:"3px 10px",fontSize:"11px",fontFamily:S,fontWeight:600,cursor:"pointer"}}>Delete</button>
                  <button onClick={()=>setConfirmDel(null)} style={{background:"none",color:"#c4a8ae",border:"none",fontSize:"11px",fontFamily:S,fontWeight:600,cursor:"pointer",padding:"2px 4px"}}>Cancel</button>
                </span>
              ):(
                <button onClick={()=>setConfirmDel(c.id)} title="Delete comment" style={{marginLeft:"auto",background:"rgba(201,123,139,0.1)",border:"1px solid rgba(201,123,139,0.3)",borderRadius:"10px",cursor:"pointer",fontSize:"11px",fontFamily:S,fontWeight:600,color:"#c97b8b",padding:"2px 10px",transition:"all 0.2s"}} onMouseEnter={e=>{e.target.style.background="#c97b8b";e.target.style.color="white"}} onMouseLeave={e=>{e.target.style.background="rgba(201,123,139,0.1)";e.target.style.color="#c97b8b"}}>Delete</button>
              ))}
            </div>
            <div style={{fontSize:"14px",lineHeight:1.5,color:"#5c4a4f",marginTop:"2px",wordWrap:"break-word"}}>{c.text}</div>
          </div>
        </div>)})}
      <div style={{display:"flex",gap:"8px",alignItems:"flex-end",position:"relative"}}>
        <input type="text" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&text.trim())handlePost()}} placeholder="Write a comment..." disabled={posting} style={{flex:1,padding:"10px 14px",border:"2px solid #ede5dc",borderRadius:"20px",fontSize:"14px",fontFamily:S,background:"white",outline:"none",color:"#5c4a4f",transition:"border-color 0.2s"}} onFocus={e=>e.target.style.borderColor="#c97b8b"} onBlur={e=>e.target.style.borderColor="#ede5dc"}/>
        <button onClick={handlePost} disabled={!text.trim()||posting} style={{padding:"10px 16px",borderRadius:"20px",border:"none",background:text.trim()?"#c97b8b":"#ede5dc",color:text.trim()?"white":"#c4a8ae",fontSize:"13px",fontFamily:S,fontWeight:600,cursor:text.trim()?"pointer":"default",transition:"background 0.2s",flexShrink:0}}>Post</button>
        {showNames&&<div className="popup-f" style={{flexDirection:"column",gap:0,padding:"6px 4px",minWidth:"120px",bottom:"48px",left:"auto",right:0,transform:"none"}}><div style={{fontSize:"10px",fontFamily:S,fontWeight:700,color:"#c4a8ae",letterSpacing:"1px",textTransform:"uppercase",padding:"4px 10px 6px",textAlign:"center"}}>Who's this?</div>{FAMILY_NAMES.map(n=><button key={n} className="name-opt" onClick={()=>pickName(n)} style={{color:A_CLR[n]||"#6b5560"}}>{n}</button>)}</div>}
      </div>
    </div>)}
  </div>);
}

/* ---- Card with inline edit + multi-photo carousel ---- */
function Card({m,extraMoments=[],faved,onFav,reactions,onReact,comments,onComment,onImageClick,toast,onEdit,selectMode=false,selected=false,onSelect}){
  const time=new Date(m.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  const url=m.primary_media_path?`${MEDIA}/${m.primary_media_path}`:null;
  const isV=m.primary_media_path?.endsWith(".mp4")||m.primary_media_path?.endsWith(".mov");
  const isA=m.primary_media_path?.endsWith(".ogg")||m.primary_media_path?.endsWith(".mp3")||m.primary_media_path?.endsWith(".oga");
  const isI=m.primary_media_path?.endsWith(".jpg")||m.primary_media_path?.endsWith(".jpeg")||m.primary_media_path?.endsWith(".png")||m.primary_media_path?.endsWith(".webp");
  const isM=m.type==="Milestone";const hide=m.text.startsWith("[")&&m.text.endsWith("]");
  const[conf,setConf]=useState(false);const wash=KID_WASH[m.kid]||KID_WASH.Family;
  const[editing,setEditing]=useState(false);const[editText,setEditText]=useState(m.text);
  useEffect(()=>{if(isM){setConf(true);const t=setTimeout(()=>setConf(false),3000);return()=>clearTimeout(t)}},[]);

  const allMedia=[m,...extraMoments];
  const hasCarousel=allMedia.filter(x=>x.primary_media_path).length>1;

  const saveEdit=()=>{if(editText.trim()&&editText!==m.text){onEdit(m.id,editText.trim())}setEditing(false)};
  const cancelEdit=()=>{setEditText(m.text);setEditing(false)};

  return(<div className="petal-card" style={{background:wash.bg,border:`0.5px solid ${wash.border}`}}>
    {isM&&<Confetti active={conf}/>}
    {selectMode&&m.primary_media_path&&<button onClick={e=>{e.stopPropagation();onSelect&&onSelect(m.id)}} title={selected?"Selected":"Select for group"} style={{position:"absolute",top:"14px",left:"14px",zIndex:8,width:"32px",height:"32px",borderRadius:"50%",border:selected?"none":"2px solid rgba(201,123,139,0.45)",background:selected?"#c97b8b":"rgba(255,255,255,0.86)",color:selected?"white":"#c97b8b",fontSize:"16px",fontFamily:S,fontWeight:900,cursor:"pointer",boxShadow:"0 4px 14px rgba(0,0,0,0.08)"}}>{selected?"✓":""}</button>}
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"14px",position:"relative",zIndex:3}}>
      <div>
        <div style={{fontSize:"10px",fontFamily:S,fontWeight:500,letterSpacing:"1.8px",textTransform:"uppercase",color:"#b08a94"}}>{m.type}</div>
        <div style={{fontFamily:SERIF,fontSize:"19px",fontWeight:500,color:"#3d2a30",marginTop:"2px"}}>{m.kid}</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <span style={{fontSize:"11px",fontFamily:S,color:"#a68a90",fontWeight:500,fontVariantNumeric:"tabular-nums"}}>{new Date(m.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})} · {time}</span>
        {!editing&&url&&<button onClick={()=>downloadMedia(url,toast)} title="Download" style={{background:"none",border:"none",cursor:"pointer",fontSize:"13px",padding:"4px",opacity:0.25,transition:"opacity 0.2s"}} onMouseEnter={e=>e.target.style.opacity="0.6"} onMouseLeave={e=>e.target.style.opacity="0.25"}>💾</button>}
        {!editing&&!hasCarousel&&<button onClick={()=>setEditing(true)} title="Edit" style={{background:"none",border:"none",cursor:"pointer",fontSize:"13px",padding:"4px",opacity:0.25,transition:"opacity 0.2s"}} onMouseEnter={e=>e.target.style.opacity="0.6"} onMouseLeave={e=>e.target.style.opacity="0.25"}>✏️</button>}
        <ShareBtn m={m} toast={toast}/><button onClick={onFav} title={faved?"Unfavorite":"Favorite"} style={{background:"none",border:"none",cursor:"pointer",fontSize:"16px",padding:"4px",opacity:faved?1:0.25,transition:"opacity 0.2s"}}>{faved?"⭐":"☆"}</button>
      </div>
    </div>
    {hasCarousel?<MediaCarousel items={allMedia} onImageClick={onImageClick} onEdit={onEdit} toast={toast}/>:(<>
      {isV&&url&&<div style={{marginBottom:"14px"}} className="clickable-media" onClick={()=>onImageClick({url,isVideo:true,moment:m})}><VideoThumbnail src={url}/></div>}
      {isI&&url&&<div style={{marginBottom:"14px",overflow:"hidden"}} className="clickable-media" onClick={()=>onImageClick({url,isVideo:false,moment:m})}><ProgressiveImage src={url} style={{width:"100%",borderRadius:"10px",maxHeight:"400px",objectFit:"cover"}} /></div>}
    </>)}
    {!hide&&!hasCarousel&&(editing?(
      <div style={{marginBottom:"14px",position:"relative",zIndex:3}}>
        <textarea className="edit-area" value={editText} onChange={e=>setEditText(e.target.value)} autoFocus/>
        <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
          <button onClick={saveEdit} style={{padding:"6px 16px",borderRadius:"16px",border:"none",background:"#c97b8b",color:"white",fontSize:"13px",fontFamily:S,fontWeight:600,cursor:"pointer"}}>Save</button>
          <button onClick={cancelEdit} style={{padding:"6px 16px",borderRadius:"16px",border:"1.5px solid #ede5dc",background:"white",color:"#9b8a78",fontSize:"13px",fontFamily:S,fontWeight:600,cursor:"pointer"}}>Cancel</button>
        </div>
      </div>
    ):(
      <div style={{fontFamily:SERIF,fontSize:"18px",lineHeight:1.5,color:"#3d2a30",marginBottom:"14px",fontStyle:"italic",position:"relative",zIndex:3}}>&#8220;{m.text}&#8221;</div>
    ))}
    {isA&&url&&<VoicePreview onClick={()=>onImageClick({url,isVideo:false,isAudio:true,moment:m})}/>}
    {extraMoments.length>0&&extraMoments.some(x=>!x.primary_media_path&&!(x.text.startsWith("[")&&x.text.endsWith("]")))&&(
      <div style={{borderTop:`0.5px solid ${wash.border}`,marginTop:"12px",paddingTop:"12px"}}>
        {extraMoments.filter(x=>!x.primary_media_path&&!(x.text.startsWith("[")&&x.text.endsWith("]"))).map(x=><div key={x.id} style={{fontFamily:SERIF,fontSize:"15px",fontStyle:"italic",lineHeight:1.5,color:"#6b5560",marginBottom:"4px"}}>&#8220;{x.text}&#8221;</div>)}
      </div>
    )}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"8px",position:"relative",zIndex:3,paddingTop:"14px",borderTop:"0.5px solid rgba(0,0,0,0.05)",marginTop:"6px"}}>
      <span style={{fontSize:"12px",fontFamily:S,fontWeight:500,color:A_CLR[m.author]||"#7d6b62",letterSpacing:"0.3px"}}>— {m.author}</span>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>{Array.isArray(m.tags)&&m.tags.slice(0,3).map((t,i)=><span key={i} style={{fontSize:"10px",fontFamily:S,fontWeight:500,padding:"3px 9px",borderRadius:"10px",border:"0.5px solid rgba(201,123,139,0.25)",color:"#8b6b75",letterSpacing:"0.2px"}}>{t}</span>)}</div>
    </div>
    <Reactions mid={m.id} rx={reactions} onR={onReact} toast={toast}/>
    <Comments mid={m.id} comments={comments} onComment={onComment} toast={toast}/>
  </div>);
}
