import { useState, useRef, useEffect, useCallback, memo } from "react";
import { MessageCircle, User, Timer, RefreshCw, X, Download, Camera, Send, Cloud, HardDrive } from "lucide-react";

const BRAND = {
  yellow: "#FFE036",
  dark:   "#0A0A0F",
  card:   "#1C1C28",
  border: "#2A2A3A",
  text:   "#F0F0FF",
  muted:  "#8888AA",
  green:  "#36FFB0",
  red:    "#FF4D6D",
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

// ─── Human Toast System ───────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div style={{
      position: "absolute", bottom: 28, left: 16, right: 16,
      zIndex: 200, display: "flex", flexDirection: "column", gap: 10,
      pointerEvents: "none",
    }}>
      {toasts.map((t, i) => (
        <div key={t.id} style={{
          background: `rgba(10, 10, 15, 0.95)`,
          backdropFilter: "blur(20px)",
          borderRadius: 60,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          border: `1px solid ${t.type === "success" ? BRAND.green : t.type === "error" ? BRAND.red : BRAND.yellow}33`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.05)",
          animation: "toastSlide 0.35s cubic-bezier(0.34, 1.2, 0.64, 1)",
          transformOrigin: "bottom center",
        }}>
          <span style={{
            fontSize: 24,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
          }}>{t.icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{
              color: BRAND.text,
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.3,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {t.message}
            </p>
            {t.subMessage && (
              <p style={{
                color: BRAND.muted,
                fontSize: 11,
                margin: "4px 0 0 0",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {t.subMessage}
              </p>
            )}
          </div>
          <div style={{
            width: 3,
            height: 28,
            background: t.type === "success" ? BRAND.green : t.type === "error" ? BRAND.red : BRAND.yellow,
            borderRadius: 3,
            opacity: 0.8,
          }} />
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, { icon = "✨", type = "info", subMessage = "", duration = 3200 } = {}) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, icon, type, subMessage }]);
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
      <line x1="17.5" y1="27.5" x2="30" y2="16" stroke={BRAND.dark} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="14" cy="18" r="4.5" fill={BRAND.dark} />
      <line x1="17.5" y1="20.5" x2="30" y2="32" stroke={BRAND.dark} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="22" cy="24" r="2.2" fill={BRAND.yellow} />
      <path d="M30 16 Q38 14 38 24 Q38 34 30 32 L27 36 L28 31 Q34 30 34 24 Q34 18 30 16Z" fill={BRAND.dark} />
    </svg>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────
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

// ─── Permission Gate ──────────────────────────────────────────────────────────
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
          Tap the <strong style={{ color: BRAND.yellow }}>lock icon</strong> or <strong style={{ color: BRAND.yellow }}>info icon</strong>{" "}
          in your browser address bar → Site settings → Camera → Allow
        </div>
      )}
      <button onClick={onRequest} disabled={isAsking} style={{
        padding: "16px 40px", borderRadius: 16,
        background: isAsking ? BRAND.border : BRAND.yellow,
        border: "none", color: BRAND.dark,
        fontWeight: 800, fontSize: 16, cursor: isAsking ? "default" : "pointer",
        fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.02em",
        display: "flex", alignItems: "center", gap: 10,
        transition: "background 0.2s, transform 0.1s",
        transform: isAsking ? "scale(0.97)" : "scale(1)",
        minWidth: 200, justifyContent: "center",
      }}>
        <Camera size={20} color={isAsking ? BRAND.muted : BRAND.dark} strokeWidth={2} />
        {isAsking ? "Opening camera..." : state === CAM_STATE.DENIED || state === CAM_STATE.ERROR ? "Try Again" : "Allow Camera"}
      </button>
      <p style={{ fontSize: 11, color: BRAND.border, letterSpacing: "0.04em" }}>
        OPEN SOURCE · PRIVATE · NO ADS
      </p>
    </div>
  );
}

// ─── Chat Overlay ─────────────────────────────────────────────────────────────
const ChatOverlay = memo(({ messages, onClose, onViewSnip }) => {
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
          <div key={msg.id} onClick={() => !msg.viewed && msg.expires > Date.now() && onViewSnip(msg)} style={{
            background: BRAND.card, borderRadius: 16, padding: 12,
            border: `1px solid ${!msg.viewed && msg.expires > Date.now() ? BRAND.yellow : BRAND.border}`,
            cursor: !msg.viewed && msg.expires > Date.now() ? "pointer" : "default",
            opacity: msg.viewed || msg.expires < Date.now() ? 0.5 : 1,
            transition: "all 0.2s",
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <img src={msg.image} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} alt="snip" />
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
        <p style={{ fontSize: 12, color: BRAND.muted, textAlign: "center" }}>
          Take a photo → Add caption → send snip!
        </p>
      </div>
    </div>
  );
});

