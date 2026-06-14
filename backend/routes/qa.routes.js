import express from "express";
import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";


const router = express.Router();
const RESULTS_DIR = path.join(process.cwd(), "results");

let qa = null;
let loading = true;

(async () => {
  console.log("🤖 Loading QA model...");
  qa = await pipeline(
    "question-answering",
    "Xenova/distilbert-base-cased-distilled-squad"
  );
  loading = false;
  console.log("✅ QA model loaded");
})();

router.post("/ask", async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({ answer: "Missing document or question" });
    }

    const filePath = path.join(process.cwd(), "results", `${documentId}.txt`);

    if (!fs.existsSync(filePath)) {
      return res.json({ answer: "Document text not found. Run OCR first." });
    }

    const raw = fs.readFileSync(filePath, "utf8");

const context = typeof raw === "string"
  ? raw.slice(0, 3000)
  : String(raw).slice(0, 3000);

if (typeof context !== "string") {
  console.error("❌ Context is NOT string:", context);
  return res.status(500).json({ answer: "Context is not valid text" });
}

if (typeof question !== "string") {
  return res.status(400).json({ answer: "Question must be a string" });
}


    const output = await qa({
  question: String(question),
  context: String(context),
});

    return res.json({
      answer: output?.answer || "No answer generated",
    });

  } catch (err) {
    console.error("❌ QA ERROR:", err);
    res.status(500).json({ answer: "QA failed internally" });
  }
});

export default router;
