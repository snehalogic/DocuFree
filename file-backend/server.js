import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import libre from "libreoffice-convert";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";
import mime from "mime-types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");
const outputsDir = path.join(__dirname, "outputs");

[uploadsDir, outputsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const getExtension = (filename) => {
  return path.extname(filename).toLowerCase().slice(1);
};

const getMimeType = (ext) => {
  return mime.lookup(ext) || "application/octet-stream";
};

const convertImage = async (inputPath, targetExt) => {
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  let outputBuffer;
  
  switch (targetExt) {
    case "jpg":
    case "jpeg":
      outputBuffer = await image.jpeg({ quality: 90 }).toBuffer();
      break;
    case "png":
      outputBuffer = await image.png({ quality: 90 }).toBuffer();
      break;
    case "webp":
      outputBuffer = await image.webp({ quality: 90 }).toBuffer();
      break;
    case "gif":
      outputBuffer = await image.gif().toBuffer();
      break;
    case "bmp":
      outputBuffer = await image.bmp().toBuffer();
      break;
    case "tiff":
      outputBuffer = await image.tiff().toBuffer();
      break;
    case "pdf":
      const pdfDoc = await PDFDocument.create();
      const imgBuffer = fs.readFileSync(inputPath);
      let pdfImage;
      
      if (metadata.format === "jpeg" || metadata.format === "jpg") {
        pdfImage = await pdfDoc.embedJpg(imgBuffer);
      } else {
        pdfImage = await pdfDoc.embedPng(imgBuffer);
      }
      
      const page = pdfDoc.addPage([metadata.width, metadata.height]);
      page.drawImage(pdfImage, {
        x: 0,
        y: 0,
        width: metadata.width,
        height: metadata.height,
      });
      
      outputBuffer = await pdfDoc.save();
      break;
    default:
      throw new Error(`Unsupported image conversion: ${targetExt}`);
  }
  
  return outputBuffer;
};

const convertPDF = async (inputPath, targetExt) => {
  const pdfBuffer = fs.readFileSync(inputPath);
  
  switch (targetExt) {
    case "jpg":
    case "jpeg":
    case "png":
      return new Promise((resolve, reject) => {
        libre.convert(pdfBuffer, targetExt === "jpg" || targetExt === "jpeg" ? ".jpg" : ".png", undefined, (err, done) => {
          if (err) reject(err);
          else resolve(done);
        });
      });
    default:
      return new Promise((resolve, reject) => {
        libre.convert(pdfBuffer, `.${targetExt}`, undefined, (err, done) => {
          if (err) reject(err);
          else resolve(done);
        });
      });
  }
};

const convertDocument = async (inputPath, sourceExt, targetExt) => {
  const buffer = fs.readFileSync(inputPath);
  
  switch (targetExt) {
    case "txt":
      if (sourceExt === "docx") {
        const result = await mammoth.extractRawText({ buffer });
        return Buffer.from(result.value, "utf-8");
      }
      break;
    case "pdf":
      break;
    default:
      break;
  }
  
  return new Promise((resolve, reject) => {
    libre.convert(buffer, `.${targetExt}`, undefined, (err, done) => {
      if (err) reject(err);
      else resolve(done);
    });
  });
};

const convertText = async (inputPath, targetExt) => {
  const textContent = fs.readFileSync(inputPath, "utf-8");
  
  switch (targetExt) {
    case "pdf":
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); 
      const { width, height } = page.getSize();
      
      page.drawText(textContent, {
        x: 50,
        y: height - 50,
        size: 12,
        maxWidth: width - 100,
      });
      
      return await pdfDoc.save();
    case "docx":
      return new Promise((resolve, reject) => {
        libre.convert(Buffer.from(textContent, "utf-8"), ".docx", undefined, (err, done) => {
          if (err) reject(err);
          else resolve(done);
        });
      });
    default:
      throw new Error(`Unsupported text conversion: ${targetExt}`);
  }
};

