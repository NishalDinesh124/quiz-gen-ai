import OpenAI from "openai";
import mongoose from "mongoose";
import { safeJSONParse } from "../utils/safeJSON.js";
import Quiz from "../models/quizModel.js";
import QuizAttempt from "../models/quizAttemptModel.js";
import ChatSession from "../models/chatSessionModel.js";
import ChatMessage from "../models/chatMessageModel.js";
import { chunkInput } from "../utils/chunkInput.js";
import { extractTextFromImage } from "../utils/visionExtract.js";
import { extractTextFromPdf } from "../utils/pdfExtract.js";
import { incrementUserActivity } from "../utils/userActivity.js";
import { extractTextFromUrl } from "../utils/urlExtract.js";
import { checkUsageLimit } from "../utils/usageLimits.js";
import {
  getChatContextById,
  getLatestChatContext,
  normalizeChunks,
  saveChatContext,
} from "../utils/contextStore.js";

const getAIClient = () => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY missing");
  }

  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_BASE_URL,
  });
};

const getMaxTokens = () => {
  const value = Number.parseInt(process.env.OPENROUTER_MAX_TOKENS, 10);
  return Number.isFinite(value) && value > 0 ? value : 4096;
};

const extractJSONArray = (raw) => {
  if (!raw) return null;
  const parsed = safeJSONParse(raw);
  if (Array.isArray(parsed)) return parsed;
  const match = String(raw).match(/\[[\s\S]*\]/);
  if (!match) return null;
  const recovered = safeJSONParse(match[0]);
  return Array.isArray(recovered) ? recovered : null;
};

const extractUrlFromChunks = (chunks) => {
  if (!Array.isArray(chunks) || chunks.length === 0) return "";
  const candidate = String(chunks[0] || "");
  const match = candidate.match(/URL:\s*(\S+)/i);
  return match ? match[1] : "";
};

export const getQuizzes = async (req, res) => {
  try {
    const { page, limit, sessionId } = req.query;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const usage = await checkUsageLimit({ userId, type: "quizzes" });
    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily quiz generation limit reached",
        limit: usage.limit,
        used: usage.used,
        plan: usage.planKey,
      });
    }

    const filter = { userId };
    if (sessionId) {
      filter.sessionId = sessionId;
    }

    const hasPage = page !== undefined;
    const hasLimit = limit !== undefined;
    if (hasPage || hasLimit) {
      if (!hasPage || !hasLimit) {
        return res
          .status(400)
          .json({ error: "Both page and limit are required for pagination." });
      }
    }

    const pageNumber = Number.parseInt(page, 10);
    const limitNumber = Number.parseInt(limit, 10);
    const shouldPaginate = hasPage && hasLimit;

    if (shouldPaginate) {
      if (
        !Number.isFinite(pageNumber) ||
        pageNumber < 1 ||
        !Number.isFinite(limitNumber) ||
        limitNumber < 1
      ) {
        return res
          .status(400)
          .json({ error: "page and limit must be positive integers." });
      }
    }

    if (shouldPaginate) {
      const total = await Quiz.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(total / limitNumber));
      const safePage = Math.min(pageNumber, totalPages);
      const skip = (safePage - 1) * limitNumber;

      const quizzes = await Quiz.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

      return res.json({
        success: true,
        quizzes,
        pagination: {
          page: safePage,
          limit: limitNumber,
          total,
          totalPages,
        },
      });
    }

    const quizzes = await Quiz.find(filter).sort({ createdAt: -1 });

    return res.json({ success: true, quizzes });
  } catch (err) {
    console.error("Error fetching quizzes:", err);
    return res.status(500).json({ error: "Failed to fetch quizzes" });
  }
};

export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    return res.json({ success: true, quiz });
  } catch (err) {
    console.error("Error fetching quiz:", err);
    return res.status(500).json({ error: "Failed to fetch quiz" });
  }
};

