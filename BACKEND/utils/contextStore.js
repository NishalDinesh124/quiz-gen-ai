import crypto from "crypto";
import ChatContext from "../models/chatContextModel.js";

const DEFAULT_CONTEXT_TTL_DAYS = Number.parseInt(
  process.env.CHAT_CONTEXT_TTL_DAYS || "60",
  10
);

const normalizeValue = (value) => String(value || "").trim();

const buildSourceHash = ({ sourceType, sourceValue, text }) => {
  const normalizedType = normalizeValue(sourceType) || "unknown";
  const normalizedValue = normalizeValue(sourceValue);
  const normalizedText = normalizeValue(text);
  const base = `${normalizedType}|${normalizedValue}|${normalizedText}`;
  return crypto.createHash("sha256").update(base).digest("hex");
};

const normalizeChunks = (chunks) =>
  Array.isArray(chunks)
    ? chunks.map((chunk) => normalizeValue(chunk)).filter(Boolean)
    : [];

const saveChatContext = async ({
  userId,
  sessionId,
  sourceType,
  sourceValue,
  chunks,
  metadata,
}) => {
  if (!userId || !sessionId) return null;
  const normalizedChunks = normalizeChunks(chunks);
  if (normalizedChunks.length === 0) return null;

  const expiresAt = new Date(
    Date.now() + DEFAULT_CONTEXT_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  const sourceHash = buildSourceHash({
    sourceType,
    sourceValue,
    text: normalizedChunks.join("\n"),
  });

  return ChatContext.findOneAndUpdate(
    { userId, sessionId, sourceHash },
    {
      userId,
      sessionId,
      sourceType: normalizeValue(sourceType) || "unknown",
      sourceValue: normalizeValue(sourceValue),
      sourceHash,
      chunks: normalizedChunks,
      metadata: metadata || {},
      expiresAt,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const getChatContextById = async ({ userId, contextId }) => {
  if (!userId || !contextId) return null;
  return ChatContext.findOne({ _id: contextId, userId });
};

const getLatestChatContext = async ({ userId, sessionId }) => {
  if (!userId || !sessionId) return null;
  return ChatContext.findOne({ userId, sessionId }).sort({ updatedAt: -1 });
};

export {
  buildSourceHash,
  getChatContextById,
  getLatestChatContext,
  normalizeChunks,
  saveChatContext,
};
