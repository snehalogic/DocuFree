import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { extractTextFromPDF, extractTextFromDocx } from "../utils/fileExtractor.js";
import summarizationService from "../services/summarization.service.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const SUMMARIES_DIR = path.join(process.cwd(), "backend", "summarisedresults");

if (!fs.existsSync(SUMMARIES_DIR)) {
  fs.mkdirSync(SUMMARIES_DIR, { recursive: true });
  console.log(`📁 Created directory: ${SUMMARIES_DIR}`);
}

async function ensureModelReady() {
  try {
    if (!summarizationService.isReady) {
      console.log("🧠 Initializing summarization model...");
      await summarizationService.initialize();
      console.log("✅ Model initialized successfully!");
    }
  } catch (err) {
    console.error("❌ Model initialization failed:", err);
    throw new Error("Model initialization failed");
  }
}

router.post("/text", async (req, res) => {
  try {
    console.log("\n🔵 [Text Summarization Request]");
    const { text, length_percent } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: "No text provided." });
    }

    await ensureModelReady();

    console.log("🧾 Text length:", text.length, "chars");
    const summary = await summarizationService.summarizeText(text, length_percent);

    console.log("✅ [Text Summary Complete]");
    res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error("❌ Text summarization failed:", error.stack || error);
    res.status(500).json({ success: false, message: "Summarization failed.", error: error.message });
  }
});

router.post("/file", upload.single("file"), async (req, res) => {
  try {
    console.log("\n📄 [File Summarization Request]");
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const { originalname, buffer } = req.file;
    const ext = originalname.split(".").pop().toLowerCase();
    let extractedText = "";

    if (ext === "pdf") {
      extractedText = await extractTextFromPDF(buffer);
    } else if (ext === "docx") {
      extractedText = await extractTextFromDocx(buffer);
    } else {
      return res.status(400).json({ success: false, message: "Unsupported file type." });
    }

    console.log(`📄 Extracted text length: ${extractedText.length} chars`);

    await ensureModelReady();
    const summary = await summarizationService.summarizeText(extractedText);

    console.log("✅ [File Summary Complete]");
    res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error("❌ File summarization failed:", error.stack || error);
    res.status(500).json({ success: false, message: "File summarization failed.", error: error.message });
  }
});

router.post("/save", async (req, res) => {
  try {
    console.log("\n💾 [Save Summary Request]");
    const { title, content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: "No summary content provided." });
    }

    const finalTitle = title?.trim() || `Summary-${new Date().toISOString()}`;
    const safeFilename = finalTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase().substring(0, 100);
    const filename = `${safeFilename}_${Date.now()}.txt`;
    const filepath = path.join(SUMMARIES_DIR, filename);

    const metadata = {
      title: finalTitle,
      filename,
      wordCount: content.split(/\s+/).length,
      date: new Date().toISOString(),
      snippet: content.substring(0, 200)
    };

    const summaryData = { ...metadata, content };
    fs.writeFileSync(filepath, JSON.stringify(summaryData, null, 2), "utf8");
    console.log(`💾 Saved summary: "${finalTitle}" (${filename})`);

    res.status(201).json({ success: true, summary: metadata });
  } catch (error) {
    console.error("❌ Failed to save summary:", error.stack || error);
    res.status(500).json({ success: false, message: "Failed to save summary.", error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    console.log("\n📚 [Fetch All Summaries]");
    const files = fs.readdirSync(SUMMARIES_DIR);
    const summaries = [];

    for (const file of files) {
      if (file.endsWith(".txt")) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(SUMMARIES_DIR, file), "utf8"));
          summaries.push({
            id: file,
            title: data.title,
            snippet: data.snippet,
            wordCount: data.wordCount,
            date: data.date,
            filename: data.filename
          });
        } catch (err) {
          console.warn(`⚠️ Skipping invalid summary file: ${file}`, err.message);
        }
      }
    }

    summaries.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.status(200).json({ success: true, summaries });
  } catch (error) {
    console.error("❌ Failed to fetch summaries:", error.stack || error);
    res.status(500).json({ success: false, message: "Failed to fetch summaries." });
  }
});

router.get("/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(SUMMARIES_DIR, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: "Summary not found." });
    }

    const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
    res.status(200).json({ success: true, summary: data.content, title: data.title });
  } catch (error) {
    console.error("❌ Failed to fetch summary:", error.stack || error);
    res.status(500).json({ success: false, message: "Failed to fetch summary." });
  }
});

router.delete("/:filename", async (req, res) => {
  try {
    const filepath = path.join(SUMMARIES_DIR, req.params.filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: "Summary not found." });
    }

    fs.unlinkSync(filepath);
    console.log(`🗑️ Deleted summary: ${req.params.filename}`);
    res.status(200).json({ success: true, message: "Summary deleted successfully." });
  } catch (error) {
    console.error("❌ Failed to delete summary:", error.stack || error);
    res.status(500).json({ success: false, message: "Failed to delete summary." });
  }
});

export default router;