const buildQuizQuestions = async ({
  chunks,
  totalQuestions,
  questionType,
  difficulty,
  language,
  mode,
}) => {
  const openai = getAIClient();
  let questions = [];

  const perChunkTarget = Math.ceil(totalQuestions / chunks.length);
  const concurrency = Math.min(3, chunks.length);

  const appendUniqueQuestions = (items) => {
    if (!Array.isArray(items)) return;
    const existing = new Set(
      questions.map((item) => String(item?.question || "").trim().toLowerCase())
    );
    items.forEach((item) => {
      const key = String(item?.question || "").trim().toLowerCase();
      if (!key || existing.has(key)) return;
      existing.add(key);
      questions.push(item);
    });
  };

  const requestQuestions = async (chunk, count) => {
    const messages = buildQuizPrompt({
      chunk,
      totalQuestions: count,
      questionType,
      difficulty,
      language,
      mode,
    });

    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL,
      messages,
      max_tokens: getMaxTokens(),
      temperature: 0.3,
    });

    const raw = response.choices[0].message.content;
    const parsed = extractJSONArray(raw);

    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map((item) => normalizeQuestionAnswer(item))
        .filter(Boolean);
      appendUniqueQuestions(normalized);
    }
  };

  let chunkIndex = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      if (questions.length >= totalQuestions) return;
      const currentIndex = chunkIndex;
      chunkIndex += 1;
      if (currentIndex >= chunks.length) return;

      const remaining = totalQuestions - questions.length;
      const chunkTarget = Math.min(perChunkTarget, remaining);
      await requestQuestions(chunks[currentIndex], chunkTarget);
    }
  });

  await Promise.all(workers);

  const maxTopUpAttempts = 2;
  let topUpAttempt = 0;
  let topUpChunkIndex = 0;

  while (questions.length < totalQuestions && topUpAttempt < maxTopUpAttempts) {
    const remaining = totalQuestions - questions.length;
    const chunkTarget = Math.min(perChunkTarget, remaining);
    const chunk = chunks[topUpChunkIndex % chunks.length];
    await requestQuestions(chunk, chunkTarget);
    topUpChunkIndex += 1;
    topUpAttempt += 1;
  }

  questions = questions.slice(0, totalQuestions);
  questions = ensureMultipleCorrectMajority(questions);

  return questions;
};

