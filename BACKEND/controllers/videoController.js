import OpenAI from "openai";
import mongoose from "mongoose";
import { fetchTranscript } from "youtube-transcript-plus";
import { safeJSONParse } from "../utils/safeJSON.js";
import VideoContext from "../models/videoContextModel.js";
import ChatSession from "../models/chatSessionModel.js";
import { chunkInput } from "../utils/chunkInput.js";
import { saveChatContext } from "../utils/contextStore.js";

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

const extractVideoId = (url) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = raw.match(regex);
  return match ? match[1] : "";
};

const parseTimestamp = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const parts = raw.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

const buildChaptersPrompt = (formattedTranscript) => `
You are given a raw YouTube transcript in this format:
[seconds]: text content

TASK:
Generate 4-10 logical chapters with "MM:SS" timestamps and titles.

OUTPUT:
Return ONLY valid JSON in this shape:
{
  "chapters": [
    { "start": "MM:SS", "title": "..." }
  ],
  "error": ""
}

RULES:
- Use ONLY the provided transcript content. Do NOT invent or generalize.
- Timestamps must be ordered and realistic.
- Chapters must align with transcript content.

RAW TRANSCRIPT:
${formattedTranscript}
`;

const parsePayload = (raw) => {
  if (!raw) return null;
  const parsed = safeJSONParse(raw);
  if (parsed && typeof parsed === "object") return parsed;
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  return safeJSONParse(match[0]);
};

const normalizeChapters = (entries) => {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((item) => ({
      start: parseTimestamp(item?.start),
      title: String(item?.title || "").trim(),
    }))
    .filter((item) => item.title);
};

const generateChaptersAsync = async ({
  userId,
  sessionId,
  videoId,
  url,
  formattedTranscript,
}) => {
  try {
    const openai = getClient();
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL,
      messages: [
        { role: "system", content: "You generate chapter summaries." },
        { role: "user", content: buildChaptersPrompt(formattedTranscript) },
      ],
      max_tokens: getMaxTokens(),
      temperature: 0.2,
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const parsed = parsePayload(raw) || {};
    const chapters = normalizeChapters(parsed.chapters);
    const chaptersStatus = chapters.length > 0 ? "available" : "failed";
    const chaptersError =
      parsed.error ||
      (chaptersStatus === "failed" ? "Chapters not available" : "");

    await VideoContext.findOneAndUpdate(
      { userId, sessionId, videoId },
      {
        chapters,
        chaptersStatus,
        chaptersError,
      }
    );
  } catch (error) {
    await VideoContext.findOneAndUpdate(
      { userId, sessionId, videoId },
      {
        chaptersStatus: "failed",
        chaptersError: "Chapters not available",
      }
    );
  }
};

export const getVideoContext = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: "Invalid sessionId" });
    }

    const context = await VideoContext.findOne({ userId, sessionId });
    if (!context) {
      return res.json({ success: true, video: null });
    }

    return res.json({ success: true, video: context });
  } catch (err) {
    console.error("Error fetching video context:", err);
    return res.status(500).json({ error: "Failed to fetch video context" });
  }
};

export const generateYoutubeContext = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sessionId, url } = req.body;
    console.log("Video url", url);
   
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: "Invalid sessionId" });
    }

    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    let transcriptItems = [];
    try {
      console.log("Url here is:", url);
      transcriptItems = await fetchTranscript(url, {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          lang: 'en'
      });
    } catch (error) {
      console.error("youtube-transcript-plus error:", error?.message || error);
      transcriptItems = [];
    }
    console.log("youtube-transcript response:", transcriptItems);

    const formattedTranscript = Array.isArray(transcriptItems)
      ? transcriptItems
          .map((item) => {
            const start = Math.max(0, Math.floor(item?.offset || 0));
            const text = String(item?.text || "").trim();
            if (!text) return "";
            return `[${start}]: ${text}`;
          })
          .filter(Boolean)
          .join("\n")
      : "";

    const normalizedTranscript = Array.isArray(transcriptItems)
      ? transcriptItems
          .map((item) => ({
            start: Math.max(0, Math.floor(item?.offset || 0)),
            text: String(item?.text || "").trim(),
          }))
          .filter((item) => item.text)
      : [];

    if (!formattedTranscript || normalizedTranscript.length === 0) {
      const context = await VideoContext.findOneAndUpdate(
        { userId, sessionId, videoId },
        {
          userId,
          sessionId,
          videoId,
          url,
          title: session?.title || "",
          transcriptStatus: "unavailable",
          transcriptError: "Transcript not available",
          transcript: [],
          chapters: [],
          chaptersStatus: "unavailable",
          chaptersError: "Chapters not available",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.json({ success: true, video: context });
    }

    const context = await VideoContext.findOneAndUpdate(
      { userId, sessionId, videoId },
      {
        userId,
        sessionId,
        videoId,
        url,
        title: session?.title || "",
        transcriptStatus: "available",
        transcriptError: "",
        transcript: normalizedTranscript,
        chapters: [],
        chaptersStatus: "pending",
        chaptersError: "",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (normalizedTranscript.length > 0) {
      const transcriptText = normalizedTranscript
        .map((item) => item.text)
        .join(" ");
      const chunks = chunkInput({ text: transcriptText });
      await saveChatContext({
        userId,
        sessionId,
        sourceType: "youtube",
        sourceValue: url,
        chunks,
        metadata: { videoId },
      });
    }

    setImmediate(() => {
      generateChaptersAsync({
        userId,
        sessionId,
        videoId,
        url,
        formattedTranscript,
      });
    });

    return res.json({ success: true, video: context });
  } catch (err) {
    console.error("YouTube context error:", err);
    return res.status(500).json({ error: "Failed to generate transcript" });
  }
};
