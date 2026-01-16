import OpenAI from "openai";
import mongoose from "mongoose";
import { safeJSONParse } from "../utils/safeJSON.js";
import Flashcard from "../models/flashcardModel.js";
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

const getClient = () => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY missing at runtime");
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

const isCommandOnlyChunks = (chunks) => {
  if (!Array.isArray(chunks) || chunks.length === 0) return false;
  const joined = chunks.join(" ").trim();
  if (!joined) return false;
  const stripped = joined
    .replace(/@(?:flashcards?|quiz(?:zes)?|notes?)\b/gi, "")
    .replace(/\s+/g, "")
    .trim();
  return stripped.length === 0;
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

export const getFlashcards = async (req, res) => {
  try {
    const { page, limit, sessionId } = req.query;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
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
      const total = await Flashcard.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(total / limitNumber));
      const safePage = Math.min(pageNumber, totalPages);
      const skip = (safePage - 1) * limitNumber;

      const flashcards = await Flashcard.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

      return res.json({
        success: true,
        flashcards,
        pagination: {
          page: safePage,
          limit: limitNumber,
          total,
          totalPages,
        },
      });
    }

    const flashcards = await Flashcard.find(filter).sort({ createdAt: -1 });

    return res.json({ success: true, flashcards });
  } catch (err) {
    console.error("Error fetching flashcards:", err);
    return res.status(500).json({ error: "Failed to fetch flashcards" });
  }
};

