import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Document from "../models/Document.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.userId })
      .sort({ createdAt: -1 }); // newest first

    res.json(docs);

  } catch (err) {
    console.error("Error fetching documents:", err);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

export default router;