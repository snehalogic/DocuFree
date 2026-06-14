import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Trash2, Zap, Bot, User } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: Date;
}

// ── Gemini config ─────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(
  userMessage: string,
  history: Message[]
): Promise<string> {
  const contents = history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));

  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{
          text: "You are DocufreeAI, a helpful AI assistant built into the Docufree SaaS platform. You help users with document-related tasks, answering questions, summarizing content, translating text, explaining concepts, and drafting professional content. Be concise, helpful, and friendly.",
        }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as any)?.error?.message || `Gemini API error ${response.status}`
    );
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ||
    "No response received.";

  return text.trim();
}


const AuroraBackground = () => (
  <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #020817 0%, #0a0f1e 50%, #050d1a 100%)" }} />
    {[
      { color: "rgba(0,230,200,0.12)", size: "80vw", top: "-20%", left: "-10%", dur: 28, delay: 0 },
      { color: "rgba(255,120,50,0.10)", size: "60vw", top: "20%", right: "-15%", dur: 22, delay: 4 },
      { color: "rgba(100,60,255,0.12)", size: "50vw", bottom: "-10%", left: "30%", dur: 25, delay: 8 },
      { color: "rgba(0,200,255,0.08)", size: "40vw", bottom: "30%", right: "20%", dur: 18, delay: 12 },
    ].map((b, i) => (
      <motion.div
        key={i}
        style={{
          position: "absolute", borderRadius: "50%", filter: "blur(100px)",
          background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
          width: b.size, height: b.size,
          top: (b as any).top, left: (b as any).left,
          right: (b as any).right, bottom: (b as any).bottom,
        }}
        animate={{ x: [0, 50, -30, 0], y: [0, 35, -20, 0], scale: [1, 1.15, 0.9, 1] }}
        transition={{ duration: b.dur, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
      />
    ))}
    <div style={{
      position: "absolute", inset: 0,
      backgroundImage: "radial-gradient(circle, rgba(0,230,200,0.12) 1px, transparent 1px)",
      backgroundSize: "48px 48px", opacity: 0.35,
    }} />
  </div>
);

const particles = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  color: ["#00e6c8", "#ff7832", "#6440ff", "#00ccff", "#ffcc00"][i % 5],
  size: 2 + (i % 3),
  startX: (i * 6.25) % 100,
  duration: 15 + (i * 3) % 20,
  delay: (i * 1.4) % 10,
  driftX: (i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 10),
}));

const Particles = () => (
  <>
    {particles.map((p) => (
      <motion.div
        key={p.id}
        style={{
          position: "fixed", left: `${p.startX}vw`, bottom: -10, zIndex: 1,
          width: p.size, height: p.size, borderRadius: "50%",
          background: p.color, boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
          pointerEvents: "none",
        }}
        animate={{ y: [0, -window.innerHeight - 20], opacity: [0, 1, 1, 0], x: [0, p.driftX] }}
        transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
      />
    ))}
  </>
);

const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, x: -20, scale: 0.9 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    exit={{ opacity: 0, x: -10, scale: 0.9 }}
    transition={{ type: "spring", stiffness: 400, damping: 30 }}
    style={{ display: "flex", alignItems: "center", gap: 12 }}
  >
    <div style={{
      width: 36, height: 36, borderRadius: 12, flexShrink: 0,
      background: "linear-gradient(135deg, #00e6c8, #0099ff)",
      boxShadow: "0 0 20px rgba(0,230,200,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Bot size={16} color="#000" />
    </div>
    <div style={{
      padding: "14px 20px", borderRadius: "18px 18px 18px 4px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(0,230,200,0.2)",
      boxShadow: "0 0 20px rgba(0,230,200,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
      backdropFilter: "blur(20px)",
    }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", height: 16 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{ width: 7, height: 7, borderRadius: "50%", background: "#00e6c8", boxShadow: "0 0 8px #00e6c8" }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, delay: i * 0.18, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  </motion.div>
);

const MessageBubble = ({ msg, index }: { msg: Message; index: number }) => {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 28, delay: index < 8 ? index * 0.05 : 0 }}
      style={{
        display: "flex", alignItems: "flex-end", gap: 12,
        flexDirection: isUser ? "row-reverse" : "row",
        maxWidth: "82%", alignSelf: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 12, flexShrink: 0,
        background: isUser ? "linear-gradient(135deg, #ff7832, #ff3366)" : "linear-gradient(135deg, #00e6c8, #0099ff)",
        boxShadow: isUser ? "0 0 20px rgba(255,120,50,0.5)" : "0 0 20px rgba(0,230,200,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isUser ? <User size={16} color="#fff" /> : <Bot size={16} color="#000" />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          style={{
            padding: "13px 18px",
            borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
            fontSize: 14.5, lineHeight: 1.65, fontWeight: 450,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            letterSpacing: "0.01em",
            ...(isUser ? {
              background: "linear-gradient(135deg, rgba(255,120,50,0.22), rgba(255,51,102,0.18))",
              border: "1px solid rgba(255,120,50,0.32)",
              color: "#fff8f5",
              boxShadow: "0 4px 24px rgba(255,120,50,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
            } : {
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(0,230,200,0.2)",
              color: "#e8f8f5",
              boxShadow: "0 4px 24px rgba(0,230,200,0.07), inset 0 1px 0 rgba(255,255,255,0.06)",
              backdropFilter: "blur(20px)",
            }),
          }}
        >
          {msg.text}
        </motion.div>
        <span style={{
          fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 400,
          letterSpacing: "0.05em", paddingInline: 4,
          textAlign: isUser ? "right" : "left",
        }}>
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
};

