import fs from "fs-extra";
import { createWorker } from "tesseract.js";
import path from "path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// OCR for images using Tesseract
export async function ocrImage(filePath) {
  let worker = null;
  try {
    console.log(`Processing image: ${filePath}`);

    worker = await createWorker("eng", 1, {
      logger: (m) => console.log("OCR:", m.status),
    });

    const { data } = await worker.recognize(filePath);
    await worker.terminate();

    return data.text;
  } catch (err) {
    console.error("OCR image error:", err);
    if (worker) {
      try { await worker.terminate(); } catch {}
    }
    throw err;
  }
}

// Extract text from PDF using pdfjs-dist (pure ESM, no Ghostscript needed)
export async function ocrPDF(filePath) {
  try {
    console.log(`Extracting text from PDF: ${filePath}`);

    const dataBuffer = fs.readFileSync(filePath);
    const data = new Uint8Array(dataBuffer);

    const loadingTask = pdfjs.getDocument({ data });
    const pdfDocument = await loadingTask.promise;

    const numPages = pdfDocument.numPages;
    console.log(`PDF has ${numPages} pages`);

    let fullText = "";

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`Extracting page ${pageNum}/${numPages}...`);
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
    }

    if (!fullText || fullText.trim().length < 50) {
      throw new Error(
        "PDF appears to be scanned or has no extractable text. " +
        "Only text-based PDFs are supported."
      );
    }

    console.log(`Extracted ${fullText.length} characters from PDF`);
    return fullText;

  } catch (err) {
    console.error("PDF extraction error:", err);
    throw err;
  }
}

// Save OCR result to backend/results/filename.txt
export async function saveOCRResult(filename, text) {
  try {
    const resultDir = path.join(process.cwd(), "results");
    await fs.ensureDir(resultDir);

    const txtFile = path.join(resultDir, `${filename}.txt`);
    await fs.writeFile(txtFile, text, "utf-8");

    console.log(`Saved OCR result to: ${txtFile}`);
    return txtFile;
  } catch (err) {
    console.error("Error saving OCR result:", err);
    throw err;
  }
}