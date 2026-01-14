import { extractTextFromPdf } from "./pdfExtract.js";

const MAX_TEXT_LENGTH = 200000;

const normalizeUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.toString();
  } catch (error) {
    return "";
  }
};

const stripHtml = (html) => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  return withoutTags.replace(/\s+/g, " ").trim();
};

const extractTextFromUrl = async (url) => {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    throw new Error("Invalid URL");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "QuizpommeBot/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/pdf") || normalized.endsWith(".pdf")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const dataUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;
      const extracted = await extractTextFromPdf(dataUrl);
      return extracted.slice(0, MAX_TEXT_LENGTH);
    }

    const html = await response.text();
    const cleaned = stripHtml(html);
    return cleaned.slice(0, MAX_TEXT_LENGTH);
  } finally {
    clearTimeout(timeout);
  }
};

export { extractTextFromUrl };
