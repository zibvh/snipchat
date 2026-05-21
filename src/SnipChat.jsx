import { useState, useRef, useEffect, useCallback, memo } from "react";
import { MessageCircle, User, Timer, RefreshCw, X, Camera, Send, Zap, Sparkles } from "lucide-react";

const BRAND = {
  yellow: "#FFFC00", // Snapchat's exact yellow
  dark:   "#000000",
  card:   "#1A1A1A",
  border: "#2C2C2C",
  text:   "#FFFFFF",
  muted:  "#858585",
};

const FILTERS = [
  { id: "normal", label: "Normal", css: "none", icon: "✨" },
  { id: "vivid",  label: "Vivid",  css: "saturate(2) contrast(1.1)", icon: "🎨" },
  { id: "bw",     label: "B&W",    css: "grayscale(1) contrast(1.2)", icon: "⚫" },
  { id: "noir",   label: "Noir",   css: "grayscale(1) contrast(1.6) brightness(0.85)", icon: "🎬" },
  { id: "sepia",  label: "Sepia",  css: "sepia(0.85) saturate(1.2)", icon: "📻" },
];

const CAM_STATE = { IDLE: "idle", ASKING: "asking", GRANTED: "granted", DENIED: "denied", ERROR: "error" };

// ─── Snapchat-style Toast ─────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div style={{
      position: "absolute", bottom: 100, left: 16, right: 16,
      zIndex: 200, display: "flex", flexDirection: "column", gap: 8,
      pointerEvents: "none", alignItems: "center",
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(20px)",
          borderRadius: 30,
          padding: "8px 18px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "0.5px solid rgba(255,255,255,0.1)",
          animation: "toastPop 0.3s cubic-bezier(0.34, 1.2, 0.64, 1)",
        }}>
          <span style={{ fontSize: 16 }}>{t.icon}</span>
          <span style={{
            color: "#FFF",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'DM Sans', sans-serif",
          }}>
            {t.message}
          </span>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, { icon = "✨", duration = 2500 } = {}) => {
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
      <line x1="17.5" y1="27.5" x2="30" y2="16" stroke={BRAND.dark} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="14" cy="18" r="4.5" fill={BRAND.dark} />
      <line x1="17.5" y1="20.5" x2="30" y2="32" stroke={BRAND.dark} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="22" cy="24" r="2.2" fill={BRAND.yellow} />
      <path d="M30 16 Q38 14 38 24 Q38 34 30 32 L27 36 L28 31 Q34 30 34 24 Q34 18 30 16Z" fill={BRAND.dark} />
    </svg>
  );
}

// ─── Filter Carousel (Snapchat-style horizontal scroll) ──────────────────────
function FilterCarousel({ filters, activeId, onSelect, videoRef }) {
  const scrollRef = useRef(null);
  const previewRefs = useRef({});

  useEffect(() => {
    filters.forEach(filter => {
      if (!previewRefs.current[filter.id]) {
        const canvas = document.createElement('canvas');
        canvas.width = 70;
        canvas.height = 70;
        previewRefs.current[filter.id] = canvas;
      }
    });

    const intervals = {};
    filters.forEach(filter => {
      intervals[filter.id] = setInterval(() => {
        const v = videoRef.current;
        const c = previewRefs.current[filter.id];
        if (!v || !c || v.readyState < 2) return;
        const ctx = c.getContext("2d");
        ctx.filter = filter.css;
        ctx.drawImage(v, 0, 0, c.width, c.height);
      }, 100);
    });

    return () => {
      Object.values(intervals).forEach(iv => clearInterval(iv));
    };
  }, [filters, videoRef]);

  return (
    <div ref={scrollRef} style={{
      position: "absolute", bottom: 100, left: 0, right: 0,
      overflowX: "auto", overflowY: "hidden",
      display: "flex", gap: 8, padding: "0 16px",
      scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      zIndex: 20,
    }}>
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onSelect(filter.id)}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 6, background: "none", border: "none", cursor: "pointer",
            flexShrink: 0, transition: "transform 0.2s",
            transform: activeId === filter.id ? "scale(1.1)" : "scale(1)",
          }}
        >
          <div style={{
            width: 70, height: 70, borderRadius: 16, overflow: "hidden",
            border: activeId === filter.id ? `2px solid ${BRAND.yellow}` : "2px solid transparent",
            boxShadow: activeId === filter.id ? `0 0 20px ${BRAND.yellow}66` : "none",
            background: "#1A1A1A",
          }}>
            <canvas
              ref={el => {
                if (el && previewRefs.current[filter.id]) {
                  const ctx = el.getContext("2d");
                  ctx.drawImage(previewRefs.current[filter.id], 0, 0, 70, 70);
                }
              }}
              width={70} height={70}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>
          <span style={{
            fontSize: 11, fontWeight: activeId === filter.id ? 600 : 400,
            color: activeId === filter.id ? BRAND.yellow : "#FFF",
            fontFamily: "'SF Pro Text', -apple-system, sans-serif",
          }}>
            {filter.label}
          </span>
        </button>
      ))}
    </div>
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
    }}>
      <SnipLogo size={80} />
      <h1 style={{ fontSize: 28, fontWeight: 700, color: BRAND.yellow, letterSpacing: "-0.5px" }}>
        SnipChat
      </h1>
      <button onClick={onRequest} disabled={isAsking} style={{
        padding: "14px 32px", borderRadius: 30,
        background: BRAND.yellow, border: "none", color: "#000",
        fontWeight: 700, fontSize: 16, cursor: "pointer",
        fontFamily: "'SF Pro Text', sans-serif",
      }}>
        {isAsking ? "Opening camera..." : "Continue"}
      </button>
    </div>
  );
}

