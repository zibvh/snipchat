import { useState, useRef, useEffect, useCallback, memo } from "react";
import { MessageCircle, User, Timer, RefreshCw, X, Download, Camera, Send, Eye, Cloud, FolderDown } from "lucide-react";

const BRAND = {
  yellow: "#FFE036",
  dark:   "#0A0A0F",
  card:   "#1C1C28",
  border: "#2A2A3A",
  text:   "#F0F0FF",
  muted:  "#8888AA",
};

const FILTERS = [
  { id: "normal", label: "Normal", css: "none" },
  { id: "vivid",  label: "Vivid",  css: "saturate(2) contrast(1.1)" },
  { id: "bw",     label: "B&W",    css: "grayscale(1) contrast(1.2)" },
  { id: "noir",   label: "Noir",   css: "grayscale(1) contrast(1.6) brightness(0.85)" },
  { id: "sepia",  label: "Sepia",  css: "sepia(0.85) saturate(1.2)" },
  { id: "warm",   label: "Warm",   css: "sepia(0.35) saturate(1.6) hue-rotate(-10deg)" },
  { id: "cool",   label: "Cool",   css: "hue-rotate(30deg) saturate(1.4) brightness(1.05)" },
  { id: "fade",   label: "Fade",   css: "brightness(1.15) contrast(0.78) saturate(0.75)" },
  { id: "dream",  label: "Dream",  css: "brightness(1.1) saturate(1.5) contrast(0.9) hue-rotate(10deg)" },
  { id: "retro",  label: "Retro",  css: "sepia(0.45) saturate(1.4) contrast(1.15) brightness(0.95)" },
];

const CAM_STATE = { IDLE: "idle", ASKING: "asking", GRANTED: "granted", DENIED: "denied", ERROR: "error" };

// SnipCloud storage (simulated cloud)
let snipCloudStorage = [];

// Load saved snips from localStorage on init
const loadSnipCloud = () => {
  const saved = localStorage.getItem("snipcloud_snips");
  if (saved) {
    try {
      snipCloudStorage = JSON.parse(saved);
    } catch(e) { console.error(e); }
  }
};
loadSnipCloud();

const saveToSnipCloud = (imageData, caption, filterName) => {
  const snip = {
    id: Date.now(),
    image: imageData,
    caption: caption,
    filter: filterName,
    timestamp: Date.now(),
    date: new Date().toLocaleString()
  };
  snipCloudStorage.unshift(snip);
  // Keep only last 50 snips in cloud
  if (snipCloudStorage.length > 50) snipCloudStorage.pop();
  localStorage.setItem("snipcloud_snips", JSON.stringify(snipCloudStorage));
  return snip;
};

const saveToLocalDevice = async (imageData, filename) => {
  try {
    // Convert base64 to blob
    const response = await fetch(imageData);
    const blob = await response.blob();
    
    // Check if File System Access API is supported (modern browsers)
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true, path: dirHandle.name + '/' + filename };
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log('Directory picker cancelled or failed, falling back to download');
        }
      }
    }
    
    // Fallback: traditional download
    const link = document.createElement('a');
    link.href = imageData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, path: 'Downloads/' + filename };
  } catch (error) {
    console.error('Save failed:', error);
    return { success: false, error: error.message };
  }
};

function SnipLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="23" fill={BRAND.yellow} />
      <circle cx="14" cy="30" r="4.5" fill={BRAND.dark} />
      <line x1="17.5" y1="27.5" x2="30" y2="16" stroke={BRAND.dark} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="14" cy="18" r="4.5" fill={BRAND.dark} />
      <line x1="17.5" y1="20.5" x2="30" y2="32" stroke={BRAND.dark} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="22" cy="24" r="2.2" fill={BRAND.yellow} />
      <path d="M30 16 Q38 14 38 24 Q38 34 30 32 L27 36 L28 31 Q34 30 34 24 Q34 18 30 16Z" fill={BRAND.dark} />
    </svg>
  );
}

