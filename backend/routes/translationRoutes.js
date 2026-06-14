import express from "express";
import {
  translateText,
  saveTranslation,
  getTranslationHistory,
  deleteTranslation,
  getTranslation,
} from "../translation/translationController.js"; 

const router = express.Router();

router.post("/translate", translateText);

router.post("/save", saveTranslation);

router.get("/history", getTranslationHistory);

router.get("/:id", getTranslation);

router.delete("/delete/:id", deleteTranslation);

export default router;