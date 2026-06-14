import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Copy, FileDown, Trash2, X, Save } from "lucide-react";
import axios from "axios";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type OcrResult = {
  id: string;          
  filename: string;   
  originalName: string;
  text: string;
  charCount: number;
  wordCount: number;
  uploadDate: string;
  processedDate: string;
};

export default function OcrResultsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<OcrResult | null>(null);
  const [editedText, setEditedText] = useState("");

  useEffect(() => {
    fetchOcrResults();
  }, []);

  const fetchOcrResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await axios.get("http://localhost:5000/api/documents", { headers });
      const docs = res.data;

      if (!Array.isArray(docs)) return setOcrResults([]);

      const results: OcrResult[] = docs
        .filter((doc: any) => doc.extractedText && doc.extractedText.trim().length > 0)
        .map((doc: any) => ({
          id: doc._id,
          filename: doc.filename,
          originalName: doc.originalName || doc.filename,
          text: doc.extractedText,
          charCount: doc.extractedText.length,
          wordCount: doc.extractedText.split(/\s+/).filter(Boolean).length,
          uploadDate: doc.createdAt,
          processedDate: doc.updatedAt || doc.createdAt,
        }));

      setOcrResults(results);
    } catch (err: any) {
      setError(err.message || "Failed to load OCR results");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (result: OcrResult) => {
    const blob = new Blob([result.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.originalName + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Success", description: "Text copied to clipboard!" });
    } catch {
      toast({ title: "Error", description: "Failed to copy text.", variant: "destructive" });
    }
  };

  const handleDelete = async (result: OcrResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${result.originalName}?`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/upload/${encodeURIComponent(result.filename)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOcrResults((prev) => prev.filter((r) => r.id !== result.id));
      toast({ title: "Success", description: "File deleted successfully" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to delete file: ${err.response?.data?.message || err.message}`,
        variant: "destructive",
      });
    }
  };

  const handleOpenDocument = (result: OcrResult) => {
    setSelectedResult(result);
    setEditedText(result.text);
  };

  const handleCloseDocument = () => {
    setSelectedResult(null);
    setEditedText("");
  };

  const handleSaveDocument = async () => {
    if (!selectedResult) return;
    try {
      await axios.put(
        `http://localhost:5000/results/${encodeURIComponent(selectedResult.filename)}.txt`,
        { text: editedText },
        { headers: { "Content-Type": "application/json" } }
      );

      setOcrResults((prev) =>
        prev.map((r) =>
          r.id === selectedResult.id
            ? {
                ...r,
                text: editedText,
                charCount: editedText.length,
                wordCount: editedText.split(/\s+/).filter(Boolean).length,
              }
            : r
        )
      );
      toast({ title: "Success", description: "Document saved successfully" });
      handleCloseDocument();
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to save document: ${err.response?.data?.error || err.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080c14; font-family: 'Syne', sans-serif; min-height: 100vh; overflow-x: hidden; }

        .ocr-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .ocr-blob { position: absolute; border-radius: 50%; filter: blur(110px); animation: blobDrift 24s ease-in-out infinite; }
        .ocr-blob-1 { width: 70vw; height: 70vw; background: radial-gradient(circle, rgba(251,191,36,0.09) 0%, transparent 70%); top: -25%; left: -20%; animation-duration: 28s; }
        .ocr-blob-2 { width: 55vw; height: 55vw; background: radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%); top: 30%; right: -20%; animation-duration: 22s; animation-delay: -7s; }
        .ocr-blob-3 { width: 45vw; height: 45vw; background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%); bottom: -15%; left: 25%; animation-duration: 30s; animation-delay: -14s; }
        @keyframes blobDrift {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(40px,-30px) scale(1.1); }
          66% { transform: translate(-30px,40px) scale(0.92); }
        }
        .ocr-grid {
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(251,191,36,0.1) 1px, transparent 1px);
          background-size: 44px 44px; opacity: 0.4;
        }

        .ocr-wrapper {
          position: relative; z-index: 1;
          max-width: 1200px; margin: 0 auto;
          padding: 48px 24px 60px;
          animation: fadeUp 0.7s ease forwards;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .ocr-topbar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 36px;
        }
        .ocr-back-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 12px; border: none; cursor: pointer;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
          color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500;
          font-family: 'Syne', sans-serif; backdrop-filter: blur(20px); outline: none;
          transition: all 0.2s;
        }
        .ocr-back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; transform: translateX(-2px); }

        .ocr-header-center { text-align: center; }
        .ocr-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 6px 14px; border-radius: 99px;
          background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.22);
          font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
          color: #fbbf24; text-transform: uppercase; margin-bottom: 14px;
        }
        .ocr-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #fbbf24; box-shadow: 0 0 8px #fbbf24;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.4); } }
        .ocr-title {
          font-size: clamp(26px, 4vw, 40px); font-weight: 800;
          color: #fff; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 8px;
        }
        .ocr-title-accent {
          background: linear-gradient(90deg, #fbbf24, #f59e0b, #fb923c);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .ocr-subtitle { font-size: 13px; color: rgba(255,255,255,0.32); font-weight: 400; }
        .ocr-count-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 99px;
          background: rgba(6,182,212,0.07); border: 1px solid rgba(6,182,212,0.2);
          font-size: 11px; font-weight: 600; color: #22d3ee;
          font-family: 'DM Mono', monospace;
        }

        .ocr-grid-layout {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 18px;
        }

        .ocr-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; backdrop-filter: blur(40px);
          padding: 22px; cursor: pointer;
          box-shadow: 0 8px 40px rgba(0,0,0,0.25);
          transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .ocr-card:hover {
          border-color: rgba(251,191,36,0.25);
          transform: translateY(-3px);
          box-shadow: 0 16px 50px rgba(0,0,0,0.35), 0 0 30px rgba(251,191,36,0.06);
        }
        .ocr-card-name {
          font-size: 15px; font-weight: 700; color: #fff;
          margin-bottom: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ocr-card-meta {
          font-size: 11.5px; color: rgba(255,255,255,0.35);
          font-family: 'DM Mono', monospace; line-height: 1.8; margin-bottom: 14px;
        }
        .ocr-card-stats {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 11px; border-radius: 99px;
          background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.15);
          font-size: 11px; color: #22d3ee; font-family: 'DM Mono', monospace;
          margin-bottom: 18px;
        }

        .ocr-card-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .ocr-action-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 10px; border: none; cursor: pointer;
          font-size: 12.5px; font-weight: 600; font-family: 'Syne', sans-serif;
          transition: all 0.2s; outline: none;
        }
        .ocr-action-btn:active { transform: scale(0.95); }
        .ocr-btn-copy { background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.22); color: #22d3ee; }
        .ocr-btn-copy:hover { background: rgba(6,182,212,0.16); border-color: rgba(6,182,212,0.4); transform: translateY(-1px); }
        .ocr-btn-download { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.22); color: #34d399; }
        .ocr-btn-download:hover { background: rgba(16,185,129,0.16); border-color: rgba(16,185,129,0.4); transform: translateY(-1px); }
        .ocr-btn-delete { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.22); color: #f87171; }
        .ocr-btn-delete:hover { background: rgba(239,68,68,0.16); border-color: rgba(239,68,68,0.4); transform: translateY(-1px); }

        .ocr-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 16px; }
        .ocr-spinner { width: 44px; height: 44px; border-radius: 50%; border: 3px solid rgba(251,191,36,0.15); border-top-color: #fbbf24; animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ocr-loading-text { font-size: 14px; color: rgba(255,255,255,0.35); font-weight: 500; }

        .ocr-empty { text-align: center; padding: 80px 20px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .ocr-empty-icon { font-size: 48px; }
        .ocr-empty-title { font-size: 20px; font-weight: 700; color: #fff; }
        .ocr-empty-sub { font-size: 14px; color: rgba(255,255,255,0.3); }
        .ocr-empty-btn {
          padding: 11px 24px; border-radius: 13px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #000; font-size: 14px; font-weight: 700; font-family: 'Syne', sans-serif;
          box-shadow: 0 0 24px rgba(251,191,36,0.3); transition: all 0.25s; margin-top: 6px;
        }
        .ocr-empty-btn:hover { transform: translateY(-2px); box-shadow: 0 0 40px rgba(251,191,36,0.5); }

        .ocr-modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .ocr-modal {
          width: 100%; max-width: 860px; max-height: 90vh; display: flex; flex-direction: column;
          background: rgba(10,15,26,0.98); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px; box-shadow: 0 0 80px rgba(0,0,0,0.6), 0 0 40px rgba(251,191,36,0.06);
          overflow: hidden;
        }
        .ocr-modal-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
        }
        .ocr-modal-title { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 4px; }
        .ocr-modal-meta { font-size: 11px; color: rgba(255,255,255,0.3); font-family: 'DM Mono', monospace; }
        .ocr-modal-close {
          padding: 8px; border-radius: 10px; border: none; cursor: pointer;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5); transition: all 0.18s; outline: none; flex-shrink: 0;
        }
        .ocr-modal-close:hover { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.3); color: #f87171; }
        .ocr-modal-body { flex: 1; overflow-y: auto; padding: 24px 28px; }
        .ocr-modal-textarea {
          width: 100%; min-height: 400px; padding: 18px; border-radius: 14px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09);
          color: #f1f5f9; font-size: 14px; font-family: 'DM Mono', monospace;
          font-weight: 400; line-height: 1.7; outline: none; resize: vertical;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .ocr-modal-textarea::placeholder { color: rgba(255,255,255,0.2); }
        .ocr-modal-textarea:focus {
          border-color: rgba(251,191,36,0.4);
          box-shadow: 0 0 0 3px rgba(251,191,36,0.08), 0 0 30px rgba(251,191,36,0.08);
        }
        .ocr-modal-footer {
          display: flex; align-items: center; justify-content: flex-end; gap: 10px;
          padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
        }
        .ocr-modal-cancel {
          padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
          color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500;
          font-family: 'Syne', sans-serif; transition: all 0.2s; outline: none;
        }
        .ocr-modal-cancel:hover { background: rgba(255,255,255,0.09); color: #fff; }
        .ocr-modal-save {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 22px; border-radius: 12px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #000; font-size: 13px; font-weight: 700; font-family: 'Syne', sans-serif;
          box-shadow: 0 0 20px rgba(251,191,36,0.3); transition: all 0.25s; outline: none;
        }
        .ocr-modal-save:hover { transform: translateY(-1px); box-shadow: 0 0 32px rgba(251,191,36,0.5); }

        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.3); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(251,191,36,0.6); }

        @media (max-width: 600px) {
          .ocr-card-actions { flex-direction: column; }
          .ocr-topbar { flex-wrap: wrap; gap: 12px; }
        }
      `}</style>

      <div className="ocr-bg">
        <div className="ocr-blob ocr-blob-1" />
        <div className="ocr-blob ocr-blob-2" />
        <div className="ocr-blob ocr-blob-3" />
        <div className="ocr-grid" />
      </div>

      <div className="ocr-wrapper">
        <div className="ocr-topbar">
          <motion.button
            className="ocr-back-btn"
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={14} /> Back
          </motion.button>

          <div className="ocr-header-center">
            <div className="ocr-badge">
              <span className="ocr-badge-dot" />
              OCR Processing Engine
            </div>
            <h1 className="ocr-title">
              Processed <span className="ocr-title-accent">Documents</span>
            </h1>
            <p className="ocr-subtitle">Click any document to view and edit extracted text</p>
          </div>

          <div className="ocr-count-badge">
            {ocrResults.length} doc{ocrResults.length !== 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div className="ocr-loading">
            <div className="ocr-spinner" />
            <p className="ocr-loading-text">Loading OCR results…</p>
          </div>
        ) : ocrResults.length === 0 ? (
          <motion.div
            className="ocr-empty"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="ocr-empty-icon">🗂️</div>
            <div className="ocr-empty-title">No OCR Results Found</div>
            <div className="ocr-empty-sub">Upload documents and run OCR to see results here.</div>
            <button className="ocr-empty-btn" onClick={() => navigate("/dashboard")}>
              ✦ Go to Dashboard
            </button>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="ocr-grid-layout">
              {ocrResults.map((result, i) => (
                <motion.div
                  key={result.id}
                  className="ocr-card"
                  initial={{ opacity: 0, y: 30, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 26 }}
                  onClick={() => handleOpenDocument(result)}
                >
                  <div>
                    <div className="ocr-card-name" title={result.originalName}>
                      📄 {result.originalName}
                    </div>
                    <div className="ocr-card-meta">
                      ↑ {new Date(result.uploadDate).toLocaleString()}<br />
                      ⚙ {new Date(result.processedDate).toLocaleString()}
                    </div>
                    <div className="ocr-card-stats">
                      {result.wordCount} words · {result.charCount} chars
                    </div>
                  </div>

                  <div className="ocr-card-actions" onClick={(e) => e.stopPropagation()}>
                    <motion.button
                      className="ocr-action-btn ocr-btn-copy"
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); handleCopy(result.text); }}
                    >
                      <Copy size={13} /> Copy
                    </motion.button>

                    <motion.button
                      className="ocr-action-btn ocr-btn-download"
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); handleDownload(result); }}
                    >
                      <FileDown size={13} /> Download
                    </motion.button>

                    <motion.button
                      className="ocr-action-btn ocr-btn-delete"
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={(e) => handleDelete(result, e)}
                    >
                      <Trash2 size={13} /> Delete
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        <div style={{ textAlign: "center", marginTop: 40, fontSize: 11, color: "rgba(255,255,255,0.14)", letterSpacing: "0.07em", fontFamily: "Syne, sans-serif" }}>
          DOCUFREE-AI — OCR DOCUMENT INTELLIGENCE
        </div>
      </div>

      <AnimatePresence>
        {selectedResult && (
          <motion.div
            className="ocr-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseDocument}
          >
            <motion.div
              className="ocr-modal"
              initial={{ scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ocr-modal-header">
                <div>
                  <div className="ocr-modal-title">{selectedResult.originalName}</div>
                  <div className="ocr-modal-meta">
                    {editedText.split(/\s+/).filter(Boolean).length} words · {editedText.length} chars
                  </div>
                </div>
                <button className="ocr-modal-close" onClick={handleCloseDocument}>
                  <X size={18} />
                </button>
              </div>

              <div className="ocr-modal-body">
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="ocr-modal-textarea"
                  placeholder="Edit your document text here…"
                />
              </div>

              <div className="ocr-modal-footer">
                <button className="ocr-modal-cancel" onClick={handleCloseDocument}>
                  Cancel
                </button>
                <motion.button
                  className="ocr-modal-save"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSaveDocument}
                >
                  <Save size={14} /> Save Changes
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}