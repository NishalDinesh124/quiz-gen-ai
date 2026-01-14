import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import {
  addQuizToSet,
  createQuizSet,
  deleteQuizSet,
  getQuizSetById,
  listQuizSets,
  updateQuizSetTitle,
} from "../controllers/quizSetController.js";
import {
  completeQuizSetAttempt,
  startQuizSetAttempt,
  updateQuizSetAttempt,
} from "../controllers/attemptController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", listQuizSets);
router.get("/:id", getQuizSetById);
router.post("/", createQuizSet);
router.post("/:id/quizzes", addQuizToSet);
router.patch("/:id", updateQuizSetTitle);
router.delete("/:id", deleteQuizSet);
router.post("/:id/attempts/start", startQuizSetAttempt);
router.patch("/attempts/:attemptId", updateQuizSetAttempt);
router.post("/attempts/:attemptId/complete", completeQuizSetAttempt);

export default router;
