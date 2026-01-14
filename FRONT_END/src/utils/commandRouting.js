const extractRequestedCount = (text, keywords) => {
  const match = text.match(
    new RegExp(`(\\d+)\\s+(?:more\\s+|additional\\s+)?${keywords}`, 'i'),
  );
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const hasStrongActionVerb = (text) =>
  /(generate|create|make|build|produce|prepare|draft|craft|design|write)/i.test(
    text,
  );

const hasSoftRequest = (text) =>
  /(i\s+want|i\s+need|give\s+me|can\s+you|please)/i.test(text);

const looksLikeKnowledgeQuery = (text) =>
  /(tell\s+me\s+about|what\s+is|what\s+are|explain|define|meaning\s+of|overview\s+of|learn\s+about|know\s+about)/i.test(
    text,
  );

const hasExplicitCount = (text) => /\b\d+\b/.test(text);

export const getExceededLimitMessage = (count, typeLabel) => {
  if (!count) return '';
  const safeCount = Number.isFinite(Number(count)) ? Number(count) : count;
  const normalized = String(typeLabel || '').toLowerCase();
  const isQuiz = normalized.includes('quiz');
  const itemLabel = isQuiz ? 'questions' : 'flashcards';
  const singular = isQuiz ? 'quiz' : 'flashcard';
  const focusLine = isQuiz
    ? 'Complete current quiz'
    : 'Complete current flashcards';
  const title = isQuiz ? 'quizzes' : 'flashcards';
  return `**${safeCount} ${title} exceeds practical limits** – would overwhelm learning.\n\n**Better approach:**\n\n1. **${focusLine}**\n2. **Request topic-specific ${singular}s**\n3. **Use 5-20 ${itemLabel} per session** for retention\n\n**Quality > quantity** for mastery! 📊`;
};

export const parseGenerationIntent = (text) => {
  const tokens = new Set();
  const counts = {};
  const trimmed = String(text || '').trim();
  if (!trimmed) return { tokens: [], counts, isIntent: false };

  if (/@flashcards/i.test(trimmed)) tokens.add('@Flashcards');
  if (/@quiz/i.test(trimmed)) tokens.add('@Quiz');
  if (/@notes/i.test(trimmed)) tokens.add('@Notes');

  const flashcardMatch = /(flashcards?|cards)/i.test(trimmed);
  const quizKeyword = /(quiz|quizzes|quizes|mcq|multiple choice)/i.test(trimmed);
  const notesKeyword = /(notes?|note|outline|summary)/i.test(trimmed);

  const flashcardCount = extractRequestedCount(trimmed, '(flashcards?|cards)');
  const quizCount = extractRequestedCount(
    trimmed,
    '(quiz|quizzes|quizes|questions|mcq)',
  );

  if (flashcardCount) counts.flashcards = flashcardCount;
  if (quizCount) counts.quizzes = quizCount;

  const strongIntent = hasStrongActionVerb(trimmed);
  const softIntent = hasSoftRequest(trimmed) && !looksLikeKnowledgeQuery(trimmed);
  const countIntent = hasExplicitCount(trimmed);

  if ((strongIntent || softIntent || countIntent) && flashcardMatch) {
    tokens.add('@Flashcards');
  }
  if ((strongIntent || softIntent || quizCount) && (quizKeyword || quizCount)) {
    tokens.add('@Quiz');
  }
  if ((strongIntent || softIntent) && notesKeyword) {
    tokens.add('@Notes');
  }

  return { tokens: Array.from(tokens), counts, isIntent: tokens.size > 0 };
};