function FilterPill({ filter, active, onClick, videoRef }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const iv = setInterval(() => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState < 2) return;
      const ctx = c.getContext("2d");
      ctx.filter = filter.css;
      ctx.drawImage(v, 0, 0, c.width, c.height);
    }, 200);
    return () => clearInterval(iv);
  }, [filter.css, videoRef]);

  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      background: "none", border: "none", cursor: "pointer", flexShrink: 0,
      padding: "0 4px",
      transform: active ? "scale(1.12)" : "scale(1)",
      transition: "transform 0.15s ease",
    }}>
      <div style={{
        width: 58, height: 58, borderRadius: 14, overflow: "hidden",
        border: active ? `2.5px solid ${BRAND.yellow}` : `2px solid ${BRAND.border}`,
        boxShadow: active ? `0 0 14px ${BRAND.yellow}66` : "none",
        transition: "all 0.2s ease", background: BRAND.card,
      }}>
        <canvas ref={canvasRef} width={58} height={58}
          style={{ display: "block", width: "100%", height: "100%" }} />
      </div>
      <span style={{
        fontSize: 10, fontFamily: "'DM Sans', sans-serif",
        fontWeight: active ? 700 : 400,
        color: active ? BRAND.yellow : BRAND.muted,
        letterSpacing: "0.02em", transition: "color 0.2s",
      }}>
        {filter.label}
      </span>
    </button>
  );
}

function PermissionGate({ state, onRequest }) {
  const isAsking = state === CAM_STATE.ASKING;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 100,
      background: BRAND.dark, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 32, gap: 24, textAlign: "center",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <SnipLogo size={64} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: BRAND.text, letterSpacing: "-0.04em" }}>
          Snip<span style={{ color: BRAND.yellow }}>Chat</span>
        </h1>
        <p style={{ fontSize: 14, color: BRAND.muted, lineHeight: 1.6, maxWidth: 280 }}>
          {state === CAM_STATE.DENIED
            ? "Camera access was denied. Please allow it in your browser site settings, then tap Try Again."
            : state === CAM_STATE.ERROR
            ? "Something went wrong starting the camera. Make sure no other app is using it."
            : "SnipChat needs camera access to work. Your camera is never recorded or uploaded."}
        </p>
      </div>

      {state === CAM_STATE.DENIED && (
        <div style={{
          background: BRAND.card, border: `1px solid ${BRAND.border}`,
          borderRadius: 14, padding: "14px 20px",
          fontSize: 13, color: BRAND.muted, lineHeight: 1.7, maxWidth: 300,
        }}>
          <strong style={{ color: BRAND.text, display: "block", marginBottom: 6 }}>How to fix it:</strong>
          Tap the <strong style={{ color: BRAND.yellow }}>lock icon</strong> or <strong style={{ color: BRAND.yellow }}>info icon</strong> in your browser address bar
          {" "}→ Site settings → Camera → Allow
        </div>
      )}

      <button
        onClick={onRequest}
        disabled={isAsking}
        style={{
          padding: "16px 40px", borderRadius: 16,
          background: isAsking ? BRAND.border : BRAND.yellow,
          border: "none", color: BRAND.dark,
          fontWeight: 800, fontSize: 16, cursor: isAsking ? "default" : "pointer",
          fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.02em",
          display: "flex", alignItems: "center", gap: 10,
          transition: "background 0.2s, transform 0.1s",
          transform: isAsking ? "scale(0.97)" : "scale(1)",
          minWidth: 200, justifyContent: "center",
        }}
      >
        <Camera size={20} color={isAsking ? BRAND.muted : BRAND.dark} strokeWidth={2} />
        {isAsking ? "Opening camera..." : state === CAM_STATE.DENIED || state === CAM_STATE.ERROR ? "Try Again" : "Allow Camera"}
      </button>

      <p style={{ fontSize: 11, color: BRAND.border, letterSpacing: "0.04em" }}>
        OPEN SOURCE · PRIVATE · NO ADS
      </p>
    </div>
  );
}

