import OpenAI from "openai";
import mongoose from "mongoose";
import Note from "../models/noteModel.js";
import ChatSession from "../models/chatSessionModel.js";
import ChatMessage from "../models/chatMessageModel.js";
import { chunkInput } from "../utils/chunkInput.js";
import { extractTextFromImage } from "../utils/visionExtract.js";
import { extractTextFromPdf } from "../utils/pdfExtract.js";
import { extractTextFromUrl } from "../utils/urlExtract.js";
import { incrementUserActivity } from "../utils/userActivity.js";
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

const extractUrlFromChunks = (chunks) => {
  if (!Array.isArray(chunks) || chunks.length === 0) return "";
  const candidate = String(chunks[0] || "");
  const match = candidate.match(/URL:\s*(\S+)/i);
  return match ? match[1] : "";
};

export const getNotes = async (req, res) => {
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
      const total = await Note.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(total / limitNumber));
      const safePage = Math.min(pageNumber, totalPages);
      const skip = (safePage - 1) * limitNumber;

      const notes = await Note.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

      return res.json({
        success: true,
        notes,
        pagination: {
          page: safePage,
          limit: limitNumber,
          total,
          totalPages,
        },
      });
    }

    const notes = await Note.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, notes });
  } catch (err) {
    console.error("Error fetching notes:", err);
    return res.status(500).json({ error: "Failed to fetch notes" });
  }
};

export const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const note = await Note.findOne({ _id: id, userId });
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    return res.json({ success: true, note });
  } catch (err) {
    console.error("Error fetching note:", err);
    return res.status(500).json({ error: "Failed to fetch note" });
  }
};

export const generateNotes = async (req, res) => {
  try {
    const openai = getClient();
    const {
      title,
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

    const usage = await checkUsageLimit({ userId, type: "notes" });
    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily note generation limit reached",
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

    const notePrompt = buildNotesPrompt(
      resolvedChunks.join("\n\n"),
      language || "English"
    );
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL,
      messages: notePrompt,
      max_tokens: getMaxTokens(),
      temperature: 0.2,
    });

    const content = String(
      response?.choices?.[0]?.message?.content || ""
    ).trim();
    if (!content) {
      return res.status(500).json({ error: "Empty note content generated" });
    }

    const noteTitle = String(title || session?.title || "Study Notes").trim();
    const savedNote = await Note.create({
      userId,
      sessionId: session?._id,
      title: noteTitle,
      content,
      sourceType: resolvedSourceType || "text",
      sourceValue: resolvedSourceValue || "",
    });

    if (session && savedNote?._id) {
      await ChatSession.findByIdAndUpdate(session._id, {
        lastActivityAt: new Date(),
      });
      await ChatMessage.create([
        {
          sessionId: session._id,
          userId,
          role: "user",
          type: "command",
          content: "@Notes",
        },
        {
          sessionId: session._id,
          userId,
          role: "assistant",
          type: "asset",
          content: "Generated notes",
          assetType: "notes",
          assetId: savedNote._id,
        },
      ]);
    }

    if (session && resolvedChunks.length > 0 && !contextFromStore) {
      await saveChatContext({
        userId,
        sessionId: session._id,
        sourceType: resolvedSourceType || "text",
        sourceValue: resolvedSourceValue,
        chunks: resolvedChunks,
        metadata: { title: noteTitle },
      });
    }

    incrementUserActivity(userId, { noteGeneratedCount: 1 }).catch((err) => {
      console.error("Failed to track note generation:", err);
    });

    return res.json({ success: true, note: savedNote });
  } catch (err) {
    console.error("Notes generation error:", err);
    return res.status(500).json({ error: "Failed to generate notes" });
  }
};

const buildNotesPrompt = (text, language) => [
  {
    role: "system",
    content:
      "You are an expert study note writer. Produce clean, structured notes that are easy to scan.",
  },
  {
    role: "user",
    content: `TEXT:
${text}

TASK:
Create concise, structured study notes.

RULES:
- Language: ${language}
- Use short, descriptive section headings as plain text lines ending with ":".
- Keep bullets to 1 idea per bullet; keep bullets under ~18 words.
- Keep it focused on the provided text only.
- Avoid fluff, repetition, or external knowledge.
- If the text supports it, include a short "Key Takeaways:" section (3-6 bullets).
- You may use concise Markdown (headings, bold, bullet points) to improve readability`,
  },
];
