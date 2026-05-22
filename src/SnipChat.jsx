import { useState, useRef, useEffect, useCallback, memo } from "react";
import { CameraPreview } from "@capacitor-community/camera-preview";
import { MessageCircle, User, RefreshCw, X, Zap, Sparkles, Download, Scissors, Type, Pen, Music, Share2, Check, Mic, Smile, Trash2, ChevronUp, ChevronDown, RotateCcw, Eye } from "lucide-react";

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
    <div style={{ position:"absolute", top:70, left:0, right:0, zIndex:200,
      display:"flex", flexDirection:"column", gap:8, pointerEvents:"none", alignItems:"center" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background:"rgba(20,20,20,0.92)",
          backdropFilter:"blur(24px)",
          WebkitBackdropFilter:"blur(24px)",
          borderRadius:14,
          padding:"10px 20px",
          display:"flex", alignItems:"center", gap:10,
          border:"1px solid rgba(255,255,255,0.08)",
          boxShadow:"0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
          animation:"toastSlide 0.3s cubic-bezier(0.34,1.2,0.64,1)",
          minWidth:140, maxWidth:280,
        }}>
          <span style={{ fontSize:18, lineHeight:1 }}>{t.icon}</span>
          <span style={{ color:"#FFF", fontSize:13, fontWeight:600,
            fontFamily:"'DM Sans',-apple-system,sans-serif", letterSpacing:"0.1px" }}>{t.message}</span>
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

// ─── Filter Carousel — weird-edged polygon shapes ─────────────────────────────
// Each filter gets a unique clip-path polygon; all same size except active
const CLIP_SHAPES = [
  "polygon(50% 0%, 95% 15%, 100% 60%, 80% 100%, 20% 100%, 0% 60%, 5% 15%)",   // heptagon-ish
  "polygon(50% 0%, 100% 30%, 90% 90%, 50% 100%, 10% 90%, 0% 30%)",             // hex squish
  "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)", // octagon
  "polygon(50% 0%, 85% 10%, 100% 50%, 85% 90%, 50% 100%, 15% 90%, 0% 50%, 15% 10%)", // smooth oct
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",             // diamond hex
  "polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)", // chamfer rect
  "polygon(50% 0%, 90% 20%, 100% 65%, 70% 100%, 30% 100%, 0% 65%, 10% 20%)",   // leaning blob
];

