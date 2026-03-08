import { useState, useEffect } from "react";

const SUPABASE_URL = "https://xpvgofrtikbfvyxihviz.supabase.co";
const SUPABASE_KEY = "sb_publishable_QPLaxQw-b5CYZSizS_7P4Q_5uMemWVq";
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/family-journal`;

const EMOJI = { Milestone:"🌟", Funny:"😂", Quote:"💬", First:"🎉", Health:"💚", Memory:"📸", Other:"✨" };
const AUTHOR_CLR = { Brandon:"#4a9eff", Jacky:"#e8836b", Mom:"#8b5cf6", Dad:"#10b981" };
const KID_BG = {
  Gabby: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)",
  Madalyn: "linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)",
  Both: "linear-gradient(135deg, #fce4ec 0%, #c5cae9 100%)",
  Family: "linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)",
};
const sans = "'Helvetica Neue', 'Arial', sans-serif";

export default function App() {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [kidFilter, setKidFilter] = useState("all");

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/moments?order=created_at.desc&limit=200`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMoments(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = moments.filter((m) => {
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    if (kidFilter !== "all" && m.kid !== kidFilter) return false;
    return true;
  });

  const types = [...new Set(moments.map((m) => m.type))];
  const kids = [...new Set(moments.map((m) => m.kid))];

  const stats = {
    total: moments.length,
    byKid: moments.reduce((a, m) => ({ ...a, [m.kid]: (a[m.kid] || 0) + 1 }), {}),
    byAuthor: moments.reduce((a, m) => ({ ...a, [m.author]: (a[m.author] || 0) + 1 }), {}),
    withMedia: moments.filter((m) => m.primary_media_path).length,
  };

  function groupByDate(items) {
    const g = {};
    items.forEach((m) => {
      const key = new Date(m.created_at).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      });
      if (!g[key]) g[key] = [];
      g[key].push(m);
    });
    return g;
  }

  const grouped = groupByDate(filtered);

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f7", fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        padding: "48px 24px 36px", color: "white", textAlign: "center",
      }}>
        <div style={label({ color: "#e8836b", marginBottom: "8px" })}>The Henes Family</div>
        <h1 style={{ fontSize: "38px", fontWeight: "400", margin: "0 0 6px", letterSpacing: "1px" }}>Memory Journal</h1>
        <div style={{ fontSize: "14px", opacity: 0.5, fontFamily: sans }}>
          {stats.total} moment{stats.total !== 1 ? "s" : ""} captured
          {stats.withMedia > 0 && ` · ${stats.withMedia} with media`}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
          {Object.entries(stats.byKid).map(([kid, n]) => <Pill key={kid} text={`${kid}: ${n}`} />)}
          {Object.entries(stats.byAuthor).map(([a, n]) => <Pill key={a} text={`${a}: ${n}`} color={AUTHOR_CLR[a]} dim />)}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", gap: "8px", padding: "14px 24px", overflowX: "auto",
        background: "white", borderBottom: "1px solid #eee", fontFamily: sans,
      }}>
        <Filter active={kidFilter === "all"} onClick={() => setKidFilter("all")} text="All Kids" />
        {kids.map((k) => <Filter key={k} active={kidFilter === k} onClick={() => setKidFilter(k)} text={k} />)}
        <div style={{ width: "1px", background: "#ddd", margin: "0 4px", flexShrink: 0 }} />
        <Filter active={typeFilter === "all"} onClick={() => setTypeFilter("all")} text="All Types" />
        {types.map((t) => <Filter key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} text={`${EMOJI[t] || ""} ${t}`} />)}
      </div>

      {/* Content */}
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "28px 16px" }}>
        {loading ? (
          <Empty text="Loading memories..." />
        ) : filtered.length === 0 ? (
          <Empty text="No moments yet. Send a message to the Telegram bot!" />
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} style={{ marginBottom: "36px" }}>
              <div style={{ ...label({ color: "#999" }), marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                {date}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {items.map((m) => <Card key={m.id} m={m} />)}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ textAlign: "center", padding: "36px", color: "#ccc", fontSize: "12px", fontFamily: sans }}>
        Gabby & Maddy's Memory Journal · Powered by love and a Telegram bot
      </div>
    </div>
  );
}

