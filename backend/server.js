import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import ocrRouter from "./ocr/index.js";
import summaryRoutes from "./routes/summary.routes.js";
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/upload.routes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import summarizationService from "./services/summarization.service.js";
import translationRoutes from "./routes/translationRoutes.js";
import qaRoutes from "./routes/qa.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import Document from "./models/Document.js";

// -------------------- Initialize Express App --------------------
const app = express();

// Warm up the summarization model (loads in background)
summarizationService.initialize().catch(err =>
  console.error("Model preload failed:", err)
);

dotenv.config();

// -------------------- Directories Setup --------------------
const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const RESULTS_DIR = path.join(process.cwd(), "results");
const SUMMARIES_DIR = path.join("backend", "summarisedresults");

// Create directories if they don't exist
[UPLOAD_DIR, RESULTS_DIR, SUMMARIES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// -------------------- Multer Setup --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const uniqueName = `${base}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and PDFs allowed."));
    }
  },
});

// -------------------- CRITICAL MIDDLEWARE (ORDER MATTERS) --------------------
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.text({ limit: "10mb" }));

// -------------------- Routes --------------------
app.use("/api/qa", qaRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/summaries", summaryRoutes);
app.use("/ocr", ocrRouter);
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/translation", translationRoutes);

// -------------------- Result File Endpoints (kept for OCR results page) --------------------
app.put("/results/:filename", (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  if (!filename) return res.status(400).json({ success: false, error: "Missing filename" });

  const filePath = path.join(RESULTS_DIR, filename);

  try {
    const textContent = req.is("application/json") ? req.body.text || "" : req.body || "";
    fs.writeFileSync(filePath, textContent, "utf8");
    console.log(`✅ Updated result: ${filename}`);
    return res.json({ success: true, message: "Result updated successfully" });
  } catch (err) {
    console.error("Error updating result:", err);
    return res.status(500).json({ success: false, error: "Failed to update result", details: err.message });
  }
});

app.delete("/results/:filename", (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  if (!filename) return res.status(400).json({ success: false, error: "Missing filename" });

  const filePath = path.join(RESULTS_DIR, filename);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ success: false, error: "Result file not found" });

  try {
    fs.unlinkSync(filePath);
    console.log(`✅ Deleted result: ${filename}`);
    return res.json({ success: true, message: "Result deleted successfully" });
  } catch (err) {
    console.error("Error deleting result:", err);
    return res.status(500).json({ success: false, error: "Failed to delete result", details: err.message });
  }
});

// -------------------- Static File Serving --------------------
app.use("/uploads", express.static(UPLOAD_DIR));
app.use("/results", express.static(RESULTS_DIR));
app.use("/summaries", express.static(SUMMARIES_DIR));

// -------------------- Error Handling --------------------
app.use((err, req, res, next) => {
  console.error("Global error:", err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ message: "File too large. Max 50MB." });
    return res.status(400).json({ message: err.message });
  }

  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

// -------------------- Health & Info Endpoints --------------------
app.get("/", (req, res) => {
  res.json({
    message: "DocuFree Backend Server",
    version: "1.0.0",
    endpoints: {
      upload: "POST /api/upload",
      documents: "GET /api/documents",
      delete: "DELETE /api/upload/:filename",
      ocr: "POST /ocr/run/:filename",
      summarize_text: "POST /api/summaries/text",
      summarize_file: "POST /api/summaries/file",
      save_summary: "POST /api/summaries/save",
      get_summaries: "GET /api/summaries",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    directories: {
      uploads: fs.existsSync(UPLOAD_DIR),
      results: fs.existsSync(RESULTS_DIR),
      summaries: fs.existsSync(SUMMARIES_DIR),
    },
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// -------------------- Auto Cleanup (MongoDB-driven, 10 Days) --------------------
const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

async function autoCleanup() {
  console.log("🧹 Running MongoDB auto cleanup...");

  try {
    const expiryDate = new Date(Date.now() - TEN_DAYS);

    const expiredDocs = await Document.find({
      createdAt: { $lt: expiryDate },
    });

    for (const doc of expiredDocs) {
      // Delete the uploaded file
      const filePath = path.join(UPLOAD_DIR, doc.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑 Deleted expired file: ${doc.filename}`);
      }

      // Delete corresponding OCR result if exists
      const resultPath = path.join(RESULTS_DIR, `${doc.filename}.txt`);
      if (fs.existsSync(resultPath)) {
        fs.unlinkSync(resultPath);
        console.log(`🗑 Deleted expired OCR result: ${doc.filename}.txt`);
      }

      await doc.deleteOne();
    }

    console.log(`✅ Cleanup complete. Removed ${expiredDocs.length} expired document(s).`);
  } catch (err) {
    console.error("❌ Auto cleanup failed:", err);
  }
}

// Run every 24 hours
setInterval(autoCleanup, 24 * 60 * 60 * 1000);

// -------------------- MongoDB Connection & Server Start --------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 Uploads: ${UPLOAD_DIR}`);
      console.log(`📄 Results: ${RESULTS_DIR}`);
      console.log(`📝 Summaries: ${SUMMARIES_DIR}`);
      console.log("🤖 Summarization: T5-base model (Xenova)");
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  mongoose.connection.close(() => {
    console.log("MongoDB closed");
    process.exit(0);
  });
});