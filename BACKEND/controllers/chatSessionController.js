import OpenAI from "openai";
import ChatSession from "../models/chatSessionModel.js";
import ChatMessage from "../models/chatMessageModel.js";
import Flashcard from "../models/flashcardModel.js";
import Quiz from "../models/quizModel.js";
import Note from "../models/noteModel.js";
import VideoContext from "../models/videoContextModel.js";
import { chunkInput } from "../utils/chunkInput.js";
import { extractTextFromImage } from "../utils/visionExtract.js";
import { extractTextFromPdf } from "../utils/pdfExtract.js";
import { extractTextFromUrl } from "../utils/urlExtract.js";
import { getLatestChatContext, saveChatContext } from "../utils/contextStore.js";
import { incrementUserActivity } from "../utils/userActivity.js";
import { checkUsageLimit } from "../utils/usageLimits.js";

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

export const createSession = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const trimmedTitle =
      typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const title = trimmedTitle || "New chat";

    const session = await ChatSession.create({
      userId,
      title,
      lastActivityAt: new Date(),
    });

    return res.json({ success: true, session });
  } catch (err) {
    console.error("Error creating chat session:", err);
    return res.status(500).json({ error: "Failed to create chat session" });
  }
};

export const getSessions = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessions = await ChatSession.find({ userId }).sort({
      lastActivityAt: -1,
      createdAt: -1,
    });

    return res.json({ success: true, sessions });
  } catch (err) {
    console.error("Error fetching chat sessions:", err);
    return res.status(500).json({ error: "Failed to fetch chat sessions" });
  }
};

export const getSessionById = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const usage = await checkUsageLimit({ userId, type: "messages" });
    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily message limit reached",
        limit: usage.limit,
        used: usage.used,
        plan: usage.planKey,
      });
    }

    const { id } = req.params;
    const session = await ChatSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const [flashcards, quizzes, notes, messages, video, context] = await Promise.all([
      Flashcard.find({ userId, sessionId: id }).sort({ createdAt: -1 }),
      Quiz.find({ userId, sessionId: id }).sort({ createdAt: -1 }),
      Note.find({ userId, sessionId: id }).sort({ createdAt: -1 }),
      ChatMessage.find({ userId, sessionId: id }).sort({ createdAt: 1 }),
      VideoContext.findOne({ userId, sessionId: id }),
      getLatestChatContext({ userId, sessionId: id }),
    ]);

    return res.json({
      success: true,
      session,
      flashcards,
      quizzes,
      notes,
      video,
      messages,
      context: context
        ? {
            hasContext: true,
            sourceType: context.sourceType,
            sourceValue: context.sourceValue,
            updatedAt: context.updatedAt,
          }
        : { hasContext: false },
    });
  } catch (err) {
    console.error("Error fetching chat session:", err);
    return res.status(500).json({ error: "Failed to fetch chat session" });
  }
};

