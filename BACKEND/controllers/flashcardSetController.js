import mongoose from "mongoose";
import Flashcard from "../models/flashcardModel.js";
import FlashcardSet from "../models/flashcardSetModel.js";
import FlashcardAttempt from "../models/flashcardAttemptModel.js";

const normalizeTitle = (value) => String(value || "").trim();

export const listFlashcardSets = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = Number.parseInt(req.query?.limit, 10);
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : null;

    let query = FlashcardSet.find({ userId }).sort({ updatedAt: -1 });
    if (safeLimit) {
      query = query.limit(safeLimit);
    }
    const sets = await query.lean();
    if (sets.length === 0) {
      return res.json({ success: true, sets });
    }

    const setIds = sets.map((set) => set._id);
    const attempts = await FlashcardAttempt.find({
      userId,
      flashcardSetId: { $in: setIds },
    })
      .sort({ attemptedAt: -1, createdAt: -1 })
      .lean();

    const latestBySet = new Map();
    attempts.forEach((attempt) => {
      const key = String(attempt.flashcardSetId);
      if (!latestBySet.has(key)) {
        latestBySet.set(key, attempt);
      }
    });

    const now = Date.now();
    const setsWithStatus = sets.map((set) => {
      const attempt = latestBySet.get(String(set._id));
      if (!attempt) {
        return {
          ...set,
          attemptStatus: "not_started",
          dueCount: set.cardCount || 0,
        };
      }
      const attemptCards = Array.isArray(attempt.cards) ? attempt.cards : [];
      const dueCount =
        attemptCards.length > 0
          ? attemptCards.filter((card) => {
              if (!card?.nextReviewAt) return true;
              const next = new Date(card.nextReviewAt).getTime();
              return Number.isFinite(next) && next <= now;
            }).length
          : set.cardCount || 0;
      return {
        ...set,
        attemptStatus: attempt.status || "completed",
        lastAttemptedAt: attempt.attemptedAt,
        dueCount,
      };
    });

    return res.json({ success: true, sets: setsWithStatus });
  } catch (err) {
    console.error("Error fetching flashcard sets:", err);
    return res.status(500).json({ error: "Failed to fetch flashcard sets" });
  }
};

export const createFlashcardSet = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const title = normalizeTitle(req.body?.title);
    const flashcardId = req.body?.flashcardId;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    let flashcardIds = [];
    let cards = [];

    if (flashcardId) {
      if (!mongoose.Types.ObjectId.isValid(flashcardId)) {
        return res.status(400).json({ error: "Invalid flashcardId" });
      }
      const flashcard = await Flashcard.findOne({
        _id: flashcardId,
        userId,
      });
      if (!flashcard) {
        return res.status(404).json({ error: "Flashcard not found" });
      }
      flashcardIds = [flashcard._id];
      cards = Array.isArray(flashcard.cards) ? flashcard.cards : [];
    }

    const set = await FlashcardSet.create({
      userId,
      title,
      flashcardIds,
      cards,
      cardCount: cards.length,
    });

    return res.json({ success: true, set });
  } catch (err) {
    console.error("Error creating flashcard set:", err);
    return res.status(500).json({ error: "Failed to create flashcard set" });
  }
};

export const addFlashcardToSet = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { flashcardId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid set id" });
    }
    if (!mongoose.Types.ObjectId.isValid(flashcardId)) {
      return res.status(400).json({ error: "Invalid flashcardId" });
    }

    const [set, flashcard] = await Promise.all([
      FlashcardSet.findOne({ _id: id, userId }),
      Flashcard.findOne({ _id: flashcardId, userId }),
    ]);

    if (!set) {
      return res.status(404).json({ error: "Set not found" });
    }
    if (!flashcard) {
      return res.status(404).json({ error: "Flashcard not found" });
    }

    const alreadyAdded = set.flashcardIds.some(
      (item) => String(item) === String(flashcard._id)
    );
    if (alreadyAdded) {
      return res.json({ success: true, set });
    }

    set.flashcardIds.push(flashcard._id);
    const nextCards = Array.isArray(flashcard.cards) ? flashcard.cards : [];
    set.cards.push(...nextCards);
    set.cardCount = set.cards.length;
    await set.save();

    return res.json({ success: true, set });
  } catch (err) {
    console.error("Error adding flashcard to set:", err);
    return res.status(500).json({ error: "Failed to update flashcard set" });
  }
};

export const getFlashcardSetById = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid set id" });
    }

    const set = await FlashcardSet.findOne({ _id: id, userId });
    if (!set) {
      return res.status(404).json({ error: "Set not found" });
    }

    return res.json({ success: true, set });
  } catch (err) {
    console.error("Error fetching flashcard set:", err);
    return res.status(500).json({ error: "Failed to fetch flashcard set" });
  }
};

export const updateFlashcardSet = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid set id" });
    }

    const title = normalizeTitle(req.body?.title);
    const cardsProvided = Array.isArray(req.body?.cards);
    const cards = cardsProvided ? req.body.cards : [];
    if (!title && !cardsProvided) {
      return res.status(400).json({ error: "Title or cards are required" });
    }
    if (cardsProvided && cards.length === 0) {
      return res.status(400).json({ error: "Cards array is required" });
    }

    let normalizedCards = null;
    if (cardsProvided) {
      normalizedCards = cards.map((card, index) => {
        const front = typeof card?.front === "string" ? card.front.trim() : "";
        const back = typeof card?.back === "string" ? card.back.trim() : "";
        const explanation =
          typeof card?.explanation === "string" ? card.explanation.trim() : "";
        if (!front || !back) {
          throw new Error(`Card ${index + 1} must include front and back`);
        }
        return { front, back, explanation };
      });
    }

    const update = {};
    if (normalizedCards) {
      update.cards = normalizedCards;
      update.cardCount = normalizedCards.length;
    }
    if (title) {
      update.title = title;
    }

    const set = await FlashcardSet.findOneAndUpdate(
      { _id: id, userId },
      update,
      { new: true, runValidators: true }
    );

    if (!set) {
      return res.status(404).json({ error: "Set not found" });
    }

    return res.json({ success: true, set });
  } catch (err) {
    console.error("Error updating flashcard set:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const deleteFlashcardSet = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid set id" });
    }

    const set = await FlashcardSet.findOne({ _id: id, userId });
    if (!set) {
      return res.status(404).json({ error: "Set not found" });
    }

    await FlashcardAttempt.deleteMany({ userId, flashcardSetId: id });
    await FlashcardSet.deleteOne({ _id: id, userId });

    return res.json({ success: true });
  } catch (err) {
    console.error("Error deleting flashcard set:", err);
    return res.status(500).json({ error: "Failed to delete flashcard set" });
  }
};