const SUGGESTIONS = [
  "✦ Summarize a document",
  "⚡ Translate the document",
  "🔮 Explain machine learning",
  "✍️ Draft a professional email",
];

export default function AiAssistant() {
  const [input, setInput]     = useState("");
  const [chat, setChat]       = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const messagesEndRef  = useRef<HTMLDivElement | null>(null);
  const textareaRef     = useRef<HTMLTextAreaElement | null>(null);
  const MAX_CHARS = 2000;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + "px";
    }
  }, [input]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: input.trim(),
      timestamp: new Date(),
    };

    const historyForApi = [...chat];

    setChat((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await callGemini(userMsg.text, historyForApi);
      setChat((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "ai", text: reply, timestamp: new Date() },
      ]);
    } catch (error: any) {
      const errMsg =
        error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("API key")
          ? "Invalid Gemini API key. Please update GEMINI_API_KEY in AiAssistant.tsx."
          : error?.message || "AI request failed. Please try again.";
      setChat((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "ai", text: `❌ ${errMsg}`, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, chat]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) { e.preventDefault(); sendMessage(); }
  };

  const charPct   = (input.length / MAX_CHARS) * 100;
  const charColor = charPct > 90 ? "#ff3366" : charPct > 70 ? "#ffcc00" : "#00e6c8";
  const canSend   = !loading && input.trim().length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: 'Syne', sans-serif; overflow: hidden; }
        textarea { resize: none; font-family: 'Syne', sans-serif; }
        textarea::placeholder { color: rgba(255,255,255,0.22) !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,230,200,0.3); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,230,200,0.6); }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 20px rgba(0,230,200,0.25), 0 0 40px rgba(0,230,200,0.08); }
          50% { box-shadow: 0 0 32px rgba(0,230,200,0.45), 0 0 64px rgba(0,230,200,0.15); }
        }
        .glow-focused { animation: glowPulse 2s ease-in-out infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      <AuroraBackground />
      <Particles />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        style={{
          position: "fixed", inset: 0, zIndex: 10,
          display: "flex", flexDirection: "column",
          maxWidth: 860, margin: "0 auto",
          padding: "20px 20px 16px",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        <motion.header
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexShrink: 0 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <motion.button
              whileHover={{ scale: 1.07, x: -2 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => (window.location.href = "/dashboard")}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 12,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13, fontWeight: 500,
                fontFamily: "'Syne', sans-serif", backdropFilter: "blur(20px)", outline: "none",
                transition: "all 0.2s",
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </motion.button>

            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                Docufree
                <span style={{ background: "linear-gradient(90deg,#00e6c8,#0099ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  -AI
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e6c8", boxShadow: "0 0 8px #00e6c8" }}
                />
                <span style={{ fontSize: 10, color: "#00e6c8", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Active</span>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={chat.length > 0 ? { scale: 1.06 } : {}}
            whileTap={chat.length > 0 ? { scale: 0.94 } : {}}
            onClick={() => setChat([])}
            disabled={chat.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "9px 15px", borderRadius: 12,
              background: chat.length > 0 ? "rgba(255,51,102,0.07)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${chat.length > 0 ? "rgba(255,51,102,0.22)" : "rgba(255,255,255,0.05)"}`,
              color: chat.length > 0 ? "#ff6680" : "rgba(255,255,255,0.18)",
              cursor: chat.length > 0 ? "pointer" : "not-allowed",
              fontSize: 13, fontWeight: 500, fontFamily: "'Syne', sans-serif",
              backdropFilter: "blur(20px)", outline: "none", transition: "all 0.3s",
            }}
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </motion.button>
        </motion.header>

        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 240, damping: 26 }}
          style={{
            flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18,
            padding: "22px 20px", borderRadius: 22,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(40px)",
            boxShadow: "0 0 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
            marginBottom: 14, position: "relative",
          }}
        >
          <AnimatePresence>
            {chat.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", flex: 1, gap: 26, textAlign: "center", padding: "16px 0",
                }}
              >
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>
                    What can I help you{" "}
                    <span style={{ background: "linear-gradient(90deg,#00e6c8,#0099ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      build?
                    </span>
                  </h2>
                  <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 14, fontWeight: 400 }}>
                    Powered by Gemini 2.5 Flash — ask anything
                  </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", maxWidth: 500 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + i * 0.07 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { setInput(s.replace(/^[✦⚡🔮✍️]\s/, "")); textareaRef.current?.focus(); }}
                      style={{
                        padding: "10px 16px", borderRadius: 11, fontSize: 12.5, fontWeight: 500,
                        background: "rgba(0,230,200,0.05)", border: "1px solid rgba(0,230,200,0.16)",
                        color: "rgba(255,255,255,0.72)", cursor: "pointer",
                        fontFamily: "'Syne', sans-serif", backdropFilter: "blur(12px)",
                        outline: "none", transition: "all 0.2s",
                      }}
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {chat.map((msg, i) => <MessageBubble key={msg.id} msg={msg} index={i} />)}

          <AnimatePresence>{loading && <TypingIndicator />}</AnimatePresence>
          <div ref={messagesEndRef} />
        </motion.div>

        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.22, type: "spring", stiffness: 240, damping: 26 }}
          className={focused ? "glow-focused" : ""}
          style={{
            borderRadius: 18,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${focused ? "rgba(0,230,200,0.38)" : "rgba(255,255,255,0.08)"}`,
            backdropFilter: "blur(40px)",
            transition: "border-color 0.3s",
            flexShrink: 0, overflow: "hidden",
          }}
        >
          <div style={{ padding: "15px 18px 0" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
              disabled={loading}
              rows={1}
              style={{
                width: "100%", background: "transparent", border: "none", outline: "none",
                fontSize: 14.5, color: "#ffffff", fontFamily: "'Syne', sans-serif",
                fontWeight: 450, lineHeight: 1.6, letterSpacing: "0.01em",
                maxHeight: 140, overflowY: "auto", display: "block",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {input.length > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                    <circle cx="12" cy="12" r="9" fill="none" stroke={charColor} strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 9}`}
                      strokeDashoffset={`${2 * Math.PI * 9 * (1 - charPct / 100)}`}
                      transform="rotate(-90 12 12)"
                      style={{ filter: `drop-shadow(0 0 4px ${charColor})`, transition: "all 0.3s" }}
                    />
                  </svg>
                  <span style={{ fontSize: 11, color: charColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                    {MAX_CHARS - input.length}
                  </span>
                </motion.div>
              )}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", fontWeight: 400 }}>
                Shift+Enter for new line
              </span>
            </div>

            <motion.button
              whileHover={canSend ? { scale: 1.05 } : {}}
              whileTap={canSend ? { scale: 0.93 } : {}}
              onClick={sendMessage}
              disabled={!canSend}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 13,
                cursor: canSend ? "pointer" : "not-allowed",
                fontSize: 13.5, fontWeight: 600, fontFamily: "'Syne', sans-serif",
                border: "none", outline: "none", transition: "all 0.3s",
                ...(canSend ? {
                  background: "linear-gradient(135deg, #00e6c8, #0099ff)",
                  color: "#000",
                  boxShadow: "0 0 22px rgba(0,230,200,0.38), 0 0 44px rgba(0,230,200,0.12)",
                } : {
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.2)",
                }),
              }}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="spin" style={{ display: "flex" }}>
                    <Zap size={14} />
                  </motion.div>
                ) : (
                  <motion.div key="send" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}
                    style={{ display: "flex" }}>
                    <Send size={14} />
                  </motion.div>
                )}
              </AnimatePresence>
              <span>{loading ? "Thinking…" : "Send"}</span>
            </motion.button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          style={{ textAlign: "center", marginTop: 8, fontSize: 10.5, color: "rgba(255,255,255,0.14)", letterSpacing: "0.07em" }}
        >
          Docufree-AI — Powered by Gemini 2.5 Flash
        </motion.p>
      </motion.div>
    </>
  );
}