// ─── Snip Viewer ──────────────────────────────────────────────────────────────
const SnipViewer = memo(({ snip, onClose }) => {
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
      <img src={snip.image} alt="snip" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
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

// ─── Save Button with hold-to-save ────────────────────────────────────────────
function SaveButton({ onSaveCloud, onSaveLocal }) {
  const holdTimer = useRef(null);
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const progressTimer = useRef(null);
  const HOLD_MS = 700;

  const startHold = (e) => {
    e.preventDefault();
    setHolding(true);
    setHoldProgress(0);
    const start = Date.now();
    progressTimer.current = setInterval(() => {
      const p = Math.min((Date.now() - start) / HOLD_MS, 1);
      setHoldProgress(p);
    }, 16);
    holdTimer.current = setTimeout(() => {
      clearInterval(progressTimer.current);
      setHolding(false);
      setHoldProgress(0);
      onSaveLocal();
    }, HOLD_MS);
  };

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      clearInterval(progressTimer.current);
      if (holdProgress < 1) {
        setHolding(false);
        setHoldProgress(0);
        onSaveCloud();
      }
    }
  };

  const circumference = 2 * Math.PI * 20;

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={() => {
        if (holding) {
          clearTimeout(holdTimer.current);
          clearInterval(progressTimer.current);
          setHolding(false);
          setHoldProgress(0);
        }
      }}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      style={{
        flex: 1, padding: "14px 0", borderRadius: 14,
        background: holding ? `${BRAND.yellow}22` : BRAND.card,
        border: `1px solid ${holding ? BRAND.yellow : BRAND.border}`,
        color: BRAND.text, fontWeight: 700, fontSize: 14, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 4, position: "relative",
        transition: "background 0.15s, border-color 0.15s",
        userSelect: "none", WebkitUserSelect: "none",
        minHeight: 56,
      }}
    >
      {holding ? (
        <>
          <svg width={44} height={44} style={{ position: "absolute" }}>
            <circle cx={22} cy={22} r={20} fill="none"
              stroke={BRAND.border} strokeWidth={2.5} />
            <circle cx={22} cy={22} r={20} fill="none"
              stroke={BRAND.yellow} strokeWidth={2.5}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - holdProgress)}
              strokeLinecap="round"
              transform="rotate(-90 22 22)"
              style={{ transition: "stroke-dashoffset 0.016s linear" }}
            />
          </svg>
          <HardDrive size={14} color={BRAND.yellow} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
          <span style={{ fontSize: 9, color: BRAND.yellow, position: "relative", zIndex: 1, letterSpacing: "0.03em" }}>LOCAL</span>
        </>
      ) : (
        <>
          <Cloud size={16} color={BRAND.muted} strokeWidth={1.8} />
          <span style={{ fontSize: 10, color: BRAND.muted, letterSpacing: "0.03em" }}>save</span>
        </>
      )}
    </button>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function SnipChat() {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef   = useRef(null);

  const [camState,     setCamState]     = useState(CAM_STATE.IDLE);
  const [activeFilter, setActiveFilter] = useState("normal");
  const [facingMode,   setFacingMode]   = useState("user");
  const [captured,     setCaptured]     = useState(null);
  const [flash,        setFlash]        = useState(false);
  const [timerCount,   setTimerCount]   = useState(null);
  const [pressing,     setPressing]     = useState(false);
  const [showChat,     setShowChat]     = useState(false);
  const [messages,     setMessages]     = useState([]);
  const [chatInput,    setChatInput]    = useState("");
  const [viewingSnip,  setViewingSnip]  = useState(null);

  const { toasts, toast } = useToast();
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
      toast("Camera's ready! 📸", { icon: "🎥", type: "success", subMessage: "You look great today" });
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCamState(CAM_STATE.DENIED);
      } else {
        setCamState(CAM_STATE.ERROR);
      }
    }
  }, [facingMode, toast]);

  useEffect(() => { startCamera(); }, [startCamera]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.expires > Date.now());
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const doCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    setCaptured(canvas.toDataURL("image/png"));
    toast("Got it! 🎬", { icon: "✨", type: "info", subMessage: "Now add a caption or send it" });
  };

  const handleCapture = () => { if (timerCount === null) doCapture(); };

  const startTimer = () => {
    if (timerCount !== null) return;
    toast("3... 2... 1... smile! 😁", { icon: "⏱️", type: "info", duration: 2500 });
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
    toast(next === "user" ? "Back to you! 🤳" : "Looking outside! 🌍", { icon: "🔄", type: "info", duration: 1500 });
  };

  // Save to SnipCloud (localStorage)
  const saveToCloud = () => {
    if (!captured) return;
    try {
      const existing = JSON.parse(localStorage.getItem("snipcloud") || "[]");
      const entry = {
        id: Date.now(),
        image: captured,
        caption: chatInput,
        filter: activeFilter,
        time: Date.now(),
      };
      existing.unshift(entry);
      localStorage.setItem("snipcloud", JSON.stringify(existing.slice(0, 20)));
      toast("Saved to your cloud! ☁️", { icon: "☁️", type: "success", subMessage: "You can find it anytime" });
    } catch {
      toast("Oops, cloud save failed 😅", { icon: "💔", type: "error", subMessage: "Try again?" });
    }
  };

  // Save to local device
  const saveToLocal = () => {
    if (!captured) return;
    try {
      const a = document.createElement("a");
      a.href = captured;
      const filename = `snipchat/snip-${Date.now()}.png`;
      a.download = filename;
      a.click();
      toast("Saved to your device! 💾", { icon: "📁", type: "success", subMessage: "Check your SnipChat folder" });
    } catch {
      toast("Couldn't save locally 😢", { icon: "❌", type: "error" });
    }
  };

  const sendSnip = () => {
    if (!captured) return;
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
    toast("Snip sent! ✈️", { icon: "💌", type: "success", subMessage: "Your friend will see it soon" });
  };

  const viewSnip = (msg) => {
    setViewingSnip(msg);
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, viewed: true, expires: Date.now() + 5000 } : m
    ));
    toast("Here's your snip! 👀", { icon: "🔓", type: "info", subMessage: "It'll disappear in 5 seconds" });
  };

  const closeViewer = useCallback(() => {
    setViewingSnip(null);
  }, []);

  const showGate = camState !== CAM_STATE.GRANTED;
  const unviewedCount = messages.filter(m => !m.viewed && m.expires > Date.now()).length;

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
        @keyframes toastSlide {
          from { transform: translateY(30px) scale(0.95); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
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

        {/* Human-friendly toast notifications */}
        <ToastContainer toasts={toasts} />

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

        {/* Bottom controls */}
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

        {/* Captured preview */}
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
                  fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif",
                }}
                onFocus={() => toast("Say something nice! 💭", { icon: "✏️", type: "info", duration: 2000 })}
              />
            </div>

            <div style={{ display: "flex", gap: 10, padding: "8px 20px 24px" }}>
              {/* Retake */}
              <button onClick={() => { setCaptured(null); setChatInput(""); toast("Let's try again! 🔄", { icon: "🎬", type: "info", duration: 1500 }); }} style={{
                flex: 1, padding: "14px 0", borderRadius: 14,
                background: BRAND.card, border: `1px solid ${BRAND.border}`,
                color: BRAND.text, fontWeight: 700, fontSize: 14, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <X size={15} color={BRAND.text} strokeWidth={2} />
                retake
              </button>

              {/* Send snip */}
              <button onClick={sendSnip} style={{
                flex: 1.4, padding: "14px 0", borderRadius: 14,
                background: BRAND.yellow, border: "none",
                color: BRAND.dark, fontWeight: 800, fontSize: 14, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <Send size={15} color={BRAND.dark} strokeWidth={2} />
                send snip
              </button>

              {/* Save — tap = cloud, hold = local */}
              <SaveButton onSaveCloud={saveToCloud} onSaveLocal={saveToLocal} />
            </div>

            <div style={{
              textAlign: "center", fontSize: 11, color: BRAND.muted,
              paddingBottom: 10, paddingTop: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              💡 tap <strong style={{ color: BRAND.text }}>save</strong> → cloud &nbsp;·&nbsp; hold → my phone
            </div>
          </div>
        )}

        {showChat && (
          <ChatOverlay
            messages={messages}
            onClose={() => setShowChat(false)}
            onViewSnip={viewSnip}
          />
        )}

        {viewingSnip && (
          <SnipViewer
            snip={viewingSnip}
            onClose={closeViewer}
          />
        )}
      </div>
    </>
  );
}