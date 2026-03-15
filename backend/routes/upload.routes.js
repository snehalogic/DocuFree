import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import authMiddleware from "../middleware/authMiddleware.js";
import Document from "../models/Document.js";
import { ocrImage, ocrPDF, saveOCRResult } from "../ocr/utils.js";

const router = express.Router();

// -------------------- Directory Setup --------------------
// Ensure uploads folder exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure results folder exists
const RESULTS_DIR = path.join(process.cwd(), "results");
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// -------------------- Multer Setup --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});

// ✅ Updated fileFilter — now allows images + PDF
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/tiff",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only images and PDF allowed"));
  },
});

// -------------------- POST /api/upload --------------------
// Just saves the file + creates MongoDB record. OCR runs separately via /api/upload/ocr/:filename
router.post("/", authMiddleware, upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.files[0];

    // Save document in MongoDB (no OCR yet)
    const newDoc = await Document.create({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mime: file.mimetype,
      userId: req.userId,
      extractedText: "",
    });

    console.log(`✅ File uploaded: ${file.filename}`);

    res.json({
      message: "Upload successful",
      document: newDoc,
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

// -------------------- POST /api/upload/ocr/:filename --------------------
// Runs OCR on demand when user clicks "Run OCR" button
router.post("/ocr/:filename", authMiddleware, async (req, res) => {
  try {
    const { filename } = req.params;

    // Find the document in MongoDB — must belong to this user
    const doc = await Document.findOne({ filename, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on disk" });
    }

    let text = "";

    if (doc.mime.startsWith("image/")) {
      // IMAGE → use working ocrImage from ocr/utils.js
      console.log(`🔍 Running OCR on image: ${filename}`);
      text = await ocrImage(filePath);

    } else if (doc.mime === "application/pdf") {
      // PDF → use working ocrPDF from ocr/utils.js (pdf-parse, no Ghostscript needed)
      console.log(`🔍 Running OCR on PDF: ${filename}`);
      text = await ocrPDF(filePath);

    } else {
      return res.status(400).json({ message: "OCR not supported for this file type" });
    }

    // Save OCR text to backend/results/filename.txt
    const textFileName = filename + ".txt";
    await saveOCRResult(filename, text);
    console.log(`📄 OCR result saved: ${textFileName}`);

    // Update MongoDB document with extracted text
    doc.extractedText = text;
    await doc.save();

    res.json({
      ok: true,
      message: "OCR successful",
      filename: textFileName,
      text,
      charCount: text.length,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    });

  } catch (err) {
    console.error("OCR error:", err);
    res.status(500).json({ message: "OCR failed", error: err.message });
  }
});

// -------------------- DELETE /api/upload/:filename --------------------
router.delete("/:filename", authMiddleware, async (req, res) => {
  try {
    const filename = req.params.filename;

    // Find document in MongoDB — must belong to this user
    const doc = await Document.findOne({
      filename,
      userId: req.userId,
    });

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Delete uploaded file from disk
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑 Deleted file: ${filename}`);
    }

    // Delete OCR result text file if exists
    const resultPath = path.join(RESULTS_DIR, `${filename}.txt`);
    if (fs.existsSync(resultPath)) {
      fs.unlinkSync(resultPath);
      console.log(`🗑 Deleted OCR result: ${filename}.txt`);
    }

    // Remove from MongoDB
    await doc.deleteOne();

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

export default router;