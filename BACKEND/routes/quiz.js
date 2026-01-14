import express from 'express';
import {
  deleteQuiz,
  generateQuiz,
  getQuizzes,
  getQuizById,
  regenerateQuiz,
  submitQuizAttempt,
  updateQuiz,
  updateQuizStatus,
} from '../controllers/quizController.js';
import requireActiveSubscription from '../middleware/requireActiveSubscription.js'
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();
//const { authenticate } = require('../Middleware/authMiddleware');

// Protected: only users with an active subscription may generate quizzes
router.post("/generate", requireAuth, generateQuiz);

// Fetch quizzes (optionally filter by userId via query)
router.get("/", requireAuth, getQuizzes);
router.get("/:id", getQuizById);
router.post("/:id/attempt", requireAuth, submitQuizAttempt);
router.post("/:id/regenerate", requireAuth, regenerateQuiz);
router.put("/:id", requireAuth, updateQuiz);
router.patch("/:id/status", requireAuth, updateQuizStatus);
router.delete("/:id", requireAuth, deleteQuiz);

export default router;