export const generateQuiz = async (req, res) => {
  try {
    const {
      title,
      category,
      questionType,
      difficulty,
      totalQuestions,
      language,
      mode,
      chunks,
      imageData,
      pdfData,
      timeConfig,
      expiryDate,
      allowManualQuestions,
      sessionId,
      sourceType,
      sourceValue,
      contextId,
    } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let session = null;
    if (sessionId) {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ error: "Invalid sessionId" });
      }
      session = await ChatSession.findOne({ _id: sessionId, userId });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
    }
    
    /// === validate request === ///
    if (timeConfig?.enabled) {
      
      if (timeConfig.mode === undefined) {
        return res.status(400).json({ error: "mode required in timeConfig" });
      }

      if (timeConfig.mode === "perQuiz" && !timeConfig.totalTimeSeconds) {
        return res.status(400).json({ error: "totalTimeSeconds required" });
      }

      if (
        timeConfig.mode === "perQuestion" &&
        !timeConfig.perQuestionTimeSeconds
      ) {
        return res
          .status(400)
          .json({ error: "perQuestionTimeSeconds required" });
      }
    }

    let resolvedChunks = normalizeChunks(chunks);
    let resolvedSourceType = sourceType;
    let resolvedSourceValue = sourceValue;
    let contextFromStore = null;

    if (resolvedChunks.length === 0 && contextId) {
      contextFromStore = await getChatContextById({ userId, contextId });
      if (contextFromStore?.chunks?.length) {
        resolvedChunks = contextFromStore.chunks;
        resolvedSourceType = contextFromStore.sourceType;
        resolvedSourceValue = contextFromStore.sourceValue;
      }
    }

    if (resolvedSourceType === "link" && resolvedSourceValue) {
      try {
        const extractedText = await extractTextFromUrl(resolvedSourceValue);
        const extractedChunks = chunkInput({ text: extractedText });
        if (extractedChunks.length > 0) {
          resolvedChunks = extractedChunks;
        }
      } catch (error) {
        console.warn("Failed to extract URL content:", error.message);
      }
    }

    if (resolvedChunks.length > 0 && !resolvedSourceValue) {
      const urlFromChunks = extractUrlFromChunks(resolvedChunks);
      if (urlFromChunks) {
        resolvedSourceType = "link";
        resolvedSourceValue = urlFromChunks;
        try {
          const extractedText = await extractTextFromUrl(urlFromChunks);
          const extractedChunks = chunkInput({ text: extractedText });
          if (extractedChunks.length > 0) {
            resolvedChunks = extractedChunks;
          }
        } catch (error) {
          console.warn("Failed to extract URL content:", error.message);
        }
      }
    }

    if (resolvedChunks.length === 0 && imageData) {
      const extractedText = await extractTextFromImage(imageData);
      resolvedChunks = chunkInput({ text: extractedText });
      resolvedSourceType = resolvedSourceType || "image";
    }
    if (resolvedChunks.length === 0 && pdfData) {
      const extractedText = await extractTextFromPdf(pdfData);
      resolvedChunks = chunkInput({ text: extractedText });
      resolvedSourceType = resolvedSourceType || "pdf";
    }
    if (resolvedChunks.length === 0 && session) {
      const latestContext = await getLatestChatContext({
        userId,
        sessionId: session._id,
      });
      if (latestContext?.chunks?.length) {
        resolvedChunks = latestContext.chunks;
        resolvedSourceType = latestContext.sourceType;
        resolvedSourceValue = latestContext.sourceValue;
      }
    }

    if (resolvedChunks.length === 0 && session?.title) {
      resolvedChunks = chunkInput({ subject: session.title });
      resolvedSourceType = resolvedSourceType || "subject";
      resolvedSourceValue = resolvedSourceValue || session.title;
    }

    if (!resolvedChunks || resolvedChunks.length === 0) {
      return res.status(400).json({ error: "Chunks array is required" });
    }

    const requestedTotal = Number.parseInt(totalQuestions, 10);
    if (!Number.isFinite(requestedTotal) || requestedTotal < 1) {
      return res.status(400).json({ error: "Invalid totalQuestions value" });
    }
    if (requestedTotal > 50) {
      return res.status(400).json({ error: "Questions cannot exceed 50." });
    }

    const questions = await buildQuizQuestions({
      chunks: resolvedChunks,
      totalQuestions: requestedTotal,
      questionType,
      difficulty,
      language,
      mode,
    });

    if (session && resolvedChunks.length > 0 && !contextFromStore) {
      await saveChatContext({
        userId,
        sessionId: session._id,
        sourceType: resolvedSourceType || "text",
        sourceValue: resolvedSourceValue,
        chunks: resolvedChunks,
        metadata: { title },
      });
    }

    /// === store quiz in DB === ///
    const savedQuiz = await storeQuizInDB(
      userId,
      title,
      category,
      questionType,
      difficulty,
      requestedTotal,
      language,
      mode,
      questions,
      timeConfig,
      expiryDate,
      allowManualQuestions,
      session?._id
    );

    if (session) {
      await ChatSession.findByIdAndUpdate(session._id, {
        lastActivityAt: new Date(),
      });
      if (savedQuiz?._id) {
        await ChatMessage.create([
          {
            sessionId: session._id,
            userId,
            role: "user",
            type: "command",
            content: "@Quiz",
          },
          {
            sessionId: session._id,
            userId,
            role: "assistant",
            type: "asset",
            content: "Generated quiz",
            assetType: "quiz",
            assetId: savedQuiz._id,
          },
        ]);
      }
    }

    incrementUserActivity(userId, { quizGeneratedCount: 1 }).catch(
      (err) => {
      console.error("Failed to track quiz generation:", err);
      }
    );

    return res.json({
      success: true,
      quiz: {
        title,
        category,
        questionType,
        difficulty,
        totalQuestions: questions.length,
        mode,
        questions,
      },
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return res.status(500).json({
      error: "Failed to generate quiz",
    });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      title,
      category,
      questionType,
      difficulty,
      totalQuestions,
      language,
      mode,
      questions,
      timeConfig,
      expiryDate,
      allowManualQuestions,
    } = req.body;

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    const trimmedCategory =
      typeof category === "string" ? category.trim() : "";
    const trimmedQuestionType =
      typeof questionType === "string" ? questionType.trim() : "";
    const trimmedDifficulty =
      typeof difficulty === "string" ? difficulty.trim() : "";
    const trimmedLanguage =
      typeof language === "string" ? language.trim() : "";
    const trimmedMode = typeof mode === "string" ? mode.trim() : "";

    if (!trimmedTitle) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!trimmedCategory) {
      return res.status(400).json({ error: "Category is required" });
    }
    if (!trimmedQuestionType) {
      return res.status(400).json({ error: "Question type is required" });
    }
    if (!trimmedDifficulty) {
      return res.status(400).json({ error: "Difficulty is required" });
    }
    if (!trimmedLanguage) {
      return res.status(400).json({ error: "Language is required" });
    }
    if (!trimmedMode) {
      return res.status(400).json({ error: "Mode is required" });
    }

    if (timeConfig?.enabled) {
      if (!timeConfig.mode) {
        return res.status(400).json({ error: "mode required in timeConfig" });
      }
      if (timeConfig.mode === "perQuiz" && !timeConfig.totalTimeSeconds) {
        return res.status(400).json({ error: "totalTimeSeconds required" });
      }
      if (
        timeConfig.mode === "perQuestion" &&
        !timeConfig.perQuestionTimeSeconds
      ) {
        return res
          .status(400)
          .json({ error: "perQuestionTimeSeconds required" });
      }
    }

    let normalizedQuestions = [];
    if (Array.isArray(questions)) {
      normalizedQuestions = questions.map((item, index) => {
        const type = String(item?.type || "").trim();
        const allowedTypes = ["multiple_choice", "single_choice", "true_false"];
        if (!allowedTypes.includes(type)) {
          throw new Error(`Question ${index + 1} has invalid type`);
        }

        const questionText = String(item?.question || "").trim();
        if (!questionText) {
          throw new Error(`Question ${index + 1} text is required`);
        }

        let options = Array.isArray(item?.options) ? item.options : [];
        options = options.map((option) => String(option || "").trim()).filter(Boolean);

        if (type === "true_false") {
          options = ["True", "False"];
        }

        if (options.length < 2) {
          throw new Error(`Question ${index + 1} must have at least 2 options`);
        }

        let correctAnswer = item?.correctAnswer;
        if (type === "multiple_choice") {
          let correct = Array.isArray(correctAnswer)
            ? correctAnswer
            : correctAnswer
            ? [correctAnswer]
            : [];
          correct = correct.map((value) => String(value || "").trim()).filter(Boolean);
          if (correct.length === 0) {
            throw new Error(`Question ${index + 1} requires correct answers`);
          }
          const invalid = correct.find((value) => !options.includes(value));
          if (invalid) {
            throw new Error(`Question ${index + 1} has invalid correct option`);
          }
          correctAnswer = correct;
        } else {
          let correctValue = Array.isArray(correctAnswer)
            ? correctAnswer[0]
            : correctAnswer;
          correctValue = String(correctValue || "").trim();
          if (!correctValue) {
            throw new Error(`Question ${index + 1} requires a correct option`);
          }
          if (type === "true_false") {
            const normalized = correctValue.toLowerCase();
            correctValue = normalized === "false" ? "False" : "True";
          }
          if (!options.includes(correctValue)) {
            throw new Error(`Question ${index + 1} has invalid correct option`);
          }
          correctAnswer = correctValue;
        }

        return {
          type,
          question: questionText,
          options,
          correctAnswer,
        };
      });
    }

    const parsedTotal = Number.parseInt(totalQuestions, 10);
    const nextTotal = normalizedQuestions.length
      ? normalizedQuestions.length
      : Number.isFinite(parsedTotal)
      ? parsedTotal
      : 0;

    if (!nextTotal || nextTotal < 1) {
      return res.status(400).json({ error: "Invalid totalQuestions value" });
    }
    if (nextTotal > 50) {
      return res.status(400).json({ error: "Questions cannot exceed 50." });
    }

    const updatePayload = {
      title: trimmedTitle,
      category: trimmedCategory,
      questionType: trimmedQuestionType,
      difficulty: trimmedDifficulty,
      totalQuestions: nextTotal,
      language: trimmedLanguage,
      mode: trimmedMode,
      questions: normalizedQuestions,
      timeConfig: timeConfig?.enabled ? timeConfig : { enabled: false },
      expiryDate: expiryDate || null,
      allowManualQuestions: Boolean(allowManualQuestions),
    };

    const updated = await Quiz.findOneAndUpdate(
      { _id: id, userId },
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    incrementUserActivity(userId, { quizGeneratedCount: 1 }).catch(
      (err) => {
      console.error("Failed to track quiz regeneration:", err);
      }
    );

    return res.json({ success: true, quiz: updated });
  } catch (err) {
    console.error("Error updating quiz:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const regenerateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const usage = await checkUsageLimit({ userId, type: "quizzes" });
    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily quiz generation limit reached",
        limit: usage.limit,
        used: usage.used,
        plan: usage.planKey,
      });
    }

    const {
      title,
      category,
      questionType,
      difficulty,
      totalQuestions,
      language,
      mode,
      chunks,
      imageData,
      pdfData,
      timeConfig,
      expiryDate,
      allowManualQuestions,
      sourceType,
      sourceValue,
      contextId,
    } = req.body;

    let resolvedChunks = normalizeChunks(chunks);
    let resolvedSourceType = sourceType;
    let resolvedSourceValue = sourceValue;

    if (resolvedChunks.length === 0 && contextId) {
      const context = await getChatContextById({ userId, contextId });
      if (context?.chunks?.length) {
        resolvedChunks = context.chunks;
        resolvedSourceType = context.sourceType;
        resolvedSourceValue = context.sourceValue;
      }
    }

    if (resolvedSourceType === "link" && resolvedSourceValue) {
      try {
        const extractedText = await extractTextFromUrl(resolvedSourceValue);
        const extractedChunks = chunkInput({ text: extractedText });
        if (extractedChunks.length > 0) {
          resolvedChunks = extractedChunks;
        }
      } catch (error) {
        console.warn("Failed to extract URL content:", error.message);
      }
    }

    if (resolvedChunks.length > 0 && !resolvedSourceValue) {
      const urlFromChunks = extractUrlFromChunks(resolvedChunks);
      if (urlFromChunks) {
        resolvedSourceType = "link";
        resolvedSourceValue = urlFromChunks;
        try {
          const extractedText = await extractTextFromUrl(urlFromChunks);
          const extractedChunks = chunkInput({ text: extractedText });
          if (extractedChunks.length > 0) {
            resolvedChunks = extractedChunks;
          }
        } catch (error) {
          console.warn("Failed to extract URL content:", error.message);
        }
      }
    }

    if (resolvedChunks.length === 0 && imageData) {
      const extractedText = await extractTextFromImage(imageData);
      resolvedChunks = chunkInput({ text: extractedText });
      resolvedSourceType = resolvedSourceType || "image";
    }
    if (resolvedChunks.length === 0 && pdfData) {
      const extractedText = await extractTextFromPdf(pdfData);
      resolvedChunks = chunkInput({ text: extractedText });
      resolvedSourceType = resolvedSourceType || "pdf";
    }
    if (!resolvedChunks || resolvedChunks.length === 0) {
      return res.status(400).json({ error: "Chunks array is required" });
    }

    const requestedTotal = Number.parseInt(totalQuestions, 10);
    if (!Number.isFinite(requestedTotal) || requestedTotal < 1) {
      return res.status(400).json({ error: "Invalid totalQuestions value" });
    }
    if (requestedTotal > 50) {
      return res.status(400).json({ error: "Questions cannot exceed 50." });
    }

    if (timeConfig?.enabled) {
      if (!timeConfig.mode) {
        return res.status(400).json({ error: "mode required in timeConfig" });
      }
      if (timeConfig.mode === "perQuiz" && !timeConfig.totalTimeSeconds) {
        return res.status(400).json({ error: "totalTimeSeconds required" });
      }
      if (
        timeConfig.mode === "perQuestion" &&
        !timeConfig.perQuestionTimeSeconds
      ) {
        return res
          .status(400)
          .json({ error: "perQuestionTimeSeconds required" });
      }
    }

    const questions = await buildQuizQuestions({
      chunks: resolvedChunks,
      totalQuestions: requestedTotal,
      questionType,
      difficulty,
      language,
      mode,
    });

    const updated = await Quiz.findOneAndUpdate(
      { _id: id, userId },
      {
        title,
        category,
        questionType,
        difficulty,
        totalQuestions: questions.length,
        language,
        mode,
        questions,
        timeConfig: timeConfig?.enabled ? timeConfig : { enabled: false },
        expiryDate: expiryDate || null,
        allowManualQuestions: Boolean(allowManualQuestions),
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    incrementUserActivity(userId, { quizGeneratedCount: 1 }).catch((err) => {
      console.error("Failed to track quiz regeneration:", err);
    });

    return res.json({ success: true, quiz: updated });
  } catch (error) {
    console.error("Quiz regeneration error:", error);
    return res.status(500).json({ error: "Failed to regenerate quiz" });
  }
};

