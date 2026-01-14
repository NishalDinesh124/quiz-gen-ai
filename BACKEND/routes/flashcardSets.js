import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import {
  addFlashcardToSet,
  createFlashcardSet,
  deleteFlashcardSet,
  getFlashcardSetById,
  listFlashcardSets,
  updateFlashcardSet,
} from "../controllers/flashcardSetController.js";
import {
  completeFlashcardSetAttempt,
  startFlashcardSetAttempt,
  updateFlashcardSetAttempt,
} from "../controllers/flashcardAttemptController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", listFlashcardSets);
router.get("/:id", getFlashcardSetById);
router.post("/", createFlashcardSet);
router.post("/:id/flashcards", addFlashcardToSet);
router.put("/:id", updateFlashcardSet);
router.patch("/:id", updateFlashcardSet);
router.delete("/:id", deleteFlashcardSet);
router.post("/:id/attempts/start", startFlashcardSetAttempt);
router.patch("/attempts/:attemptId", updateFlashcardSetAttempt);
router.post("/attempts/:attemptId/complete", completeFlashcardSetAttempt);

export default router;
