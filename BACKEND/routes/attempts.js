import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import {
  getAttemptById,
  getAttemptSummary,
  listAttempts,
} from "../controllers/attemptController.js";

const router = express.Router();

router.get("/", requireAuth, listAttempts);
router.get("/summary", requireAuth, getAttemptSummary);
router.get("/:attemptId", requireAuth, getAttemptById);

export default router;