/// === store quizes in DB === ///

const storeQuizInDB = async (
  userId,
  title,
  category,
  questionType,
  difficulty,
  totalQuestions,
  language,
  mode,
  questions,
  timeConfig,
  expiryDate,
  allowManualQuestions,
  sessionId
) => {
  try {
    const quiz = await Quiz.create({
      userId,
      sessionId,
      title,
      category,
      questionType,
      difficulty,
      totalQuestions: questions.length,
      language,
      mode,
      questions,
      timeConfig,
      expiryDate,
      allowManualQuestions,
    });
    console.log("Quiz saved to DB successfully");
    return quiz;
  } catch (err) {
    console.error("Error saving quiz to DB:", err);
    return null;
  }
};

/// ==  update quiz status == ///
export const updateQuizStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const allowed = ["active", "inactive"];
    let nextStatus = status;

    if (!nextStatus) {
      const existing = await Quiz.findOne({ _id: id, userId });
      if (!existing) {
        return res.status(404).json({ error: "Quiz not found" });
      }
      nextStatus = existing.status === "active" ? "inactive" : "active";
    }

    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updated = await Quiz.findOneAndUpdate(
      { _id: id, userId },
      { status: nextStatus },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    return res.json({ success: true, status: updated.status });
  } catch (err) {
    console.error("Error updating quiz status:", err);
    return res.status(500).json({ error: "Failed to update status" });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deleted = await Quiz.findOneAndDelete({ _id: id, userId });

    if (!deleted) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Error deleting quiz:", err);
    return res.status(500).json({ error: "Failed to delete quiz" });
  }
};