export const updateFlashcard = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, difficulty, language, cards } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    const trimmedCategory = typeof category === "string" ? category.trim() : "";
    const trimmedDifficulty =
      typeof difficulty === "string" ? difficulty.trim() : "";
    const trimmedLanguage =
      typeof language === "string" ? language.trim() : "";

    if (!trimmedTitle) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!trimmedCategory) {
      return res.status(400).json({ error: "Category is required" });
    }
    if (!trimmedDifficulty) {
      return res.status(400).json({ error: "Difficulty is required" });
    }
    if (!trimmedLanguage) {
      return res.status(400).json({ error: "Language is required" });
    }
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: "Cards array is required" });
    }
    if (cards.length > 20) {
      return res.status(400).json({ error: "Flashcards cannot exceed 20" });
    }

    const normalizedCards = cards.map((card, index) => {
      const front = typeof card?.front === "string" ? card.front.trim() : "";
      const back = typeof card?.back === "string" ? card.back.trim() : "";
      const explanation =
        typeof card?.explanation === "string" ? card.explanation.trim() : "";
      if (!front || !back) {
        throw new Error(`Card ${index + 1} must include front and back`);
      }
      return { front, back, explanation };
    });

    const updated = await Flashcard.findOneAndUpdate(
      { _id: id, userId },
      {
        title: trimmedTitle,
        category: trimmedCategory,
        difficulty: trimmedDifficulty,
        language: trimmedLanguage,
        count: normalizedCards.length,
        cards: normalizedCards,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Flashcard not found" });
    }

    return res.json({ success: true, flashcard: updated });
  } catch (err) {
    console.error("Error updating flashcard:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const deleteFlashcard = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deleted = await Flashcard.findOneAndDelete({ _id: id, userId });

    if (!deleted) {
      return res.status(404).json({ error: "Flashcard not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Error deleting flashcard:", err);
    return res.status(500).json({ error: "Failed to delete flashcard" });
  }
};

export const generateFlashcards = async (req, res) => {

  try {
    const openai = getClient(); // ← created AFTER env exists

    const {
      title,
      count,
      category,
      difficulty,
      language,
      chunks,
      imageData,
      pdfData,
      sessionId,
      sourceType,
      sourceValue,
      contextId,
    } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const usage = await checkUsageLimit({ userId, type: "flashcards" });
    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily flashcard generation limit reached",
        limit: usage.limit,
        used: usage.used,
        plan: usage.planKey,
      });
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
    let resolvedChunks = normalizeChunks(chunks);
    if (isCommandOnlyChunks(resolvedChunks)) {
      resolvedChunks = [];
    }
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

    let flashcards = [];
    const maxPerChunk = 10;
    const maxAttempts = Math.max(
      resolvedChunks.length * 3,
      Math.ceil(count / maxPerChunk) * 4
    );
    let attempt = 0;

    while (flashcards.length < count && attempt < maxAttempts) {
      const chunk = resolvedChunks[attempt % resolvedChunks.length];
      const remaining = count - flashcards.length;
      const requestCount = Math.min(remaining, maxPerChunk);

      const response = await openai.chat.completions.create({
        model: process.env.AI_MODEL,
        messages: buildFlashcardPrompt(chunk, requestCount, difficulty, language),
        max_tokens: getMaxTokens(),
        temperature: 0.3,
      });

      const raw = response.choices[0].message.content;
      const parsed = extractJSONArray(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        flashcards.push(...parsed);
      }

      attempt += 1;
    }

    const finalFlashcards = flashcards
      .slice(0, count)
      .map((card) => ({
        front: String(card?.front || "").trim(),
        back: String(card?.back || "").trim(),
        explanation: String(card?.explanation || "").trim(),
      }))
      .filter((card) => card.front && card.back);

    /// === save flashcards to DB === ///
    const savedFlashcard = await saveFlashcardsToDB(
      userId,
      title,
      count,
      category,
      difficulty,
      language,
      finalFlashcards,
      session?._id
    );

    if (session) {
      await ChatSession.findByIdAndUpdate(session._id, {
        lastActivityAt: new Date(),
      });
      if (savedFlashcard?._id) {
        await ChatMessage.create([
          {
            sessionId: session._id,
            userId,
            role: "user",
            type: "command",
            content: "@Flashcards",
          },
          {
            sessionId: session._id,
            userId,
            role: "assistant",
            type: "asset",
            content: "Generated flashcards",
            assetType: "flashcards",
            assetId: savedFlashcard._id,
          },
        ]);
      }
    }

    incrementUserActivity(
      userId,
      { flashcardGeneratedCount: 1 }
    ).catch((err) => {
      console.error("Failed to track flashcard generation:", err);
    });

    res.json({ success: true, flashcards: finalFlashcards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/// == saving flashcards to DB === ///

const saveFlashcardsToDB = async (
  userId,
  title,
  count,
  category,
  difficulty,
  language,
  flashcardsData,
  sessionId
) => {
  try {
    const flashcard = await Flashcard.create({
      userId,
      sessionId,
      title: title || "Untitled Flashcards",
      count,
      difficulty,
      category,
      language,
      cards: flashcardsData,
    });
    console.log("Flashcards saved to DB successfully");
    return flashcard;
  } catch (err) {
    console.error("Error saving flashcards to DB:", err);
    return null;
  }
};
/// === prompt builder == ///

const buildFlashcardPrompt = (chunk, count, difficulty, language) => [
  {
    role: "system",
    content:
      "You are an expert educational flashcard creator. You follow formatting rules exactly.",
  },
  {
    role: "user",
    content: `
TEXT:
${chunk}

TASK:
Generate ${count} flashcards.

RULES:
- Difficulty: ${difficulty}
- Language: ${language}
- Each flashcard must contain:
  - "front"
  - "back"
-  - "explanation"
- Clear, concise, revision-focused (not tricky questions).
- Output ONLY valid JSON array (no markdown, no extra text).
- Front should be a short concept prompt or definition cue.
- Back must be a short, accurate answer (max 160 characters).
- Explanation should be 1-2 short sentences clarifying the answer.
- Avoid multi-part questions or long explanations.
- Do not invent facts beyond the provided text.

DIFFICULTY CALIBRATION:
- Basic: direct definitions and key facts.
- Intermediate: short concept explanations or comparisons.
- Advanced: precise distinctions or deeper insight, still concise.
    `,
  },
];
