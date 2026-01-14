import pdfParse from "pdf-parse";

export const extractTextFromPdf = async (pdfData) => {
  if (!pdfData) return "";
  const raw = typeof pdfData === "string" ? pdfData : "";
  const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
  const buffer = Buffer.from(base64, "base64");
  const result = await pdfParse(buffer);
  return result?.text || "";
};