const normalizeAnswerValue = (value) =>
  String(value || "").trim().toLowerCase();

const isAnswerCorrect = (selected, correct) => {
  if (Array.isArray(correct)) {
    const correctSet = new Set(correct.map(normalizeAnswerValue));
    const selectedArray = Array.isArray(selected) ? selected : [selected];
    const normalizedSelected = selectedArray
      .map(normalizeAnswerValue)
      .filter(Boolean);

    if (normalizedSelected.length === 0) return false;
    if (normalizedSelected.length !== correctSet.size) return false;
    return normalizedSelected.every((item) => correctSet.has(item));
  }

  return normalizeAnswerValue(selected) === normalizeAnswerValue(correct);
};

/// == submit quiz attempt == ///
export const submitQuizAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, timeSpentSeconds } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "answers must be an array" });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    const totalQuestions = questions.length;

    let correctCount = 0;
    const scoredAnswers = answers.map((answer) => {
      const questionIndex =
        typeof answer.questionIndex === "number" ? answer.questionIndex : -1;
      const question =
        questionIndex >= 0 && questionIndex < questions.length
          ? questions[questionIndex]
          : null;
      const correctAnswer = question?.correctAnswer;
      const selected = answer.selected;
      const isCorrect = question
        ? isAnswerCorrect(selected, correctAnswer)
        : false;

      if (isCorrect) {
        correctCount += 1;
      }

      return {
        questionIndex,
        selected,
        correct: correctAnswer,
        isCorrect,
      };
    });

    const score =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

    await QuizAttempt.create({
      userId,
      quizId: quiz._id,
      quizOwnerId: quiz.userId,
      score,
      correctCount,
      totalQuestions,
      mode: quiz.mode,
      answers: scoredAnswers,
      timeSpentSeconds:
        Number.isFinite(Number(timeSpentSeconds)) && Number(timeSpentSeconds) > 0
          ? Number(timeSpentSeconds)
          : undefined,
      attemptedAt: new Date(),
    });

    return res.json({
      success: true,
      score,
      correctCount,
      totalQuestions,
    });
  } catch (err) {
    console.error("Error submitting quiz attempt:", err);
    return res.status(500).json({ error: "Failed to submit quiz attempt" });
  }
};