export const sendChatMessage = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const content =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : typeof req.body?.content === "string"
        ? req.body.content.trim()
        : "";
    const replyOverride =
      typeof req.body?.reply === "string" ? req.body.reply.trim() : "";
    if (!content) {
      return res.status(400).json({ error: "Message is required" });
    }

    const session = await ChatSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const latestContext = await getLatestChatContext({
      userId,
      sessionId: session._id,
    });
    if (!latestContext?.chunks?.length) {
      return res
        .status(400)
        .json({ error: "Context is required", code: "NO_CONTEXT" });
    }

    await ChatMessage.create({
      sessionId: session._id,
      userId,
      role: "user",
      type: "text",
      content,
    });

    incrementUserActivity(userId, { chatMessageCount: 1 }).catch((err) => {
      console.error("Failed to track chat message:", err);
    });

    let reply = replyOverride;
    if (!reply) {
      const recentMessages = await ChatMessage.find({
        userId,
        sessionId: session._id,
        type: { $ne: "asset" },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

    const mode = typeof req.body?.mode === "string" ? req.body.mode : "chat";
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[chat-routing]",
        JSON.stringify({
          sessionId: String(session._id),
          mode,
          messagePreview: content.slice(0, 160),
        }),
      );
    }
      const looksLikeGenerated = (text = "") =>
        /^(flashcards|flashcard|quiz|quizzes)\b/i.test(text.trim()) ||
        /\b(correct answer|card\s+\d+|flashcard\s+\d+|quiz\s+\d+)\b/i.test(
          text,
        );

      const orderedMessages = recentMessages.reverse();
      const baseMessages = orderedMessages.filter((msg) => {
        if (msg.role !== "assistant") return true;
        return !looksLikeGenerated(msg.content || "");
      });
      const messages =
        mode === "chat"
          ? [{ role: "user", content }]
          : baseMessages
              .map((msg) => ({ role: msg.role, content: msg.content || "" }))
              .filter((msg) => msg.content);

      const contextMessage = {
        role: "system",
        content: `You are a study assistant. Use the provided study context as grounding for your answer. You may use concise Markdown (headings, bold, bullet points) to improve readability. Answer only the user's latest request. Do not format the response as flashcards, quizzes, or notes unless explicitly requested.\n\nStudy context:\n${latestContext.chunks
          .slice(0, 6)
          .join("\n\n")}`,
      };

      const client = getClient();
      const response = await client.chat.completions.create({
        model: process.env.AI_MODEL,
        messages: [contextMessage, ...messages],
        max_tokens: getMaxTokens(),
      });

      reply = response?.choices?.[0]?.message?.content?.trim() || "";
    }
    if (reply) {
      await ChatMessage.create({
        sessionId: session._id,
        userId,
        role: "assistant",
        type: "text",
        content: reply,
      });
    }

    await ChatSession.findByIdAndUpdate(session._id, {
      lastActivityAt: new Date(),
    });

    return res.json({ success: true, reply });
  } catch (err) {
    console.error("Error sending chat message:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
};

export const addSessionContext = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const session = await ChatSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const sourceType =
      typeof req.body?.sourceType === "string" ? req.body.sourceType : "";
    const sourceValue =
      typeof req.body?.sourceValue === "string" ? req.body.sourceValue : "";
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const imageData =
      typeof req.body?.imageData === "string" ? req.body.imageData : "";
    const pdfData = typeof req.body?.pdfData === "string" ? req.body.pdfData : "";

    let chunks = [];
    if (text) {
      chunks = chunkInput({ text });
    } else if (sourceType === "link" && sourceValue) {
      const extractedText = await extractTextFromUrl(sourceValue);
      chunks = chunkInput({ text: extractedText });
    } else if (imageData) {
      const extractedText = await extractTextFromImage(imageData);
      chunks = chunkInput({ text: extractedText });
    } else if (pdfData) {
      const extractedText = await extractTextFromPdf(pdfData);
      chunks = chunkInput({ text: extractedText });
    }

    if (!chunks.length) {
      return res.status(400).json({ error: "Context content is required" });
    }

    const context = await saveChatContext({
      userId,
      sessionId: session._id,
      sourceType,
      sourceValue,
      chunks,
    });

    await ChatSession.findByIdAndUpdate(session._id, {
      lastActivityAt: new Date(),
    });

    return res.json({
      success: true,
      context: {
        id: context?._id,
        sourceType: context?.sourceType,
        sourceValue: context?.sourceValue,
        chunkCount: context?.chunks?.length || chunks.length,
      },
    });
  } catch (err) {
    console.error("Error adding chat context:", err);
    return res.status(500).json({ error: "Failed to add context" });
  }
};

export const updateSessionTitle = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const session = await ChatSession.findOneAndUpdate(
      { _id: id, userId },
      { title, lastActivityAt: new Date() },
      { new: true }
    );
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({ success: true, session });
  } catch (err) {
    console.error("Error updating chat session:", err);
    return res.status(500).json({ error: "Failed to update chat session" });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const session = await ChatSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await Promise.all([
      ChatMessage.deleteMany({ userId, sessionId: id }),
      Flashcard.deleteMany({ userId, sessionId: id }),
      Quiz.deleteMany({ userId, sessionId: id }),
      Note.deleteMany({ userId, sessionId: id }),
      VideoContext.deleteMany({ userId, sessionId: id }),
    ]);
    await ChatSession.deleteOne({ _id: id, userId });

    return res.json({ success: true });
  } catch (err) {
    console.error("Error deleting chat session:", err);
    return res.status(500).json({ error: "Failed to delete chat session" });
  }
};
