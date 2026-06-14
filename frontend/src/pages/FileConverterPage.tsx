import React, { useState, useRef } from "react";
import {
  Upload, FileText, Loader2, Download, X, ArrowLeft,
  RefreshCw, ChevronRight, CheckCircle2, AlertCircle,
  Zap, Shield, Globe
} from "lucide-react";

type ConversionOption = { label: string; value: string };
type Step = "pick-tool" | "upload" | "converting" | "done";

const CONVERSION_MAP: Record<string, ConversionOption[]> = {
  jpg:  [{ label:"PNG",value:"png"},{ label:"WEBP",value:"webp"},{ label:"GIF",value:"gif"},{ label:"BMP",value:"bmp"},{ label:"TIFF",value:"tiff"},{ label:"PDF",value:"pdf"}],
  jpeg: [{ label:"PNG",value:"png"},{ label:"WEBP",value:"webp"},{ label:"GIF",value:"gif"},{ label:"BMP",value:"bmp"},{ label:"TIFF",value:"tiff"},{ label:"PDF",value:"pdf"}],
  png:  [{ label:"JPG",value:"jpg"},{ label:"WEBP",value:"webp"},{ label:"GIF",value:"gif"},{ label:"BMP",value:"bmp"},{ label:"TIFF",value:"tiff"},{ label:"PDF",value:"pdf"}],
  webp: [{ label:"JPG",value:"jpg"},{ label:"PNG",value:"png"},{ label:"GIF",value:"gif"},{ label:"BMP",value:"bmp"},{ label:"TIFF",value:"tiff"},{ label:"PDF",value:"pdf"}],
  gif:  [{ label:"JPG",value:"jpg"},{ label:"PNG",value:"png"},{ label:"WEBP",value:"webp"},{ label:"BMP",value:"bmp"},{ label:"TIFF",value:"tiff"},{ label:"PDF",value:"pdf"}],
  bmp:  [{ label:"JPG",value:"jpg"},{ label:"PNG",value:"png"},{ label:"WEBP",value:"webp"},{ label:"GIF",value:"gif"},{ label:"TIFF",value:"tiff"},{ label:"PDF",value:"pdf"}],
  tiff: [{ label:"JPG",value:"jpg"},{ label:"PNG",value:"png"},{ label:"WEBP",value:"webp"},{ label:"GIF",value:"gif"},{ label:"BMP",value:"bmp"},{ label:"PDF",value:"pdf"}],
  pdf:  [{ label:"JPG",value:"jpg"},{ label:"PNG",value:"png"},{ label:"TXT",value:"txt"},{ label:"DOCX",value:"docx"}],
  docx: [{ label:"PDF",value:"pdf"},{ label:"TXT",value:"txt"}],
  doc:  [{ label:"PDF",value:"pdf"},{ label:"TXT",value:"txt"}],
  txt:  [{ label:"PDF",value:"pdf"},{ label:"DOCX",value:"docx"}],
  csv:  [{ label:"XLSX",value:"xlsx"},{ label:"PDF",value:"pdf"}],
  xlsx: [{ label:"CSV",value:"csv"},{ label:"PDF",value:"pdf"}],
  md:   [{ label:"PDF",value:"pdf"},{ label:"TXT",value:"txt"},{ label:"HTML",value:"html"}],
  html: [{ label:"PDF",value:"pdf"},{ label:"TXT",value:"txt"}],
};