/// == prompt builder == ///

const normalizeQuestionAnswer = (item) => {
  if (!item || typeof item !== "object") return null;

  const options = Array.isArray(item.options)
    ? item.options.map((option) => String(option).trim()).filter(Boolean)
    : [];

  const mapLetterToOption = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    const letterIndexMap = {
      a: 0,
      b: 1,
      c: 2,
      d: 3,
      e: 4,
      f: 5,
    };
    if (Object.prototype.hasOwnProperty.call(letterIndexMap, normalized)) {
      const idx = letterIndexMap[normalized];
      return options[idx] ?? value;
    }
    return value;
  };

  let correctAnswer = item.correctAnswer;
  if (Array.isArray(correctAnswer)) {
    correctAnswer = correctAnswer.map((answer) => mapLetterToOption(answer));
  } else if (correctAnswer !== undefined && correctAnswer !== null) {
    correctAnswer = mapLetterToOption(correctAnswer);
  }

  return {
    ...item,
    options,
    correctAnswer,
  };
};

const ensureMultipleCorrectMajority = (questions) => {
  if (!Array.isArray(questions)) return questions;

  const multipleChoice = questions.filter(
    (item) => item?.type === "multiple_choice"
  );

  if (multipleChoice.length === 0) {
    return questions;
  }

  const required = Math.floor(multipleChoice.length / 2) + 1;
  let multiCorrectCount = multipleChoice.filter((item) =>
    Array.isArray(item?.correctAnswer) ? item.correctAnswer.length > 1 : false
  ).length;

  if (multiCorrectCount >= required) {
    return questions;
  }

  const updated = questions.map((item) => {
    if (multiCorrectCount >= required) {
      return item;
    }

    if (item?.type !== "multiple_choice") {
      return item;
    }

    const options = Array.isArray(item.options) ? item.options : [];
    if (options.length < 2) {
      return item;
    }

    const currentAnswers = Array.isArray(item.correctAnswer)
      ? item.correctAnswer
      : item.correctAnswer
      ? [item.correctAnswer]
      : [];

    if (currentAnswers.length > 1) {
      return item;
    }

    const nextOption = options.find(
      (option) => !currentAnswers.includes(option)
    );

    if (!nextOption) {
      return item;
    }

    multiCorrectCount += 1;
    return {
      ...item,
      correctAnswer: [...currentAnswers, nextOption],
    };
  });

  return updated;
};

