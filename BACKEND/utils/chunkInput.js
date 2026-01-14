const MIN_CHUNK_LENGTH = 400;
const MAX_CHUNK_LENGTH = 600;

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const splitIntoSentences = (text) => {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return [];
  }
  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  return sentences.map((sentence) => sentence.trim()).filter(Boolean);
};

const chunkText = (text) => {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return [];
  }

  const totalLength = normalized.length;
  const targetChunks = Math.min(
    10,
    Math.max(8, Math.ceil(totalLength / MAX_CHUNK_LENGTH))
  );
  const targetSize = Math.ceil(totalLength / targetChunks);

  const sentences = splitIntoSentences(normalized);
  const chunks = [];

  if (sentences.length > 0) {
    let current = "";
    sentences.forEach((sentence) => {
      const candidate = current ? `${current} ${sentence}` : sentence;
      if (candidate.length <= targetSize || current.length === 0) {
        current = candidate;
        return;
      }
      chunks.push(current.trim());
      current = sentence;
    });
    if (current) {
      chunks.push(current.trim());
    }
  }

  if (chunks.length < targetChunks) {
    const slices = [];
    let start = 0;
    while (start < normalized.length && slices.length < targetChunks) {
      const slice = normalized.slice(start, start + targetSize).trim();
      if (slice) {
        slices.push(slice);
      }
      start += targetSize;
    }
    return slices;
  }

  const trimmed = chunks.map((chunk) => chunk.trim()).filter(Boolean);
  if (trimmed.length > targetChunks) {
    return trimmed.slice(0, targetChunks);
  }
  return trimmed;
};

const expandSubject = (subject) => {
  const normalized = normalizeWhitespace(subject);
  if (!normalized) {
    return [];
  }
  return [
    `Explain the fundamentals of ${normalized}.`,
    `Provide key concepts, definitions, and examples for ${normalized}.`,
    `Summarize common questions and important facts about ${normalized}.`,
  ];
};

const wrapUrl = (url) => {
  const normalized = normalizeWhitespace(url);
  if (!normalized) {
    return [];
  }
  return [`Generate flashcards based on the content of this URL: ${normalized}`];
};

const chunkInput = (input) => {
  if (!input || typeof input !== "object") {
    return [];
  }

  if (input.text) {
    return chunkText(input.text);
  }

  if (input.subject) {
    return expandSubject(input.subject);
  }

  if (input.url) {
    return wrapUrl(input.url);
  }

  return [];
};

export { chunkInput };
