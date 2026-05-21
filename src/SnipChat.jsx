import { useState, useRef, useEffect, useCallback, memo } from "react";
import { MessageCircle, User, RefreshCw, X, Zap, Sparkles, Download, Scissors, Type, Pen, Music, Share2, Check, Mic } from "lucide-react";

const BRAND = {
  yellow: "#FFFC00",
  dark:   "#000000",
  card:   "#1A1A1A",
  border: "#2C2C2C",
  text:   "#FFFFFF",
  muted:  "#858585",
  red:    "#FF3B30",
};

const FILTERS = [
  { id: "normal", label: "Normal", css: "none",                                            icon: "✨" },
  { id: "vivid",  label: "Vivid",  css: "saturate(2) contrast(1.1)",                       icon: "🎨" },
  { id: "bw",     label: "B&W",    css: "grayscale(1) contrast(1.2)",                      icon: "⚫" },
  { id: "noir",   label: "Noir",   css: "grayscale(1) contrast(1.6) brightness(0.85)",     icon: "🎬" },
  { id: "sepia",  label: "Sepia",  css: "sepia(0.85) saturate(1.2)",                       icon: "📻" },
  { id: "warm",   label: "Warm",   css: "sepia(0.3) saturate(1.5) hue-rotate(-10deg)",     icon: "🔥" },
  { id: "cool",   label: "Cool",   css: "saturate(1.2) hue-rotate(20deg) brightness(1.05)", icon: "❄️" },
];

const CAM_STATE = { IDLE: "idle", ASKING: "asking", GRANTED: "granted", DENIED: "denied", ERROR: "error" };
const MAX_VIDEO_SEC = 180;

// ─── Toast ────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div style={{ position:"absolute", bottom:100, left:16, right:16, zIndex:200,
      display:"flex", flexDirection:"column", gap:8, pointerEvents:"none", alignItems:"center" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(20px)",
          borderRadius:30, padding:"8px 18px", display:"flex", alignItems:"center", gap:8,
          border:"0.5px solid rgba(255,255,255,0.1)", animation:"toastPop 0.3s cubic-bezier(0.34,1.2,0.64,1)" }}>
          <span style={{ fontSize:16 }}>{t.icon}</span>
          <span style={{ color:"#FFF", fontSize:13, fontWeight:500, fontFamily:"'SF Pro Text',-apple-system,sans-serif" }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, { icon="✨", duration=2500 } = {}) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, icon }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  return { toasts, toast };
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function SnipLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="23" fill={BRAND.yellow} />
      <circle cx="14" cy="30" r="4.5" fill={BRAND.dark} />
      <line x1="17.5" y1="27.5" x2="30" y2="16" stroke={BRAND.dark} strokeWidth="3.2" strokeLinecap="round"/>
      <circle cx="14" cy="18" r="4.5" fill={BRAND.dark} />
      <line x1="17.5" y1="20.5" x2="30" y2="32" stroke={BRAND.dark} strokeWidth="3.2" strokeLinecap="round"/>
      <circle cx="22" cy="24" r="2.2" fill={BRAND.yellow} />
      <path d="M30 16 Q38 14 38 24 Q38 34 30 32 L27 36 L28 31 Q34 30 34 24 Q34 18 30 16Z" fill={BRAND.dark}/>
    </svg>
  );
}

