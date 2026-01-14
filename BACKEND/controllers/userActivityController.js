import { getUtcDateKey } from "../utils/userActivity.js";
import UserActivityDaily from "../models/userActivityDailyModel.js";
import Quiz from "../models/quizModel.js";
import Flashcard from "../models/flashcardModel.js";

const buildDateRange = (days) => {
  const today = new Date();
  const dates = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    date.setUTCDate(date.getUTCDate() - i);
    dates.push(getUtcDateKey(date));
  }
  return dates;
};

export const getUserActivity = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const days = Math.min(30, Math.max(7, Number.parseInt(req.query.days, 10) || 7));
    const dateKeys = buildDateRange(days);

    const entries = await UserActivityDaily.find({
      userId,
      date: { $in: dateKeys },
    }).lean();

    const entryMap = new Map(entries.map((entry) => [entry.date, entry]));
    const series = dateKeys.map((dateKey) => {
      const entry = entryMap.get(dateKey);
      return {
        date: dateKey,
        loginCount: entry?.loginCount || 0,
        quizGeneratedCount: entry?.quizGeneratedCount || 0,
        flashcardGeneratedCount: entry?.flashcardGeneratedCount || 0,
        noteGeneratedCount: entry?.noteGeneratedCount || 0,
        chatMessageCount: entry?.chatMessageCount || 0,
      };
    });

    return res.json({ success: true, series });
  } catch (err) {
    console.error("Error loading user activity:", err);
    return res.status(500).json({ error: "Failed to load activity" });
  }
};

export const getUserSummary = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [totalQuizzes, activeQuizzes, totalFlashcards] = await Promise.all([
      Quiz.countDocuments({ userId }),
      Quiz.countDocuments({ userId, status: "active" }),
      Flashcard.countDocuments({ userId }),
    ]);

    return res.json({
      success: true,
      totals: {
        totalQuizzes,
        activeQuizzes,
        totalFlashcards,
      },
    });
  } catch (err) {
    console.error("Error loading user summary:", err);
    return res.status(500).json({ error: "Failed to load summary" });
  }
};
