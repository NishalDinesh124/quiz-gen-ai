import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import {
  getFlashcardAttemptSummary,
  listFlashcardAttempts,
} from "../controllers/flashcardAttemptController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", listFlashcardAttempts);
router.get("/summary", getFlashcardAttemptSummary);

export default router;
