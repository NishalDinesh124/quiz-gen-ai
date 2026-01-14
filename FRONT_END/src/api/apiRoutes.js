import { API_HOST } from './config';

const API_ROUTES = {
  FLASHCARDS: {
    CREATE_FLASHCARDS: `${API_HOST}/api/flashcards/generate`,
    GET_FLASHCARDS: `${API_HOST}/api/flashcards`,
    UPDATE_FLASHCARD: (id) => `${API_HOST}/api/flashcards/${id}`,
    DELETE_FLASHCARD: (id) => `${API_HOST}/api/flashcards/${id}`,
  },
  FLASHCARD_SETS: {
    LIST: `${API_HOST}/api/flashcard-sets`,
    CREATE: `${API_HOST}/api/flashcard-sets`,
    ADD_FLASHCARD: (id) => `${API_HOST}/api/flashcard-sets/${id}/flashcards`,
    GET: (id) => `${API_HOST}/api/flashcard-sets/${id}`,
    UPDATE: (id) => `${API_HOST}/api/flashcard-sets/${id}`,
    DELETE: (id) => `${API_HOST}/api/flashcard-sets/${id}`,
    START_ATTEMPT: (id) => `${API_HOST}/api/flashcard-sets/${id}/attempts/start`,
    UPDATE_ATTEMPT: (id) => `${API_HOST}/api/flashcard-sets/attempts/${id}`,
    COMPLETE_ATTEMPT: (id) =>
      `${API_HOST}/api/flashcard-sets/attempts/${id}/complete`,
  },
  QUIZZES: {
    CREATE_QUIZ: `${API_HOST}/api/quizzes/generate`,
    GET_QUIZZES: `${API_HOST}/api/quizzes`,
    UPDATE_STATUS: (id) => `${API_HOST}/api/quizzes/${id}/status`,
    GET_QUIZ: (id) => `${API_HOST}/api/quizzes/${id}`,
    UPDATE_QUIZ: (id) => `${API_HOST}/api/quizzes/${id}`,
    REGENERATE_QUIZ: (id) => `${API_HOST}/api/quizzes/${id}/regenerate`,
    SUBMIT_ATTEMPT: (id) => `${API_HOST}/api/quizzes/${id}/attempt`,
    DELETE_QUIZ: (id) => `${API_HOST}/api/quizzes/${id}`,
  },
  QUIZ_SETS: {
    LIST: `${API_HOST}/api/quiz-sets`,
    CREATE: `${API_HOST}/api/quiz-sets`,
    ADD_QUIZ: (id) => `${API_HOST}/api/quiz-sets/${id}/quizzes`,
    GET: (id) => `${API_HOST}/api/quiz-sets/${id}`,
    UPDATE: (id) => `${API_HOST}/api/quiz-sets/${id}`,
    DELETE: (id) => `${API_HOST}/api/quiz-sets/${id}`,
    START_ATTEMPT: (id) => `${API_HOST}/api/quiz-sets/${id}/attempts/start`,
    UPDATE_ATTEMPT: (id) => `${API_HOST}/api/quiz-sets/attempts/${id}`,
    COMPLETE_ATTEMPT: (id) => `${API_HOST}/api/quiz-sets/attempts/${id}/complete`,
  },
  NOTES: {
    CREATE_NOTE: `${API_HOST}/api/notes/generate`,
    GET_NOTES: `${API_HOST}/api/notes`,
    GET_NOTE: (id) => `${API_HOST}/api/notes/${id}`,
  },
  VIDEOS: {
    CREATE_YOUTUBE: `${API_HOST}/api/videos/youtube`,
    GET_BY_SESSION: (id) => `${API_HOST}/api/videos/${id}`,
  },
  USER_ACTIVITY: {
    GET_DASHBOARD: `${API_HOST}/api/user-activity`,
    GET_SUMMARY: `${API_HOST}/api/user-activity/summary`,
  },
  ATTEMPTS: {
    GET_ATTEMPTS: `${API_HOST}/api/attempts`,
    GET_SUMMARY: `${API_HOST}/api/attempts/summary`,
    GET_ATTEMPT: (id) => `${API_HOST}/api/attempts/${id}`,
  },
  FLASHCARD_ATTEMPTS: {
    GET_ATTEMPTS: `${API_HOST}/api/flashcard-attempts`,
    GET_SUMMARY: `${API_HOST}/api/flashcard-attempts/summary`,
  },
  SESSIONS: {
    CREATE: `${API_HOST}/api/sessions`,
    LIST: `${API_HOST}/api/sessions`,
    GET_SESSION: (id) => `${API_HOST}/api/sessions/${id}`,
    UPDATE: (id) => `${API_HOST}/api/sessions/${id}`,
    DELETE: (id) => `${API_HOST}/api/sessions/${id}`,
    SEND_MESSAGE: (id) => `${API_HOST}/api/sessions/${id}/messages`,
    ADD_CONTEXT: (id) => `${API_HOST}/api/sessions/${id}/context`,
  },
};

export { API_ROUTES };
