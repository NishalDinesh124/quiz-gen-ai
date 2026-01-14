import mongoose from "mongoose";
import QuizAttempt from "../models/quizAttemptModel.js";
import QuizSet from "../models/quizSetModel.js";

const toStartOfDayUtc = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const listAttempts = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      page = "1",
      limit = "20",
      from,
      to,
      quizId,
      quizSetId,
      includeAnswers,
    } = req.query;
    const pageNumber = Number.parseInt(page, 10);
    const limitNumber = Number.parseInt(limit, 10);
    const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const safeLimit =
      Number.isFinite(limitNumber) && limitNumber > 0 ? limitNumber : 20;

    const filter = { userId };
    if (quizId) {
      filter.quizId = quizId;
    }
    if (quizSetId) {
      filter.quizSetId = quizSetId;
    }
    if (from || to) {
      filter.attemptedAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!Number.isNaN(fromDate.getTime())) {
          filter.attemptedAt.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!Number.isNaN(toDate.getTime())) {
          filter.attemptedAt.$lte = toDate;
        }
      }
      if (Object.keys(filter.attemptedAt).length === 0) {
        delete filter.attemptedAt;
      }
    }

    const shouldIncludeAnswers = includeAnswers === "true";
    const [total, attempts] = await Promise.all([
      QuizAttempt.countDocuments(filter),
      QuizAttempt.find(filter)
        .sort({ attemptedAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .select(shouldIncludeAnswers ? undefined : "-answers")
        .populate({ path: "quizId", select: "title" })
        .populate({ path: "quizSetId", select: "title" }),
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
    console.error("Error fetching attempts:", err);
    return res.status(500).json({ error: "Failed to fetch attempts" });
  }
};

export const getAttemptById = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const attempt = await QuizAttempt.findOne({
      _id: req.params.attemptId,
      userId,
    })
      .populate({ path: "quizId", select: "title" })
      .populate({ path: "quizSetId", select: "title" });

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    return res.json({ success: true, attempt });
  } catch (err) {
    console.error("Error fetching attempt:", err);
    return res.status(500).json({ error: "Failed to fetch attempt" });
  }
};

export const getAttemptSummary = async (req, res) => {
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
      $or: [{ status: "completed" }, { status: { $exists: false } }],
    };

    const [dailyAttempts, highestScoresByQuiz, totals, recentAttempts] =
      await Promise.all([
        QuizAttempt.aggregate([
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
        QuizAttempt.aggregate([
          { $match: completedFilter },
          {
            $group: {
              _id: {
                quizSetId: "$quizSetId",
                quizId: "$quizId",
              },
              maxScore: { $max: "$score" },
              lastAttemptedAt: { $max: "$attemptedAt" },
            },
          },
          {
            $lookup: {
              from: "quizsets",
              localField: "_id.quizSetId",
              foreignField: "_id",
              as: "quizSet",
            },
          },
          {
            $lookup: {
              from: "quizzes",
              localField: "_id.quizId",
              foreignField: "_id",
              as: "quiz",
            },
          },
          { $unwind: { path: "$quizSet", preserveNullAndEmptyArrays: true } },
          { $unwind: { path: "$quiz", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              quizSetId: "$_id.quizSetId",
              quizId: "$_id.quizId",
              title: { $ifNull: ["$quizSet.title", "$quiz.title"] },
              maxScore: 1,
              lastAttemptedAt: 1,
            },
          },
          { $sort: { maxScore: -1, lastAttemptedAt: -1 } },
        ]),
        QuizAttempt.aggregate([
          { $match: completedFilter },
          {
            $group: {
              _id: null,
              totalAttempts: { $sum: 1 },
              avgScore: { $avg: "$score" },
              bestScore: { $max: "$score" },
            },
          },
          {
            $project: {
              _id: 0,
              totalAttempts: 1,
              avgScore: { $round: ["$avgScore", 1] },
              bestScore: 1,
            },
          },
        ]),
        QuizAttempt.find(completedFilter)
          .sort({ attemptedAt: -1 })
          .limit(5)
          .select("-answers")
          .populate({ path: "quizId", select: "title" })
          .populate({ path: "quizSetId", select: "title" }),
      ]);

    return res.json({
      success: true,
      dailyAttempts,
      highestScoresByQuiz,
      totals: totals[0] || { totalAttempts: 0, avgScore: 0, bestScore: 0 },
      recentAttempts,
    });
  } catch (err) {
    console.error("Error fetching attempt summary:", err);
    return res.status(500).json({ error: "Failed to fetch attempt summary" });
  }
};

