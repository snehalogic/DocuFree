import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { speakText } from "../utils/tts";

interface Translation {
  id: string;
  name?: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: string;
}

interface OcrResultFile {
  _id: string;
  filename: string;
  originalName: string;
  extractedText: string;
  createdAt: string;
}

const LANGS = [
  { code: 'hi', label: 'Hindi (हिंदी)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ur', label: 'Urdu (اردو)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'zh', label: 'Chinese (中文)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'ko', label: 'Korean (한국어)' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'ru', label: 'Russian (Русский)' },
];

const API_BASE_URL = "http://localhost:5000";

const TranslationPage: React.FC = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [translated, setTranslated] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('hi');
  const [loadingTranslate, setLoadingTranslate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [past, setPast] = useState<Translation[]>([]);
  const [translationInfo, setTranslationInfo] = useState<{model?: string, chunks?: number} | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [showOcrPicker, setShowOcrPicker] = useState(false);
  const [ocrFiles, setOcrFiles] = useState<OcrResultFile[]>([]);
  const [loadingOcrFiles, setLoadingOcrFiles] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  useEffect(() => {
    if (showPast) fetchPastTranslations();
  }, [showPast]);

  const openOcrPicker = async () => {
    setShowOcrPicker(true);
    setOcrError(null);
    setLoadingOcrFiles(true);
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
      setOcrError(e?.message || "Failed to load OCR results");
      setOcrFiles([]);
    } finally {
      setLoadingOcrFiles(false);
    }
  };

  const handleUseOcrFile = (file: OcrResultFile) => {
    setInput(file.extractedText);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowOcrPicker(false);
  };

  const handleTranslate = async () => {
    if (!input.trim()) return;
    setLoadingTranslate(true);
    setTranslated('');
    setTranslationInfo(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/translation/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, sourceLang, targetLang })
      });
      const data = await res.json();
      if (data.success) {
        setTranslated(data.translatedText || '');
        setTranslationInfo({ model: data.model, chunks: data.chunksProcessed });
      } else {
        setTranslated('Translation failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      setTranslated('Translation failed: Network error');
    } finally {
      setLoadingTranslate(false);
    }
  };

  const handleSave = async () => {
    if (!translated) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/translation/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${sourceLang}->${targetLang} ${new Date().toLocaleString()}`,
          sourceLang, targetLang, originalText: input, translatedText: translated
        })
      });
      const data = await res.json();
      if (data?.success) {
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 2000);
        if (showPast) fetchPastTranslations();
      } else { alert('Save failed'); }
    } catch (e) { console.error(e); alert('Save failed'); }
    finally { setSaving(false); }
  };

  const fetchPastTranslations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/translation/history`);
      const data = await res.json();
      setPast(data.translations || []);
    } catch (e) { console.error(e); setPast([]); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    });
  };

  const handleDownload = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this translation?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/translation/delete/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data?.success) { setPast(prev => prev.filter(p => p.id !== id)); }
      else { alert('Delete failed'); }
    } catch (e) { console.error(e); alert('Delete failed'); }
  };

  const swapLanguages = () => {
    if (sourceLang === 'auto') return;
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    const tempText = input;
    setInput(translated);
    setTranslated(tempText);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Syne', sans-serif; background: #080c14; }
        .tp-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .tp-blob { position: absolute; border-radius: 50%; filter: blur(110px); animation: blobDrift 24s ease-in-out infinite; }
        .tp-blob-1 { width: 70vw; height: 70vw; background: radial-gradient(circle, rgba(251,191,36,0.09) 0%, transparent 70%); top: -25%; left: -20%; animation-duration: 28s; }
        .tp-blob-2 { width: 55vw; height: 55vw; background: radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%); top: 30%; right: -20%; animation-duration: 22s; animation-delay: -7s; }
        .tp-blob-3 { width: 45vw; height: 45vw; background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%); bottom: -15%; left: 25%; animation-duration: 30s; animation-delay: -14s; }
        @keyframes blobDrift { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-30px) scale(1.1); } 66% { transform: translate(-30px,40px) scale(0.92); } }
        .tp-grid { position: absolute; inset: 0; background-image: radial-gradient(rgba(251,191,36,0.1) 1px, transparent 1px); background-size: 44px 44px; opacity: 0.4; }
        .tp-wrapper { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 36px 24px 60px; }
        .tp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 36px; }
        .tp-back-btn { display: flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 12px; border: none; cursor: pointer; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500; font-family: 'Syne', sans-serif; backdrop-filter: blur(20px); outline: none; transition: all 0.2s; }
        .tp-back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .tp-brand { text-align: center; }
        .tp-brand-name { font-size: clamp(22px,4vw,34px); font-weight: 800; color: #fff; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 6px; }
        .tp-brand-accent { background: linear-gradient(90deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .tp-brand-sub { font-size: 12px; color: rgba(255,255,255,0.3); font-weight: 400; letter-spacing: 0.04em; }
        .tp-badge { display: inline-flex; align-items: center; gap: 7px; padding: 6px 14px; border-radius: 99px; background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.22); font-size: 11px; font-weight: 600; letter-spacing: 0.1em; color: #fbbf24; text-transform: uppercase; }
        .tp-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #fbbf24; box-shadow: 0 0 8px #fbbf24; animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.4); } }
        .tp-grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        @media (max-width: 768px) { .tp-grid-layout { grid-template-columns: 1fr; } }
        .tp-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 22px; backdrop-filter: blur(40px); padding: 24px; box-shadow: 0 8px 60px rgba(0,0,0,0.3); }
        .tp-card-label { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 14px; }
        .tp-textarea { width: 100%; min-height: 220px; padding: 16px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); color: #f1f5f9; font-size: 14px; font-family: 'Syne', sans-serif; font-weight: 400; line-height: 1.65; outline: none; resize: vertical; transition: border-color 0.3s, box-shadow 0.3s; }
        .tp-textarea::placeholder { color: rgba(255,255,255,0.2); }
        .tp-textarea:focus { border-color: rgba(251,191,36,0.4); box-shadow: 0 0 0 3px rgba(251,191,36,0.08), 0 0 30px rgba(251,191,36,0.1); }
        .tp-result { min-height: 220px; padding: 16px; border-radius: 14px; background: rgba(6,182,212,0.04); border: 1px solid rgba(6,182,212,0.2); color: #e0f7ff; font-size: 14px; line-height: 1.75; position: relative; overflow: hidden; box-shadow: 0 0 30px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.05); }
        .tp-result::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #06b6d4, #0ea5e9, #6366f1); }
        .tp-result-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 220px; color: rgba(255,255,255,0.22); text-align: center; gap: 10px; }
        .tp-result-empty-icon { font-size: 36px; }
        .tp-lang-row { display: flex; align-items: center; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
        .tp-select { flex: 1; min-width: 130px; padding: 10px 14px; border-radius: 11px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 13px; font-weight: 500; font-family: 'Syne', sans-serif; outline: none; cursor: pointer; transition: border-color 0.2s; }
        .tp-select option { background: #0f172a; color: #fff; }
        .tp-select:focus { border-color: rgba(251,191,36,0.4); }
        .tp-swap-btn { padding: 10px 14px; border-radius: 11px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); font-size: 18px; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; outline: none; }
        .tp-swap-btn:hover:not(:disabled) { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.3); color: #fbbf24; }
        .tp-swap-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .tp-btn-primary { width: 100%; margin-top: 16px; padding: 13px 20px; border-radius: 13px; border: none; cursor: pointer; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000; font-size: 14px; font-weight: 700; font-family: 'Syne', sans-serif; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.25s; box-shadow: 0 0 24px rgba(251,191,36,0.3); }
        .tp-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 0 40px rgba(251,191,36,0.5); }
        .tp-btn-primary:active:not(:disabled) { transform: scale(0.97); }
        .tp-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
        .tp-btn-green { flex: 1; min-width: 160px; padding: 11px 18px; border-radius: 13px; border: none; cursor: pointer; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-size: 13px; font-weight: 700; font-family: 'Syne', sans-serif; transition: all 0.25s; box-shadow: 0 0 20px rgba(16,185,129,0.25); }
        .tp-btn-green:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 0 32px rgba(16,185,129,0.4); }
        .tp-btn-green:disabled { opacity: 0.45; cursor: not-allowed; }
        .tp-btn-teal { flex: 1; min-width: 160px; padding: 11px 18px; border-radius: 13px; border: 1px solid rgba(6,182,212,0.3); cursor: pointer; background: rgba(6,182,212,0.07); color: #22d3ee; font-size: 13px; font-weight: 700; font-family: 'Syne', sans-serif; transition: all 0.2s; }
        .tp-btn-teal:hover { background: rgba(6,182,212,0.14); border-color: rgba(6,182,212,0.5); }
        .tp-btn-teal.active { background: rgba(6,182,212,0.18); }
        .tp-action-btn { padding: 9px 16px; border-radius: 11px; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500; font-family: 'Syne', sans-serif; cursor: pointer; transition: all 0.18s; outline: none; display: flex; align-items: center; gap: 6px; }
        .tp-action-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #fff; transform: translateY(-1px); }
        .tp-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .tp-btn-row { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
        .tp-btn-row2 { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
        .tp-char { font-size: 11px; color: rgba(255,255,255,0.25); font-family: 'DM Mono', monospace; text-align: right; margin-top: 8px; }
        .tp-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.25); border-top-color: #000; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tp-progress { height: 3px; border-radius: 2px; margin-top: 14px; background: linear-gradient(90deg, #fbbf24, #f59e0b, #fb923c); background-size: 200% 100%; animation: progressSlide 1.4s linear infinite; }
        @keyframes progressSlide { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .tp-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent); margin: 20px 0; }
        .tp-history-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px 18px; margin-bottom: 12px; transition: border-color 0.2s, transform 0.2s; }
        .tp-history-card:hover { border-color: rgba(251,191,36,0.2); transform: translateY(-1px); }
        .tp-history-langs { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 3px; }
        .tp-history-date { font-size: 11px; color: rgba(255,255,255,0.28); font-family: 'DM Mono', monospace; margin-bottom: 12px; }
        .tp-icon-btn { padding: 6px 12px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); font-size: 13px; font-family: 'Syne', sans-serif; cursor: pointer; transition: all 0.18s; outline: none; }
        .tp-icon-btn:hover { background: rgba(255,255,255,0.09); color: #fff; }
        .tp-icon-btn.delete:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #f87171; }
        .tp-icon-btn.restore:hover { background: rgba(6,182,212,0.1); border-color: rgba(6,182,212,0.3); color: #22d3ee; }
        details summary { list-style: none; cursor: pointer; font-size: 12px; font-weight: 600; color: #fbbf24; user-select: none; }
        details summary::-webkit-details-marker { display: none; }
        .tp-detail-box { padding: 10px 12px; border-radius: 10px; font-size: 13px; white-space: pre-wrap; word-break: break-word; max-height: 140px; overflow-y: auto; margin-top: 8px; line-height: 1.6; color: rgba(255,255,255,0.75); }
        .tp-detail-original { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }
        .tp-detail-translated { background: rgba(6,182,212,0.05); border: 1px solid rgba(6,182,212,0.15); }
        .tp-detail-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); margin-bottom: 4px; letter-spacing: 0.06em; text-transform: uppercase; }
        .tp-empty { text-align: center; padding: 36px 20px; color: rgba(255,255,255,0.22); font-size: 14px; }
        .tp-toast { position: fixed; bottom: 28px; right: 28px; z-index: 999; background: rgba(20,27,40,0.95); border: 1px solid rgba(251,191,36,0.3); color: #fbbf24; font-size: 13px; font-weight: 600; padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.4); backdrop-filter: blur(20px); animation: toastIn 0.3s ease, toastOut 0.3s ease 1.7s forwards; font-family: 'Syne', sans-serif; }
        @keyframes toastIn { from { opacity:0; transform:translateY(16px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes toastOut { to { opacity:0; transform:translateY(10px); } }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.3); border-radius: 99px; }
        .tp-ocr-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at top, rgba(15,23,42,0.96), rgba(15,23,42,0.98)); backdrop-filter: blur(24px); padding: 24px; }
        .tp-ocr-modal { width: 100%; max-width: 520px; max-height: 70vh; background: rgba(15,23,42,0.98); border-radius: 20px; border: 1px solid rgba(148,163,184,0.35); box-shadow: 0 24px 80px rgba(15,23,42,0.9); padding: 20px 20px 16px; display: flex; flex-direction: column; gap: 12px; }
        .tp-ocr-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .tp-ocr-title { font-size: 15px; font-weight: 600; color: #e5e7eb; }
        .tp-ocr-sub { font-size: 11px; color: rgba(148,163,184,0.8); margin-top: 2px; }
        .tp-ocr-close { border-radius: 999px; border: 1px solid rgba(148,163,184,0.5); background: rgba(15,23,42,0.9); color: rgba(148,163,184,0.9); padding: 5px 10px; font-size: 11px; cursor: pointer; }
        .tp-ocr-list { margin-top: 4px; padding-top: 8px; border-top: 1px solid rgba(30,64,175,0.8); overflow-y: auto; }
        .tp-ocr-empty { padding: 24px 8px; text-align: center; font-size: 13px; color: rgba(148,163,184,0.9); }
        .tp-ocr-item { width: 100%; border: none; background: rgba(15,23,42,0.9); border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; transition: background 0.18s, transform 0.18s, border-color 0.18s; border: 1px solid rgba(30,64,175,0.6); text-align: left; }
        .tp-ocr-item:hover { background: rgba(30,64,175,0.5); transform: translateY(-1px); }
        .tp-ocr-name { font-size: 13px; color: #e5e7eb; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tp-ocr-meta { font-size: 11px; color: rgba(148,163,184,0.9); }
        .tp-ocr-icon { width: 26px; height: 26px; border-radius: 999px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 30% 0, #fbbf24, #6366f1); box-shadow: 0 0 16px rgba(129,140,248,0.7); font-size: 14px; }
      `}</style>

      <div className="tp-bg">
        <div className="tp-blob tp-blob-1" />
        <div className="tp-blob tp-blob-2" />
        <div className="tp-blob tp-blob-3" />
        <div className="tp-grid" />
      </div>

      {copyToast && <div className="tp-toast">📋 Copied to clipboard!</div>}
      {saveToast && <div className="tp-toast">💾 Translation saved!</div>}

      <div className="tp-wrapper">

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className="tp-header">
          <motion.button whileHover={{ scale: 1.06, x: -2 }} whileTap={{ scale: 0.93 }} className="tp-back-btn" onClick={() => navigate('/dashboard')}>← Back</motion.button>
          <div className="tp-brand">
            <div className="tp-brand-name">Docufree <span className="tp-brand-accent">Translation</span></div>
            <div className="tp-brand-sub">AI-powered • 20+ languages • Any text size</div>
          </div>
          <div className="tp-badge"><span className="tp-badge-dot" />Live</div>
        </motion.div>

        <div className="tp-grid-layout">

          <motion.div className="tp-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: "spring", stiffness: 240, damping: 26 }}>
            <div className="tp-card-label">📄 Input Text</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.96 }} className="tp-action-btn" onClick={openOcrPicker}>
                ⬆ Insert from OCR
              </motion.button>
            </div>
            <textarea className="tp-textarea" value={input} onChange={e => setInput(e.target.value)} placeholder="Paste or type text in any language to translate…" />
            <div className="tp-char">{input.length} chars {input.length > 500 && `· ~${Math.ceil(input.length / 500)} chunks`}</div>
            <div className="tp-lang-row">
              <select className="tp-select" value={sourceLang} onChange={e => setSourceLang(e.target.value)}>
                <option value="auto">🔍 Auto-detect</option>
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <motion.button className="tp-swap-btn" whileHover={sourceLang !== 'auto' ? { rotate: 180, scale: 1.1 } : {}} whileTap={sourceLang !== 'auto' ? { scale: 0.9 } : {}} onClick={swapLanguages} disabled={sourceLang === 'auto'} title="Swap languages">⇄</motion.button>
              <select className="tp-select" value={targetLang} onChange={e => setTargetLang(e.target.value)}>
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            {loadingTranslate && <div className="tp-progress" />}
            <motion.button className="tp-btn-primary" whileHover={!loadingTranslate && input.trim() ? { scale: 1.02 } : {}} whileTap={!loadingTranslate && input.trim() ? { scale: 0.97 } : {}} onClick={handleTranslate} disabled={loadingTranslate || !input.trim()}>
              {loadingTranslate ? <><span className="tp-spinner" /> Translating…</> : <>✦ Translate Now</>}
            </motion.button>
          </motion.div>

          <motion.div className="tp-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, type: "spring", stiffness: 240, damping: 26 }}>
            <div className="tp-card-label" style={{ color: "rgba(6,182,212,0.7)" }}>✨ Translated Text</div>
            <AnimatePresence mode="wait">
              <motion.div key={translated || 'empty'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="tp-result">
                {loadingTranslate ? (
                  <div className="tp-result-empty">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} style={{ fontSize: 36 }}>⚙️</motion.div>
                    <div style={{ fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Processing…</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Large texts may take a moment</div>
                  </div>
                ) : translated ? (
                  <>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'Syne, sans-serif', fontSize: 14, lineHeight: 1.7, color: '#e0f7ff' }}>{translated}</pre>
                    {translationInfo && (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(6,182,212,0.15)', fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontFamily: 'DM Mono, monospace' }}>
                        <span>Model: {translationInfo.model}</span>
                        {translationInfo.chunks && translationInfo.chunks > 1 && <span>Chunks: {translationInfo.chunks}</span>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="tp-result-empty">
                    <div className="tp-result-empty-icon">🌐</div>
                    <div style={{ fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>Translation appears here</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Supports any length</div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            <div className="tp-btn-row">
              {(["📋 Copy", "💾 Download"] as const).map((label) => (
                <motion.button key={label} className="tp-action-btn" whileHover={translated ? { scale: 1.04, y: -1 } : {}} whileTap={translated ? { scale: 0.95 } : {}} disabled={!translated}
                  onClick={() => {
                    if (label === "📋 Copy") handleCopy(translated);
                    if (label === "💾 Download") handleDownload(`translation_${new Date().toISOString().slice(0,10)}.txt`, translated);
                  }}>{label}</motion.button>
              ))}
            </div>
            <div className="tp-btn-row2">
              <motion.button className="tp-btn-green" whileHover={translated && !saving ? { scale: 1.02 } : {}} whileTap={translated && !saving ? { scale: 0.97 } : {}} onClick={handleSave} disabled={!translated || saving}>
                {saving ? '💾 Saving…' : '💾 Save Translation'}
              </motion.button>
              <motion.button className={`tp-btn-teal ${showPast ? 'active' : ''}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setShowPast(s => !s)}>
                {showPast ? '✕ Hide History' : '📚 View History'}
              </motion.button>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {showPast && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.3 }} className="tp-card">
              <div className="tp-card-label">📜 Translation History</div>
              <div className="tp-divider" style={{ margin: '0 0 16px' }} />
              {past.length === 0 ? (
                <div className="tp-empty"><div style={{ fontSize: 36, marginBottom: 10 }}>📭</div><div>No past translations found</div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 520, overflowY: 'auto' }}>
                  {past.map((item, idx) => (
                    <motion.div key={item.id} className="tp-history-card" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div className="tp-history-langs">{item.sourceLang} → {item.targetLang}</div>
                          <div className="tp-history-date">{new Date(item.timestamp).toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="tp-icon-btn" onClick={() => handleCopy(item.translatedText)}>📋</motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="tp-icon-btn" onClick={() => handleDownload(`${item.sourceLang}-${item.targetLang}.txt`, item.translatedText)}>⬇</motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="tp-icon-btn restore" onClick={() => { setInput(item.originalText); setTranslated(item.translatedText); setSourceLang(item.sourceLang); setTargetLang(item.targetLang); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>↺</motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="tp-icon-btn delete" onClick={() => handleDelete(item.id)}>🗑</motion.button>
                        </div>
                      </div>
                      <details>
                        <summary>View content ▼</summary>
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="tp-detail-label">Original ({item.sourceLang})</div>
                          <div className="tp-detail-box tp-detail-original">{item.originalText}</div>
                          <div className="tp-detail-label" style={{ marginTop: 12 }}>Translated ({item.targetLang})</div>
                          <div className="tp-detail-box tp-detail-translated">{item.translatedText}</div>
                        </div>
                      </details>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showOcrPicker && (
            <motion.div className="tp-ocr-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowOcrPicker(false)}>
              <motion.div className="tp-ocr-modal" initial={{ scale: 0.9, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} onClick={e => e.stopPropagation()}>
                <div className="tp-ocr-header">
                  <div>
                    <div className="tp-ocr-title">OCR Processed Documents</div>
                    <div className="tp-ocr-sub">Select a document to paste its extracted text into the input.</div>
                  </div>
                  <button className="tp-ocr-close" type="button" onClick={() => setShowOcrPicker(false)}>Close</button>
                </div>
                <div className="tp-ocr-list">
                  {loadingOcrFiles && <div className="tp-ocr-empty">Loading documents…</div>}
                  {!loadingOcrFiles && ocrError && <div className="tp-ocr-empty">Failed to load: {ocrError}</div>}
                  {!loadingOcrFiles && !ocrError && ocrFiles.length === 0 && (
                    <div className="tp-ocr-empty">No OCR processed documents found.<br />Upload a document and run OCR first.</div>
                  )}
                  {!loadingOcrFiles && !ocrError && ocrFiles.map(file => (
                    <button key={file._id} type="button" className="tp-ocr-item" onClick={() => handleUseOcrFile(file)}>
                      <div>
                        {/* ✅ Shows original name e.g. "invoice.pdf" */}
                        <div className="tp-ocr-name">{file.originalName}</div>
                        <div className="tp-ocr-meta">
                          {new Date(file.createdAt).toLocaleString()} &nbsp;·&nbsp;
                          {file.extractedText.split(/\s+/).filter(Boolean).length} words
                        </div>
                      </div>
                      <div className="tp-ocr-icon">⇢</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} style={{ textAlign: 'center', marginTop: 28, fontSize: 10.5, color: 'rgba(255,255,255,0.14)', letterSpacing: '0.07em', fontFamily: 'Syne, sans-serif' }}>
          DOCUFREE-AI — ADVANCED DOCUMENT INTELLIGENCE
        </motion.p>
      </div>
    </>
  );
};

export default TranslationPage;