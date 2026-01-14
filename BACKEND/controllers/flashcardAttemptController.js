import mongoose from "mongoose";
import FlashcardAttempt from "../models/flashcardAttemptModel.js";
import FlashcardSet from "../models/flashcardSetModel.js";

const toStartOfDayUtc = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const getReviewOffsetMs = (rating) => {
  switch (rating) {
    case "again":
      return 60 * 1000;
    case "hard":
      return 8 * 60 * 1000;
    case "good":
      return 15 * 60 * 1000;
    case "easy":
      return 2 * 24 * 60 * 60 * 1000;
    default:
      return 8 * 60 * 1000;
  }
};

const buildAttemptCards = (totalCards) =>
  Array.from({ length: totalCards }, (_, index) => ({
    index,
    status: "not_studied",
  }));

export const listFlashcardAttempts = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { page = "1", limit = "20", flashcardSetId } = req.query;
    const pageNumber = Number.parseInt(page, 10);
    const limitNumber = Number.parseInt(limit, 10);
    const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const safeLimit =
      Number.isFinite(limitNumber) && limitNumber > 0 ? limitNumber : 20;

    const filter = { userId };
    if (flashcardSetId) {
      filter.flashcardSetId = flashcardSetId;
    }

    const [total, attempts] = await Promise.all([
      FlashcardAttempt.countDocuments(filter),
      FlashcardAttempt.find(filter)
        .sort({ attemptedAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate({ path: "flashcardSetId", select: "title" }),
    ]);

    return res.json({
      success: true,
      attempts,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    });
  } catch (err) {
    console.error("Error fetching flashcard attempts:", err);
    return res.status(500).json({ error: "Failed to fetch flashcard attempts" });
  }
};

export const getFlashcardAttemptSummary = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const days = Number.parseInt(req.query.days, 10);
    const lookbackDays = Number.isFinite(days) && days > 0 ? days : 30;
    const now = new Date();
    const startDate = toStartOfDayUtc(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    );
    startDate.setUTCDate(startDate.getUTCDate() - (lookbackDays - 1));

    const completedFilter = {
      userId,
      status: "completed",
    };

    const [dailyAttempts, totals, recentAttempts] = await Promise.all([
      FlashcardAttempt.aggregate([
        { $match: completedFilter },
        {
          $addFields: {
            activityDate: { $ifNull: ["$completedAt", "$attemptedAt"] },
          },
        },
        { $match: { activityDate: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$activityDate",
                timezone: "UTC",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", count: 1 } },
      ]),
      FlashcardAttempt.aggregate([
        { $match: completedFilter },
        { $group: { _id: null, totalAttempts: { $sum: 1 } } },
        { $project: { _id: 0, totalAttempts: 1 } },
      ]),
      FlashcardAttempt.find(completedFilter)
        .sort({ completedAt: -1, attemptedAt: -1 })
        .limit(10)
        .populate({ path: "flashcardSetId", select: "title" }),
    ]);

    return res.json({
      success: true,
      dailyAttempts,
      totals: totals[0] || { totalAttempts: 0 },
      recentAttempts,
    });
  } catch (err) {
    console.error("Error fetching flashcard attempt summary:", err);
    return res.status(500).json({ error: "Failed to fetch flashcard summary" });
  }
};

export const startFlashcardSetAttempt = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid flashcard set id" });
    }

    const set = await FlashcardSet.findOne({ _id: id, userId });
    if (!set) {
      return res.status(404).json({ error: "Flashcard set not found" });
    }

    const forceNew = Boolean(req.body?.forceNew);
    const existing = await FlashcardAttempt.findOne({
      userId,
      flashcardSetId: id,
      status: "in_progress",
    });
    if (existing && !forceNew) {
      return res.json({ success: true, attempt: existing });
    }
    if (existing && forceNew) {
      existing.status = "abandoned";
      await existing.save();
    }

    const recentCompleted = await FlashcardAttempt.findOne({
      userId,
      flashcardSetId: id,
      status: "completed",
    }).sort({ completedAt: -1, attemptedAt: -1 });

    if (recentCompleted) {
      const now = new Date();
      const cardNextReviews = Array.isArray(recentCompleted.cards)
        ? recentCompleted.cards
            .map((card) => (card?.nextReviewAt ? new Date(card.nextReviewAt) : null))
            .filter((date) => date && !Number.isNaN(date.getTime()))
        : [];
      const hasDueCard = Array.isArray(recentCompleted.cards)
        ? recentCompleted.cards.some(
            (card) =>
              !card?.nextReviewAt ||
              new Date(card.nextReviewAt).getTime() <= now.getTime(),
          )
        : false;
      if (!hasDueCard) {
        const soonest =
          cardNextReviews.sort((a, b) => a.getTime() - b.getTime())[0] || null;
        if (soonest && soonest > now) {
          return res.json({
            success: true,
            cooldown: true,
            nextReviewAt: soonest.toISOString(),
          });
        }
        if (recentCompleted.nextReviewAt) {
          const nextReviewAt = new Date(recentCompleted.nextReviewAt);
          if (!Number.isNaN(nextReviewAt.getTime()) && nextReviewAt > now) {
            return res.json({
              success: true,
              cooldown: true,
              nextReviewAt: nextReviewAt.toISOString(),
            });
          }
        }
      }
    }

    const totalCards = Number.parseInt(req.body?.totalCards, 10);
    const safeTotal = Number.isFinite(totalCards) ? totalCards : set.cardCount || 0;

    const resolvedTotal =
      safeTotal > 0
        ? safeTotal
        : Array.isArray(set.cards)
        ? set.cards.length
        : 0;
    const baseCards = Array.isArray(recentCompleted?.cards)
      ? recentCompleted.cards
          .filter((card) => Number.isFinite(card?.index))
          .map((card) => ({
            index: card.index,
            status: card.status || "not_studied",
            lastReviewedAt: card.lastReviewedAt || null,
            nextReviewAt: card.nextReviewAt || null,
            lastRating: card.lastRating || null,
          }))
      : [];
    let cards = [];
    if (baseCards.length > 0) {
      const cardMap = new Map(baseCards.map((card) => [card.index, card]));
      cards = Array.from({ length: resolvedTotal }, (_, index) => {
        if (cardMap.has(index)) {
          return cardMap.get(index);
        }
        return { index, status: "not_studied" };
      });
    } else {
      cards = buildAttemptCards(resolvedTotal);
    }

    const attempt = await FlashcardAttempt.create({
      userId,
      flashcardSetId: id,
      totalCards: resolvedTotal,
      status: "in_progress",
      attemptedAt: new Date(),
      currentIndex: 0,
      cardsSeen: 0,
      cards,
    });

    return res.json({ success: true, attempt });
  } catch (err) {
    console.error("Error starting flashcard attempt:", err);
    return res.status(500).json({ error: "Failed to start flashcard attempt" });
  }
};