// Chat Overlay as separate component
const ChatOverlay = memo(({ messages, onClose, onViewsnip }) => {
  const unviewedCount = messages.filter(m => !m.viewed && m.expires > Date.now()).length;
  
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 60,
      background: BRAND.dark, display: "flex", flexDirection: "column",
      animation: "slideUp 0.25s ease",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", borderBottom: `1px solid ${BRAND.border}`,
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: BRAND.text }}>
          💬 snips {unviewedCount > 0 && `(${unviewedCount})`}
        </span>
        <button onClick={onClose} style={{
          background: BRAND.card, border: "none", borderRadius: 30,
          padding: 8, cursor: "pointer",
        }}>
          <X size={18} color={BRAND.text} />
        </button>
      </div>
      
      <div style={{ flex: 1, overflowY: "auto", padding: 16, gap: 12, display: "flex", flexDirection: "column" }}>
        {messages.length === 0 ? (
          <p style={{ color: BRAND.muted, textAlign: "center", marginTop: 40 }}>
            No snips yet. Take a photo and send it!
          </p>
        ) : messages.map((msg) => (
          <div key={msg.id} onClick={() => !msg.viewed && msg.expires > Date.now() && onViewsnip(msg)} style={{
            background: BRAND.card, borderRadius: 16, padding: 12,
            border: `1px solid ${!msg.viewed && msg.expires > Date.now() ? BRAND.yellow : BRAND.border}`,
            cursor: !msg.viewed && msg.expires > Date.now() ? "pointer" : "default",
            opacity: msg.viewed || msg.expires < Date.now() ? 0.5 : 1,
            transition: "all 0.2s",
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <img src={msg.image} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
              <div>
                <div style={{ color: BRAND.text, fontWeight: 600, fontSize: 13 }}>{msg.text || "📸 snip"}</div>
                <div style={{ color: BRAND.muted, fontSize: 10 }}>{new Date(msg.time).toLocaleTimeString()}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: BRAND.muted }}>
              {msg.viewed ? "👁️ Viewed" : msg.expires > Date.now() ? "✨ Tap to view" : "⏳ Expired"}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ padding: 16, borderTop: `1px solid ${BRAND.border}` }}>
        <p style={{ fontSize: 12, color: BRAND.muted, textAlign: "center", marginBottom: 8 }}>
          Take a photo → Add caption → Send snip!
        </p>
      </div>
    </div>
  );
});

// snip Viewer as separate component
const snipViewer = memo(({ snip, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!snip) return null;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 70,
      background: "#000", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease",
    }} onClick={onClose}>
      <img src={snip.image} alt="snip" style={{
        width: "100%", height: "100%", objectFit: "contain",
      }} />
      {snip.text && (
        <div style={{
          position: "absolute", bottom: 100, left: 20, right: 20,
          background: "rgba(0,0,0,0.8)", padding: 12, borderRadius: 20,
          textAlign: "center", color: BRAND.text, fontSize: 16,
        }}>
          {snip.text}
        </div>
      )}
      <button onClick={onClose} style={{
        position: "absolute", top: 20, right: 20,
        background: BRAND.card, border: "none", borderRadius: 30,
        padding: 10, cursor: "pointer",
      }}>
        <X size={20} color={BRAND.text} />
      </button>
      <div style={{
        position: "absolute", bottom: 40, left: 20, right: 20,
        textAlign: "center", color: BRAND.muted, fontSize: 12,
      }}>
        Tap anywhere to close
      </div>
    </div>
  );
});