function Card({ m }) {
  const time = new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const mediaUrl = m.primary_media_path ? `${STORAGE_BASE}/${m.primary_media_path}` : null;

  const isVideo = m.primary_media_path && (m.primary_media_path.endsWith(".mp4") || m.primary_media_path.endsWith(".mov"));
  const isAudio = m.primary_media_path && (m.primary_media_path.endsWith(".ogg") || m.primary_media_path.endsWith(".mp3") || m.primary_media_path.endsWith(".oga"));
  const isImage = m.primary_media_path && (m.primary_media_path.endsWith(".jpg") || m.primary_media_path.endsWith(".jpeg") || m.primary_media_path.endsWith(".png") || m.primary_media_path.endsWith(".webp"));

  return (
    <div style={{
      background: KID_BG[m.kid] || "white", borderRadius: "16px", padding: "20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "22px" }}>{EMOJI[m.type] || "✨"}</span>
          <span style={{ ...label({ color: "#1a1a2e", opacity: 0.55 }) }}>{m.kid} · {m.type}</span>
        </div>
        <span style={{ fontSize: "11px", fontFamily: sans, color: "#999" }}>{time}</span>
      </div>

      {/* Text */}
      <div style={{ fontSize: "17px", lineHeight: 1.6, color: "#1a1a2e", marginBottom: "14px" }}>
        "{m.text}"
      </div>

      {/* Media */}
      {isVideo && mediaUrl && (
        <div style={{ marginBottom: "14px", borderRadius: "12px", overflow: "hidden" }}>
          <video
            controls
            playsInline
            preload="metadata"
            style={{ width: "100%", borderRadius: "12px", maxHeight: "400px", background: "#000" }}
          >
            <source src={mediaUrl} type="video/mp4" />
          </video>
        </div>
      )}

      {isImage && mediaUrl && (
        <div style={{ marginBottom: "14px", borderRadius: "12px", overflow: "hidden" }}>
          <img
            src={mediaUrl}
            alt={m.text}
            style={{ width: "100%", borderRadius: "12px", maxHeight: "400px", objectFit: "cover" }}
          />
        </div>
      )}

      {isAudio && mediaUrl && (
        <div style={{ marginBottom: "14px" }}>
          <audio controls preload="metadata" style={{ width: "100%", height: "40px" }}>
            <source src={mediaUrl} type={m.primary_media_path.endsWith(".ogg") ? "audio/ogg" : "audio/mpeg"} />
          </audio>
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontSize: "12px", fontFamily: sans, fontWeight: 600, color: AUTHOR_CLR[m.author] || "#666" }}>
          {m.author}
        </span>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {Array.isArray(m.tags) && m.tags.slice(0, 3).map((t, i) => <Tag key={i} text={t} />)}
        </div>
      </div>
    </div>
  );
}

function Filter({ active, onClick, text }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: "20px", cursor: "pointer", whiteSpace: "nowrap",
      border: active ? "2px solid #1a1a2e" : "1px solid #ddd",
      background: active ? "#1a1a2e" : "white",
      color: active ? "white" : "#666",
      fontSize: "12px", fontFamily: sans, fontWeight: active ? 600 : 400,
    }}>{text}</button>
  );
}

function Pill({ text, color, dim }) {
  return (
    <div style={{
      background: dim ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.1)",
      borderRadius: "20px", padding: "6px 16px", fontSize: "13px",
      fontFamily: sans, color: color || "white",
    }}>{text}</div>
  );
}

function Tag({ text }) {
  return (
    <span style={{
      fontSize: "10px", fontFamily: sans, background: "rgba(0,0,0,0.07)",
      borderRadius: "10px", padding: "3px 8px", color: "#777",
    }}>{text}</span>
  );
}

function Empty({ text }) {
  return <div style={{ textAlign: "center", padding: "60px 0", color: "#999", fontFamily: sans }}>{text}</div>;
}

function label(overrides = {}) {
  return { fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", fontFamily: sans, fontWeight: 600, ...overrides };
}