const buildQuizPrompt = ({
  chunk,
  totalQuestions,
  questionType,
  difficulty,
  language,
  mode,
}) => {
  const normalizedType = String(questionType || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const resolvedType =
    normalizedType.includes("true") || normalizedType.includes("false")
      ? "true_false"
      : normalizedType.includes("multiple")
      ? "multiple_choice"
      : normalizedType.includes("single")
      ? "single_choice"
      : "multiple_choice";

  const typeInstructions = {
    multiple_choice: [
      "- Type: multiple_choice",
      "- Provide 4 options",
      "- correctAnswer must be an array of the correct option text",
      "- For the majority of questions, include 2 or more correct answers",
    ],
    single_choice: [
      "- Type: single_choice",
      "- Provide 4 options",
      "- correctAnswer must be a string matching one option",
    ],
    true_false: [
      "- Type: true_false",
      "- Options must be [\"True\", \"False\"]",
      "- correctAnswer must be \"True\" or \"False\"",
    ],
  };

  const questionTypeBlock = typeInstructions[resolvedType].join("\n");

  return [
    {
      role: "system",
      content: "You are an expert exam question creator. You follow formatting rules exactly.",
    },
    {
      role: "user",
      content: `
TEXT:
${chunk}

TASK:
Generate ${totalQuestions} questions as a JSON array.

RULES:
- Difficulty: ${difficulty}
- Language: ${language}
- Mode: ${mode}
- Output ONLY valid JSON array (no code fences, no extra text)
- Each item must be:
  {
    "type": "${resolvedType}",
    "question": "string",
    "options": ["string", "..."],
    "correctAnswer": "string" | ["string", "..."]
  }
${questionTypeBlock}

NOTES:
- Questions must be clear, unambiguous, and strictly based on the provided text.
- Do not use letter answers like "A", "B", "C", "D".
- Every option must be a full answer choice, not labels.
- correctAnswer must match one or more items from "options" EXACTLY (case sensitive).
- Never include a correctAnswer that is not in options.
- Options must be unique and plausible (no duplicates, no "all of the above").
- Exam mode = no hints, no explanations.
- Study mode = simpler phrasing.

DIFFICULTY CALIBRATION:
- Basic: recall and direct facts from the text, simple wording.
- Intermediate: apply or compare concepts, minor inference from the text.
- Advanced: multi-step reasoning, subtle distinctions, or edge-case application grounded in the text.
- For Advanced, avoid trivial definitions; require deeper understanding from the text.
    `,
    },
  ];
};