export const updateFlashcardSetAttempt = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { attemptId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ error: "Invalid attempt id" });
    }

    const attempt = await FlashcardAttempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    const currentIndex = Number.parseInt(req.body?.currentIndex, 10);
    const totalCards = Number.parseInt(req.body?.totalCards, 10);
    const cardsSeen = Number.parseInt(req.body?.cardsSeen, 10);
    const cardIndex = Number.parseInt(req.body?.cardIndex, 10);
    const rating = String(req.body?.rating || "").toLowerCase();

    if (!Array.isArray(attempt.cards) || attempt.cards.length === 0) {
      const resolvedTotal = Number.isFinite(totalCards)
        ? totalCards
        : attempt.totalCards || 0;
      attempt.cards = buildAttemptCards(resolvedTotal);
    }

    attempt.currentIndex = Number.isFinite(currentIndex)
      ? currentIndex
      : attempt.currentIndex;
    attempt.totalCards = Number.isFinite(totalCards)
      ? totalCards
      : attempt.totalCards;
    const nextCardsSeen = Number.isFinite(cardsSeen)
      ? cardsSeen
      : attempt.currentIndex + 1;
    attempt.cardsSeen = Math.max(attempt.cardsSeen, nextCardsSeen);

    if (Number.isFinite(cardIndex) && cardIndex >= 0 && rating) {
      let cardState =
        attempt.cards.find((card) => card.index === cardIndex) || null;
      if (!cardState) {
        cardState = { index: cardIndex, status: "not_studied" };
        attempt.cards.push(cardState);
      }
      const nextReviewAt = new Date();
      const offsetMs = getReviewOffsetMs(rating);
      nextReviewAt.setTime(nextReviewAt.getTime() + offsetMs);
      cardState.status = "to_review";
      cardState.lastReviewedAt = new Date();
      cardState.nextReviewAt = nextReviewAt;
      cardState.lastRating = rating;
    }
    attempt.cardsSeen = Array.isArray(attempt.cards)
      ? attempt.cards.filter((card) => card.status && card.status !== "not_studied")
          .length
      : attempt.cardsSeen;
    await attempt.save();

    return res.json({ success: true, attempt });
  } catch (err) {
    console.error("Error updating flashcard attempt:", err);
    return res.status(500).json({ error: "Failed to update flashcard attempt" });
  }
};

export const completeFlashcardSetAttempt = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { attemptId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ error: "Invalid attempt id" });
    }

    const attempt = await FlashcardAttempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    const currentIndex = Number.parseInt(req.body?.currentIndex, 10);
    const totalCards = Number.parseInt(req.body?.totalCards, 10);
    const cardsSeen = Number.parseInt(req.body?.cardsSeen, 10);

    if (Number.isFinite(currentIndex)) {
      attempt.currentIndex = currentIndex;
    }
    if (Number.isFinite(totalCards)) {
      attempt.totalCards = totalCards;
    }
    if (Number.isFinite(cardsSeen)) {
      attempt.cardsSeen = Math.max(attempt.cardsSeen, cardsSeen);
    }
    attempt.status = "completed";
    attempt.completedAt = new Date();
    const nextReviewAt = new Date(attempt.completedAt);
    nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + 4);
    attempt.nextReviewAt = nextReviewAt;
    await attempt.save();

    return res.json({ success: true, attempt });
  } catch (err) {
    console.error("Error completing flashcard attempt:", err);
    return res.status(500).json({ error: "Failed to complete flashcard attempt" });
  }
};