// SnipCloud Gallery Component
const SnipCloudGallery = memo(({ snips, onClose }) => {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 80,
      background: BRAND.dark, display: "flex", flexDirection: "column",
      animation: "slideUp 0.25s ease",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", borderBottom: `1px solid ${BRAND.border}`,
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: BRAND.text }}>
          ☁️ SnipCloud <span style={{ fontSize: 12, color: BRAND.muted }}>({snips.length} saved)</span>
        </span>
        <button onClick={onClose} style={{
          background: BRAND.card, border: "none", borderRadius: 30,
          padding: 8, cursor: "pointer",
        }}>
          <X size={18} color={BRAND.text} />
        </button>
      </div>
      
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {snips.length === 0 ? (
          <p style={{ color: BRAND.muted, textAlign: "center", marginTop: 40 }}>
            No snips in the cloud yet. Take and save a photo!
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {snips.map((snip) => (
              <div key={snip.id} style={{
                background: BRAND.card, borderRadius: 12, overflow: "hidden",
                border: `1px solid ${BRAND.border}`,
              }}>
                <img src={snip.image} alt="snip" style={{
                  width: "100%", aspectRatio: "1/1", objectFit: "cover",
                }} />
                <div style={{ padding: 8 }}>
                  {snip.caption && (
                    <div style={{ color: BRAND.text, fontSize: 11, marginBottom: 4 }}>
                      💬 {snip.caption}
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: BRAND.muted }}>
                    {snip.date}
                  </div>
                  {snip.filter !== "normal" && (
                    <div style={{ fontSize: 9, color: BRAND.yellow, marginTop: 4 }}>
                      🎨 {snip.filter}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default function SnipChat() {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef   = useRef(null);

  const [camState,         setCamState]     = useState(CAM_STATE.IDLE);
  const [activeFilter,     setActiveFilter] = useState("normal");
  const [facingMode,       setFacingMode]   = useState("user");
  const [captured,         setCaptured]     = useState(null);
  const [flash,            setFlash]        = useState(false);
  const [timerCount,       setTimerCount]   = useState(null);
  const [pressing,         setPressing]     = useState(false);
  const [showChat,         setShowChat]     = useState(false);
  const [messages,         setMessages]     = useState([]);
  const [chatInput,        setChatInput]    = useState("");
  const [viewingsnip,      setViewingsnip]  = useState(null);
  const [showCloudGallery, setShowCloudGallery] = useState(false);
  const [saveFeedback,     setSaveFeedback] = useState(null);

  const currentFilter = FILTERS.find(f => f.id === activeFilter);

  const startCamera = useCallback(async (mode) => {
    const m = mode ?? facingMode;
    setCamState(CAM_STATE.ASKING);
    streamRef.current?.getTracks().forEach(t => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: m, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamState(CAM_STATE.GRANTED);
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCamState(CAM_STATE.DENIED);
      } else {
        setCamState(CAM_STATE.ERROR);
      }
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // Auto-expire messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.expires > Date.now());
        if (filtered.length !== prev.length) return filtered;
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Draw loop
  useEffect(() => {
    if (camState !== CAM_STATE.GRANTED) return;
    const draw = () => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        const { videoWidth: vw, videoHeight: vh } = video;
        const side = Math.min(vw, vh);
        const sx = (vw - side) / 2, sy = (vh - side) / 2;
        ctx.filter = currentFilter.css;
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

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const showFeedback = (message, isError = false) => {
    setSaveFeedback({ message, isError });
    setTimeout(() => setSaveFeedback(null), 2000);
  };

  const doCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    setCaptured(canvas.toDataURL("image/png"));
  };

  const handleCapture = () => { if (timerCount === null) doCapture(); };

  const startTimer = () => {
    if (timerCount !== null) return;
    let count = 3;
    setTimerCount(count);
    const iv = setInterval(() => {
      count--;
      if (count === 0) { clearInterval(iv); setTimerCount(null); doCapture(); }
      else setTimerCount(count);
    }, 1000);
  };

  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  };

  // Save to SnipCloud (tap)
  const saveToCloud = () => {
    if (!captured) return;
    saveToSnipCloud(captured, chatInput, currentFilter.label);
    showFeedback("☁️ Saved to SnipCloud!");
    setCaptured(null);
    setChatInput("");
  };

  // Save to local device (press & hold)
  const saveToLocal = async () => {
    if (!captured) return;
    const filename = `snipchat/snip-${Date.now()}.png`;
    const result = await saveToLocalDevice(captured, filename);
    if (result.success) {
      showFeedback(`💾 Saved to ${result.path}`);
    } else {
      showFeedback(`❌ Save failed: ${result.error}`, true);
    }
    setCaptured(null);
    setChatInput("");
  };

  const handleSavePress = (e) => {
    // For mouse events
    let timer;
    const startPress = () => {
      timer = setTimeout(() => {
        saveToLocal();
      }, 500);
    };
    const endPress = () => {
      clearTimeout(timer);
    };
    
    if (e.type === 'mousedown') startPress();
    if (e.type === 'mouseup' || e.type === 'mouseleave') endPress();
    
    // For touch events
    if (e.type === 'touchstart') {
      e.preventDefault();
      startPress();
    }
    if (e.type === 'touchend') {
      e.preventDefault();
      endPress();
    }
  };

  const sendsnip = () => {
    if (!captured) return;
    // Also save to cloud when sending
    saveToSnipCloud(captured, chatInput, currentFilter.label);
    const newMsg = {
      id: Date.now(),
      image: captured,
      text: chatInput,
      time: Date.now(),
      expires: Date.now() + 30000,
      viewed: false,
    };
    setMessages(prev => [newMsg, ...prev]);
    setChatInput("");
    setCaptured(null);
    setShowChat(true);
    showFeedback("📨 Snip sent! (also saved to SnipCloud)");
  };

  const viewsnip = (msg) => {
    setViewingsnip(msg);
    setMessages(prev => prev.map(m => 
      m.id === msg.id ? { ...m, viewed: true, expires: Date.now() + 5000 } : m
    ));
  };

  const closeViewer = useCallback(() => {
    setViewingsnip(null);
  }, []);

  const showGate = camState !== CAM_STATE.GRANTED;
  const unviewedCount = messages.filter(m => !m.viewed && m.expires > Date.now()).length;
  const cloudSnips = snipCloudStorage;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; background: #000; }
        ::-webkit-scrollbar { display: none; }
        @keyframes pop {
          0%   { transform: scale(1.5); opacity: 0.3; }
          60%  { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes toastPop {
          0% { transform: translateY(20px) scale(0.9); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 420, margin: "0 auto",
        height: "100dvh", minHeight: 640,
        display: "flex", flexDirection: "column",
        background: BRAND.dark, fontFamily: "'DM Sans', sans-serif",
        position: "relative", overflow: "hidden",
      }}>
        {showGate && <PermissionGate state={camState} onRequest={() => startCamera()} />}

        {/* Toast Feedback */}
        {saveFeedback && (
          <div style={{
            position: "absolute", bottom: 120, left: 20, right: 20, zIndex: 200,
            background: saveFeedback.isError ? "#E53935" : BRAND.yellow,
            color: saveFeedback.isError ? "#fff" : BRAND.dark,
            padding: "12px 20px", borderRadius: 30, textAlign: "center",
            fontWeight: 600, fontSize: 14, animation: "toastPop 0.2s ease",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}>
            {saveFeedback.message}
          </div>
        )}

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px 10px", zIndex: 10, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SnipLogo size={34} />
            <span style={{ fontSize: 20, fontWeight: 800, color: BRAND.text, letterSpacing: "-0.04em", fontFamily: "'DM Sans', sans-serif" }}>
              Snip<span style={{ color: BRAND.yellow }}>Chat</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowCloudGallery(true)} style={{
              background: `${BRAND.card}CC`, border: `1px solid ${BRAND.border}`,
              borderRadius: "50%", width: 38, height: 38,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              position: "relative",
            }}>
              <Cloud size={17} color={BRAND.muted} strokeWidth={1.8} />
              {cloudSnips.length > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  background: BRAND.yellow, color: BRAND.dark,
                  borderRadius: 10, padding: "2px 5px", fontSize: 9, fontWeight: 800,
                }}>
                  {cloudSnips.length}
                </span>
              )}
            </button>
            <button onClick={() => setShowChat(true)} style={{
              background: `${BRAND.card}CC`, border: `1px solid ${BRAND.border}`,
              borderRadius: "50%", width: 38, height: 38,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              position: "relative",
            }}>
              <MessageCircle size={17} color={BRAND.muted} strokeWidth={1.8} />
              {unviewedCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  background: BRAND.yellow, color: BRAND.dark,
                  borderRadius: 10, padding: "2px 6px", fontSize: 10, fontWeight: 800,
                }}>
                  {unviewedCount}
                </span>
              )}
            </button>
            <button style={{
              background: `${BRAND.card}CC`, border: `1px solid ${BRAND.border}`,
              borderRadius: "50%", width: 38, height: 38,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <User size={17} color={BRAND.muted} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Viewfinder */}
        <div style={{
          flex: 1, position: "relative", overflow: "hidden",
          borderRadius: 20, margin: "0 12px", background: "#000",
        }}>
          <video ref={videoRef} playsInline muted style={{ display: "none" }} />
          <canvas ref={canvasRef} width={800} height={800}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

          <div style={{
            position: "absolute", inset: 0, background: "#fff",
            opacity: flash ? 1 : 0, transition: "opacity 0.25s ease",
            pointerEvents: "none", borderRadius: 20,
          }} />

          {activeFilter !== "normal" && camState === CAM_STATE.GRANTED && (
            <div style={{
              position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
              background: `${BRAND.dark}CC`, backdropFilter: "blur(8px)",
              borderRadius: 20, padding: "4px 14px",
              fontSize: 11, fontWeight: 700, color: BRAND.yellow,
              letterSpacing: "0.08em", textTransform: "uppercase",
              border: `1px solid ${BRAND.yellow}44`,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {currentFilter.label}
            </div>
          )}

          {timerCount !== null && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <span key={timerCount} style={{
                fontSize: 100, fontWeight: 900, color: BRAND.yellow,
                textShadow: `0 0 40px ${BRAND.yellow}`,
                animation: "pop 1s ease-in-out",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {timerCount}
              </span>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{ flexShrink: 0, paddingBottom: 20 }}>
          <div style={{
            display: "flex", gap: 10, overflowX: "auto",
            padding: "12px 16px 6px", scrollbarWidth: "none",
          }}>
            {FILTERS.map(f => (
              <FilterPill key={f.id} filter={f} active={activeFilter === f.id}
                onClick={() => setActiveFilter(f.id)} videoRef={videoRef} />
            ))}
          </div>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 32, padding: "10px 24px 4px",
          }}>
            <button onClick={startTimer} style={{
              width: 48, height: 48, borderRadius: "50%",
              background: `${BRAND.card}CC`, border: `1px solid ${BRAND.border}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Timer size={20} color={BRAND.muted} strokeWidth={1.8} />
            </button>

            <button
              onClick={handleCapture}
              onMouseDown={() => setPressing(true)}
              onMouseUp={() => setPressing(false)}
              onMouseLeave={() => setPressing(false)}
              onTouchStart={() => setPressing(true)}
              onTouchEnd={() => { setPressing(false); handleCapture(); }}
              style={{
                width: 76, height: 76, borderRadius: "50%",
                background: BRAND.text, border: `4px solid ${BRAND.yellow}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 24px ${BRAND.yellow}55, 0 4px 20px #00000080`,
                transform: pressing ? "scale(0.92)" : "scale(1)",
                transition: "transform 0.1s ease",
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: BRAND.yellow }} />
            </button>

            <button onClick={flipCamera} style={{
              width: 48, height: 48, borderRadius: "50%",
              background: `${BRAND.card}CC`, border: `1px solid ${BRAND.border}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <RefreshCw size={20} color={BRAND.muted} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Preview overlay */}
        {captured && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 50,
            background: BRAND.dark, display: "flex", flexDirection: "column",
            animation: "slideUp 0.25s ease",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px 10px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <SnipLogo size={28} />
                <span style={{ fontSize: 18, fontWeight: 800, color: BRAND.text, letterSpacing: "-0.04em", fontFamily: "'DM Sans', sans-serif" }}>
                  Your <span style={{ color: BRAND.yellow }}>Snip</span>
                </span>
              </div>
              <span style={{
                color: BRAND.muted, fontSize: 11, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {currentFilter.label}
              </span>
            </div>

            <img src={captured} alt="Captured"
              style={{ flex: 1, objectFit: "cover", borderRadius: 20, margin: 12 }} />

            <div style={{ padding: "0 20px", marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Add a caption..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{
                  width: "100%", background: BRAND.card, border: `1px solid ${BRAND.border}`,
                  borderRadius: 24, padding: "12px 16px", color: BRAND.text,
                  fontSize: 14, outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12, padding: "12px 24px 28px" }}>
              <button onClick={() => {
                setCaptured(null);
                setChatInput("");
              }} style={{
                flex: 1, padding: "14px 0", borderRadius: 14,
                background: BRAND.card, border: `1px solid ${BRAND.border}`,
                color: BRAND.text, fontWeight: 700, fontSize: 15, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <X size={16} color={BRAND.text} strokeWidth={2} />
                Retake
              </button>
              <button onClick={sendsnip} style={{
                flex: 1, padding: "14px 0", borderRadius: 14,
                background: BRAND.yellow, border: "none",
                color: BRAND.dark, fontWeight: 700, fontSize: 15, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <Send size={16} color={BRAND.dark} strokeWidth={2} />
                Send snip
              </button>
              <button
                onClick={saveToCloud}
                onMouseDown={handleSavePress}
                onMouseUp={handleSavePress}
                onMouseLeave={handleSavePress}
                onTouchStart={handleSavePress}
                onTouchEnd={handleSavePress}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 14,
                  background: BRAND.card, border: `1px solid ${BRAND.border}`,
                  color: BRAND.text, fontWeight: 700, fontSize: 15, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.1s",
                }}
                title="Tap: Save to SnipCloud | Hold: Save to device"
              >
                <FolderDown size={16} color={BRAND.text} strokeWidth={2} />
                Save
              </button>
            </div>
            <div style={{ textAlign: "center", paddingBottom: 12, fontSize: 10, color: BRAND.muted }}>
              💡 Tap Save → SnipCloud &nbsp;&nbsp;|&nbsp;&nbsp; Hold Save → Local device
            </div>
          </div>
        )}

        {showChat && (
          <ChatOverlay 
            messages={messages}
            onClose={() => setShowChat(false)}
            onViewsnip={viewsnip}
          />
        )}
        
        {viewingsnip && (
          <snipViewer 
            snip={viewingsnip}
            onClose={closeViewer}
          />
        )}

        {showCloudGallery && (
          <SnipCloudGallery
            snips={cloudSnips}
            onClose={() => setShowCloudGallery(false)}
          />
        )}
      </div>
    </>
  );
}