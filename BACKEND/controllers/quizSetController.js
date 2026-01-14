import mongoose from "mongoose";
import Quiz from "../models/quizModel.js";
import QuizSet from "../models/quizSetModel.js";
import QuizAttempt from "../models/quizAttemptModel.js";

const normalizeTitle = (value) => String(value || "").trim();

export const listQuizSets = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = Number.parseInt(req.query?.limit, 10);
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : null;

    let query = QuizSet.find({ userId }).sort({ updatedAt: -1 });
    if (safeLimit) {
      query = query.limit(safeLimit);
    }
    const sets = await query.lean();
    if (sets.length === 0) {
      return res.json({ success: true, sets });
    }

    const setIds = sets.map((set) => set._id);
    const attempts = await QuizAttempt.find({
      userId,
      quizSetId: { $in: setIds },
    })
      .sort({ attemptedAt: -1, createdAt: -1 })
      .lean();

    const latestBySet = new Map();
    attempts.forEach((attempt) => {
      const key = String(attempt.quizSetId);
      if (!latestBySet.has(key)) {
        latestBySet.set(key, attempt);
      }
    });

    const setsWithStatus = sets.map((set) => {
      const attempt = latestBySet.get(String(set._id));
      if (!attempt) {
        return {
          ...set,
          attemptStatus: "not_started",
          progressPercent: 0,
          answeredCount: 0,
        };
      }
      const totalQuestions = attempt.totalQuestions || set.questionCount || 0;
      const answeredCount = Array.isArray(attempt.answers)
        ? attempt.answers.length
        : 0;
      const currentIndex =
        Number.isFinite(attempt.currentIndex) && attempt.currentIndex > 0
          ? attempt.currentIndex
          : 0;
      const safeAnswered = Math.max(answeredCount, currentIndex);
      const progressPercent =
        totalQuestions > 0
          ? Math.min(100, Math.round((safeAnswered / totalQuestions) * 100))
          : 0;
      return {
        ...set,
        attemptStatus: attempt.status || "completed",
        lastAttemptedAt: attempt.attemptedAt,
        progressPercent,
        answeredCount: safeAnswered,
      };
    });

    return res.json({ success: true, sets: setsWithStatus });
  } catch (err) {
    console.error("Error fetching quiz sets:", err);
    return res.status(500).json({ error: "Failed to fetch quiz sets" });
  }
};

export const createQuizSet = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const title = normalizeTitle(req.body?.title);
    const quizId = req.body?.quizId;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    let quizIds = [];
    let questions = [];

    if (quizId) {
      if (!mongoose.Types.ObjectId.isValid(quizId)) {
        return res.status(400).json({ error: "Invalid quizId" });
      }
      const quiz = await Quiz.findOne({ _id: quizId, userId });
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }
      quizIds = [quiz._id];
      questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    }

    const set = await QuizSet.create({
      userId,
      title,
      quizIds,
      questions,
      questionCount: questions.length,
    });

    return res.json({ success: true, set });
  } catch (err) {
    console.error("Error creating quiz set:", err);
    return res.status(500).json({ error: "Failed to create quiz set" });
  }
};

export const addQuizToSet = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { quizId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid set id" });
    }
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ error: "Invalid quizId" });
    }

    const [set, quiz] = await Promise.all([
      QuizSet.findOne({ _id: id, userId }),
      Quiz.findOne({ _id: quizId, userId }),
    ]);

    if (!set) {
      return res.status(404).json({ error: "Set not found" });
    }
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const alreadyAdded = set.quizIds.some(
      (item) => String(item) === String(quiz._id)
    );
    if (alreadyAdded) {
      return res.json({ success: true, set });
    }

    set.quizIds.push(quiz._id);
    const nextQuestions = Array.isArray(quiz.questions) ? quiz.questions : [];
    set.questions.push(...nextQuestions);
    set.questionCount = set.questions.length;
    await set.save();

    return res.json({ success: true, set });
  } catch (err) {
    console.error("Error adding quiz to set:", err);
    return res.status(500).json({ error: "Failed to update quiz set" });
  }
};

export const getQuizSetById = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid set id" });
    }

    const set = await QuizSet.findOne({ _id: id, userId });
    if (!set) {
      return res.status(404).json({ error: "Set not found" });
    }

    return res.json({ success: true, set });
  } catch (err) {
    console.error("Error fetching quiz set:", err);
    return res.status(500).json({ error: "Failed to fetch quiz set" });
  }
};

export const updateQuizSetTitle = async (req, res) => {
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
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const set = await QuizSet.findOneAndUpdate(
      { _id: id, userId },
      { title, updatedAt: new Date() },
      { new: true }
    );
    if (!set) {
      return res.status(404).json({ error: "Set not found" });
    }

    return res.json({ success: true, set });
  } catch (err) {
    console.error("Error updating quiz set:", err);
    return res.status(500).json({ error: "Failed to update quiz set" });
  }
};

export const deleteQuizSet = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid set id" });
    }

    const set = await QuizSet.findOne({ _id: id, userId });
    if (!set) {
      return res.status(404).json({ error: "Set not found" });
    }

    await QuizAttempt.deleteMany({ userId, quizSetId: id });
    await QuizSet.deleteOne({ _id: id, userId });

    return res.json({ success: true });
  } catch (err) {
    console.error("Error deleting quiz set:", err);
    return res.status(500).json({ error: "Failed to delete quiz set" });
  }
};