const TOOLS = [
  { id:"pdf-to-word",  from:"pdf",  to:"docx", title:"PDF to Word",       desc:"Convert PDFs into editable Word documents",       icon:"📄", accent:"#ef4444" },
  { id:"word-to-pdf",  from:"docx", to:"pdf",  title:"Word to PDF",       desc:"Turn .docx files into universal PDFs",             icon:"📝", accent:"#3b82f6" },
  { id:"jpg-to-pdf",   from:"jpg",  to:"pdf",  title:"JPG to PDF",        desc:"Pack your images into a clean PDF",                icon:"🖼️", accent:"#8b5cf6" },
  { id:"pdf-to-jpg",   from:"pdf",  to:"jpg",  title:"PDF to JPG",        desc:"Extract PDF pages as high-quality images",         icon:"📷", accent:"#f59e0b" },
  { id:"png-to-jpg",   from:"png",  to:"jpg",  title:"PNG to JPG",        desc:"Convert transparent PNGs to compressed JPGs",      icon:"🎨", accent:"#10b981" },
  { id:"excel-to-pdf", from:"xlsx", to:"pdf",  title:"Excel to PDF",      desc:"Share spreadsheets as styled, locked PDFs",        icon:"📊", accent:"#06b6d4" },
  { id:"csv-to-excel", from:"csv",  to:"xlsx", title:"CSV to Excel",      desc:"Open raw CSV data in a proper spreadsheet",        icon:"📈", accent:"#ec4899" },
  { id:"md-to-pdf",    from:"md",   to:"pdf",  title:"Markdown to PDF",   desc:"Render Markdown notes into polished PDFs",         icon:"📓", accent:"#f97316" },
  { id:"txt-to-pdf",   from:"txt",  to:"pdf",  title:"Text to PDF",       desc:"Wrap plain text into portable PDF documents",      icon:"📃", accent:"#a78bfa" },
  { id:"html-to-pdf",  from:"html", to:"pdf",  title:"HTML to PDF",       desc:"Convert webpages to print-ready PDFs",             icon:"🌐", accent:"#34d399" },
  { id:"pdf-to-txt",   from:"pdf",  to:"txt",  title:"PDF to Text",       desc:"Extract readable plain text from PDFs",            icon:"🔤", accent:"#fb7185" },
  { id:"webp-to-jpg",  from:"webp", to:"jpg",  title:"WEBP to JPG",       desc:"Convert modern WEBP to universal JPG format",      icon:"🔄", accent:"#60a5fa" },
];

const getExt = (name: string) => name.split(".").pop()?.toLowerCase() || "";
const fmtSize = (b: number) =>
  b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;

