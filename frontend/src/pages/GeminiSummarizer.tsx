import React, { useEffect, useState } from "react";

type SavedSummary = {
  id: string;
  title: string;
  content: string;
  date: string;
};

type OcrResultFile = {
  _id: string;
  filename: string;
  originalName: string;
  extractedText: string;
  createdAt: string;
};

const GeminiSummarizer: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savedSummaries, setSavedSummaries] = useState<SavedSummary[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [showOcrPicker, setShowOcrPicker] = useState(false);
  const [ocrFiles, setOcrFiles] = useState<OcrResultFile[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const API_BASE_URL = "http://localhost:5000";

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("summaries") || "[]");
    setSavedSummaries(data);
  }, []);

  const openOcrPicker = async () => {
    setShowOcrPicker(true);
    setOcrError(null);
    setOcrLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/documents`, { headers });
      if (!res.ok) throw new Error("Failed to fetch documents");

      const docs = await res.json();

      const ocrDocs = Array.isArray(docs)
        ? docs.filter((d: any) => d.extractedText && d.extractedText.trim().length > 0)
        : [];

      setOcrFiles(ocrDocs);
    } catch (e: any) {
      console.error(e);
      setOcrFiles([]);
      setOcrError(e?.message || "Failed to load OCR results");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleUseOcrFile = (file: OcrResultFile) => {
    setInputText(file.extractedText);
    setShowOcrPicker(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const checkSpeech = setInterval(() => {
      if (!window.speechSynthesis.speaking) setIsSpeaking(false);
    }, 300);
    return () => clearInterval(checkSpeech);
  }, []);

  const summarizeText = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setSummary("");
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Summarize the following text:\n${inputText}` }] }],
          }),
        }
      );
      const data = await res.json();
      setSummary(data?.candidates?.[0]?.content?.parts?.[0]?.text || "No summary generated.");
    } catch {
      setSummary("Error while summarizing text.");
    }
    setLoading(false);
  };

  const speakSummary = () => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(summary);
    speech.lang = "en-US";
    speech.onend = () => setIsSpeaking(false);
    speech.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(speech);
    setIsSpeaking(true);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const saveSummary = () => {
    const title = prompt("Enter title for this summary");
    if (!title) return;
    const newSummary: SavedSummary = {
      id: Date.now().toString(),
      title,
      content: summary,
      date: new Date().toLocaleString(),
    };
    const updated = [...savedSummaries, newSummary];
    localStorage.setItem("summaries", JSON.stringify(updated));
    setSavedSummaries(updated);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const downloadText = (title: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteSummary = (id: string) => {
    const updated = savedSummaries.filter((s) => s.id !== id);
    localStorage.setItem("summaries", JSON.stringify(updated));
    setSavedSummaries(updated);
  };

  const charCount = inputText.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080c14; font-family: 'Syne', sans-serif; min-height: 100vh; overflow-x: hidden; }
        .gs-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .gs-blob { position: absolute; border-radius: 50%; filter: blur(110px); animation: blobDrift 24s ease-in-out infinite; }
        .gs-blob-1 { width: 70vw; height: 70vw; background: radial-gradient(circle, rgba(251,191,36,0.09) 0%, transparent 70%); top: -25%; left: -20%; animation-duration: 28s; }
        .gs-blob-2 { width: 55vw; height: 55vw; background: radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%); top: 30%; right: -20%; animation-duration: 22s; animation-delay: -7s; }
        .gs-blob-3 { width: 45vw; height: 45vw; background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%); bottom: -15%; left: 25%; animation-duration: 30s; animation-delay: -14s; }
        @keyframes blobDrift { 0%, 100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px, -30px) scale(1.1); } 66% { transform: translate(-30px, 40px) scale(0.92); } }
        .gs-grid { position: absolute; inset: 0; background-image: radial-gradient(rgba(251,191,36,0.1) 1px, transparent 1px); background-size: 44px 44px; opacity: 0.4; }
        .gs-wrapper { position: relative; z-index: 1; max-width: 860px; margin: 0 auto; padding: 48px 20px 60px; animation: fadeUp 0.7s ease forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .gs-back-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 12px; border: none; cursor: pointer; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500; font-family: 'Syne', sans-serif; backdrop-filter: blur(20px); outline: none; margin-bottom: 32px; transition: all 0.2s; }
        .gs-back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.18); transform: translateX(-2px); }
        .gs-back-btn:active { transform: scale(0.96); }
        .gs-header { text-align: center; margin-bottom: 40px; }
        .gs-badge { display: inline-flex; align-items: center; gap: 7px; padding: 6px 14px; border-radius: 99px; background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.22); font-size: 11px; font-weight: 600; letter-spacing: 0.1em; color: #fbbf24; text-transform: uppercase; margin-bottom: 18px; }
        .gs-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #fbbf24; box-shadow: 0 0 8px #fbbf24; animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }
        .gs-title { font-size: clamp(30px, 5vw, 46px); font-weight: 800; color: #fff; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 10px; }
        .gs-title-accent { background: linear-gradient(90deg, #fbbf24, #f59e0b, #fb923c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .gs-subtitle { font-size: 14px; font-weight: 400; color: rgba(255,255,255,0.35); letter-spacing: 0.02em; }
        .gs-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 22px; backdrop-filter: blur(40px); padding: 28px; margin-bottom: 20px; box-shadow: 0 8px 60px rgba(0,0,0,0.3); animation: fadeUp 0.7s ease forwards; }
        .gs-card-title { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 14px; }
        .gs-textarea-wrap { position: relative; }
        .gs-textarea { width: 100%; min-height: 190px; padding: 18px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); color: #f1f5f9; font-size: 14.5px; font-family: 'Syne', sans-serif; font-weight: 400; line-height: 1.65; outline: none; resize: vertical; transition: border-color 0.3s, box-shadow 0.3s; }
        .gs-textarea::placeholder { color: rgba(255,255,255,0.2); }
        .gs-textarea:focus { border-color: rgba(251,191,36,0.4); box-shadow: 0 0 0 3px rgba(251,191,36,0.08), 0 0 30px rgba(251,191,36,0.1); }
        .gs-char-count { position: absolute; bottom: 12px; right: 14px; font-size: 11px; color: rgba(255,255,255,0.22); font-family: 'DM Mono', monospace; pointer-events: none; }
        .gs-btn-row { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
        .gs-btn-primary { flex: 1; min-width: 140px; padding: 13px 20px; border-radius: 13px; border: none; cursor: pointer; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000; font-size: 14px; font-weight: 700; font-family: 'Syne', sans-serif; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.25s; box-shadow: 0 0 24px rgba(251,191,36,0.3); position: relative; overflow: hidden; }
        .gs-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 0 40px rgba(251,191,36,0.5); }
        .gs-btn-primary:active:not(:disabled) { transform: scale(0.96); }
        .gs-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .gs-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.3); border-top-color: #000; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .gs-btn-sec { padding: 13px 18px; border-radius: 13px; border: none; cursor: pointer; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.65); font-size: 13px; font-weight: 500; font-family: 'Syne', sans-serif; display: flex; align-items: center; gap: 7px; transition: all 0.2s; white-space: nowrap; }
        .gs-btn-sec:hover { background: rgba(255,255,255,0.09); color: #fff; border-color: rgba(255,255,255,0.18); transform: translateY(-1px); }
        .gs-btn-sec:active { transform: scale(0.96); }
        .gs-btn-teal { background: rgba(6,182,212,0.07); border-color: rgba(6,182,212,0.2); color: #22d3ee; }
        .gs-btn-teal:hover { background: rgba(6,182,212,0.14); border-color: rgba(6,182,212,0.4); color: #67e8f9; }
        .gs-btn-stop { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #f87171; animation: stopPulse 1.5s ease-in-out infinite; }
        .gs-btn-stop:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.5); color: #fca5a5; }
        @keyframes stopPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0.15); } }
        .gs-summary-reveal { animation: fadeUp 0.5s ease forwards; }
        .gs-summary-box { background: rgba(6,182,212,0.04); border: 1px solid rgba(6,182,212,0.2); border-radius: 16px; padding: 20px 22px; color: #e0f7ff; font-size: 14.5px; line-height: 1.75; font-weight: 400; box-shadow: 0 0 30px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.05); position: relative; overflow: hidden; }
        .gs-summary-box::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #06b6d4, #0ea5e9, #6366f1); }
        .gs-summary-label { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #22d3ee; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .gs-summary-label-line { flex: 1; height: 1px; background: rgba(6,182,212,0.2); }
        .gs-actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
        .gs-action-btn { padding: 10px 18px; border-radius: 11px; border: none; cursor: pointer; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500; font-family: 'Syne', sans-serif; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .gs-action-btn:hover { background: rgba(255,255,255,0.09); color: #fff; transform: translateY(-1px); border-color: rgba(255,255,255,0.18); }
        .gs-action-btn:active { transform: scale(0.96); }
        .gs-saved-panel { animation: fadeUp 0.4s ease forwards; }
        .gs-saved-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 18px 20px; margin-bottom: 14px; transition: border-color 0.2s, transform 0.2s; animation: fadeUp 0.4s ease forwards; }
        .gs-saved-card:hover { border-color: rgba(251,191,36,0.2); transform: translateY(-2px); }
        .gs-saved-title { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 3px; }
        .gs-saved-date { font-size: 11px; color: rgba(255,255,255,0.28); font-family: 'DM Mono', monospace; margin-bottom: 10px; }
        .gs-saved-content { font-size: 13.5px; color: rgba(255,255,255,0.55); line-height: 1.65; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .gs-saved-actions { display: flex; gap: 8px; }
        .gs-icon-btn { padding: 7px 13px; border-radius: 9px; border: none; cursor: pointer; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); font-size: 13px; font-family: 'Syne', sans-serif; display: flex; align-items: center; gap: 5px; transition: all 0.18s; }
        .gs-icon-btn:hover { background: rgba(255,255,255,0.09); color: #fff; }
        .gs-icon-btn.delete:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #f87171; }
        .gs-empty { text-align: center; padding: 36px 20px; color: rgba(255,255,255,0.22); font-size: 14px; }
        .gs-empty-icon { font-size: 36px; margin-bottom: 10px; }
        .gs-toast { position: fixed; bottom: 28px; right: 28px; z-index: 999; background: rgba(20,27,40,0.95); border: 1px solid rgba(251,191,36,0.3); color: #fbbf24; font-size: 13px; font-weight: 600; padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.4); backdrop-filter: blur(20px); animation: toastIn 0.3s ease, toastOut 0.3s ease 1.7s forwards; font-family: 'Syne', sans-serif; }
        @keyframes toastIn { from { opacity: 0; transform: translateY(16px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes toastOut { to { opacity: 0; transform: translateY(10px); } }
        .gs-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent); margin: 24px 0; }
        .gs-wave { display: flex; align-items: center; gap: 3px; height: 16px; }
        .gs-wave span { display: block; width: 3px; border-radius: 2px; background: #fbbf24; animation: waveBar 1s ease-in-out infinite; }
        .gs-wave span:nth-child(1) { height: 6px; animation-delay: 0s; }
        .gs-wave span:nth-child(2) { height: 12px; animation-delay: 0.15s; }
        .gs-wave span:nth-child(3) { height: 16px; animation-delay: 0.3s; }
        .gs-wave span:nth-child(4) { height: 10px; animation-delay: 0.45s; }
        .gs-wave span:nth-child(5) { height: 6px; animation-delay: 0.6s; }
        @keyframes waveBar { 0%, 100% { transform: scaleY(0.5); opacity: 0.5; } 50% { transform: scaleY(1); opacity: 1; } }
        .gs-progress { height: 3px; border-radius: 2px; background: linear-gradient(90deg, #fbbf24, #f59e0b, #fb923c); background-size: 200% 100%; animation: progressSlide 1.4s linear infinite; margin-top: 16px; }
        @keyframes progressSlide { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @media (max-width: 600px) { .gs-btn-row { flex-direction: column; } .gs-btn-primary { min-width: unset; } .gs-actions { flex-wrap: wrap; } }
        .gs-ocr-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at top, rgba(15,23,42,0.96), rgba(15,23,42,0.98)); backdrop-filter: blur(24px); padding: 24px; }
        .gs-ocr-modal { width: 100%; max-width: 520px; max-height: 70vh; background: rgba(15,23,42,0.98); border-radius: 20px; border: 1px solid rgba(148,163,184,0.35); box-shadow: 0 24px 80px rgba(15,23,42,0.9); padding: 20px 20px 16px; display: flex; flex-direction: column; gap: 12px; }
        .gs-ocr-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .gs-ocr-title { font-size: 15px; font-weight: 600; color: #e5e7eb; }
        .gs-ocr-sub { font-size: 11px; color: rgba(148,163,184,0.8); margin-top: 2px; }
        .gs-ocr-close { border-radius: 999px; border: 1px solid rgba(148,163,184,0.5); background: rgba(15,23,42,0.9); color: rgba(148,163,184,0.9); padding: 5px 10px; font-size: 11px; cursor: pointer; }
        .gs-ocr-list { margin-top: 4px; padding-top: 8px; border-top: 1px solid rgba(30,64,175,0.8); overflow-y: auto; }
        .gs-ocr-empty { padding: 24px 8px; text-align: center; font-size: 13px; color: rgba(148,163,184,0.9); }
        .gs-ocr-item { width: 100%; border: none; background: rgba(15,23,42,0.9); border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; transition: background 0.18s, transform 0.18s, border-color 0.18s; border: 1px solid rgba(30,64,175,0.6); text-align: left; }
        .gs-ocr-item:hover { background: rgba(30,64,175,0.5); transform: translateY(-1px); }
        .gs-ocr-name { font-size: 13px; color: #e5e7eb; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gs-ocr-meta { font-size: 11px; color: rgba(148,163,184,0.9); }
        .gs-ocr-icon { width: 26px; height: 26px; border-radius: 999px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 30% 0, #fbbf24, #6366f1); box-shadow: 0 0 16px rgba(129,140,248,0.7); font-size: 14px; }
      `}</style>

      <div className="gs-bg">
        <div className="gs-blob gs-blob-1" />
        <div className="gs-blob gs-blob-2" />
        <div className="gs-blob gs-blob-3" />
        <div className="gs-grid" />
      </div>

      {copyToast && <div className="gs-toast">📋 Copied to clipboard!</div>}
      {saveToast && <div className="gs-toast">💾 Summary saved!</div>}

      <div className="gs-wrapper">
        <button className="gs-back-btn" onClick={() => window.location.href = "/dashboard"}>← Back</button>

        <div className="gs-header">
          <div className="gs-badge"><span className="gs-badge-dot" />Powered by Gemini 2.5 Flash Lite</div>
          <h1 className="gs-title">AI Text <span className="gs-title-accent">Summarizer</span></h1>
          <p className="gs-subtitle">Paste any text and get a smart, instant summary</p>
        </div>

        <div className="gs-card">
          <div className="gs-card-title">📄 Your Text</div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button className="gs-btn-sec gs-btn-teal" type="button" onClick={openOcrPicker}>
              ⬆ Insert from OCR
            </button>
          </div>
          <div className="gs-textarea-wrap">
            <textarea
              className="gs-textarea"
              placeholder="Paste or type your text here…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            {charCount > 0 && <span className="gs-char-count">{charCount.toLocaleString()} chars</span>}
          </div>
          {loading && <div className="gs-progress" />}
          <div className="gs-btn-row">
            <button className="gs-btn-primary" onClick={summarizeText} disabled={loading || !inputText.trim()}>
              {loading ? <><span className="gs-spinner" />Summarizing…</> : <>✦ Summarize</>}
            </button>
            <button className="gs-btn-sec" onClick={() => setInputText("")} disabled={loading}>✕ Clear</button>
            <button className="gs-btn-sec gs-btn-teal" onClick={() => setShowSaved(!showSaved)}>
              {showSaved ? "✕ Close" : "📂 Saved"} ({savedSummaries.length})
            </button>
          </div>
        </div>

        {summary && (
          <div className="gs-card gs-summary-reveal">
            <div className="gs-summary-label">Summary <span className="gs-summary-label-line" /></div>
            <div className="gs-summary-box">{summary}</div>
            <div className="gs-actions">
              {!isSpeaking ? (
                <button className="gs-action-btn" onClick={speakSummary}>🔊 Speak</button>
              ) : (
                <button className="gs-btn-sec gs-btn-stop" onClick={stopSpeaking}>
                  <div className="gs-wave"><span/><span/><span/><span/><span/></div>⏹ Stop
                </button>
              )}
              <button className="gs-action-btn" onClick={saveSummary}>💾 Save</button>
              <button className="gs-action-btn" onClick={() => copyText(summary)}>📋 Copy</button>
            </div>
          </div>
        )}

        {showSaved && (
          <div className="gs-card gs-saved-panel">
            <div className="gs-card-title">📂 Saved Summaries</div>
            <div className="gs-divider" style={{ margin: "0 0 16px" }} />
            {savedSummaries.length === 0 ? (
              <div className="gs-empty"><div className="gs-empty-icon">🗂️</div><div>No saved summaries yet</div></div>
            ) : (
              savedSummaries.map((s, idx) => (
                <div key={s.id} className="gs-saved-card" style={{ animationDelay: `${idx * 0.06}s` }}>
                  <div className="gs-saved-title">{s.title}</div>
                  <div className="gs-saved-date">{s.date}</div>
                  <div className="gs-saved-content">{s.content}</div>
                  <div className="gs-saved-actions">
                    <button className="gs-icon-btn" onClick={() => copyText(s.content)}>📋 Copy</button>
                    <button className="gs-icon-btn" onClick={() => downloadText(s.title, s.content)}>⬇ Download</button>
                    <button className="gs-icon-btn delete" onClick={() => deleteSummary(s.id)}>🗑 Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showOcrPicker && (
          <div className="gs-ocr-overlay" onClick={() => setShowOcrPicker(false)}>
            <div className="gs-ocr-modal" onClick={(e) => e.stopPropagation()}>
              <div className="gs-ocr-header">
                <div>
                  <div className="gs-ocr-title">OCR Processed Documents</div>
                  <div className="gs-ocr-sub">Select a document to paste its extracted text.</div>
                </div>
                <button className="gs-ocr-close" type="button" onClick={() => setShowOcrPicker(false)}>Close</button>
              </div>
              <div className="gs-ocr-list">
                {ocrLoading && <div className="gs-ocr-empty">Loading documents…</div>}
                {!ocrLoading && ocrError && <div className="gs-ocr-empty">Failed to load: {ocrError}</div>}
                {!ocrLoading && !ocrError && ocrFiles.length === 0 && (
                  <div className="gs-ocr-empty">
                    No OCR processed documents found.<br />Upload a document and run OCR first.
                  </div>
                )}
                {!ocrLoading && !ocrError && ocrFiles.map((file) => (
                  <button key={file._id} type="button" className="gs-ocr-item" onClick={() => handleUseOcrFile(file)}>
                    <div>
                      {/* ✅ Shows original name e.g. "invoice.pdf" not the stored filename */}
                      <div className="gs-ocr-name">{file.originalName}</div>
                      <div className="gs-ocr-meta">
                        {new Date(file.createdAt).toLocaleString()} &nbsp;·&nbsp;
                        {file.extractedText.split(/\s+/).filter(Boolean).length} words
                      </div>
                    </div>
                    <div className="gs-ocr-icon">⇢</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 32, fontSize: 11, color: "rgba(255,255,255,0.14)", letterSpacing: "0.07em" }}>
          GEMINI AI SUMMARIZER — BUILT WITH ✦
        </div>
      </div>
    </>
  );
};

export default GeminiSummarizer;