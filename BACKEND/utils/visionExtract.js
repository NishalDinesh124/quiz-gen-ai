import OpenAI from "openai";

const getVisionClient = () => {
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

const normalizeImageUrl = (imageData) => {
  const trimmed = String(imageData || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
};

const extractTextFromImage = async (imageData) => {
  const imageUrl = normalizeImageUrl(imageData);
  if (!imageUrl) {
    throw new Error("imageData is required");
  }

  const client = getVisionClient();
  const model =
    process.env.AI_VISION_MODEL || "google/gemini-2.5-pro";

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Extract all readable study-relevant text from this image. " +
              "Return plain text only, no markdown or bullet formatting.",
          },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    max_tokens: getMaxTokens(),
    temperature: 0.2,
  });

  return response.choices?.[0]?.message?.content || "";
};

export { extractTextFromImage };
