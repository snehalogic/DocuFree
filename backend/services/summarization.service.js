
import { pipeline } from '@xenova/transformers';
import * as pdfParse from 'pdf-parse';

class SummarizationService {
  constructor() {
    this.summarizer = null;
    this.isLoading = false;
    this.isReady = false;
    this.modelName = 'Xenova/t5-small'; 
  }

  async initialize() {
    if (this.isReady) return;
    if (this.isLoading) {
      while (this.isLoading) await new Promise(r => setTimeout(r, 100));
      return;
    }

    this.isLoading = true;
    console.log(`🤖 Loading model ${this.modelName}... (downloads smaller ~300MB)`);

    try {
      this.summarizer = await pipeline('summarization', this.modelName, {
        quantized: true,
        progress_callback: (p) => {
          if (p.status === 'progress') {
            console.log(`📥 Downloading: ${Math.round(p.progress || 0)}%`);
          }
        },
      });

      this.isReady = true;
      console.log('✅ Model loaded successfully');
    } catch (err) {
      console.error('❌ Failed to load model:', err);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^a-zA-Z0-9.,!?;:'"()\-–—\s]/g, '')
      .trim();
  }

  async summarizeChunk(text, lengthPercent = 30) {
    if (!this.isReady) await this.initialize();

    const cleaned = this.cleanText(text);
    if (!cleaned) throw new Error('Empty text');

    const words = cleaned.split(/\s+/).length;
    if (words < 30) return cleaned;

    const targetWords = Math.max(Math.floor(words * lengthPercent / 100), 20);
    const minLength = Math.max(Math.floor(targetWords * 0.7 / 1.3), 10);
    const maxLength = Math.min(Math.floor(targetWords * 1.3 / 1.3), 120);

    const input = `summarize: ${cleaned}`;
    const result = await this.summarizer(input, {
      min_length: minLength,
      max_length: maxLength,
      do_sample: false,
      num_beams: 4,
      early_stopping: true,
    });

    return result[0].summary_text;
  }

  chunkText(text, maxWords = 250) {
    const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
    const chunks = [];
    let chunk = [];
    let count = 0;

    for (const s of sentences) {
      const words = s.trim().split(/\s+/).length;
      if (count + words > maxWords && chunk.length) {
        chunks.push(chunk.join(' ').trim());
        chunk = [s];
        count = words;
      } else {
        chunk.push(s);
        count += words;
      }
    }

    if (chunk.length) chunks.push(chunk.join(' ').trim());
    return chunks.length ? chunks : [text];
  }

  async summarizeText(fullText, lengthPercent = 30) {
    if (!this.isReady) await this.initialize();

    const chunks = this.chunkText(fullText);
    console.log(`🧩 Total chunks: ${chunks.length}`);

    const summaries = [];
    for (const chunk of chunks) {
      try {
        const summary = await this.summarizeChunk(chunk, lengthPercent);
        summaries.push(summary);
      } catch (err) {
        console.error("❌ Failed to summarize chunk:", err.message);
      }
    }

    const finalSummary = summaries.join(" ").replace(/\s+/g, " ").trim();
    console.log("✅ Combined final summary length:", finalSummary.length);

    return finalSummary || "No meaningful summary generated.";
  }
}

const summarizationService = new SummarizationService();
export default summarizationService;