// ─── Filter Carousel — uneven bubbly circles ──────────────────────────────────
const BUBBLE_SIZES = [64, 72, 58, 76, 60, 68, 54];
function FilterCarousel({ filters, activeId, onSelect, videoRef }) {
  const previewRefs = useRef({});

  useEffect(() => {
    filters.forEach(f => {
      if (!previewRefs.current[f.id]) {
        const c = document.createElement("canvas");
        c.width = 80; c.height = 80;
        previewRefs.current[f.id] = c;
      }
    });
    const ivs = {};
    filters.forEach(f => {
      ivs[f.id] = setInterval(() => {
        const v = videoRef.current;
        const c = previewRefs.current[f.id];
        if (!v || !c || v.readyState < 2) return;
        const ctx = c.getContext("2d");
        ctx.filter = f.css;
        ctx.drawImage(v, 0, 0, c.width, c.height);
      }, 120);
    });
    return () => Object.values(ivs).forEach(iv => clearInterval(iv));
  }, [filters, videoRef]);

  return (
    <div style={{ position:"absolute", bottom:96, left:0, right:0, overflowX:"auto", overflowY:"hidden",
      display:"flex", gap:10, padding:"0 16px 8px", scrollbarWidth:"none", WebkitOverflowScrolling:"touch",
      zIndex:20, alignItems:"flex-end" }}>
      {filters.map((filter, i) => {
        const sz = BUBBLE_SIZES[i % BUBBLE_SIZES.length];
        const active = activeId === filter.id;
        return (
          <button key={filter.id} onClick={() => onSelect(filter.id)}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              background:"none", border:"none", cursor:"pointer", flexShrink:0,
              transition:"transform 0.2s", transform: active ? "scale(1.12) translateY(-4px)" : "scale(1)" }}>
            <div style={{ width:sz, height:sz, borderRadius:"50%", overflow:"hidden",
              border: active ? `3px solid ${BRAND.yellow}` : "2.5px solid rgba(255,255,255,0.25)",
              boxShadow: active ? `0 0 18px ${BRAND.yellow}88` : "0 2px 8px rgba(0,0,0,0.5)",
              background:"#1A1A1A", flexShrink:0 }}>
              <canvas
                ref={el => {
                  if (el && previewRefs.current[filter.id]) {
                    const ctx = el.getContext("2d");
                    ctx.drawImage(previewRefs.current[filter.id], 0, 0, sz, sz);
                  }
                }}
                width={sz} height={sz}
                style={{ width:"100%", height:"100%", display:"block" }}
              />
            </div>
            <span style={{ fontSize:10, fontWeight: active ? 700 : 400,
              color: active ? BRAND.yellow : "rgba(255,255,255,0.8)",
              fontFamily:"'SF Pro Text',-apple-system,sans-serif", whiteSpace:"nowrap" }}>
              {filter.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Permission Gate ──────────────────────────────────────────────────────────
function PermissionGate({ state, onRequest }) {
  const isAsking = state === CAM_STATE.ASKING;
  return (
    <div style={{ position:"absolute", inset:0, zIndex:100, background:BRAND.dark,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:32, gap:24, textAlign:"center" }}>
      <SnipLogo size={80} />
      <h1 style={{ fontSize:28, fontWeight:700, color:BRAND.yellow, letterSpacing:"-0.5px" }}>SnipChat</h1>
      <p style={{ color:"#858585", fontSize:14 }}>Tap & hold to record · Tap to snap</p>
      <button onClick={onRequest} disabled={isAsking} style={{ padding:"14px 32px", borderRadius:30,
        background:BRAND.yellow, border:"none", color:"#000", fontWeight:700, fontSize:16, cursor:"pointer" }}>
        {isAsking ? "Opening camera..." : "Continue"}
      </button>
    </div>
  );
}

// ─── Chat Overlay ─────────────────────────────────────────────────────────────
const ChatOverlay = memo(({ messages, onClose, onViewSnip }) => (
  <div style={{ position:"absolute", inset:0, zIndex:60, background:"#000",
    display:"flex", flexDirection:"column", animation:"slideUp 0.3s ease" }}>
    <div style={{ padding:"60px 16px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:20, fontWeight:700, color:"#FFF" }}>Chats</span>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none",
          borderRadius:30, width:36, height:36, display:"flex", alignItems:"center",
          justifyContent:"center", cursor:"pointer" }}>
          <X size={18} color="#FFF" />
        </button>
      </div>
    </div>
    <div style={{ flex:1, overflowY:"auto", padding:"0 16px" }}>
      {messages.length === 0 ? (
        <div style={{ textAlign:"center", marginTop:60, color:"#858585" }}>
          <User size={48} strokeWidth={1} />
          <p style={{ marginTop:12 }}>No chats yet</p>
        </div>
      ) : messages.map(msg => (
        <div key={msg.id} onClick={() => onViewSnip(msg)}
          style={{ display:"flex", gap:12, padding:"12px 0",
            borderBottom:"0.5px solid rgba(255,255,255,0.1)", cursor:"pointer",
            opacity: msg.viewed ? 0.5 : 1 }}>
          <div style={{ width:50, height:50, borderRadius:25, overflow:"hidden",
            border: !msg.viewed ? `2px solid ${BRAND.yellow}` : "none" }}>
            {msg.type === "video"
              ? <video src={msg.media} style={{ width:"100%", height:"100%", objectFit:"cover" }} muted />
              : <img src={msg.media} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
            }
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontWeight:600, color:"#FFF" }}>Friend</span>
              <span style={{ fontSize:11, color:"#858585" }}>{new Date(msg.time).toLocaleTimeString()}</span>
            </div>
            <span style={{ fontSize:13, color:"#858585" }}>
              {msg.type === "video" ? "Video Snap" : "Snap"} {msg.text ? `· ${msg.text}` : ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
));

// ─── Snip Viewer ──────────────────────────────────────────────────────────────
const SnipViewer = memo(({ snip, onClose }) => {
  const vidRef = useRef(null);
  useEffect(() => {
    if (snip.type === "video" && vidRef.current) { vidRef.current.play(); }
  }, [snip]);
  return (
    <div style={{ position:"absolute", inset:0, zIndex:70, background:"#000",
      display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      {snip.type === "video"
        ? <video ref={vidRef} src={snip.media} style={{ width:"100%", height:"100%", objectFit:"cover" }}
            muted autoPlay loop />
        : <img src={snip.media} alt="snip" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
      }
      {snip.text && (
        <div style={{ position:"absolute", bottom:80, left:20, right:20,
          background:"rgba(0,0,0,0.7)", padding:12, borderRadius:20,
          textAlign:"center", color:"#FFF" }}>{snip.text}</div>
      )}
      <div style={{ position:"absolute", top:20, right:20,
        width:8, height:8, borderRadius:4, background:BRAND.yellow,
        animation:"pulse 1s infinite" }} />
      <div style={{ position:"absolute", bottom:20, left:0, right:0,
        textAlign:"center", color:"rgba(255,255,255,0.5)", fontSize:12 }}>
        Tap to close
      </div>
    </div>
  );
});

// ─── Saved Gallery ────────────────────────────────────────────────────────────
const SavedGallery = memo(({ snaps, onClose }) => (
  <div style={{ position:"absolute", inset:0, zIndex:80, background:"#000",
    display:"flex", flexDirection:"column", animation:"slideUp 0.3s ease" }}>
    <div style={{ padding:"60px 16px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <span style={{ fontSize:20, fontWeight:700, color:"#FFF" }}>Saved ({snaps.length})</span>
      <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none",
        borderRadius:30, width:36, height:36, display:"flex", alignItems:"center",
        justifyContent:"center", cursor:"pointer" }}>
        <X size={18} color="#FFF" />
      </button>
    </div>
    {snaps.length === 0 ? (
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", color:"#858585", gap:12 }}>
        
        <p>No saved snaps yet</p>
        <p style={{ fontSize:12 }}>Tap 💾 after capturing to save</p>
      </div>
    ) : (
      <div style={{ flex:1, overflowY:"auto", padding:"0 12px 24px",
        display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:3 }}>
        {snaps.map(snap => (
          <div key={snap.id} style={{ aspectRatio:"1", borderRadius:6, overflow:"hidden", position:"relative" }}>
            {snap.type === "video"
              ? <video src={snap.media} style={{ width:"100%", height:"100%", objectFit:"cover" }} muted />
              : <img src={snap.media} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            }
            <div style={{ position:"absolute", top:4, left:4, background:"rgba(0,0,0,0.6)",
              borderRadius:8, padding:"2px 6px", fontSize:10, color:"#FFF" }}>
              {snap.type === "video" ? "VID" : "IMG"}
            </div>
            <button onClick={() => {
              const a = document.createElement("a");
              a.href = snap.media;
              a.download = `snip_${snap.id}.${snap.type === "video" ? "webm" : "png"}`;
              a.click();
            }} style={{ position:"absolute", bottom:4, right:4,
              background:"rgba(0,0,0,0.6)", border:"none", borderRadius:20,
              width:28, height:28, display:"flex", alignItems:"center",
              justifyContent:"center", cursor:"pointer" }}>
              <Download size={14} color={BRAND.yellow} />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
));

// ─── Edit Screen ──────────────────────────────────────────────────────────────
function EditScreen({ media, mediaType, onDone, onDiscard, toast }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState(null); // "crop"|"text"|"paint"|"music"
  const [texts, setTexts] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#FFFC00");
  const [painting, setPainting] = useState(false);
  const [paintColor, setPaintColor] = useState("#FF3B30");
  const [paintSize, setPaintSize] = useState(6);
  const [musicFile, setMusicFile] = useState(null);
  const [musicName, setMusicName] = useState(null);
  const [cropBox, setCropBox] = useState({ x:0.1, y:0.1, w:0.8, h:0.8 });
  const [draggingCrop, setDraggingCrop] = useState(null);
  const lastPoint = useRef(null);
  const audioRef = useRef(null);
  const musicInputRef = useRef(null);

  // Draw image onto canvas
  useEffect(() => {
    if (mediaType !== "photo") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
    };
    img.src = media;
  }, [media, mediaType]);

  const handlePaintStart = (e) => {
    if (tool !== "paint") return;
    setPainting(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const touch = e.touches ? e.touches[0] : e;
    lastPoint.current = {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  const handlePaintMove = (e) => {
    if (!painting || tool !== "paint") return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch = e.touches ? e.touches[0] : e;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    ctx.strokeStyle = paintColor;
    ctx.lineWidth = paintSize * scaleX;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPoint.current = { x, y };
  };

  const addText = () => {
    if (!textInput.trim()) return;
    setTexts(prev => [...prev, { id: Date.now(), text: textInput, color: textColor, x: 50, y: 45 }]);
    setTextInput("");
    setTool(null);
  };

  const handleMusicPick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMusicFile(url);
    setMusicName(file.name.replace(/\.[^.]+$/, ""));
    if (audioRef.current) { audioRef.current.src = url; audioRef.current.play(); }
    toast(`🎵 ${file.name.replace(/\.[^.]+$/, "")}`, { icon: "🎵" });
    setTool(null);
  };

  const handleDone = () => {
    if (mediaType !== "photo") { onDone(media, texts, musicFile); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Bake text overlays into canvas
    const ctx = canvas.getContext("2d");
    texts.forEach(t => {
      const fontSize = Math.round(canvas.width * 0.06);
      ctx.font = `bold ${fontSize}px 'SF Pro Text', sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = fontSize * 0.08;
      const x = (t.x / 100) * canvas.width;
      const y = (t.y / 100) * canvas.height;
      ctx.strokeText(t.text, x, y);
      ctx.fillText(t.text, x, y);
    });
    // Crop if active
    if (tool === "crop") {
      const cx = Math.round(cropBox.x * canvas.width);
      const cy = Math.round(cropBox.y * canvas.height);
      const cw = Math.round(cropBox.w * canvas.width);
      const ch = Math.round(cropBox.h * canvas.height);
      const tmp = document.createElement("canvas");
      tmp.width = cw; tmp.height = ch;
      tmp.getContext("2d").drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
      onDone(tmp.toDataURL("image/png"), [], musicFile);
      return;
    }
    onDone(canvas.toDataURL("image/png"), [], musicFile);
  };

  const PAINT_COLORS = ["#FF3B30","#FF9500","#FFFC00","#34C759","#007AFF","#AF52DE","#FFF","#000"];

  return (
    <div style={{ position:"absolute", inset:0, zIndex:55, background:"#000",
      display:"flex", flexDirection:"column", animation:"slideUp 0.25s ease" }}>
      {/* Media preview */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        {mediaType === "video"
          ? <video src={media} style={{ width:"100%", height:"100%", objectFit:"cover" }} muted autoPlay loop />
          : <canvas ref={canvasRef}
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block",
                cursor: tool === "paint" ? "crosshair" : "default",
                touchAction: tool === "paint" ? "none" : "auto" }}
              onMouseDown={handlePaintStart} onMouseMove={handlePaintMove} onMouseUp={() => setPainting(false)}
              onTouchStart={handlePaintStart} onTouchMove={handlePaintMove} onTouchEnd={() => setPainting(false)}
            />
        }

        {/* Draggable text overlays */}
        {texts.map(t => (
          <div key={t.id}
            style={{ position:"absolute", left:`${t.x}%`, top:`${t.y}%`, transform:"translate(-50%,-50%)",
              color:t.color, fontWeight:700, fontSize:22, textShadow:"0 1px 4px rgba(0,0,0,0.9)",
              cursor:"move", userSelect:"none", fontFamily:"'SF Pro Text',sans-serif",
              WebkitTextStroke:"0.5px rgba(0,0,0,0.6)" }}
            onMouseDown={e => {
              e.preventDefault();
              const startX = e.clientX; const startY = e.clientY;
              const origX = t.x; const origY = t.y;
              const el = e.currentTarget.closest("[data-editwrap]") || document.body;
              const rect = el.getBoundingClientRect();
              const onMove = (ev) => {
                setTexts(prev => prev.map(tx => tx.id === t.id ? {
                  ...tx,
                  x: Math.max(5, Math.min(95, origX + (ev.clientX - startX) / rect.width * 100)),
                  y: Math.max(5, Math.min(95, origY + (ev.clientY - startY) / rect.height * 100)),
                } : tx));
              };
              const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
              window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
            }}
          >{t.text}</div>
        ))}

        {/* Crop overlay */}
        {tool === "crop" && (
          <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
            <div style={{ position:"absolute",
              left:`${cropBox.x*100}%`, top:`${cropBox.y*100}%`,
              width:`${cropBox.w*100}%`, height:`${cropBox.h*100}%`,
              border:"2px solid #FFFC00", boxShadow:"0 0 0 9999px rgba(0,0,0,0.55)" }}>
              <div style={{ position:"absolute", inset:0, display:"grid",
                gridTemplateColumns:"1fr 1fr 1fr", gridTemplateRows:"1fr 1fr 1fr" }}>
                {[...Array(9)].map((_,i) => (
                  <div key={i} style={{ border:"0.5px solid rgba(255,252,0,0.3)" }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Music badge */}
        {musicName && (
          <div style={{ position:"absolute", bottom:16, left:16,
            background:"rgba(0,0,0,0.75)", borderRadius:20, padding:"6px 14px",
            display:"flex", alignItems:"center", gap:6, backdropFilter:"blur(10px)" }}>
            <Music size={14} color={BRAND.yellow} />
            <span style={{ color:"#FFF", fontSize:12, maxWidth:160, overflow:"hidden",
              textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{musicName}</span>
          </div>
        )}

        {/* Top bar */}
        <div style={{ position:"absolute", top:0, left:0, right:0,
          padding:"12px 16px", display:"flex", justifyContent:"space-between",
          background:"linear-gradient(180deg,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0) 100%)" }}>
          <button onClick={onDiscard} style={{ background:"rgba(255,255,255,0.15)",
            border:"none", borderRadius:30, padding:"8px 16px",
            color:"#FFF", fontSize:14, cursor:"pointer" }}>✕ Discard</button>
          <button onClick={handleDone} style={{ background:BRAND.yellow,
            border:"none", borderRadius:30, padding:"8px 20px",
            color:"#000", fontWeight:700, fontSize:14, cursor:"pointer" }}>
            <Check size={16} style={{ display:"inline", marginRight:4 }} />Done
          </button>
        </div>
      </div>

      {/* Tool panel */}
      <div style={{ background:"#0A0A0A", borderTop:"0.5px solid #2C2C2C" }}>
        {/* Tool row */}
        <div style={{ display:"flex", justifyContent:"space-around", padding:"12px 8px 8px" }}>
          {[
            { id:"crop",  icon:<Scissors size={20}/>, label:"Snip" },
            { id:"text",  icon:<Type size={20}/>,     label:"Text" },
            { id:"paint", icon:<Pen size={20}/>,      label:"Paint" },
            { id:"music", icon:<Music size={20}/>,    label:"Music" },
          ].map(t => (
            <button key={t.id} onClick={() => setTool(tool === t.id ? null : t.id)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                background:"none", border:"none", cursor:"pointer",
                color: tool === t.id ? BRAND.yellow : "#858585",
                transition:"color 0.15s" }}>
              {t.icon}
              <span style={{ fontSize:10, fontFamily:"sans-serif" }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Sub-panels */}
        {tool === "text" && (
          <div style={{ padding:"8px 16px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", gap:8 }}>
              {["#FFFC00","#FFF","#FF3B30","#007AFF","#34C759","#FF9500"].map(c => (
                <button key={c} onClick={() => setTextColor(c)}
                  style={{ width:28, height:28, borderRadius:"50%", background:c, border:"none",
                    cursor:"pointer", outline: textColor === c ? `3px solid ${BRAND.yellow}` : "none",
                    outlineOffset:2 }} />
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={textInput} onChange={e => setTextInput(e.target.value)}
                placeholder="Add text..."
                onKeyDown={e => e.key === "Enter" && addText()}
                style={{ flex:1, background:"#1A1A1A", border:"none", borderRadius:20,
                  padding:"10px 16px", color:"#FFF", fontSize:15, outline:"none" }}
                autoFocus />
              <button onClick={addText} style={{ background:BRAND.yellow, border:"none",
                borderRadius:20, padding:"10px 18px", fontWeight:700, cursor:"pointer", color:"#000" }}>Add</button>
            </div>
          </div>
        )}

        {tool === "paint" && (
          <div style={{ padding:"8px 16px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {PAINT_COLORS.map(c => (
                <button key={c} onClick={() => setPaintColor(c)}
                  style={{ width:28, height:28, borderRadius:"50%", background:c,
                    border: c === "#FFF" ? "1px solid #333" : "none", cursor:"pointer",
                    outline: paintColor === c ? `3px solid ${BRAND.yellow}` : "none", outlineOffset:2 }} />
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ color:"#858585", fontSize:12 }}>Size</span>
              <input type="range" min={2} max={24} value={paintSize}
                onChange={e => setPaintSize(Number(e.target.value))}
                style={{ flex:1, accentColor:BRAND.yellow }} />
              <div style={{ width:paintSize*2, height:paintSize*2, borderRadius:"50%",
                background:paintColor, minWidth:4, minHeight:4 }} />
            </div>
          </div>
        )}

        {tool === "music" && (
          <div style={{ padding:"8px 16px 20px" }}>
            <button onClick={() => musicInputRef.current?.click()}
              style={{ width:"100%", padding:"14px", borderRadius:20,
                background:"#1A1A1A", border:"1.5px dashed #2C2C2C", cursor:"pointer",
                color:"#FFF", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              <Mic size={18} color={BRAND.yellow} />
              <span>Pick from local storage</span>
            </button>
            <input ref={musicInputRef} type="file" accept="audio/*"
              style={{ display:"none" }} onChange={handleMusicPick} />
            {musicName && (
              <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8 }}>
                <Music size={14} color={BRAND.yellow} />
                <span style={{ color:"#FFF", fontSize:13 }}>{musicName}</span>
                <button onClick={() => { setMusicFile(null); setMusicName(null);
                  if(audioRef.current){audioRef.current.pause();audioRef.current.src="";} }}
                  style={{ marginLeft:"auto", background:"none", border:"none",
                    color:"#858585", cursor:"pointer", fontSize:13 }}>Remove</button>
              </div>
            )}
          </div>
        )}

        {tool === "crop" && (
          <div style={{ padding:"8px 16px 20px", color:"#858585", fontSize:13, textAlign:"center" }}>
            Crop overlay active — tap Done to apply
          </div>
        )}
      </div>
      <audio ref={audioRef} loop style={{ display:"none" }} />
    </div>
  );
}

// ─── Record Button ────────────────────────────────────────────────────────────
function RecordButton({ onCapture, onRecordStart, onRecordStop, isRecording, progress }) {
  const holdTimer = useRef(null);
  const [holding, setHolding] = useState(false);

  const onPressStart = () => {
    setHolding(true);
    holdTimer.current = setTimeout(() => { onRecordStart(); }, 250);
  };
  const onPressEnd = () => {
    setHolding(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (isRecording) { onRecordStop(); }
    else { onCapture(); }
  };

  const circumference = 2 * Math.PI * 34;

  return (
    <div style={{ position:"relative", width:80, height:80 }}>
      {isRecording && (
        <svg style={{ position:"absolute", inset:0, transform:"rotate(-90deg)" }} width={80} height={80}>
          <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={4} />
          <circle cx={40} cy={40} r={34} fill="none" stroke={BRAND.red} strokeWidth={4}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress / 100)}
            style={{ transition:"stroke-dashoffset 0.3s linear" }} />
        </svg>
      )}
      <button
        onMouseDown={onPressStart} onMouseUp={onPressEnd} onMouseLeave={onPressEnd}
        onTouchStart={e => { e.preventDefault(); onPressStart(); }}
        onTouchEnd={e => { e.preventDefault(); onPressEnd(); }}
        style={{ position:"absolute", inset:8, borderRadius:"50%",
          background: isRecording ? BRAND.red : "#FFF",
          border: isRecording ? `3px solid ${BRAND.red}` : "3px solid rgba(255,255,255,0.3)",
          cursor:"pointer", transition:"all 0.15s ease",
          transform: holding && !isRecording ? "scale(0.9)" : "scale(1)" }}
      />
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function SnipChat() {
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);
  const animRef      = useRef(null);
  const mediaRecRef  = useRef(null);
  const recChunks    = useRef([]);
  const recTimer     = useRef(null);

  const [camState,     setCamState]     = useState(CAM_STATE.IDLE);
  const [activeFilter, setActiveFilter] = useState("normal");
  const [facingMode,   setFacingMode]   = useState("user");
  const [captured,     setCaptured]     = useState(null);   // { media, type }
  const [flash,        setFlash]        = useState(false);
  const [showChat,     setShowChat]     = useState(false);
  const [messages,     setMessages]     = useState([]);
  const [chatInput,    setChatInput]    = useState("");
  const [viewingSnip,  setViewingSnip]  = useState(null);
  const [showFilters,  setShowFilters]  = useState(false);
  const [isRecording,  setIsRecording]  = useState(false);
  const [recProgress,  setRecProgress]  = useState(0);
  const [editing,      setEditing]      = useState(false);
  const [savedSnaps,   setSavedSnaps]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("snipChat_saved") || "[]"); } catch { return []; }
  });
  const [showSaved, setShowSaved] = useState(false);

  const { toasts, toast } = useToast();
  const currentFilter = FILTERS.find(f => f.id === activeFilter);

  const startCamera = useCallback(async (mode) => {
    const m = mode ?? facingMode;
    setCamState(CAM_STATE.ASKING);
    streamRef.current?.getTracks().forEach(t => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: m, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamState(CAM_STATE.GRANTED);
    } catch { setCamState(CAM_STATE.DENIED); }
  }, [facingMode]);

  useEffect(() => { startCamera(); }, [startCamera]);

  // Canvas draw loop
  useEffect(() => {
    if (camState !== CAM_STATE.GRANTED) return;
    const draw = () => {
      const video = videoRef.current, canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        const { videoWidth: vw, videoHeight: vh } = video;
        const side = Math.min(vw, vh);
        const sx = (vw - side) / 2, sy = (vh - side) / 2;
        ctx.filter = currentFilter?.css || "none";
        if (facingMode === "user") {
          ctx.save(); ctx.scale(-1, 1);
          ctx.drawImage(video, sx, sy, side, side, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();
        } else {
          ctx.drawImage(video, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [camState, currentFilter, facingMode]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(animRef.current);
  }, []);

  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setFlash(true); setTimeout(() => setFlash(false), 200);
    setCaptured({ media: canvas.toDataURL("image/png"), type: "photo" });
    toast("Snap taken!", { icon: "📸" });
  };

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    recChunks.current = [];
    let mimeType = "video/webm;codecs=vp8,opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "video/webm";
    const mr = new MediaRecorder(streamRef.current, { mimeType });
    mr.ondataavailable = e => { if (e.data.size > 0) recChunks.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(recChunks.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setCaptured({ media: url, type: "video" });
      toast("Video saved!", { icon: "🎥" });
    };
    mr.start(100);
    mediaRecRef.current = mr;
    setIsRecording(true);
    setRecProgress(0);

    let elapsed = 0;
    recTimer.current = setInterval(() => {
      elapsed += 0.3;
      setRecProgress((elapsed / MAX_VIDEO_SEC) * 100);
      if (elapsed >= MAX_VIDEO_SEC) stopRecording();
    }, 300);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecRef.current?.state !== "inactive") mediaRecRef.current?.stop();
    clearInterval(recTimer.current);
    setIsRecording(false);
    setRecProgress(0);
  }, []);

  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
    toast(next === "user" ? "Front cam" : "Back cam", { icon: "🔄" });
  };

  const saveToStorage = (media, type) => {
    const snap = { id: Date.now(), media, type };
    setSavedSnaps(prev => {
      const updated = [snap, ...prev].slice(0, 50);
      try { localStorage.setItem("snipChat_saved", JSON.stringify(updated)); } catch {}
      return updated;
    });
    toast("Saved to gallery!", { icon: "💾" });
  };

  const downloadSnap = (media, type) => {
    const a = document.createElement("a");
    a.href = media;
    a.download = `snip_${Date.now()}.${type === "video" ? "webm" : "png"}`;
    a.click();
    toast("Downloading...", { icon: "⬇️" });
  };

  const sendSnip = (media, type) => {
    if (!media) return;
    const newMsg = { id: Date.now(), media, type, text: chatInput,
      time: Date.now(), expires: Date.now() + 86400000, viewed: false };
    setMessages(prev => [newMsg, ...prev]);
    setChatInput("");
    setCaptured(null);
    setEditing(false);
    setShowChat(true);
    toast("Sent!", { icon: "✈️" });
  };

  const viewSnip = (msg) => {
    setViewingSnip(msg);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, viewed: true } : m));
  };

  const unviewedCount = messages.filter(m => !m.viewed).length;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; background: #000; }
        ::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes toastPop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes recPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,48,0.6); } 50% { box-shadow: 0 0 0 8px rgba(255,59,48,0); } }
      `}</style>

      <div style={{ width:"100%", maxWidth:450, margin:"0 auto", height:"100dvh",
        background:"#000", position:"relative", overflow:"hidden" }}>

        {camState !== CAM_STATE.GRANTED && <PermissionGate state={camState} onRequest={() => startCamera()} />}
        <ToastContainer toasts={toasts} />

        {/* Top bar */}
        <div style={{ position:"absolute", top:0, left:0, right:0, padding:"12px 16px",
          display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:10,
          background:"linear-gradient(180deg,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0) 100%)" }}>
          <div style={{ display:"flex", gap:14, alignItems:"center" }}>
            <SnipLogo size={28} />
          </div>
          <div style={{ display:"flex", gap:14, alignItems:"center" }}>
            <button onClick={() => setShowSaved(true)} style={{ background:"none", border:"none",
              cursor:"pointer", position:"relative" }} title="Saved snaps">
              <span style={{ fontSize:12, fontWeight:600, color:"#FFF", letterSpacing:0.3 }}>SAVED</span>
              {savedSnaps.length > 0 && (
                <span style={{ position:"absolute", top:-6, right:-8, background:BRAND.yellow,
                  color:"#000", borderRadius:10, padding:"2px 5px", fontSize:10, fontWeight:700 }}>
                  {savedSnaps.length}
                </span>
              )}
            </button>
            <button onClick={() => setShowChat(true)} style={{ background:"none", border:"none",
              cursor:"pointer", position:"relative" }}>
              <MessageCircle size={22} color="#FFF" strokeWidth={1.5} />
              {unviewedCount > 0 && (
                <span style={{ position:"absolute", top:-6, right:-8, background:BRAND.red,
                  color:"#FFF", borderRadius:10, padding:"2px 6px", fontSize:10, fontWeight:700 }}>
                  {unviewedCount}
                </span>
              )}
            </button>
            <button style={{ background:"none", border:"none", cursor:"pointer" }}>
              <Zap size={22} color="#FFF" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Camera viewfinder */}
        <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
          <video ref={videoRef} playsInline muted style={{ display:"none" }} />
          <canvas ref={canvasRef} width={800} height={800}
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          <div style={{ position:"absolute", inset:0, background:"#FFF",
            opacity: flash ? 1 : 0, transition:"opacity 0.15s ease", pointerEvents:"none" }} />
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div style={{ position:"absolute", top:60, left:"50%", transform:"translateX(-50%)",
            background:"rgba(0,0,0,0.7)", borderRadius:20, padding:"6px 16px",
            display:"flex", alignItems:"center", gap:8, zIndex:15 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:BRAND.red,
              animation:"recPulse 1s infinite" }} />
            <span style={{ color:"#FFF", fontSize:13, fontWeight:600 }}>
              `${Math.floor((recProgress/100*MAX_VIDEO_SEC)/60)}:${String(Math.round((recProgress/100*MAX_VIDEO_SEC)%60)).padStart(2,"0")} / 3:00`
            </span>
          </div>
        )}

        {/* Filter carousel */}
        {showFilters && camState === CAM_STATE.GRANTED && !captured && (
          <FilterCarousel filters={FILTERS} activeId={activeFilter}
            onSelect={setActiveFilter} videoRef={videoRef} />
        )}

        {/* Bottom controls */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0,
          padding:"20px 24px 40px",
          background:"linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.4) 100%)",
          display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:10 }}>
          <button onClick={() => setShowFilters(!showFilters)}
            style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:30,
              width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", backdropFilter:"blur(10px)",
              boxShadow: showFilters ? `0 0 12px ${BRAND.yellow}88` : "none" }}>
            <Sparkles size={20} color={showFilters ? BRAND.yellow : "#FFF"} />
          </button>

          <RecordButton
            onCapture={handleCapture}
            onRecordStart={startRecording}
            onRecordStop={stopRecording}
            isRecording={isRecording}
            progress={recProgress}
          />

          <button onClick={flipCamera}
            style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:30,
              width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", backdropFilter:"blur(10px)" }}>
            <RefreshCw size={20} color="#FFF" />
          </button>
        </div>

        {/* Hint */}
        {camState === CAM_STATE.GRANTED && !captured && (
          <div style={{ position:"absolute", bottom:120, left:0, right:0,
            textAlign:"center", color:"rgba(255,255,255,0.55)", fontSize:12,
            pointerEvents:"none", zIndex:10 }}>
            Tap to snap · Hold to record (max 3 min)
          </div>
        )}

        {/* Preview / Send screen */}
        {captured && !editing && (
          <div style={{ position:"absolute", inset:0, zIndex:50, background:"#000",
            display:"flex", flexDirection:"column", animation:"slideUp 0.3s ease" }}>
            <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
              {captured.type === "video"
                ? <video src={captured.media} style={{ width:"100%", height:"100%", objectFit:"cover" }}
                    muted autoPlay loop />
                : <img src={captured.media} alt="preview"
                    style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              }
              {/* Edit button overlay */}
              <button onClick={() => setEditing(true)}
                style={{ position:"absolute", top:16, right:16,
                  background:"rgba(0,0,0,0.6)", border:"1px solid rgba(255,255,255,0.2)",
                  borderRadius:20, padding:"8px 16px", color:"#FFF",
                  fontSize:13, cursor:"pointer", backdropFilter:"blur(10px)",
                  display:"flex", alignItems:"center", gap:6 }}>
                <Scissors size={14} color={BRAND.yellow} /> Edit
              </button>
            </div>

            <div style={{ padding:20, background:"#000" }}>
              <input type="text" placeholder="Add caption..."
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                style={{ width:"100%", background:"#1A1A1A", border:"none", borderRadius:30,
                  padding:"14px 20px", color:"#FFF", fontSize:16, outline:"none" }} />
              <div style={{ display:"flex", gap:10, marginTop:14 }}>
                <button onClick={() => setCaptured(null)}
                  style={{ flex:1, padding:"13px", borderRadius:30, background:"#2C2C2C",
                    border:"none", color:"#FFF", fontWeight:600, cursor:"pointer", fontSize:14 }}>
                  Retake
                </button>
                <button onClick={() => saveToStorage(captured.media, captured.type)}
                  style={{ width:50, height:50, borderRadius:30, flexShrink:0,
                    background:"#1A1A1A", border:"1px solid #2C2C2C",
                    display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
                  title="Save to gallery">
                  <Download size={18} color={BRAND.yellow} />
                </button>
                <button onClick={() => sendSnip(captured.media, captured.type)}
                  style={{ flex:1.5, padding:"13px", borderRadius:30, background:BRAND.yellow,
                    border:"none", color:"#000", fontWeight:700, cursor:"pointer", fontSize:14,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <Share2 size={16} /> Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit screen */}
        {captured && editing && (
          <EditScreen
            media={captured.media}
            mediaType={captured.type}
            toast={toast}
            onDiscard={() => setEditing(false)}
            onDone={(newMedia, _texts, _music) => {
              setCaptured({ media: newMedia, type: captured.type });
              setEditing(false);
              toast("Edits applied!", { icon: "✂️" });
            }}
          />
        )}

        {showSaved && <SavedGallery snaps={savedSnaps} onClose={() => setShowSaved(false)} />}
        {showChat && <ChatOverlay messages={messages} onClose={() => setShowChat(false)} onViewSnip={viewSnip} />}
        {viewingSnip && <SnipViewer snip={viewingSnip} onClose={() => setViewingSnip(null)} />}
      </div>
    </>
  );
}