const FileConverterPage: React.FC = () => {
  const [step, setStep]           = useState<Step>("pick-tool");
  const [activeTool, setActiveTool] = useState<typeof TOOLS[0] | null>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [target, setTarget]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [outputName, setOutputName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetAll = () => {
    setStep("pick-tool"); setActiveTool(null); setFile(null);
    setTarget(""); setLoading(false); setProgress(0); setError(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (inputRef.current) inputRef.current.value = "";
  };

  const pickTool = (tool: typeof TOOLS[0]) => {
    setActiveTool(tool);
    setTarget(tool.to);
    setStep("upload");
  };

  const handleFile = (f: File) => { setFile(f); setError(null); };

  const startProgress = () => {
    setProgress(5);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 85) { clearInterval(timerRef.current!); return p; }
        return Math.min(p + Math.random() * 8 + 3, 85);
      });
    }, 350);
  };

  const handleConvert = async () => {
    if (!file || !target) return;
    setLoading(true); setError(null); setStep("converting");
    startProgress();
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target", target);
      const res = await fetch("http://localhost:5001/convert", { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: "Conversion failed" }));
        throw new Error(e.error || "Conversion failed");
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const stem = file.name.replace(/\.[^.]+$/, "");
      const name = `${stem}.${target}`;
      setOutputName(name);
      setProgress(100);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
        setLoading(false); setStep("done");
      }, 600);
    } catch (err: any) {
      setError(err.message || "Conversion failed. Please try again.");
      setLoading(false); setStep("upload"); setProgress(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const ext = file ? getExt(file.name) : activeTool?.from || "";
  const conversions = CONVERSION_MAP[ext] || [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0a0f;
          --s1: #111118;
          --s2: #16161f;
          --border: rgba(255,255,255,0.06);
          --border2: rgba(255,255,255,0.1);
          --text: #f0f0f5;
          --muted: rgba(240,240,245,0.38);
          --muted2: rgba(240,240,245,0.55);
          --accent: #e8ff47;
          --accent-dim: rgba(232,255,71,0.1);
          --accent-glow: rgba(232,255,71,0.22);
          --r: 14px;
          --font: 'Plus Jakarta Sans', sans-serif;
          --mono: 'JetBrains Mono', monospace;
        }
        html, body { background: var(--bg); font-family: var(--font); color: var(--text); min-height: 100vh; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(232,255,71,0.18); border-radius: 99px; }

        .page-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 80% 55% at 5% -5%, rgba(232,255,71,0.045) 0%, transparent 55%),
            radial-gradient(ellipse 55% 50% at 95% 85%, rgba(99,102,241,0.05) 0%, transparent 55%),
            var(--bg);
        }

        .wrap {
          position: relative; z-index: 1;
          max-width: 1080px; margin: 0 auto;
          padding: 32px 24px 80px;
          animation: fadeUp .5s ease both;
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }

        /* NAV */
        .topnav { display:flex; align-items:center; justify-content:space-between; margin-bottom:48px; }
        .back-btn {
          display:inline-flex; align-items:center; gap:7px;
          padding:8px 16px; border-radius:10px; border:none; cursor:pointer;
          background:var(--s2); border:1px solid var(--border2);
          color:var(--muted2); font-size:13px; font-weight:600; font-family:var(--font);
          transition:all .18s; outline:none;
        }
        .back-btn:hover { color:var(--text); background:rgba(255,255,255,0.07); transform:translateX(-2px); }
        .brand { font-size:12.5px; font-weight:700; letter-spacing:.06em; color:var(--muted); font-family:var(--mono); text-transform:uppercase; }
        .brand b { color:var(--accent); }

        /* HERO */
        .hero { text-align:center; margin-bottom:52px; }
        .eyebrow {
          display:inline-flex; align-items:center; gap:6px;
          background:var(--accent-dim); border:1px solid rgba(232,255,71,0.22);
          color:var(--accent); font-size:11px; font-weight:700; letter-spacing:.12em;
          text-transform:uppercase; padding:5px 14px; border-radius:99px; margin-bottom:20px;
        }
        .eyebrow-dot {
          width:5px; height:5px; border-radius:50%;
          background:var(--accent); box-shadow:0 0 8px var(--accent);
          animation:blink 2s ease infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        .hero-title {
          font-size:clamp(30px,5vw,52px); font-weight:800; line-height:1.07;
          letter-spacing:-.04em; margin-bottom:14px;
        }
        .hero-title em {
          font-style:normal;
          background:linear-gradient(135deg, #e8ff47 0%, #b8ff00 50%, #7fff00 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .hero-sub { font-size:15px; color:var(--muted); max-width:470px; margin:0 auto; line-height:1.65; }
        .feat-row { display:flex; justify-content:center; gap:9px; flex-wrap:wrap; margin-top:22px; }
        .feat-pill {
          display:inline-flex; align-items:center; gap:6px;
          padding:6px 12px; border-radius:8px;
          background:var(--s2); border:1px solid var(--border);
          font-size:11.5px; font-weight:500; color:var(--muted2);
        }
        .feat-pill svg { color:var(--accent); }

        /* SECTION LABEL */
        .sec-label {
          font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
          color:var(--muted); margin-bottom:20px;
          display:flex; align-items:center; gap:10px;
        }
        .sec-label::after { content:''; flex:1; height:1px; background:var(--border); }

        /* TOOL GRID */
        .tools-grid {
          display:grid; grid-template-columns:repeat(auto-fill, minmax(215px, 1fr));
          gap:12px; margin-bottom:48px;
        }
        .tool-card {
          padding:20px; border-radius:var(--r); cursor:pointer; outline:none;
          background:var(--s1); border:1px solid var(--border);
          transition:all .22s; text-align:left; font-family:var(--font);
          position:relative; overflow:hidden;
        }
        .tool-card:hover { transform:translateY(-3px); box-shadow:0 14px 40px rgba(0,0,0,.35); }
        .tool-card .arrow { position:absolute; top:15px; right:15px; opacity:0; transform:translateX(-4px); transition:all .2s; }
        .tool-card:hover .arrow { opacity:1; transform:translateX(0); }
        .tool-icon { font-size:26px; margin-bottom:12px; line-height:1; }
        .tool-title { font-size:13.5px; font-weight:700; color:var(--text); margin-bottom:4px; }
        .tool-desc { font-size:11.5px; color:var(--muted); line-height:1.55; }
        .tool-tags { display:flex; align-items:center; gap:5px; margin-top:12px; }
        .tag {
          padding:2px 8px; border-radius:5px; font-size:9.5px; font-weight:700;
          font-family:var(--mono); text-transform:uppercase;
        }
        .tag-from { background:rgba(255,255,255,0.06); color:var(--muted2); border:1px solid var(--border); }

        /* CONVERTER PANEL */
        .panel { max-width:580px; margin:0 auto; animation:fadeUp .4s ease both; }
        .panel-head { display:flex; align-items:center; gap:14px; margin-bottom:32px; }
        .panel-back {
          width:36px; height:36px; border-radius:10px; border:none; cursor:pointer; outline:none;
          background:var(--s2); border:1px solid var(--border2);
          color:var(--muted2); display:flex; align-items:center; justify-content:center;
          transition:all .18s; flex-shrink:0;
        }
        .panel-back:hover { background:rgba(255,255,255,0.08); color:var(--text); transform:translateX(-2px); }
        .panel-title { font-size:22px; font-weight:800; letter-spacing:-.02em; }
        .panel-sub { font-size:13px; color:var(--muted); margin-top:3px; }

        /* UPLOAD CARD */
        .upload-card {
          background:var(--s1); border:1px solid var(--border);
          border-radius:18px; padding:24px;
        }
        .drop-zone {
          border:2px dashed rgba(255,255,255,0.09); border-radius:12px;
          padding:40px 24px; cursor:pointer; text-align:center;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:11px; transition:all .25s; min-height:178px;
        }
        .drop-zone:hover, .drop-zone.drag { border-color:rgba(232,255,71,0.35); background:rgba(232,255,71,0.025); }
        .drop-zone.has-file { border-style:solid; border-color:rgba(99,102,241,0.3); background:rgba(99,102,241,0.03); cursor:default; }
        .drop-icon-wrap { color:rgba(255,255,255,0.2); }
        .drop-title { font-size:15px; font-weight:600; color:rgba(255,255,255,0.6); }
        .drop-sub { font-size:12px; color:var(--muted); }
        .browse-btn {
          display:inline-flex; align-items:center; gap:6px;
          padding:9px 20px; border-radius:9px; border:none; cursor:pointer;
          background:var(--accent-dim); border:1px solid rgba(232,255,71,0.28);
          color:var(--accent); font-size:13px; font-weight:700; font-family:var(--font);
          transition:all .18s; outline:none; margin-top:4px;
        }
        .browse-btn:hover { background:rgba(232,255,71,0.16); }

        .file-row { display:flex; align-items:center; gap:14px; width:100%; }
        .file-icon-box {
          width:48px; height:48px; border-radius:12px; flex-shrink:0;
          background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.22);
          display:flex; align-items:center; justify-content:center; color:#818cf8;
        }
        .file-info { flex:1; min-width:0; }
        .file-name { font-size:14px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .file-meta { font-size:11px; color:var(--muted); font-family:var(--mono); margin-top:3px; }
        .ext-badge {
          padding:2px 7px; border-radius:5px; margin-left:7px;
          background:var(--accent-dim); border:1px solid rgba(232,255,71,0.22);
          font-size:9.5px; font-weight:800; color:var(--accent); text-transform:uppercase; font-family:var(--mono);
        }
        .rm-btn {
          width:30px; height:30px; border-radius:8px; border:none; cursor:pointer; flex-shrink:0; outline:none;
          background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.18);
          color:#f87171; display:flex; align-items:center; justify-content:center; transition:all .18s;
        }
        .rm-btn:hover { background:rgba(239,68,68,0.16); transform:scale(1.1); }

        /* TARGET CHIPS */
        .target-row { margin-top:20px; }
        .target-label { font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin-bottom:10px; }
        .chip-row { display:flex; flex-wrap:wrap; gap:8px; }
        .chip {
          padding:8px 18px; border-radius:9px; border:none; cursor:pointer; outline:none;
          font-size:12px; font-weight:700; font-family:var(--mono); text-transform:uppercase;
          background:var(--s2); border:1px solid var(--border2);
          color:var(--muted2); transition:all .18s;
        }
        .chip:hover { background:var(--accent-dim); border-color:rgba(232,255,71,0.3); color:var(--accent); transform:translateY(-1px); }
        .chip.active { background:var(--accent-dim); border-color:rgba(232,255,71,0.45); color:var(--accent); box-shadow:0 0 18px var(--accent-glow); }

        /* CONVERT BTN */
        .conv-btn {
          width:100%; margin-top:22px; padding:15px; border-radius:12px; border:none; cursor:pointer; outline:none;
          background:var(--accent); color:#000; font-size:15px; font-weight:800; font-family:var(--font);
          display:flex; align-items:center; justify-content:center; gap:9px;
          transition:all .22s; box-shadow:0 0 28px var(--accent-glow); letter-spacing:-.01em;
        }
        .conv-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 0 48px rgba(232,255,71,.38); }
        .conv-btn:active:not(:disabled) { transform:scale(.97); }
        .conv-btn:disabled { opacity:.45; cursor:not-allowed; }

        /* ERROR / UNSUPPORTED */
        .error-box {
          margin-top:14px; padding:13px 16px; border-radius:10px;
          background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.2);
          color:#f87171; font-size:13px; display:flex; align-items:flex-start; gap:9px;
          animation:fadeUp .3s ease;
        }
        .warn-box {
          margin-top:14px; padding:13px 16px; border-radius:10px;
          background:rgba(245,158,11,0.07); border:1px solid rgba(245,158,11,0.2);
          color:#fbbf24; font-size:13px;
        }

        /* CONVERTING SCREEN */
        .conv-screen {
          max-width:480px; margin:0 auto; text-align:center;
          padding:64px 24px; animation:fadeUp .4s ease both;
        }
        .spinner {
          width:76px; height:76px; border-radius:50%;
          border:3px solid rgba(255,255,255,0.06);
          border-top-color:var(--accent);
          animation:spin .85s linear infinite;
          margin:0 auto 28px;
        }
        @keyframes spin { to{transform:rotate(360deg)} }
        .conv-title { font-size:24px; font-weight:800; letter-spacing:-.02em; margin-bottom:8px; }
        .conv-sub { font-size:14px; color:var(--muted); margin-bottom:28px; }
        .prog-wrap { max-width:300px; margin:0 auto; }
        .prog-track { height:5px; border-radius:99px; background:rgba(255,255,255,0.06); overflow:hidden; }
        .prog-fill {
          height:100%; border-radius:99px;
          background:linear-gradient(90deg,#e8ff47,#b8ff00,#7fff00);
          transition:width .35s ease; box-shadow:0 0 10px rgba(232,255,71,.4);
        }
        .prog-meta { display:flex; justify-content:space-between; margin-top:8px; }
        .prog-status { font-size:12px; color:var(--muted); }
        .prog-pct { font-size:12px; color:var(--accent); font-family:var(--mono); font-weight:700; }

        /* DONE SCREEN */
        .done-screen {
          max-width:480px; margin:0 auto; text-align:center;
          padding:64px 24px; animation:fadeUp .5s ease both;
        }
        .done-icon {
          width:78px; height:78px; border-radius:50%;
          background:rgba(52,211,153,0.1); border:2px solid rgba(52,211,153,0.28);
          display:flex; align-items:center; justify-content:center;
          color:#34d399; margin:0 auto 24px;
          animation:popIn .5s cubic-bezier(.175,.885,.32,1.275) both;
        }
        @keyframes popIn { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
        .done-title { font-size:26px; font-weight:800; letter-spacing:-.03em; margin-bottom:8px; }
        .done-sub { font-size:14px; color:var(--muted); margin-bottom:24px; }
        .done-file {
          display:inline-flex; align-items:center; gap:8px;
          padding:10px 18px; border-radius:10px;
          background:rgba(52,211,153,0.07); border:1px solid rgba(52,211,153,0.2);
          color:#6ee7b7; font-family:var(--mono); font-size:13px; margin-bottom:28px;
        }
        .done-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
        .btn-primary {
          padding:11px 22px; border-radius:10px; border:none; cursor:pointer; outline:none;
          background:var(--accent); color:#000; font-size:13px; font-weight:800; font-family:var(--font);
          transition:all .18s; display:inline-flex; align-items:center; gap:7px;
        }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 0 24px var(--accent-glow); }
        .btn-ghost {
          padding:11px 22px; border-radius:10px; border:none; cursor:pointer; outline:none;
          background:var(--s2); border:1px solid var(--border2);
          color:var(--muted2); font-size:13px; font-weight:600; font-family:var(--font);
          transition:all .18s; display:inline-flex; align-items:center; gap:7px;
        }
        .btn-ghost:hover { background:rgba(255,255,255,0.07); color:var(--text); }

        @media(max-width:600px){ .tools-grid{grid-template-columns:1fr 1fr;} }
        @media(max-width:380px){ .tools-grid{grid-template-columns:1fr;} }
      `}</style>

      <div className="page-bg" />

      <div className="wrap">
        <nav className="topnav">
          <button className="back-btn" onClick={() => (window.location.href = "/dashboard")}>
            <ArrowLeft size={13} /> Dashboard
          </button>
          <div className="brand">DOCUFREE<b>.</b>AI</div>
        </nav>

        {step === "pick-tool" && (
          <>
            <div className="hero">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                File Converter
              </div>
              <h1 className="hero-title">
                Convert any file<br />
                <em>instantly & free</em>
              </h1>
              <p className="hero-sub">
                PDF, Word, Excel, Images, Markdown — all formats supported.
                No sign-up, no watermarks, runs locally on your machine.
              </p>
              <div className="feat-row">
                <span className="feat-pill"><Zap size={12} /> Lightning fast</span>
                <span className="feat-pill"><Shield size={12} /> 100% private</span>
                <span className="feat-pill"><Globe size={12} /> No upload limits</span>
              </div>
            </div>

            <div className="sec-label">Choose a conversion</div>
            <div className="tools-grid">
              {TOOLS.map(tool => (
                <button
                  key={tool.id}
                  className="tool-card"
                  onClick={() => pickTool(tool)}
                  style={{ ["--hov-border" as any]: `${tool.accent}30` }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${tool.accent}35`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <ChevronRight size={13} className="arrow" style={{ color: tool.accent }} />
                  <div className="tool-icon">{tool.icon}</div>
                  <div className="tool-title">{tool.title}</div>
                  <div className="tool-desc">{tool.desc}</div>
                  <div className="tool-tags">
                    <span className="tag tag-from">.{tool.from.toUpperCase()}</span>
                    <ChevronRight size={10} style={{ color:"var(--muted)", flexShrink:0 }} />
                    <span
                      className="tag"
                      style={{ background:`${tool.accent}18`, color:tool.accent, border:`1px solid ${tool.accent}40` }}
                    >
                      .{tool.to.toUpperCase()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "upload" && (
          <div className="panel">
            <div className="panel-head">
              <button className="panel-back" onClick={resetAll}><ArrowLeft size={15} /></button>
              <div>
                <div className="panel-title">{activeTool?.title ?? "Convert File"}</div>
                <div className="panel-sub">{activeTool?.desc ?? "Upload your file and pick a target format"}</div>
              </div>
            </div>

            <div className="upload-card">
              <div
                className={`drop-zone${file ? " has-file" : ""}${dragging ? " drag" : ""}`}
                onClick={() => !file && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              >
                {file ? (
                  <div className="file-row">
                    <div className="file-icon-box"><FileText size={22} /></div>
                    <div className="file-info">
                      <div className="file-name">
                        {file.name}<span className="ext-badge">.{ext}</span>
                      </div>
                      <div className="file-meta">{fmtSize(file.size)}</div>
                    </div>
                    <button className="rm-btn" onClick={e => { e.stopPropagation(); setFile(null); setError(null); if (inputRef.current) inputRef.current.value = ""; }}>
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={38} className="drop-icon-wrap" />
                    <div className="drop-title">Drop your file here</div>
                    <div className="drop-sub">
                      {activeTool ? `Select a .${activeTool.from.toUpperCase()} file` : "Any supported format"}
                    </div>
                    <button className="browse-btn"><Upload size={13} /> Browse Files</button>
                  </>
                )}
                <input
                  ref={inputRef} type="file" hidden
                  onChange={e => e.target.files && handleFile(e.target.files[0])}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.csv,.xlsx,.md,.html"
                />
              </div>

              {file && conversions.length > 0 && (
                <div className="target-row">
                  <div className="target-label">Convert .{ext.toUpperCase()} to:</div>
                  <div className="chip-row">
                    {conversions.map(c => (
                      <button
                        key={c.value}
                        className={`chip${target === c.value ? " active" : ""}`}
                        onClick={() => { setTarget(c.value); setError(null); }}
                      >
                        .{c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {file && conversions.length === 0 && (
                <div className="warn-box">⚠ No conversions available for .{ext.toUpperCase()} files.</div>
              )}

              {error && (
                <div className="error-box">
                  <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }} />
                  {error}
                </div>
              )}

              {file && target && (
                <button className="conv-btn" onClick={handleConvert} disabled={loading}>
                  <RefreshCw size={15} /> Convert to .{target.toUpperCase()}
                </button>
              )}
            </div>
          </div>
        )}

        {step === "converting" && (
          <div className="conv-screen">
            <div className="spinner" />
            <div className="conv-title">Converting your file…</div>
            <div className="conv-sub">{file?.name} → .{target.toUpperCase()}</div>
            <div className="prog-wrap">
              <div className="prog-track">
                <div className="prog-fill" style={{ width:`${Math.min(progress, 100)}%` }} />
              </div>
              <div className="prog-meta">
                <span className="prog-status">Processing…</span>
                <span className="prog-pct">{Math.min(Math.round(progress), 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="done-screen">
            <div className="done-icon"><CheckCircle2 size={36} /></div>
            <div className="done-title">Conversion complete!</div>
            <div className="done-sub">Your file has been downloaded automatically.</div>
            <div className="done-file"><Download size={14} />{outputName}</div>
            <div className="done-actions">
              <button className="btn-primary" onClick={() => { setStep("upload"); setFile(null); setError(null); setProgress(0); if (inputRef.current) inputRef.current.value = ""; }}>
                <RefreshCw size={14} /> Convert another
              </button>
              <button className="btn-ghost" onClick={resetAll}>
                <ArrowLeft size={14} /> All tools
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FileConverterPage;