const FILTER_SIZE = 62; // uniform base size
const FILTER_SIZE_ACTIVE = 74; // active is bigger

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
      display:"flex", gap:8, padding:"0 16px 8px", scrollbarWidth:"none", WebkitOverflowScrolling:"touch",
      zIndex:20, alignItems:"center" }}>
      {filters.map((filter, i) => {
        const active = activeId === filter.id;
        const sz = active ? FILTER_SIZE_ACTIVE : FILTER_SIZE;
        const clipShape = CLIP_SHAPES[i % CLIP_SHAPES.length];
        return (
          <button key={filter.id} onClick={() => onSelect(filter.id)}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5,
              background:"none", border:"none", cursor:"pointer", flexShrink:0,
              transition:"all 0.22s cubic-bezier(0.34,1.3,0.64,1)" }}>
            {/* Outer glow ring — clipped to same shape */}
            <div style={{
              width: sz + (active ? 6 : 0),
              height: sz + (active ? 6 : 0),
              clipPath: clipShape,
              background: active ? BRAND.yellow : "rgba(255,255,255,0.18)",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.22s cubic-bezier(0.34,1.3,0.64,1)",
              flexShrink:0,
            }}>
              {/* Inner media tile */}
              <div style={{
                width: sz - (active ? 4 : 3),
                height: sz - (active ? 4 : 3),
                clipPath: clipShape,
                overflow:"hidden",
                background:"#1A1A1A",
                boxShadow: active ? `0 0 20px ${BRAND.yellow}66` : "none",
              }}>
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
            </div>
            <span style={{ fontSize:10, fontWeight: active ? 700 : 500,
              color: active ? BRAND.yellow : "rgba(255,255,255,0.65)",
              fontFamily:"'SF Pro Text',-apple-system,sans-serif", whiteSpace:"nowrap",
              letterSpacing: active ? "0.3px" : 0,
              transition:"all 0.2s" }}>
              {filter.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Permission Gate ──────────────────────────────────────────────────────────
function SplashScreen({ state }) {
  if (state === CAM_STATE.GRANTED) return null;
  return (
    <div style={{ position:"absolute", inset:0, zIndex:100, background:"#000",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      gap:16, pointerEvents:"none",
      transition:"opacity 0.4s ease",
      opacity: state === CAM_STATE.ASKING ? 1 : 0 }}>
      <SnipLogo size={72} />
      <h1 style={{ fontSize:26, fontWeight:800, color:BRAND.yellow, letterSpacing:"-0.5px", margin:0 }}>SnipChat</h1>
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
// ─── Sticker data ─────────────────────────────────────────────────────────────
const STICKERS = ["🔥","✨","💥","⚡","🎉","💯","🤩","😍","💀","👻","🌈","🍕","🎵","❤️","💔","🌙","⭐","🦋","🎯","🏆"];
const TEXT_STYLES = [
  { id:"normal",  label:"Plain",   render:(t,c) => ({ color:c, textShadow:"0 2px 8px rgba(0,0,0,0.8)", WebkitTextStroke:"0.5px rgba(0,0,0,0.4)" }) },
  { id:"outline", label:"Outline", render:(t,c) => ({ color:"#000", WebkitTextStroke:`2px ${c}`, textShadow:"none" }) },
  { id:"glow",    label:"Glow",    render:(t,c) => ({ color:"#fff", textShadow:`0 0 12px ${c}, 0 0 24px ${c}, 0 2px 4px rgba(0,0,0,0.9)` }) },
  { id:"shadow",  label:"Shadow",  render:(t,c) => ({ color:c, textShadow:"3px 3px 0px rgba(0,0,0,0.9)", WebkitTextStroke:"0.5px rgba(0,0,0,0.3)" }) },
  { id:"fill",    label:"Fill",    render:(t,c) => ({ color:"#fff", background:c, padding:"2px 10px", borderRadius:6, textShadow:"none" }) },
];

// ─── Audio + Video muxer ───────────────────────────────────────────────────────
// Mixes an audio track into a video blob using WebAudio → AudioContext → mux.
// For photos, encodes canvas + audio into a short webm via MediaRecorder.
async function muxAudioIntoVideo(videoBlob, audioUrl, durationSec) {
  try {
    // Decode the audio
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioResp = await fetch(audioUrl);
    const audioArrayBuf = await audioResp.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(audioArrayBuf);

    // Create an OfflineAudioContext for rendering
    const sampleRate = audioBuffer.sampleRate;
    const durationToUse = durationSec || 5;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * durationToUse), sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(offlineCtx.destination);
    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();
    await audioCtx.close();

    // Convert rendered audio to WAV blob
    const wavBlob = audioBufferToWav(renderedBuffer);
    const wavUrl = URL.createObjectURL(wavBlob);

    // Now combine: use canvas + audio stream via MediaRecorder
    const videoEl = document.createElement("video");
    videoEl.src = URL.createObjectURL(videoBlob);
    videoEl.muted = true;
    await new Promise(r => { videoEl.onloadedmetadata = r; videoEl.load(); });

    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth || 800;
    canvas.height = videoEl.videoHeight || 800;
    const ctx = canvas.getContext("2d");

    // Audio destination stream
    const audioCtx2 = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioCtx2.createMediaStreamDestination();
    
    // Decode and play audio via buffer source instead of Audio element
    const audioResp2 = await fetch(audioUrl);
    const audioBuf = await audioResp2.blob();
    const decodedBuf = await audioCtx2.decodeAudioData(await audioBuf.arrayBuffer());
    const src = audioCtx2.createBufferSource();
    src.buffer = decodedBuf;
    src.loop = true;
    src.connect(dest);
    src.start(0);

    const canvasStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus" : "video/webm";
    const recorder = new MediaRecorder(combinedStream, { mimeType });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    return new Promise((resolve) => {
      recorder.onstop = () => {
        audioCtx2.close();
        const finalBlob = new Blob(chunks, { type: mimeType });
        resolve(URL.createObjectURL(finalBlob));
      };

      const draw = () => {
        if (videoEl.ended || videoEl.paused) return;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
      };

      recorder.start(100);
      videoEl.play().then(() => {
        draw();
        const dur = (videoEl.duration || durationToUse) * 1000;
        setTimeout(() => { recorder.stop(); videoEl.pause(); }, dur);
      }).catch(err => {
        console.warn("Video playback failed:", err);
        recorder.stop();
      });
    });
  } catch (err) {
    console.warn("Audio mux failed, returning original:", err);
    return URL.createObjectURL(videoBlob);
  }
}

// Photo + audio → short video clip
async function photoWithAudioToVideo(imageDataUrl, audioUrl, durationSec = 5) {
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imageDataUrl; });

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    
    // Load and decode audio to ensure it plays
    const audioResp = await fetch(audioUrl);
    const audioBlob = await audioResp.blob();
    const audioBuffer = await audioCtx.decodeAudioData(await audioBlob.arrayBuffer());
    
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(dest);
    source.start(0);

    const canvasStream = canvas.captureStream(30);
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus" : "video/webm";
    const recorder = new MediaRecorder(combined, { mimeType });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    return new Promise(resolve => {
      recorder.onstop = () => {
        audioCtx.close();
        resolve({ url: URL.createObjectURL(new Blob(chunks, { type: mimeType })), type: "video" });
      };
      recorder.start(100);
      setTimeout(() => { recorder.stop(); }, durationSec * 1000);
    });
  } catch (err) {
    console.warn("Photo+audio encode failed:", err);
    return { url: imageDataUrl, type: "photo" };
  }
}

// Simple WAV encoder from AudioBuffer
function audioBufferToWav(buffer) {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const arrayBuffer = new ArrayBuffer(44 + length * numCh * 2);
  const view = new DataView(arrayBuffer);
  const writeStr = (off, str) => { for (let i=0;i<str.length;i++) view.setUint8(off+i, str.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + length * numCh * 2, true);
  writeStr(8, "WAVE"); writeStr(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * 2, true); view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true); writeStr(36, "data");
  view.setUint32(40, length * numCh * 2, true);
  let off = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return new Blob([arrayBuffer], { type: "audio/wav" });
}

// ─── EditScreen ───────────────────────────────────────────────────────────────
function EditScreen({ media, mediaType, onDone, onDiscard, toast }) {
  const canvasRef   = useRef(null);
  const audioRef    = useRef(null);
  const musicInputRef = useRef(null);
  const wrapRef     = useRef(null);
  const lastPoint   = useRef(null);
  const historyRef  = useRef([]);   // undo stack of canvas imageData snapshots

  const [tool,       setTool]       = useState(null);
  const [painting,   setPainting]   = useState(false);
  const [paintColor, setPaintColor] = useState("#FF3B30");
  const [paintSize,  setPaintSize]  = useState(8);
  const [paintMode,  setPaintMode]  = useState("pen");  // "pen"|"neon"|"eraser"
  const [texts,      setTexts]      = useState([]);
  const [stickers,   setStickers]   = useState([]);
  const [textInput,  setTextInput]  = useState("");
  const [textColor,  setTextColor]  = useState("#FFFC00");
  const [textStyle,  setTextStyle]  = useState("normal");
  const [textSize,   setTextSize]   = useState(26);
  const [musicFile,  setMusicFile]  = useState(null);
  const [musicName,  setMusicName]  = useState(null);
  const [musicVol,   setMusicVol]   = useState(0.8);
  const [musicStart, setMusicStart] = useState(0);
  const [audioPeaks, setAudioPeaks] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [selectedText, setSelectedText] = useState(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast,   setContrast]   = useState(100);
  const [saturation, setSaturation] = useState(100);

  // Load image onto canvas
  useEffect(() => {
    if (mediaType !== "photo") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.width  = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      historyRef.current = [];
    };
    img.src = media;
  }, [media, mediaType]);

  // Visualise audio waveform peaks
  const analyseAudio = async (url) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await (await fetch(url)).arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      await ctx.close();
      const data = decoded.getChannelData(0);
      const buckets = 40;
      const step = Math.floor(data.length / buckets);
      const peaks = [];
      for (let i = 0; i < buckets; i++) {
        let max = 0;
        for (let j = 0; j < step; j++) max = Math.max(max, Math.abs(data[i * step + j]));
        peaks.push(max);
      }
      setAudioPeaks(peaks);
    } catch { setAudioPeaks([]); }
  };

  const pushHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const snap = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = [...historyRef.current.slice(-19), snap];
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    canvas.getContext("2d").putImageData(prev, 0, 0);
  };

  // ── Paint handlers ──
  const handlePaintStart = (e) => {
    if (tool !== "paint") return;
    pushHistory();
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

    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (paintMode === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = paintSize * 3 * scaleX;
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (paintMode === "neon") {
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowColor = paintColor;
      ctx.shadowBlur = 18;
      ctx.lineWidth = paintSize * scaleX;
      ctx.strokeStyle = paintColor;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;
      ctx.lineWidth = paintSize * scaleX;
      ctx.strokeStyle = paintColor;
    }
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
    lastPoint.current = { x, y };
  };

  // ── Text ──
  const addText = () => {
    if (!textInput.trim()) return;
    setTexts(prev => [...prev, {
      id: Date.now(), text: textInput, color: textColor,
      style: textStyle, size: textSize, x: 50, y: 42, rotation: 0,
    }]);
    setTextInput(""); setTool(null);
  };

  const deleteText = (id) => setTexts(prev => prev.filter(t => t.id !== id));

  const makeDraggable = (id, e, isTouch) => {
    e.preventDefault();
    setSelectedText(id);
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;
    const item = texts.find(t => t.id === id) || stickers.find(s => s.id === id);
    if (!item) return;
    const origX = item.x, origY = item.y;
    const wrap = wrapRef.current;
    const rect = wrap ? wrap.getBoundingClientRect() : document.body.getBoundingClientRect();

    const onMove = (ev) => {
      const cx = isTouch ? ev.touches[0].clientX : ev.clientX;
      const cy = isTouch ? ev.touches[0].clientY : ev.clientY;
      const nx = Math.max(4, Math.min(96, origX + (cx - startX) / rect.width * 100));
      const ny = Math.max(4, Math.min(96, origY + (cy - startY) / rect.height * 100));
      setTexts(prev => prev.map(t => t.id === id ? {...t, x:nx, y:ny} : t));
      setStickers(prev => prev.map(s => s.id === id ? {...s, x:nx, y:ny} : s));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive:false });
    window.addEventListener("touchend", onUp);
  };

  // ── Music ──
  const handleMusicPick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMusicFile(url);
    setMusicName(file.name.replace(/\.[^.]+$/, ""));
    analyseAudio(url);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.currentTime = musicStart;
      audioRef.current.volume = musicVol;
      // Try to play, but handle autoplay restrictions gracefully
      audioRef.current.play().catch(err => {
        console.warn("Audio autoplay blocked (browser policy):", err);
        // Audio will play when user interacts with controls
      });
    }
    toast(`🎵 ${file.name.replace(/\.[^.]+$/, "")}`, { icon:"🎵" });
    setTool(null);
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicVol;
  }, [musicVol]);

  useEffect(() => {
    if (audioRef.current && musicFile) audioRef.current.currentTime = musicStart;
  }, [musicStart, musicFile]);

  // ── Done / export ──
  const handleDone = async () => {
    setProcessing(true);
    toast("Processing...", { icon:"⚙️" });

    // Bake text + stickers onto canvas (photo only)
    const bakeOverlays = (canvas) => {
      const ctx = canvas.getContext("2d");
      texts.forEach(t => {
        const styleObj = TEXT_STYLES.find(s => s.id === t.style) || TEXT_STYLES[0];
        const style = styleObj.render(t.text, t.color);
        const fontSize = t.size * (canvas.width / 400);
        ctx.save();
        ctx.font = `bold ${fontSize}px 'DM Sans', sans-serif`;
        ctx.textAlign = "center";
        const x = (t.x / 100) * canvas.width;
        const y = (t.y / 100) * canvas.height;
        ctx.translate(x, y);
        if (t.rotation) ctx.rotate(t.rotation * Math.PI / 180);
        if (style.textShadow && style.textShadow.includes("px")) {
          const parts = style.textShadow.match(/(-?\d+)px (-?\d+)px (\d+)px ([^\s,]+)/);
          if (parts) { ctx.shadowOffsetX=+parts[1]; ctx.shadowOffsetY=+parts[2]; ctx.shadowBlur=+parts[3]; ctx.shadowColor=parts[4]; }
        }
        if (style.WebkitTextStroke) {
          const sw = parseFloat(style.WebkitTextStroke);
          ctx.strokeStyle = style.WebkitTextStroke.replace(/^[\d.]+px /, "");
          ctx.lineWidth = sw * 2; ctx.strokeText(t.text, 0, 0);
        }
        ctx.fillStyle = style.color || t.color;
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
      });
      stickers.forEach(s => {
        const sz = s.size * (canvas.width / 400);
        const x = (s.x / 100) * canvas.width;
        const y = (s.y / 100) * canvas.height;
        ctx.save();
        ctx.font = `${sz}px serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(s.emoji, x, y);
        ctx.restore();
      });
    };

    try {
      if (mediaType === "photo") {
        // Apply adjust filters
        const canvas = canvasRef.current;
        const tmp = document.createElement("canvas");
        tmp.width = canvas.width; tmp.height = canvas.height;
        const ctx = tmp.getContext("2d");
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = "none";
        bakeOverlays(tmp);
        const finalDataUrl = tmp.toDataURL("image/png");

        if (musicFile) {
          const result = await photoWithAudioToVideo(finalDataUrl, musicFile, 5);
          setProcessing(false);
          onDone(result.url, result.type, musicFile, musicStart, musicVol);
        } else {
          setProcessing(false);
          onDone(finalDataUrl, "photo", null, 0, 1);
        }
      } else {
        // Video path
        if (musicFile) {
          const videoResp = await fetch(media);
          const videoBlob = await videoResp.blob();
          const videoDur = await new Promise(res => {
            const v = document.createElement("video");
            v.src = media; v.onloadedmetadata = () => res(v.duration); v.load();
          });
          const muxed = await muxAudioIntoVideo(videoBlob, musicFile, videoDur);
          setProcessing(false);
          onDone(muxed, "video", musicFile, musicStart, musicVol);
        } else {
          setProcessing(false);
          onDone(media, "video", null, 0, 1);
        }
      }
    } catch (err) {
      console.error(err);
      setProcessing(false);
      toast("Export failed", { icon:"❌" });
    }
  };

  const PAINT_COLORS = ["#FF3B30","#FF9500","#FFFC00","#34C759","#007AFF","#AF52DE","#FF2D78","#FFF","#000"];

  const currentTextStyleObj = TEXT_STYLES.find(s => s.id === textStyle) || TEXT_STYLES[0];

  return (
    <div style={{ position:"absolute", inset:0, zIndex:55, background:"#000",
      display:"flex", flexDirection:"column", animation:"slideUp 0.25s ease" }}>

      {/* ── Media area ── */}
      <div ref={wrapRef} style={{ flex:1, position:"relative", overflow:"hidden",
        filter: mediaType === "photo"
          ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
          : "none" }}>

        {mediaType === "video"
          ? <video src={media} style={{ width:"100%", height:"100%", objectFit:"cover" }} muted autoPlay loop />
          : <canvas ref={canvasRef}
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block",
                cursor: tool === "paint" ? (paintMode === "eraser" ? "cell" : "crosshair") : "default",
                touchAction: tool === "paint" ? "none" : "auto" }}
              onMouseDown={handlePaintStart} onMouseMove={handlePaintMove} onMouseUp={() => setPainting(false)}
              onTouchStart={handlePaintStart} onTouchMove={handlePaintMove} onTouchEnd={() => setPainting(false)}
            />
        }

        {/* Draggable text overlays */}
        {texts.map(t => {
          const styleObj = TEXT_STYLES.find(s => s.id === t.style) || TEXT_STYLES[0];
          const styleProps = styleObj.render(t.text, t.color);
          return (
            <div key={t.id}
              style={{ position:"absolute", left:`${t.x}%`, top:`${t.y}%`,
                transform:`translate(-50%,-50%) rotate(${t.rotation||0}deg)`,
                cursor:"move", userSelect:"none",
                fontFamily:"'DM Sans',sans-serif", fontWeight:700,
                fontSize: t.size || 26, whiteSpace:"nowrap",
                ...styleProps,
                outline: selectedText === t.id ? `2px dashed ${BRAND.yellow}` : "none",
                outlineOffset:4, borderRadius: styleProps.borderRadius || 0,
              }}
              onMouseDown={e => makeDraggable(t.id, e, false)}
              onTouchStart={e => makeDraggable(t.id, e, true)}
              onDoubleClick={() => deleteText(t.id)}
            >
              {t.text}
              {selectedText === t.id && (
                <span onClick={(e) => { e.stopPropagation(); deleteText(t.id); }}
                  style={{ position:"absolute", top:-12, right:-12, background:BRAND.red,
                    borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:12, cursor:"pointer", color:"#fff", fontWeight:900 }}>✕</span>
              )}
            </div>
          );
        })}

        {/* Draggable stickers */}
        {stickers.map(s => (
          <div key={s.id}
            style={{ position:"absolute", left:`${s.x}%`, top:`${s.y}%`,
              transform:"translate(-50%,-50%)", cursor:"move", userSelect:"none",
              fontSize: s.size || 40, lineHeight:1,
              filter: selectedText === s.id ? `drop-shadow(0 0 8px ${BRAND.yellow})` : "none",
            }}
            onMouseDown={e => makeDraggable(s.id, e, false)}
            onTouchStart={e => makeDraggable(s.id, e, true)}
            onDoubleClick={() => setStickers(prev => prev.filter(x => x.id !== s.id))}
          >
            {s.emoji}
            {selectedText === s.id && (
              <span onClick={(e) => { e.stopPropagation(); setStickers(prev => prev.filter(x => x.id !== s.id)); }}
                style={{ position:"absolute", top:-10, right:-10, background:BRAND.red,
                  borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:11, cursor:"pointer", color:"#fff" }}>✕</span>
            )}
          </div>
        ))}

        {/* Music waveform badge */}
        {musicName && (
          <div style={{ position:"absolute", bottom:14, left:14, right:14,
            background:"rgba(0,0,0,0.72)", borderRadius:16,
            padding:"8px 14px", display:"flex", alignItems:"center", gap:10,
            backdropFilter:"blur(16px)", border:"0.5px solid rgba(255,255,255,0.12)" }}>
            <Music size={14} color={BRAND.yellow} style={{ flexShrink:0 }} />
            {/* Waveform visualiser */}
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:1.5, height:22, overflow:"hidden" }}>
              {(audioPeaks.length ? audioPeaks : Array(40).fill(0.3)).map((p, i) => (
                <div key={i} style={{
                  flex:1, borderRadius:2,
                  height: `${Math.max(15, p * 100)}%`,
                  background: i / audioPeaks.length < musicStart / 30
                    ? "rgba(255,252,0,0.9)"
                    : "rgba(255,255,255,0.35)",
                  transition:"height 0.1s",
                }} />
              ))}
            </div>
            <span style={{ color:"rgba(255,255,255,0.7)", fontSize:11, flexShrink:0,
              maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {musicName}
            </span>
          </div>
        )}

        {/* Top bar */}
        <div style={{ position:"absolute", top:0, left:0, right:0,
          padding:"48px 14px 14px",
          background:"linear-gradient(180deg,rgba(0,0,0,0.6) 0%,transparent 100%)",
          display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <button onClick={onDiscard}
            style={{ background:"rgba(0,0,0,0.45)", border:"0.5px solid rgba(255,255,255,0.2)",
              backdropFilter:"blur(10px)", borderRadius:24, padding:"8px 16px",
              color:"#FFF", fontSize:13, fontWeight:600, cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif" }}>✕ Discard</button>

          <div style={{ display:"flex", gap:8 }}>
            {mediaType === "photo" && (
              <button onClick={undo}
                style={{ background:"rgba(0,0,0,0.45)", border:"0.5px solid rgba(255,255,255,0.15)",
                  backdropFilter:"blur(10px)", borderRadius:24, width:38, height:38,
                  display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <RotateCcw size={16} color="#FFF" />
              </button>
            )}
            <button onClick={handleDone} disabled={processing}
              style={{ background: processing ? "#666" : BRAND.yellow,
                border:"none", borderRadius:24, padding:"8px 20px",
                color:"#000", fontWeight:700, fontSize:14, cursor: processing ? "default" : "pointer",
                fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:6,
                transition:"background 0.2s" }}>
              {processing
                ? <><span style={{ fontSize:16 }}>⏳</span> Saving...</>
                : <><Check size={15} /> Done</>}
            </button>
          </div>
        </div>

        {/* Tap-to-deselect */}
        {selectedText && (
          <div style={{ position:"absolute", inset:0, zIndex:-1 }}
            onClick={() => setSelectedText(null)} />
        )}
      </div>

      {/* ── Tool panel ── */}
      <div style={{ background:"#0C0C0C", borderTop:"0.5px solid rgba(255,255,255,0.08)" }}>

        {/* Tool row */}
        <div style={{ display:"flex", justifyContent:"space-around", padding:"10px 4px 6px" }}>
          {[
            { id:"text",   icon:<Type size={19}/>,    label:"Text" },
            { id:"paint",  icon:<Pen size={19}/>,     label:"Draw" },
            { id:"sticker",icon:<Smile size={19}/>,   label:"Sticker" },
            { id:"adjust", icon:<Sparkles size={19}/>,label:"Adjust" },
            { id:"music",  icon:<Music size={19}/>,   label:"Sound" },
          ].map(t => (
            <button key={t.id} onClick={() => setTool(tool === t.id ? null : t.id)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                background: tool === t.id ? "rgba(255,252,0,0.12)" : "none",
                border: tool === t.id ? `1px solid rgba(255,252,0,0.3)` : "1px solid transparent",
                borderRadius:12, padding:"6px 10px",
                cursor:"pointer", color: tool === t.id ? BRAND.yellow : "#666",
                transition:"all 0.15s", minWidth:52 }}>
              {t.icon}
              <span style={{ fontSize:9, fontFamily:"'DM Sans',sans-serif", fontWeight:600, letterSpacing:"0.3px" }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Text panel ── */}
        {tool === "text" && (
          <div style={{ padding:"10px 14px 16px", display:"flex", flexDirection:"column", gap:10,
            borderTop:"0.5px solid rgba(255,255,255,0.06)" }}>
            {/* Style chips */}
            <div style={{ display:"flex", gap:6, overflowX:"auto" }}>
              {TEXT_STYLES.map(s => (
                <button key={s.id} onClick={() => setTextStyle(s.id)}
                  style={{ padding:"4px 12px", borderRadius:20, border:"none", cursor:"pointer",
                    background: textStyle === s.id ? BRAND.yellow : "#1E1E1E",
                    color: textStyle === s.id ? "#000" : "#AAA",
                    fontSize:11, fontWeight:700, fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>
                  {s.label}
                </button>
              ))}
            </div>
            {/* Color row */}
            <div style={{ display:"flex", gap:7, alignItems:"center" }}>
              {["#FFFC00","#FFF","#FF3B30","#FF9500","#34C759","#007AFF","#AF52DE","#FF2D78","#000"].map(c => (
                <button key={c} onClick={() => setTextColor(c)}
                  style={{ width:26, height:26, borderRadius:"50%", background:c,
                    border: c === "#FFF" ? "1px solid #444" : "none", cursor:"pointer", flexShrink:0,
                    outline: textColor === c ? `3px solid ${BRAND.yellow}` : "none", outlineOffset:2,
                    transform: textColor === c ? "scale(1.2)" : "scale(1)", transition:"transform 0.15s" }} />
              ))}
            </div>
            {/* Size + input row */}
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={() => setTextSize(s => Math.max(14, s - 4))}
                style={{ background:"#1E1E1E", border:"none", borderRadius:8, width:32, height:32,
                  color:"#FFF", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <ChevronDown size={16} />
              </button>
              <div style={{ flex:1, display:"flex", gap:8 }}>
                <input value={textInput} onChange={e => setTextInput(e.target.value)}
                  placeholder="Add text..."
                  onKeyDown={e => e.key === "Enter" && addText()}
                  style={{ flex:1, background:"#1A1A1A", border:"0.5px solid rgba(255,255,255,0.1)",
                    borderRadius:20, padding:"9px 16px", color:"#FFF", fontSize:15, outline:"none",
                    fontFamily:"'DM Sans',sans-serif" }} autoFocus />
                <button onClick={addText}
                  style={{ background:BRAND.yellow, border:"none", borderRadius:20,
                    padding:"9px 18px", fontWeight:700, cursor:"pointer", color:"#000",
                    fontFamily:"'DM Sans',sans-serif", fontSize:14 }}>Add</button>
              </div>
              <button onClick={() => setTextSize(s => Math.min(64, s + 4))}
                style={{ background:"#1E1E1E", border:"none", borderRadius:8, width:32, height:32,
                  color:"#FFF", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <ChevronUp size={16} />
              </button>
            </div>
            <p style={{ color:"#555", fontSize:11, textAlign:"center", fontFamily:"'DM Sans',sans-serif" }}>
              Drag to move · Double-tap to delete
            </p>
          </div>
        )}

        {/* ── Paint panel ── */}
        {tool === "paint" && (
          <div style={{ padding:"10px 14px 16px", display:"flex", flexDirection:"column", gap:10,
            borderTop:"0.5px solid rgba(255,255,255,0.06)" }}>
            {/* Mode chips */}
            <div style={{ display:"flex", gap:6 }}>
              {[{id:"pen",label:"✏️ Pen"},{id:"neon",label:"⚡ Neon"},{id:"eraser",label:"⬜ Erase"}].map(m => (
                <button key={m.id} onClick={() => setPaintMode(m.id)}
                  style={{ padding:"4px 14px", borderRadius:20, border:"none", cursor:"pointer",
                    background: paintMode === m.id ? BRAND.yellow : "#1E1E1E",
                    color: paintMode === m.id ? "#000" : "#AAA",
                    fontSize:11, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
                  {m.label}
                </button>
              ))}
            </div>
            {/* Color swatches */}
            <div style={{ display:"flex", gap:7, alignItems:"center" }}>
              {PAINT_COLORS.map(c => (
                <button key={c} onClick={() => setPaintColor(c)}
                  style={{ width:26, height:26, borderRadius:"50%", background:c,
                    border: c === "#FFF" ? "1px solid #444" : "none", cursor:"pointer", flexShrink:0,
                    outline: paintColor === c ? `3px solid ${BRAND.yellow}` : "none", outlineOffset:2,
                    transform: paintColor === c ? "scale(1.2)" : "scale(1)", transition:"transform 0.15s" }} />
              ))}
            </div>
            {/* Size slider */}
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:paintSize*2.2, height:paintSize*2.2, borderRadius:"50%",
                background: paintMode === "eraser" ? "#333" : paintColor,
                border: paintMode === "eraser" ? "1.5px dashed #666" : "none",
                minWidth:6, minHeight:6, flexShrink:0, transition:"all 0.15s",
                boxShadow: paintMode === "neon" ? `0 0 10px ${paintColor}` : "none" }} />
              <input type="range" min={2} max={20} value={paintSize}
                onChange={e => setPaintSize(Number(e.target.value))}
                style={{ flex:1, accentColor:BRAND.yellow }} />
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <button onClick={undo}
                style={{ background:"none", border:"none", cursor:"pointer",
                  color:"#555", fontSize:12, fontFamily:"'DM Sans',sans-serif",
                  display:"flex", alignItems:"center", gap:4 }}>
                <RotateCcw size={12} /> Undo stroke
              </button>
            </div>
          </div>
        )}

        {/* ── Sticker panel ── */}
        {tool === "sticker" && (
          <div style={{ padding:"10px 14px 16px", borderTop:"0.5px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
              {STICKERS.map(emoji => (
                <button key={emoji} onClick={() => {
                  setStickers(prev => [...prev, {
                    id: Date.now() + Math.random(), emoji, x:50, y:40, size:44
                  }]);
                  toast(`${emoji} Added!`, { icon: emoji });
                }}
                  style={{ fontSize:30, background:"#1A1A1A", border:"none",
                    borderRadius:12, width:50, height:50, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"transform 0.1s" }}
                  onMouseDown={e => e.currentTarget.style.transform="scale(0.85)"}
                  onMouseUp={e => e.currentTarget.style.transform="scale(1)"}
                >{emoji}</button>
              ))}
            </div>
            <p style={{ color:"#555", fontSize:11, textAlign:"center", marginTop:8,
              fontFamily:"'DM Sans',sans-serif" }}>
              Double-tap sticker to delete
            </p>
          </div>
        )}

        {/* ── Adjust panel (photos only) ── */}
        {tool === "adjust" && (
          <div style={{ padding:"10px 14px 16px", display:"flex", flexDirection:"column", gap:12,
            borderTop:"0.5px solid rgba(255,255,255,0.06)" }}>
            {[
              { label:"☀️ Brightness", val:brightness, set:setBrightness, min:50, max:200 },
              { label:"◑ Contrast",   val:contrast,   set:setContrast,   min:50, max:200 },
              { label:"🎨 Saturation", val:saturation, set:setSaturation, min:0,  max:300 },
            ].map(({ label, val, set, min, max }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ color:"#AAA", fontSize:12, fontFamily:"'DM Sans',sans-serif",
                  width:110, flexShrink:0 }}>{label}</span>
                <input type="range" min={min} max={max} value={val}
                  onChange={e => set(Number(e.target.value))}
                  style={{ flex:1, accentColor:BRAND.yellow }} />
                <button onClick={() => set(100)}
                  style={{ background:"none", border:"none", cursor:"pointer",
                    color:"#555", fontSize:11 }}>↺</button>
              </div>
            ))}
            {mediaType === "video" && (
              <p style={{ color:"#444", fontSize:11, textAlign:"center", fontFamily:"'DM Sans',sans-serif" }}>
                Adjust applies to photos only
              </p>
            )}
          </div>
        )}

        {/* ── Music / Sound panel ── */}
        {tool === "music" && (
          <div style={{ padding:"10px 14px 18px", borderTop:"0.5px solid rgba(255,255,255,0.06)" }}>
            {!musicFile ? (
              <button onClick={() => musicInputRef.current?.click()}
                style={{ width:"100%", padding:"16px", borderRadius:16,
                  background:"linear-gradient(135deg,#1A1A1A 0%,#0E0E0E 100%)",
                  border:"1px dashed rgba(255,252,0,0.3)", cursor:"pointer",
                  color:"#FFF", display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:"50%",
                  background:"rgba(255,252,0,0.12)", border:"1px solid rgba(255,252,0,0.3)",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Music size={18} color={BRAND.yellow} />
                </div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontWeight:700, fontSize:14, fontFamily:"'DM Sans',sans-serif" }}>Add Sound</div>
                  <div style={{ color:"#555", fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>Pick an audio file</div>
                </div>
              </button>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10,
                  background:"#1A1A1A", borderRadius:14, padding:"10px 14px" }}>
                  <Music size={16} color={BRAND.yellow} />
                  <span style={{ flex:1, color:"#FFF", fontSize:13, fontFamily:"'DM Sans',sans-serif",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{musicName}</span>
                  <button onClick={() => {
                    setMusicFile(null); setMusicName(null); setAudioPeaks([]);
                    if(audioRef.current){ audioRef.current.pause(); audioRef.current.src=""; }
                  }} style={{ background:"none", border:"none", cursor:"pointer", color:"#555" }}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ color:"#666", fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>🔊 Volume</span>
                    <span style={{ color:"#AAA", fontSize:11 }}>{Math.round(musicVol*100)}%</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.05} value={musicVol}
                    onChange={e => setMusicVol(Number(e.target.value))}
                    style={{ width:"100%", accentColor:BRAND.yellow }} />
                </div>
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ color:"#666", fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>▶ Start at</span>
                    <span style={{ color:"#AAA", fontSize:11 }}>{musicStart}s</span>
                  </div>
                  <input type="range" min={0} max={30} step={0.5} value={musicStart}
                    onChange={e => setMusicStart(Number(e.target.value))}
                    style={{ width:"100%", accentColor:BRAND.yellow }} />
                </div>
                <button onClick={() => musicInputRef.current?.click()}
                  style={{ background:"#1A1A1A", border:"0.5px solid rgba(255,255,255,0.1)",
                    borderRadius:12, padding:"8px", color:"#AAA", cursor:"pointer", fontSize:12,
                    fontFamily:"'DM Sans',sans-serif" }}>
                  Change track
                </button>
              </div>
            )}
            <input ref={musicInputRef} type="file" accept="audio/*"
              style={{ display:"none" }} onChange={handleMusicPick} />
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

  const isNative = useRef(!!(typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.()));

  const startCamera = useCallback(async (mode) => {
    const m = mode ?? facingMode;
    setCamState(CAM_STATE.ASKING);
    try {
      if (isNative.current) {
        // Native Android/iOS: CameraPreview renders a native layer behind the WebView
        try { await CameraPreview.stop(); } catch (_) {}
        await CameraPreview.start({
          position: m === "user" ? "front" : "rear",
          toBack: true,
          width: window.screen.width,
          height: window.screen.height,
          enableAudio: true,
        });
        document.documentElement.style.background = "transparent";
        document.body.style.background = "transparent";
      } else {
        // Browser fallback
        streamRef.current?.getTracks().forEach(t => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: m, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      }
      setCamState(CAM_STATE.GRANTED);
    } catch { setCamState(CAM_STATE.DENIED); }
  }, [facingMode]);

  useEffect(() => { startCamera(); }, [startCamera]);

  // Canvas draw loop — only needed in browser (native uses CameraPreview layer)
  useEffect(() => {
    if (camState !== CAM_STATE.GRANTED) return;
    if (isNative.current) return; // native camera renders behind WebView, no canvas needed
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

  const handleCapture = async () => {
    setFlash(true); setTimeout(() => setFlash(false), 200);
    if (isNative.current) {
      // Native: grab frame from CameraPreview
      const result = await CameraPreview.capture({ quality: 90 });
      setCaptured({ media: `data:image/jpeg;base64,${result.value}`, type: "photo" });
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setCaptured({ media: canvas.toDataURL("image/png"), type: "photo" });
    }
    toast("Snap taken!", { icon: "📸" });
  };

  const startRecording = useCallback(() => {
    if (!isNative.current && !streamRef.current) return;
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

  const saveToStorage = async (media, type) => {
    try {
      let mediaToStore = media;
      
      // Convert blob URLs (videos) to base64 data URLs for persistent storage
      if (type === "video" && media.startsWith("blob:")) {
        const response = await fetch(media);
        const blob = await response.blob();
        mediaToStore = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      
      const snap = { id: Date.now(), media: mediaToStore, type };
      setSavedSnaps(prev => {
        const updated = [snap, ...prev].slice(0, 50);
        try { localStorage.setItem("snipChat_saved", JSON.stringify(updated)); } catch {}
        return updated;
      });
      toast("Saved to gallery!", { icon: "💾" });
    } catch (err) {
      console.error("Save failed:", err);
      toast("Save failed", { icon: "❌" });
    }
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
        @keyframes toastSlide { from { transform: translateY(-12px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes recPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,48,0.6); } 50% { box-shadow: 0 0 0 8px rgba(255,59,48,0); } }
      `}</style>

      <div style={{ width:"100%", maxWidth:450, margin:"0 auto", height:"100dvh",
        background: camState === CAM_STATE.GRANTED ? "transparent" : "#000",
        position:"relative", overflow:"hidden" }}>

        <SplashScreen state={camState} />
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
          {/* On native, canvas is transparent — the CameraPreview layer shows through from behind */}
          <canvas ref={canvasRef} width={800} height={800}
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block",
              background: camState === CAM_STATE.GRANTED ? "transparent" : "#000" }} />
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
            onDone={(newMedia, newType, musicUrl, musicStartSec, musicVolume) => {
              setCaptured({ media: newMedia, type: newType || captured.type });
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