// ─── Chat Overlay ─────────────────────────────────────────────────────────────
const ChatOverlay = memo(({ messages, onClose, onViewSnip }) => {
  const unviewedCount = messages.filter(m => !m.viewed && m.expires > Date.now()).length;
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 60,
      background: "#000", display: "flex", flexDirection: "column",
      animation: "slideUp 0.3s ease",
    }}>
      <div style={{
        padding: "60px 16px 16px",
        background: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#FFF" }}>
            Chats
          </span>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 30,
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <X size={18} color="#FFF" />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 60, color: "#858585" }}>
            <User size={48} strokeWidth={1} />
            <p style={{ marginTop: 12 }}>No chats yet</p>
          </div>
        ) : messages.map((msg) => (
          <div key={msg.id} onClick={() => !msg.viewed && msg.expires > Date.now() && onViewSnip(msg)} style={{
            display: "flex", gap: 12, padding: "12px 0",
            borderBottom: "0.5px solid rgba(255,255,255,0.1)",
            cursor: !msg.viewed && msg.expires > Date.now() ? "pointer" : "default",
            opacity: msg.viewed ? 0.5 : 1,
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: 25, overflow: "hidden",
              border: !msg.viewed && msg.expires > Date.now() ? `2px solid ${BRAND.yellow}` : "none",
            }}>
              <img src={msg.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "#FFF" }}>Friend</span>
                <span style={{ fontSize: 11, color: "#858585" }}>{new Date(msg.time).toLocaleTimeString()}</span>
              </div>
              <span style={{ fontSize: 13, color: "#858585" }}>
                {msg.text || "📸 Snap"}
              </span>
            </div>
          </div>
        ))}
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

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 70, background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <img src={snip.image} alt="snip" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      {snip.text && (
        <div style={{
          position: "absolute", bottom: 80, left: 20, right: 20,
          background: "rgba(0,0,0,0.7)", padding: 12, borderRadius: 20,
          textAlign: "center", color: "#FFF",
        }}>
          {snip.text}
        </div>
      )}
      <div style={{
        position: "absolute", top: 20, right: 20,
        width: 8, height: 8, borderRadius: 4, background: BRAND.yellow,
        animation: "pulse 1s infinite",
      }} />
    </div>
  );
});

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function SnipChat() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);

  const [camState, setCamState] = useState(CAM_STATE.IDLE);
  const [activeFilter, setActiveFilter] = useState("normal");
  const [facingMode, setFacingMode] = useState("user");
  const [captured, setCaptured] = useState(null);
  const [flash, setFlash] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [viewingSnip, setViewingSnip] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

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
    } catch (err) {
      setCamState(CAM_STATE.DENIED);
    }
  }, [facingMode]);

  useEffect(() => { startCamera(); }, [startCamera]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(prev => prev.filter(msg => msg.expires > Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Draw loop
  useEffect(() => {
    if (camState !== CAM_STATE.GRANTED) return;
    const draw = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
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

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    const imageData = canvas.toDataURL("image/png");
    setCaptured(imageData);
    toast("Snap saved!", { icon: "📸" });
  };

  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
    toast(next === "user" ? "Front camera" : "Back camera", { icon: "🔄" });
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
    toast("Sent!", { icon: "✈️" });
  };

  const viewSnip = (msg) => {
    setViewingSnip(msg);
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, viewed: true, expires: Date.now() + 5000 } : m
    ));
  };

  const closeViewer = useCallback(() => setViewingSnip(null), []);

  const showGate = camState !== CAM_STATE.GRANTED;
  const unviewedCount = messages.filter(m => !m.viewed && m.expires > Date.now()).length;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; background: #000; }
        ::-webkit-scrollbar { display: none; }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes toastPop {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 450, margin: "0 auto",
        height: "100dvh",
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}>
        {showGate && <PermissionGate state={camState} onRequest={() => startCamera()} />}

        <ToastContainer toasts={toasts} />

        {/* Top bar - Snapchat style */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "12px 16px",
          display: "flex", justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
          background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)",
        }}>
          <div style={{ display: "flex", gap: 16 }}>
            <SnipLogo size={28} />
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <button onClick={() => setShowChat(true)} style={{
              background: "none", border: "none", cursor: "pointer",
              position: "relative",
            }}>
              <MessageCircle size={22} color="#FFF" strokeWidth={1.5} />
              {unviewedCount > 0 && (
                <span style={{
                  position: "absolute", top: -6, right: -8,
                  background: BRAND.red, color: "#FFF",
                  borderRadius: 10, padding: "2px 6px", fontSize: 10, fontWeight: 700,
                }}>
                  {unviewedCount}
                </span>
              )}
            </button>
            <button style={{
              background: "none", border: "none", cursor: "pointer",
            }}>
              <Zap size={22} color="#FFF" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Camera viewfinder */}
        <div style={{
          position: "absolute", inset: 0,
          overflow: "hidden",
        }}>
          <video ref={videoRef} playsInline muted style={{ display: "none" }} />
          <canvas ref={canvasRef} width={800} height={800}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

          {/* Flash overlay */}
          <div style={{
            position: "absolute", inset: 0, background: "#FFF",
            opacity: flash ? 1 : 0, transition: "opacity 0.15s ease",
            pointerEvents: "none",
          }} />
        </div>

        {/* Filter carousel (shows on tap/hold) */}
        {showFilters && camState === CAM_STATE.GRANTED && (
          <FilterCarousel
            filters={FILTERS}
            activeId={activeFilter}
            onSelect={setActiveFilter}
            videoRef={videoRef}
          />
        )}

        {/* Bottom controls - Snapchat style */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "20px 24px 40px",
          background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          zIndex: 10,
        }}>
          <button onClick={() => setShowFilters(!showFilters)} style={{
            background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 30,
            width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", backdropFilter: "blur(10px)",
          }}>
            <Sparkles size={20} color="#FFF" />
          </button>

          <button
            onClick={handleCapture}
            style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "#FFF", border: "3px solid rgba(255,255,255,0.3)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform 0.1s ease",
            }}
          />

          <button onClick={flipCamera} style={{
            background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 30,
            width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", backdropFilter: "blur(10px)",
          }}>
            <RefreshCw size={20} color="#FFF" />
          </button>
        </div>

        {/* Preview/Send screen */}
        {captured && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 50,
            background: "#000", display: "flex", flexDirection: "column",
            animation: "slideUp 0.3s ease",
          }}>
            <img src={captured} alt="preview" style={{
              flex: 1, objectFit: "cover", width: "100%",
            }} />
            
            <div style={{ padding: 20, background: "#000" }}>
              <input
                type="text"
                placeholder="Add caption..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{
                  width: "100%", background: "#1A1A1A", border: "none",
                  borderRadius: 30, padding: "14px 20px", color: "#FFF",
                  fontSize: 16, outline: "none",
                }}
                autoFocus
              />
              
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button onClick={() => setCaptured(null)} style={{
                  flex: 1, padding: "14px", borderRadius: 30,
                  background: "#2C2C2C", border: "none",
                  color: "#FFF", fontWeight: 600, cursor: "pointer",
                }}>
                  Retake
                </button>
                <button onClick={sendSnip} style={{
                  flex: 1, padding: "14px", borderRadius: 30,
                  background: BRAND.yellow, border: "none",
                  color: "#000", fontWeight: 700, cursor: "pointer",
                }}>
                  Send to →
                </button>
              </div>
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
          <SnipViewer snip={viewingSnip} onClose={closeViewer} />
        )}

        {/* Hint text - Snapchat style */}
        {camState === CAM_STATE.GRANTED && !captured && (
          <div style={{
            position: "absolute", bottom: 120, left: 0, right: 0,
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
            fontSize: 12,
            pointerEvents: "none",
            zIndex: 10,
          }}>
            Tap to capture • Hold for filters
          </div>
        )}
      </div>
    </>
  );
}