const computeAttemptStats = (answers, totalQuestions) => {
  const safeAnswers = Array.isArray(answers) ? answers : [];
  const correctCount = safeAnswers.filter((answer) => answer?.isCorrect).length;
  const total = Number.isFinite(totalQuestions) ? totalQuestions : safeAnswers.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  return { correctCount, totalQuestions: total, score };
};

export const startQuizSetAttempt = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid quiz set id" });
    }

    const quizSet = await QuizSet.findOne({ _id: id, userId });
    if (!quizSet) {
      return res.status(404).json({ error: "Quiz set not found" });
    }

    const forceNew = Boolean(req.body?.forceNew);
    const existing = await QuizAttempt.findOne({
      userId,
      quizSetId: id,
      status: "in_progress",
    });
    if (existing && !forceNew) {
      const expandedCount =
        Number.isFinite(quizSet.questionCount) &&
        Number.isFinite(existing.totalQuestions) &&
        quizSet.questionCount > existing.totalQuestions;
      if (!expandedCount) {
        return res.json({ success: true, attempt: existing });
      }
      existing.status = "abandoned";
      await existing.save();
    }
    if (existing && forceNew) {
      existing.status = "abandoned";
      await existing.save();
    }

    const latestCompleted = await QuizAttempt.findOne({
      userId,
      quizSetId: id,
      status: "completed",
    }).sort({ completedAt: -1, attemptedAt: -1 });

    if (latestCompleted && !forceNew) {
      const completedAt = latestCompleted.completedAt || latestCompleted.attemptedAt;
      const countExpanded =
        Number.isFinite(quizSet.questionCount) &&
        Number.isFinite(latestCompleted.totalQuestions) &&
        quizSet.questionCount > latestCompleted.totalQuestions;
      if (!countExpanded) {
        return res.json({ success: true, locked: true, attempt: latestCompleted });
      }
    }

    const totalQuestions = Number.parseInt(req.body?.totalQuestions, 10);
    const safeTotal = Number.isFinite(totalQuestions)
      ? totalQuestions
      : quizSet.questionCount || 0;
    const attempt = await QuizAttempt.create({
      userId,
      quizSetId: id,
      totalQuestions: safeTotal,
      status: "in_progress",
      attemptedAt: new Date(),
      currentIndex: 0,
      answers: [],
    });

    return res.json({ success: true, attempt });
  } catch (err) {
    console.error("Error starting quiz set attempt:", err);
    return res.status(500).json({ error: "Failed to start quiz attempt" });
  }
};

export const updateQuizSetAttempt = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { attemptId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ error: "Invalid attempt id" });
    }

    const attempt = await QuizAttempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }
    if (attempt.status === "completed") {
      return res.json({ success: true, attempt });
    }

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const currentIndex = Number.parseInt(req.body?.currentIndex, 10);
    const totalQuestions = Number.parseInt(req.body?.totalQuestions, 10);
    const stats = computeAttemptStats(answers, totalQuestions);

    attempt.answers = answers;
    attempt.currentIndex = Number.isFinite(currentIndex) ? currentIndex : attempt.currentIndex;
    attempt.correctCount = stats.correctCount;
    attempt.totalQuestions = stats.totalQuestions;
    attempt.score = stats.score;
    await attempt.save();

    return res.json({ success: true, attempt });
  } catch (err) {
    console.error("Error updating quiz set attempt:", err);
    return res.status(500).json({ error: "Failed to update quiz attempt" });
  }
};

export const completeQuizSetAttempt = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { attemptId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ error: "Invalid attempt id" });
    }

    const attempt = await QuizAttempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }
    if (attempt.status === "completed") {
      return res.json({ success: true, attempt });
    }

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : attempt.answers;
    const totalQuestions = Number.parseInt(req.body?.totalQuestions, 10);
    const stats = computeAttemptStats(answers, totalQuestions);

    attempt.answers = answers;
    attempt.correctCount = stats.correctCount;
    attempt.totalQuestions = stats.totalQuestions;
    attempt.score = stats.score;
    attempt.status = "completed";
    attempt.completedAt = new Date();
    await attempt.save();

    return res.json({ success: true, attempt });
  } catch (err) {
    console.error("Error completing quiz set attempt:", err);
    return res.status(500).json({ error: "Failed to complete quiz attempt" });
  }
};
