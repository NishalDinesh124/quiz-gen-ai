import express from 'express';
import {
  deleteFlashcard,
  generateFlashcards,
  getFlashcards,
  updateFlashcard,
} from '../controllers/flashCardController.js';
import requireActiveSubscription from '../middleware/requireActiveSubscription.js'
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();
//const { authenticate } = require('../Middleware/authMiddleware');

router.use(requireAuth);

// Fetch flashcards (optionally filter by userId via query)
router.get("/", getFlashcards);

// Protected: only users with an active subscription may generate flashcards
router.post("/generate",generateFlashcards);

// Update flashcard set and cards
router.put("/:id", updateFlashcard);

// Delete flashcard set
router.delete("/:id", deleteFlashcard);

export default router;
