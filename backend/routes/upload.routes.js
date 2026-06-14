import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import authMiddleware from "../middleware/authMiddleware.js";
import Document from "../models/Document.js";
import { ocrImage, ocrPDF, saveOCRResult } from "../ocr/utils.js";

const router = express.Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const RESULTS_DIR = path.join(process.cwd(), "results");
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});

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

router.post("/", authMiddleware, upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.files[0];

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

router.post("/ocr/:filename", authMiddleware, async (req, res) => {
  try {
    const { filename } = req.params;

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
      console.log(`🔍 Running OCR on image: ${filename}`);
      text = await ocrImage(filePath);

    } else if (doc.mime === "application/pdf") {
      console.log(`🔍 Running OCR on PDF: ${filename}`);
      text = await ocrPDF(filePath);

    } else {
      return res.status(400).json({ message: "OCR not supported for this file type" });
    }

    const textFileName = filename + ".txt";
    await saveOCRResult(filename, text);
    console.log(`📄 OCR result saved: ${textFileName}`);

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

router.delete("/:filename", authMiddleware, async (req, res) => {
  try {
    const filename = req.params.filename;

    const doc = await Document.findOne({
      filename,
      userId: req.userId,
    });

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑 Deleted file: ${filename}`);
    }

    const resultPath = path.join(RESULTS_DIR, `${filename}.txt`);
    if (fs.existsSync(resultPath)) {
      fs.unlinkSync(resultPath);
      console.log(`🗑 Deleted OCR result: ${filename}.txt`);
    }

    await doc.deleteOne();

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

export default router;