const convertFile = async (inputPath, sourceExt, targetExt) => {
  sourceExt = sourceExt.toLowerCase();
  targetExt = targetExt.toLowerCase();
  
  if (sourceExt === targetExt) {
    return fs.readFileSync(inputPath);
  }
  
  const imageFormats = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"];
  if (imageFormats.includes(sourceExt)) {
    if (imageFormats.includes(targetExt)) {
      return await convertImage(inputPath, targetExt);
    }
    if (targetExt === "pdf") {
      return await convertImage(inputPath, targetExt);
    }
    return new Promise((resolve, reject) => {
      const buffer = fs.readFileSync(inputPath);
      libre.convert(buffer, `.${targetExt}`, undefined, (err, done) => {
        if (err) reject(err);
        else resolve(done);
      });
    });
  }
  
  if (sourceExt === "pdf") {
    return await convertPDF(inputPath, targetExt);
  }
  
  const docFormats = ["docx", "doc", "odt", "rtf"];
  if (docFormats.includes(sourceExt)) {
    return await convertDocument(inputPath, sourceExt, targetExt);
  }
  
  if (sourceExt === "txt") {
    return await convertText(inputPath, targetExt);
  }
  
  const pptFormats = ["ppt", "pptx", "odp"];
  if (pptFormats.includes(sourceExt)) {
    return new Promise((resolve, reject) => {
      const buffer = fs.readFileSync(inputPath);
      libre.convert(buffer, `.${targetExt}`, undefined, (err, done) => {
        if (err) reject(err);
        else resolve(done);
      });
    });
  }
  
  return new Promise((resolve, reject) => {
    const buffer = fs.readFileSync(inputPath);
    libre.convert(buffer, `.${targetExt}`, undefined, (err, done) => {
      if (err) reject(err);
      else resolve(done);
    });
  });
};

app.post("/convert", upload.single("file"), async (req, res) => {
  let inputPath = null;
  let outputPath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!req.body.target) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: "Target format is required" });
    }

    inputPath = req.file.path;
    const sourceExt = getExtension(req.file.originalname);
    const targetExt = req.body.target.toLowerCase().replace(".", "");
    
    if (!sourceExt) {
      if (inputPath && fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
      return res.status(400).json({ error: "File must have an extension" });
    }

    const validExtensions = [
      "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff",
      "pdf", "docx", "doc", "odt", "rtf", "txt",
      "ppt", "pptx", "odp"
    ];
    
    if (!validExtensions.includes(targetExt)) {
      if (inputPath && fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
      return res.status(400).json({ 
        error: `Unsupported target format: ${targetExt}`,
        supported: validExtensions
      });
    }
    
    console.log(`🔄 Converting ${sourceExt.toUpperCase()} → ${targetExt.toUpperCase()}...`);
    
    const outputBuffer = await convertFile(inputPath, sourceExt, targetExt);
    
    if (!outputBuffer || outputBuffer.length === 0) {
      throw new Error("Conversion produced empty output");
    }
    
    const timestamp = Date.now();
    outputPath = path.join(outputsDir, `converted-${timestamp}.${targetExt}`);
    fs.writeFileSync(outputPath, outputBuffer);
    
    console.log(`✅ Conversion successful: ${outputBuffer.length} bytes`);
    
    const mimeType = getMimeType(targetExt);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="converted.${targetExt}"`);
    
    res.sendFile(outputPath, (err) => {
      if (inputPath && fs.existsSync(inputPath)) {
        try {
          fs.unlinkSync(inputPath);
        } catch (e) {
          console.error("Error deleting input file:", e);
        }
      }
      if (outputPath && fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch (e) {
          console.error("Error deleting output file:", e);
        }
      }
      
      if (err) {
        console.error("Error sending file:", err);
      }
    });

  } catch (error) {
    console.error("❌ Conversion error:", error.message || error);
    
    if (inputPath && fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (e) {
        console.error("Error cleaning up input file:", e);
      }
    }
    if (outputPath && fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch (e) {
        console.error("Error cleaning up output file:", e);
      }
    }
    
    const errorMessage = error.message || "Unknown error occurred";
    const statusCode = errorMessage.includes("Unsupported") || errorMessage.includes("required") ? 400 : 500;
    
    res.status(statusCode).json({ 
      error: "Conversion failed", 
      message: errorMessage
    });
  }
});

app.get("/formats", (req, res) => {
  res.json({
    supported: {
      images: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"],
      documents: ["pdf", "docx", "doc", "odt", "rtf", "txt"],
      presentations: ["ppt", "pptx", "odp"],
    },
    conversions: {
      images: "Can convert to: jpg, png, webp, gif, bmp, tiff, pdf",
      pdf: "Can convert to: jpg, png, docx, txt, pptx (via LibreOffice)",
      documents: "Can convert to: pdf, txt, docx, odt (via LibreOffice)",
      text: "Can convert to: pdf, docx",
      presentations: "Can convert to: pdf, pptx, odp (via LibreOffice)",
    }
  });
});

app.get("/", (req, res) => {
  res.send("DocuFree File Converter Backend is running 🚀");
});

app.listen(PORT, () => {
  console.log(`✅ File converter backend running at http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`📁 Outputs directory: ${outputsDir}`);
});
