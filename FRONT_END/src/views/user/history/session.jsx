import ReactMarkdown from 'react-markdown';
import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  SkeletonText,
  Stack,
  Text,
  useBreakpointValue,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { keyframes } from '@emotion/react';
import {
  FiClipboard,
  FiFileText,
  FiMessageCircle,
  FiSearch,
} from 'react-icons/fi';
import {
  MdArrowBack,
  MdArrowForward,
  MdDownload,
  MdArrowUpward as MdScrollUp,
  MdAdd,
  MdBookmarkBorder,
  MdCheck,
  MdCheckCircle,
  MdEdit,
} from 'react-icons/md';
import { useLocation, useParams } from 'react-router-dom';
import { API_ROUTES } from 'api/apiRoutes';
import { fetchWithAuth } from 'api/fetchWithAuth';
import { useAuth } from 'auth/AuthContext';
import TabsPill from './components/TabsPill';
import VideoPanel from './components/VideoPanel';
import FlashcardsTab from './components/FlashcardsTab';
import QuizzesTab from './components/QuizzesTab';
import NotesTab from './components/NotesTab';
import ChatTab from './components/ChatTab';
import { getExceededLimitMessage, parseGenerationIntent } from 'utils/commandRouting';

const TAB_OPTIONS = [
  { id: 'chat', label: 'Chat', icon: FiMessageCircle },
  { id: 'flashcards', label: 'Flashcards', icon: FiClipboard },
  { id: 'quizzes', label: 'Quizzes', icon: FiFileText },
  { id: 'notes', label: 'Notes', icon: FiFileText },
];

const DEFAULT_CATEGORY = 'Education';
const DEFAULT_DIFFICULTY = 'Basic';
const DEFAULT_LANGUAGE = 'English';
const DEFAULT_COUNT = 10;
const COMMAND_MAP = {
  '@flashcards': '@Flashcards',
  '@quiz': '@Quiz',
  '@notes': '@Notes',
};
const COMMAND_SUGGESTIONS = ['@Flashcards', '@Quiz', '@Notes'];
const QUIZ_TYPES = ['Multiple Choice', 'Single Choice', 'True/False'];
const DIFFICULTY_OPTIONS = ['Basic', 'Intermediate', 'Advanced'];


export default function HistorySession() {
  const { sessionId } = useParams();
  const location = useLocation();
  const { currentUser } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('chat');
  const [session, setSession] = useState(null);
  const [hasSessionContext, setHasSessionContext] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [notes, setNotes] = useState([]);
  const [videoContext, setVideoContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingTypeOverrides, setPendingTypeOverrides] = useState([]);
  const [commandText, setCommandText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quizType, setQuizType] = useState('Multiple Choice');
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [flashcardIndexByAsset, setFlashcardIndexByAsset] = useState({});
  const [flashcardFlipByAsset, setFlashcardFlipByAsset] = useState({});
  const [flashcardExplanationByAsset, setFlashcardExplanationByAsset] =
    useState({});
  const [quizIndexByAsset, setQuizIndexByAsset] = useState({});
  const [quizAnswerByAsset, setQuizAnswerByAsset] = useState({});
  const [activeNote, setActiveNote] = useState(null);
  const [isMobileVideoOpen, setIsMobileVideoOpen] = useState(true);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [isSetsLoading, setIsSetsLoading] = useState(true);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [activeFlashcardId, setActiveFlashcardId] = useState('');
  const [isSavingSet, setIsSavingSet] = useState(false);
  const [editFlashcardSetId, setEditFlashcardSetId] = useState('');
  const [editFlashcardSetTitle, setEditFlashcardSetTitle] = useState('');
  const [deleteFlashcardSetId, setDeleteFlashcardSetId] = useState('');
  const [setSearch, setSetSearch] = useState('');
  const [activeSetView, setActiveSetView] = useState(null);
  const [isSetViewLoading, setIsSetViewLoading] = useState(false);
  const [isEditingSet, setIsEditingSet] = useState(false);
  const [editedCards, setEditedCards] = useState([]);
  const [flashcardStudyMode, setFlashcardStudyMode] = useState('fast');
  const [flashcardStudyActive, setFlashcardStudyActive] = useState(false);
  const [flashcardAttemptMeta, setFlashcardAttemptMeta] = useState(null);
  const [quizSets, setQuizSets] = useState([]);
  const [isQuizSetsLoading, setIsQuizSetsLoading] = useState(true);
  const [activeQuizPopoverId, setActiveQuizPopoverId] = useState('');
  const [selectedQuizSetId, setSelectedQuizSetId] = useState('');
  const [isSavingQuizSet, setIsSavingQuizSet] = useState(false);
  const [editQuizSetId, setEditQuizSetId] = useState('');
  const [editQuizSetTitle, setEditQuizSetTitle] = useState('');
  const [deleteQuizSetId, setDeleteQuizSetId] = useState('');
  const [quizSetSearch, setQuizSetSearch] = useState('');
  const [activeQuizSetView, setActiveQuizSetView] = useState(null);
  const [isQuizSetViewLoading, setIsQuizSetViewLoading] = useState(false);
  const [activeQuizAttemptId, setActiveQuizAttemptId] = useState('');
  const [isQuizAttemptLocked, setIsQuizAttemptLocked] = useState(false);
  const [quizCompletionByAsset, setQuizCompletionByAsset] = useState({});
  const [activeFlashcardAttemptId, setActiveFlashcardAttemptId] = useState('');
  const quizTypeRef = useRef(null);
  const difficultyRef = useRef(null);
  const [isQuizTypeOpen, setIsQuizTypeOpen] = useState(false);
  const [isDifficultyOpen, setIsDifficultyOpen] = useState(false);
  const hasLoadedRef = useRef(false);
  const chatScrollRef = useRef(null);
  const autoScrollRef = useRef(true);
  const attemptSyncTimeoutRef = useRef(null);
  const attemptCompletedRef = useRef(new Set());
  const flashcardAttemptSyncTimeoutRef = useRef(null);
  const flashcardAttemptCompletedRef = useRef(new Set());
  const lastFlashcardAttemptPayloadRef = useRef('');
  const lastAttemptPayloadRef = useRef('');
  const lastQuizSetIdRef = useRef('');
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isVideoExpanded = !isMobile || isMobileVideoOpen;

  const formatCountdown = useCallback((ms) => {
    if (!Number.isFinite(ms) || ms <= 0) return 'Ready';
    const totalMinutes = Math.ceil(ms / (60 * 1000));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, []);

  const getFlashcardReviewBadge = useCallback(
    (nextReviewAt) => {
      if (!nextReviewAt) {
        return { label: 'Due Now', isDue: true };
      }
      const next = new Date(nextReviewAt);
      const delta = next.getTime() - Date.now();
      if (!Number.isFinite(delta) || delta <= 0) {
        return { label: 'Due Now', isDue: true };
      }
      return {
        label: `Next review in: ${formatCountdown(delta)}`,
        isDue: false,
      };
    },
    [formatCountdown],
  );

  const headingColor = useColorModeValue('navy.700', 'white');
  const tabsBg = useColorModeValue('gray.100', 'whiteAlpha.100');
  const tabsBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
  const tabsActiveBg = useColorModeValue('white', 'whiteAlpha.200');
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.300');
  const cardsBg = useColorModeValue('white', 'black');
  const btnBg = useColorModeValue('black', 'white');
  const btnHover = useColorModeValue('whiteAlpha.200', 'whiteAlpha.200');
  const mutedText = useColorModeValue('gray.600', 'gray.300');
  const inputBg = useColorModeValue('white', 'whiteAlpha.100');
  const inputBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
  const dropdownBg = useColorModeValue('white', 'black');
  const dropdownBorder = inputBorder;
  const dropdownHover = useColorModeValue('gray.100', 'purple.900');
  const dropdownText = useColorModeValue('gray.700', 'white');
  const commandBadgeBg = useColorModeValue('purple.50', 'purple.900');
  const commandBadgeText = useColorModeValue('purple.600', 'purple.200');
  const flashcardFaceBg = useColorModeValue('white', 'black');
  const setRowBg = useColorModeValue('transparent', 'whiteAlpha.50');
  const setRowActiveBg = useColorModeValue('gray.100', 'whiteAlpha.100');
  const setCheckboxBorder = useColorModeValue('gray.400', 'whiteAlpha.400');
  const setCheckboxBg = useColorModeValue('white', 'navy.700');
  const setCheckboxActiveBg = useColorModeValue('gray.700', 'purple.400');
  const correctBg = useColorModeValue('green.50', 'green.900');
  const correctBorder = useColorModeValue('green.400', 'green.300');
  const wrongBg = useColorModeValue('red.50', 'red.900');
  const wrongBorder = useColorModeValue('red.400', 'red.300');
  const selectedBg = useColorModeValue('purple.50', 'purple.900');
  const selectedBorder = useColorModeValue('purple.300', 'purple.400');
  const partialBg = useColorModeValue('yellow.50', 'yellow.900');
  const partialBorder = useColorModeValue('yellow.400', 'yellow.300');
  const neutralBg = useColorModeValue('white', 'transparent');
  const commandBubbleBg = useColorModeValue('gray.100', 'whiteAlpha.200');
  const commandTextColor = useColorModeValue('gray.700', 'white');

  const commandTokens = useMemo(() => {
    const matches = commandText.match(/@flashcards|@quiz|@notes/gi) || [];
    const normalized = matches.map(
      (token) => COMMAND_MAP[token.toLowerCase()] || token,
    );
    return Array.from(new Set(normalized));
  }, [commandText]);
  const commandRemainder = useMemo(() => {
    if (commandTokens.length === 0) return commandText;
    return commandText.replace(/@flashcards|@quiz|@notes/gi, '').trimStart();
  }, [commandText, commandTokens]);
  const isQuiz = commandTokens.includes('@Quiz');
  const isFlashcards = commandTokens.includes('@Flashcards');
  const isInputEmpty = commandText.trim().length === 0;

  const flashcardMap = useMemo(
    () => new Map(flashcards.map((item) => [String(item._id), item])),
    [flashcards],
  );
  const quizMap = useMemo(
    () => new Map(quizzes.map((item) => [String(item._id), item])),
    [quizzes],
  );
  const noteMap = useMemo(
    () => new Map(notes.map((item) => [String(item._id), item])),
    [notes],
  );
  const orderedMessages = useMemo(() => {
    return messages
      .map((message, index) => ({
        message,
        index,
        time: message.createdAt
          ? new Date(message.createdAt).getTime()
          : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => {
        if (a.time !== b.time) {
          return a.time - b.time;
        }
        if (a.message.type !== b.message.type) {
          if (a.message.type === 'command') return -1;
          if (b.message.type === 'command') return 1;
        }
        return a.index - b.index;
      })
      .map(({ message }) => message);
  }, [messages]);

  const normalizeValue = useCallback(
    (value) =>
      String(value || '')
        .trim()
        .toLowerCase(),
    [],
  );
  const splitAnswerText = useCallback((value) => {
    if (Array.isArray(value))
      return value.map((item) => String(item || '').trim()).filter(Boolean);
    const text = String(value || '').trim();
    if (!text) return [];
    if (text.includes(',')) {
      return text
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [text];
  }, []);
  const toNormalizedArray = useCallback(
    (value) => splitAnswerText(value).map(normalizeValue).filter(Boolean),
    [splitAnswerText, normalizeValue],
  );
  const isAnswerOptionCorrect = (option, correctAnswer) => {
    const correctItems = toNormalizedArray(correctAnswer);
    return correctItems.includes(normalizeValue(option));
  };
  const isCorrectAnswer = useCallback(
    (selected, correctAnswer) => {
      const selectedItems = toNormalizedArray(selected);
      const correctItems = toNormalizedArray(correctAnswer);
      if (selectedItems.length === 0 || correctItems.length === 0) return false;
      if (selectedItems.length !== correctItems.length) return false;
      const correctSet = new Set(correctItems);
      return selectedItems.every((item) => correctSet.has(item));
    },
    [toNormalizedArray],
  );
  const getMultipleChoiceStatus = useCallback(
    (selected, correctAnswer) => {
      const selectedItems = toNormalizedArray(selected);
      const correctItems = toNormalizedArray(correctAnswer);
      if (selectedItems.length === 0 || correctItems.length === 0) {
        return 'incorrect';
      }
      const correctSet = new Set(correctItems);
      const selectedSet = new Set(selectedItems);
      const hasAnyCorrect = selectedItems.some((item) => correctSet.has(item));
      const hasWrong = selectedItems.some((item) => !correctSet.has(item));
      const allCorrect =
        selectedItems.length === correctItems.length &&
        correctItems.every((item) => selectedSet.has(item));
      if (allCorrect && !hasWrong) return 'correct';
      if (hasAnyCorrect) return 'partial';
      return 'incorrect';
    },
    [toNormalizedArray],
  );
  const normalizeCorrectAnswer = (options, correctAnswer) => {
    if (!options || options.length === 0) return correctAnswer;
    const mapLetter = (value) => {
      const normalized = String(value || '')
        .trim()
        .toLowerCase();
      const letterIndexMap = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5 };
      if (Object.prototype.hasOwnProperty.call(letterIndexMap, normalized)) {
        const idx = letterIndexMap[normalized];
        return options[idx] ?? value;
      }
      return value;
    };
    if (Array.isArray(correctAnswer)) {
      return correctAnswer.map(mapLetter);
    }
    return mapLetter(correctAnswer);
  };
  const normalizeQuestionType = (value) => {
    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('true')) return 'true_false';
    if (normalized.includes('multiple')) return 'multiple_choice';
    if (normalized.includes('single')) return 'single_choice';
    return 'single_choice';
  };
  const buildAttemptAnswers = useCallback(
    (questions, answersByIndex) => {
      if (!Array.isArray(questions)) return [];
      const result = [];
      questions.forEach((question, index) => {
        const state = answersByIndex?.[index];
        if (!state) return;
        const selected = state.selected;
        if (
          selected === null ||
          selected === undefined ||
          (Array.isArray(selected) && selected.length === 0)
        ) {
          return;
        }
        const questionType = normalizeQuestionType(question?.type);
        const resolvedCorrectAnswer = normalizeCorrectAnswer(
          question?.options,
          question?.correctAnswer,
        );
        let isCorrect = false;
        if (questionType === 'multiple_choice') {
          const status = getMultipleChoiceStatus(
            selected,
            resolvedCorrectAnswer,
          );
          isCorrect = status === 'correct';
        } else {
          isCorrect = isCorrectAnswer(selected, resolvedCorrectAnswer);
        }
        result.push({
          questionIndex: index,
          selected,
          correct: resolvedCorrectAnswer,
          isCorrect,
        });
      });
      return result;
    },
    [getMultipleChoiceStatus, isCorrectAnswer],
  );
  const mapAttemptAnswersToState = useCallback((answers) => {
    const next = {};
    if (!Array.isArray(answers)) return next;
    answers.forEach((answer) => {
      if (answer?.questionIndex === undefined) return;
      next[answer.questionIndex] = {
        selected: answer.selected,
        status: answer.isCorrect ? 'correct' : 'incorrect',
        submitted: answer.selected !== null && answer.selected !== undefined,
      };
    });
    return next;
  }, []);
  const formatQuestionType = (value) => {
    if (value === 'multiple_choice') return 'Multiple choice';
    if (value === 'true_false') return 'True / False';
    return 'Single choice';
  };

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    try {
      const response = await fetchWithAuth(
        API_ROUTES.SESSIONS.GET_SESSION(sessionId),
      );
      if (!response.ok) {
        throw new Error('Failed to load session.');
      }
      const payload = await response.json();
      setSession(payload.session || null);
      setHasSessionContext(Boolean(payload?.context?.hasContext));
      setFlashcards(
        Array.isArray(payload.flashcards) ? payload.flashcards : [],
      );
      setQuizzes(Array.isArray(payload.quizzes) ? payload.quizzes : []);
      setNotes(Array.isArray(payload.notes) ? payload.notes : []);
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
      setVideoContext(payload.video || null);
    } catch (error) {
      toast({
        title: 'Unable to load session.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    } finally {
      if (!hasLoadedRef.current) {
        setIsLoading(false);
        hasLoadedRef.current = true;
      }
    }
  }, [sessionId, toast]);

  const loadFlashcardSets = useCallback(async () => {
    try {
      const response = await fetchWithAuth(API_ROUTES.FLASHCARD_SETS.LIST);
      if (!response.ok) return;
      const payload = await response.json();
      const sets = Array.isArray(payload.sets) ? payload.sets : [];
      setFlashcardSets(sets);
    } catch (error) {
      // Ignore set load failures to keep the page usable.
    } finally {
      setIsSetsLoading(false);
    }
  }, []);

  const loadLatestFlashcardAttempt = useCallback(async (setId) => {
    if (!setId) return null;
    try {
      const response = await fetchWithAuth(
        `${API_ROUTES.FLASHCARD_ATTEMPTS.GET_ATTEMPTS}?flashcardSetId=${setId}&limit=1`,
      );
      if (!response.ok) return null;
      const payload = await response.json();
      const attempt = Array.isArray(payload?.attempts)
        ? payload.attempts[0]
        : null;
      setFlashcardAttemptMeta(attempt || null);
      return attempt || null;
    } catch (error) {
      return null;
    }
  }, []);

  const loadQuizSets = useCallback(async () => {
    try {
      const response = await fetchWithAuth(API_ROUTES.QUIZ_SETS.LIST);
      if (!response.ok) return;
      const payload = await response.json();
      const sets = Array.isArray(payload.sets) ? payload.sets : [];
      setQuizSets(sets);
    } catch (error) {
      // Ignore set load failures.
    } finally {
      setIsQuizSetsLoading(false);
    }
  }, []);

  const pendingTypes = useMemo(() => {
    const types = Array.isArray(location.state?.pendingTypes)
      ? location.state.pendingTypes
      : [];
    const combined = new Set(types);
    pendingTypeOverrides.forEach((type) => combined.add(type));
    return combined;
  }, [location.state, pendingTypeOverrides]);
  const pendingSeed = useMemo(
    () => ({
      flashcards: pendingTypes.has('@Flashcards'),
      quizzes: pendingTypes.has('@Quiz'),
      notes: pendingTypes.has('@Notes'),
    }),
    [pendingTypes],
  );
  const pendingAssets = useMemo(
    () => ({
      flashcards: pendingSeed.flashcards && flashcards.length === 0,
      quizzes: pendingSeed.quizzes && quizzes.length === 0,
      notes: pendingSeed.notes && notes.length === 0,
    }),
    [flashcards.length, notes.length, pendingSeed, quizzes.length],
  );
  const hasPending =
    pendingAssets.flashcards || pendingAssets.quizzes || pendingAssets.notes;

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    loadFlashcardSets();
  }, [loadFlashcardSets]);

  useEffect(() => {
    loadQuizSets();
  }, [loadQuizSets]);

  const chaptersStatus = videoContext?.chaptersStatus;

  useEffect(() => {
    if (!sessionId || chaptersStatus !== 'pending') {
      return undefined;
    }

    const poll = async () => {
      try {
        const response = await fetchWithAuth(
          API_ROUTES.VIDEOS.GET_BY_SESSION(sessionId),
        );
        if (!response.ok) return;
        const payload = await response.json();
        if (payload?.video) {
          setVideoContext(payload.video);
        }
      } catch (error) {
        // Ignore polling errors to keep the UI responsive.
      }
    };

    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [sessionId, chaptersStatus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (quizTypeRef.current && !quizTypeRef.current.contains(event.target)) {
        setIsQuizTypeOpen(false);
      }
      if (
        difficultyRef.current &&
        !difficultyRef.current.contains(event.target)
      ) {
        setIsDifficultyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab !== 'chat') return;
    const node = chatScrollRef.current;
    if (!node) return;
    if (autoScrollRef.current) {
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
    }
  }, [activeTab, orderedMessages.length]);

  const handleChatScroll = (event) => {
    const node = event.currentTarget;
    const distanceFromBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight;
    autoScrollRef.current = distanceFromBottom < 40;
  };

  useEffect(() => {
    if (messages.length === 0) return;
    setFlashcardIndexByAsset((prev) => {
      const next = { ...prev };
      messages.forEach((message) => {
        if (message.type === 'asset' && message.assetType === 'flashcards') {
          const key = String(message.assetId || message._id);
          if (next[key] === undefined) {
            next[key] = 0;
          }
        }
      });
      return next;
    });
    setFlashcardFlipByAsset((prev) => {
      const next = { ...prev };
      messages.forEach((message) => {
        if (message.type === 'asset' && message.assetType === 'flashcards') {
          const key = String(message.assetId || message._id);
          if (next[key] === undefined) {
            next[key] = false;
          }
        }
      });
      return next;
    });
    setQuizIndexByAsset((prev) => {
      const next = { ...prev };
      messages.forEach((message) => {
        if (message.type === 'asset' && message.assetType === 'quiz') {
          const key = String(message.assetId || message._id);
          if (next[key] === undefined) {
            next[key] = 0;
          }
        }
      });
      return next;
    });
    setQuizAnswerByAsset((prev) => {
      const next = { ...prev };
      messages.forEach((message) => {
        if (message.type === 'asset' && message.assetType === 'quiz') {
          const key = String(message.assetId || message._id);
          if (!next[key]) {
            next[key] = {};
          }
        }
      });
      return next;
    });
  }, [messages]);

  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(() => {
      loadSession();
    }, 4000);
    return () => clearInterval(interval);
  }, [hasPending, loadSession]);

  const handleGenerate = async () => {
    const rawPrompt = commandRemainder.trim() || commandText.trim();
    if (!hasSessionContext) {
      toast({
        title: 'Add content to continue.',
        description: 'Create a new session in Studio with content.',
        status: 'warning',
        position: 'top-right',
        isClosable: true,
      });
      return;
    }
    const inferred = parseGenerationIntent(commandText.trim());
    const effectiveTokens =
      commandTokens.length > 0
        ? commandTokens
        : inferred.isIntent
        ? inferred.tokens
        : [];
    const maxAllowed = 20;
    if (
      (inferred.counts.flashcards &&
        inferred.counts.flashcards > maxAllowed) ||
      (inferred.counts.quizzes && inferred.counts.quizzes > maxAllowed)
    ) {
      const tooManyFlashcards =
        inferred.counts.flashcards && inferred.counts.flashcards > maxAllowed;

      const firstType = tooManyFlashcards ? 'flashcards' : 'quizzes';
      const firstCount = tooManyFlashcards
        ? inferred.counts.flashcards
        : inferred.counts.quizzes;
      const friendlyMessage = getExceededLimitMessage(firstCount, firstType);
      if (friendlyMessage) {
        setCommandText('');
        setIsGenerating(true);
        try {
          const response = await fetchWithAuth(
            API_ROUTES.SESSIONS.SEND_MESSAGE(sessionId),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: rawPrompt,
                reply: friendlyMessage,
                mode: 'chat',
              }),
            },
          );
          if (!response.ok) {
            throw new Error('Failed to send message.');
          }
          await loadSession();
        } catch (error) {
          toast({
            title: 'Message failed.',
            description: 'Please try again in a moment.',
            status: 'error',
            position: 'top-right',
            isClosable: true,
          });
        } finally {
          setIsGenerating(false);
        }
      }
      return;
    }
    if (effectiveTokens.length === 0) {
      if (!rawPrompt) return;
      setCommandText('');
      setIsGenerating(true);
      try {
        const response = await fetchWithAuth(
          API_ROUTES.SESSIONS.SEND_MESSAGE(sessionId),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: rawPrompt, mode: 'chat' }),
          },
        );
        if (!response.ok) {
          throw new Error('Failed to send message.');
        }
        await loadSession();
      } catch (error) {
        toast({
          title: 'Message failed.',
          description: 'Please try again in a moment.',
          status: 'error',
          position: 'top-right',
          isClosable: true,
        });
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    const chunks = [];

    setIsGenerating(true);
    try {
      if (effectiveTokens.length > 0) {
        setPendingTypeOverrides(effectiveTokens);
      }
      setCommandText('');
      const wrapRequest = (label, request) =>
        request
          .then((response) => ({ label, response }))
          .catch((error) => ({ label, error }));
      const requestTasks = [];
      if (rawPrompt) {
        const formatTokens = (tokens) => {
          const labels = tokens.map((token) => {
            if (token === '@Flashcards') return 'flashcards';
            if (token === '@Quiz') return 'quiz';
            if (token === '@Notes') return 'notes';
            return token.replace('@', '').toLowerCase();
          });
          if (labels.length === 1) return labels[0];
          if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
          return `${labels.slice(0, -1).join(', ')} and ${labels.slice(-1)}`;
        };
        const replyOverride = `Got it — generating ${formatTokens(
          effectiveTokens,
        )} from your content.`;
        requestTasks.push(
          wrapRequest(
            'chat',
            fetchWithAuth(API_ROUTES.SESSIONS.SEND_MESSAGE(sessionId), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: rawPrompt,
                reply: replyOverride,
                mode: 'generator',
              }),
            }),
          ),
        );
      }
      if (effectiveTokens.includes('@Flashcards')) {
        const flashcardCount = inferred.counts.flashcards || DEFAULT_COUNT;
        const payload = {
          title: 'Flashcards Set',
          count: flashcardCount,
          category: DEFAULT_CATEGORY,
          difficulty,
          language: DEFAULT_LANGUAGE,
          chunks,
          sessionId,
        };
        requestTasks.push(
          wrapRequest(
            'flashcards',
            fetchWithAuth(API_ROUTES.FLASHCARDS.CREATE_FLASHCARDS, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }),
          ),
        );
      }
      if (effectiveTokens.includes('@Quiz')) {
        const quizCount = inferred.counts.quizzes || DEFAULT_COUNT;
        const payload = {
          title: 'Quiz Set',
          category: DEFAULT_CATEGORY,
          questionType: quizType,
          difficulty,
          totalQuestions: quizCount,
          language: DEFAULT_LANGUAGE,
          mode: 'exam',
          chunks,
          sessionId,
        };
        requestTasks.push(
          wrapRequest(
            'quizzes',
            fetchWithAuth(API_ROUTES.QUIZZES.CREATE_QUIZ, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }),
          ),
        );
      }
      if (effectiveTokens.includes('@Notes')) {
        const payload = {
          title: session?.title || 'Study Notes',
          language: DEFAULT_LANGUAGE,
          chunks,
          sessionId,
        };
        requestTasks.push(
          wrapRequest(
            'notes',
            fetchWithAuth(API_ROUTES.NOTES.CREATE_NOTE, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }),
          ),
        );
      }
      const waitForFirstSuccess = (tasks) =>
        new Promise((resolve, reject) => {
          let pending = tasks.length;
          let resolved = false;
          if (pending === 0) {
            reject(new Error('No generation requests were started.'));
            return;
          }
          tasks.forEach((task) => {
            task.then((result) => {
              pending -= 1;
              if (!resolved && result.response?.ok) {
                resolved = true;
                resolve(result);
                return;
              }
              if (pending === 0 && !resolved) {
                reject(new Error('Failed to generate content.'));
              }
            });
          });
        });

      requestTasks.forEach((task) => {
        task.then((result) => {
          if (result.response?.ok && result.label && result.label !== 'chat') {
            loadSession();
          }
        });
      });

      const settlePromise = Promise.all(requestTasks);
      settlePromise
        .then((results) => {
          const failures = results.filter((result) => !result.response?.ok);
          if (failures.length > 0) {
            toast({
              title: 'Some content failed to generate.',
              description: 'You can retry the failed items from the session.',
              status: 'warning',
              position: 'top-right',
              isClosable: true,
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          setPendingTypeOverrides([]);
          setIsGenerating(false);
        });

      await waitForFirstSuccess(requestTasks);
      await loadSession();
    } catch (error) {
      toast({
        title: 'Generation failed.',
        description: 'Please try again in a moment.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    } finally {
      // handled in settlePromise
    }
  };


  const openSaveSetPopover = (flashcardId) => {
    setActiveFlashcardId(String(flashcardId || ''));
    setSelectedSetId('');
    setSetSearch('');
  };

  const handleAddToSet = async () => {
    if (!activeFlashcardId || !selectedSetId) return;
    setIsSavingSet(true);
    try {
      const response = await fetchWithAuth(
        API_ROUTES.FLASHCARD_SETS.ADD_FLASHCARD(selectedSetId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flashcardId: activeFlashcardId }),
        },
      );
      if (!response.ok) {
        throw new Error('Failed to update set.');
      }
      await loadFlashcardSets();
      setActiveFlashcardId('');
    } catch (error) {
      toast({
        title: 'Unable to save set.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    } finally {
      setIsSavingSet(false);
    }
  };

  const handleCreateSetFromSession = async () => {
    if (!activeFlashcardId) return;
    const title = session?.title || 'Untitled Set';
    setIsSavingSet(true);
    try {
      const response = await fetchWithAuth(API_ROUTES.FLASHCARD_SETS.CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          flashcardId: activeFlashcardId,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create set.');
      }
      await loadFlashcardSets();
      setActiveFlashcardId('');
    } catch (error) {
      toast({
        title: 'Unable to save set.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    } finally {
      setIsSavingSet(false);
    }
  };

  const handleOpenSet = async (setId) => {
    if (!setId) return;
    setIsSetViewLoading(true);
    try {
      const response = await fetchWithAuth(
        API_ROUTES.FLASHCARD_SETS.GET(setId),
      );
      if (!response.ok) {
        throw new Error('Failed to load set.');
      }
      const payload = await response.json();
      const set = payload?.set;
      const combinedCards = Array.isArray(set?.cards) ? set.cards : [];
      if (combinedCards.length === 0) {
        toast({
          title: 'No cards in this set.',
          status: 'info',
          position: 'top-right',
          isClosable: true,
        });
        return;
      }
      setActiveSetView({
        _id: set?._id || setId,
        title: set?.title || 'Flashcard Set',
        cards: combinedCards,
        count: combinedCards.length,
      });
      setEditedCards(combinedCards.map((card) => ({ ...card })));
      setFlashcardStudyMode('fast');
      setFlashcardStudyActive(false);
      setActiveFlashcardAttemptId('');
      flashcardAttemptCompletedRef.current = new Set();
      await loadLatestFlashcardAttempt(setId);
    } catch (error) {
      toast({
        title: 'Unable to load set.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    } finally {
      setIsSetViewLoading(false);
    }
  };

  const openSaveQuizSetPopover = (quizId) => {
    setActiveQuizPopoverId(String(quizId || ''));
    setSelectedQuizSetId('');
    setQuizSetSearch('');
  };

  const handleCreateQuizSetFromSession = async (quizId) => {
    if (!quizId) return;
    setIsSavingQuizSet(true);
    try {
      const response = await fetchWithAuth(API_ROUTES.QUIZ_SETS.CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: session?.title || 'Quiz Set',
          quizId,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create set.');
      }
      await loadQuizSets();
      setActiveQuizPopoverId('');
      setSelectedQuizSetId('');
    } catch (error) {
      toast({
        title: 'Unable to save set.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    } finally {
      setIsSavingQuizSet(false);
    }
  };

  const handleAddQuizToExistingSet = async (quizId, setId) => {
    if (!quizId || !setId) return;
    setIsSavingQuizSet(true);
    try {
      const response = await fetchWithAuth(
        API_ROUTES.QUIZ_SETS.ADD_QUIZ(setId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId }),
        },
      );
      if (!response.ok) {
        throw new Error('Failed to update set.');
      }
      await loadQuizSets();
      setActiveQuizPopoverId('');
      setSelectedQuizSetId('');
    } catch (error) {
      toast({
        title: 'Unable to save set.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    } finally {
      setIsSavingQuizSet(false);
    }
  };

  const filteredQuizSets = useMemo(() => {
    const query = quizSetSearch.trim().toLowerCase();
    if (!query) return quizSets;
    return quizSets.filter((set) =>
      String(set.title || '')
        .toLowerCase()
        .includes(query),
    );
  }, [quizSetSearch, quizSets]);

  const renderQuizSetPopover = (quizId) => (
    <Popover
      isOpen={activeQuizPopoverId === String(quizId)}
      onClose={() => {
        setActiveQuizPopoverId('');
        setSelectedQuizSetId('');
      }}
      placement="top-end"
      closeOnBlur
    >
      <PopoverTrigger>
        <Button
          size="sm"
          variant="outline"
          borderRadius="12px"
          onClick={(event) => {
            event.stopPropagation();
            openSaveQuizSetPopover(quizId);
          }}
        >
          Save Set
        </Button>
      </PopoverTrigger>
      <PopoverContent
        w="300px"
        p="12px"
        borderRadius="16px"
        borderColor={inputBorder}
        bg={cardsBg}
        boxShadow="0px 1px 40px rgb(189 189 189 / 15%)"
      >
        <PopoverBody p="0">
          <Flex align="center" gap="8px" px="10px" py="6px" mb="8px">
            <Icon as={FiSearch} color={mutedText} />
            <Input
              placeholder="Select quiz set"
              value={quizSetSearch}
              onChange={(event) => setQuizSetSearch(event.target.value)}
              variant="unstyled"
              fontSize="sm"
            />
          </Flex>
          <Box borderBottom="1px solid" borderColor={inputBorder} mb="8px" />
          <Stack spacing="8px" maxH="180px" overflowY="auto" mb="12px">
            {filteredQuizSets.length === 0 ? (
              <Text fontSize="sm" color={mutedText} px="6px">
                No sets found.
              </Text>
            ) : (
              filteredQuizSets.map((set) => (
                <Flex
                  key={set._id}
                  align="center"
                  justify="space-between"
                  borderRadius="12px"
                  px="10px"
                  py="8px"
                  cursor="pointer"
                  bg={selectedQuizSetId === set._id ? setRowActiveBg : setRowBg}
                  onClick={() => setSelectedQuizSetId(set._id)}
                >
                  <Flex align="center" gap="8px">
                    <Box
                      w="16px"
                      h="16px"
                      borderRadius="4px"
                      border="1px solid"
                      borderColor={setCheckboxBorder}
                      bg={
                        selectedQuizSetId === set._id
                          ? setCheckboxActiveBg
                          : setCheckboxBg
                      }
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="white"
                      fontSize="12px"
                    >
                      {selectedQuizSetId === set._id ? <MdCheck /> : null}
                    </Box>
                    <Box>
                      <Text fontSize="sm" fontWeight="600">
                        {set.title || 'Untitled set'}
                      </Text>
                      <Text fontSize="xs" color={mutedText}>
                        {set.questionCount || 0} questions
                      </Text>
                    </Box>
                  </Flex>
                </Flex>
              ))
            )}
          </Stack>
          <Button
            w="100%"
            borderRadius="12px"
            mb="8px"
            onClick={() =>
              handleAddQuizToExistingSet(quizId, selectedQuizSetId)
            }
            isLoading={isSavingQuizSet}
            isDisabled={!selectedQuizSetId}
            bg="gray.800"
            color="white"
            _hover={{ bg: 'gray.900' }}
            leftIcon={<MdBookmarkBorder />}
          >
            Add To Set
          </Button>
          <Button
            w="100%"
            variant="outline"
            borderRadius="12px"
            onClick={() => handleCreateQuizSetFromSession(quizId)}
            isLoading={isSavingQuizSet}
            leftIcon={<MdAdd />}
          >
            Create New Set
          </Button>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );

  const handleOpenQuizSet = async (setId) => {
    if (!setId) return;
    setIsQuizSetViewLoading(true);
    try {
      const response = await fetchWithAuth(API_ROUTES.QUIZ_SETS.GET(setId));
      if (!response.ok) {
        throw new Error('Failed to load set.');
      }
      const payload = await response.json();
      const set = payload?.set;
      const questions = Array.isArray(set?.questions) ? set.questions : [];
      if (questions.length === 0) {
        toast({
          title: 'No questions in this set.',
          status: 'info',
          position: 'top-right',
          isClosable: true,
        });
        return;
      }
      setActiveQuizSetView({
        _id: set?._id || setId,
        title: set?.title || 'Quiz Set',
        questions,
        totalQuestions: questions.length,
      });
      const assetKey = String(set?._id || setId);
      setQuizIndexByAsset((prev) => ({ ...prev, [assetKey]: 0 }));
      setQuizAnswerByAsset((prev) => ({ ...prev, [assetKey]: {} }));
    } catch (error) {
      toast({
        title: 'Unable to load set.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    } finally {
      setIsQuizSetViewLoading(false);
    }
  };

  const handleRenameQuizSet = (setId, currentTitle) => {
    setEditQuizSetId(setId);
    setEditQuizSetTitle(currentTitle || 'Quiz Set');
  };

  const handleCancelQuizSetTitle = () => {
    setEditQuizSetId('');
    setEditQuizSetTitle('');
  };

  const handleConfirmQuizSetTitle = async () => {
    if (!editQuizSetId) return;
    const nextTitle = editQuizSetTitle.trim();
    if (!nextTitle) {
      toast({
        title: 'Title is required.',
        status: 'info',
        position: 'top-right',
        isClosable: true,
      });
      return;
    }
    try {
      const response = await fetchWithAuth(
        API_ROUTES.QUIZ_SETS.UPDATE(editQuizSetId),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: nextTitle }),
        },
      );
      if (!response.ok) {
        throw new Error('Update failed');
      }
      const payload = await response.json();
      const updated = payload?.set;
      setQuizSets((prev) =>
        prev.map((item) =>
          item._id === editQuizSetId
            ? { ...item, ...(updated || { title: nextTitle }) }
            : item,
        ),
      );
      if (activeQuizSetView?._id === editQuizSetId && updated?.title) {
        setActiveQuizSetView((prev) =>
          prev ? { ...prev, title: updated.title } : prev,
        );
      }
      handleCancelQuizSetTitle();
    } catch (error) {
      toast({
        title: 'Unable to update quiz set.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    }
  };

  const handleDeleteQuizSet = (setId) => {
    setDeleteQuizSetId(setId);
  };

  const handleConfirmDeleteQuizSet = async () => {
    if (!deleteQuizSetId) return;
    try {
      const response = await fetchWithAuth(
        API_ROUTES.QUIZ_SETS.DELETE(deleteQuizSetId),
        {
          method: 'DELETE',
        },
      );
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      setQuizSets((prev) =>
        prev.filter((item) => item._id !== deleteQuizSetId),
      );
      if (activeQuizSetView?._id === deleteQuizSetId) {
        setActiveQuizSetView(null);
      }
      setDeleteQuizSetId('');
    } catch (error) {
      toast({
        title: 'Unable to delete quiz set.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    }
  };

  const startQuizSetAttempt = useCallback(
    async ({ forceNew = false, resetState = false } = {}) => {
      if (!activeQuizSetView?._id) return;
      const assetKey = String(activeQuizSetView._id);
      const totalQuestions =
        activeQuizSetView.totalQuestions ||
        activeQuizSetView.questions?.length ||
        0;
      if (resetState) {
        setQuizAnswerByAsset((prev) => ({ ...prev, [assetKey]: {} }));
        setQuizIndexByAsset((prev) => ({ ...prev, [assetKey]: 0 }));
        attemptCompletedRef.current = new Set();
        lastAttemptPayloadRef.current = '';
        setIsQuizAttemptLocked(false);
        setQuizCompletionByAsset((prev) => {
          const next = { ...prev };
          delete next[assetKey];
          return next;
        });
      }
      try {
        const response = await fetchWithAuth(
          API_ROUTES.QUIZ_SETS.START_ATTEMPT(activeQuizSetView._id),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totalQuestions, forceNew }),
          },
        );
        if (!response.ok) return;
        const payload = await response.json();
        const attempt = payload?.attempt;
        if (payload?.locked && attempt?._id) {
          const totalFromAttempt =
            attempt.totalQuestions ||
            activeQuizSetView.totalQuestions ||
            activeQuizSetView.questions?.length ||
            0;
          const correctFromAttempt = Array.isArray(attempt.answers)
            ? attempt.answers.filter((answer) => answer?.isCorrect).length
            : 0;
          const scoreFromAttempt =
            totalFromAttempt > 0
              ? Math.round((correctFromAttempt / totalFromAttempt) * 100)
              : 0;
          setActiveQuizAttemptId('');
          setIsQuizAttemptLocked(true);
          setQuizCompletionByAsset((prev) => ({
            ...prev,
            [assetKey]: {
              correctCount: correctFromAttempt,
              incorrectCount: Math.max(totalFromAttempt - correctFromAttempt, 0),
              totalQuestions: totalFromAttempt,
              score: scoreFromAttempt,
            },
          }));
          if (Array.isArray(attempt.answers) && attempt.answers.length > 0) {
            setQuizAnswerByAsset((prev) => ({
              ...prev,
              [assetKey]: mapAttemptAnswersToState(attempt.answers),
            }));
          }
          setQuizIndexByAsset((prev) => ({
            ...prev,
            [assetKey]: Number.isFinite(attempt.currentIndex)
              ? attempt.currentIndex
              : prev[assetKey] || 0,
          }));
          return;
        }
        if (!attempt?._id) return;
        setActiveQuizAttemptId(String(attempt._id));
        setIsQuizAttemptLocked(false);
        setQuizIndexByAsset((prev) => ({
          ...prev,
          [assetKey]: Number.isFinite(attempt.currentIndex)
            ? attempt.currentIndex
            : prev[assetKey] || 0,
        }));
        if (Array.isArray(attempt.answers) && attempt.answers.length > 0) {
          setQuizAnswerByAsset((prev) => ({
            ...prev,
            [assetKey]: mapAttemptAnswersToState(attempt.answers),
          }));
        }
      } catch (error) {
        // Ignore attempt start failures to keep the quiz usable.
      }
    },
    [
      activeQuizSetView,
      mapAttemptAnswersToState,
      setQuizAnswerByAsset,
      setQuizIndexByAsset,
    ],
  );

  const handleEditQuizSet = useCallback(() => {
    toast({
      title: 'Edit quiz is coming soon.',
      status: 'info',
      position: 'top-right',
      isClosable: true,
    });
  }, [toast]);

  const handleRestartQuizSet = useCallback(async () => {
    if (!activeQuizSetView?._id) return;
    lastQuizSetIdRef.current = '';
    setActiveQuizAttemptId('');
    setIsQuizAttemptLocked(false);
    await startQuizSetAttempt({ forceNew: true, resetState: true });
  }, [activeQuizSetView, startQuizSetAttempt]);

  useEffect(() => {
    if (!activeQuizSetView?._id) {
      lastQuizSetIdRef.current = '';
      setActiveQuizAttemptId('');
      setIsQuizAttemptLocked(false);
      return;
    }
    if (lastQuizSetIdRef.current === String(activeQuizSetView._id)) {
      return;
    }
    lastQuizSetIdRef.current = String(activeQuizSetView._id);
    attemptCompletedRef.current = new Set();
    lastAttemptPayloadRef.current = '';
    startQuizSetAttempt();
  }, [activeQuizSetView, startQuizSetAttempt]);

  useEffect(() => {
    if (!activeQuizAttemptId || !activeQuizSetView?._id) return;
    const assetKey = String(activeQuizSetView._id);
    const answersByIndex = quizAnswerByAsset[assetKey] || {};
    const totalQuestions =
      activeQuizSetView.totalQuestions ||
      activeQuizSetView.questions?.length ||
      0;
    const currentIndex = quizIndexByAsset[assetKey] || 0;
    const answersPayload = buildAttemptAnswers(
      activeQuizSetView.questions,
      answersByIndex,
    );
    const submittedCount = Object.values(answersByIndex).filter(
      (answer) => answer?.submitted,
    ).length;
    const isComplete = totalQuestions > 0 && submittedCount >= totalQuestions;
    const payloadKey = JSON.stringify({
      answersPayload,
      totalQuestions,
      currentIndex,
    });
    if (payloadKey === lastAttemptPayloadRef.current) return;
    lastAttemptPayloadRef.current = payloadKey;

    if (attemptSyncTimeoutRef.current) {
      clearTimeout(attemptSyncTimeoutRef.current);
    }

    if (isComplete) {
      if (!attemptCompletedRef.current.has(activeQuizAttemptId)) {
        attemptCompletedRef.current.add(activeQuizAttemptId);
        const correctCount = answersPayload.filter(
          (answer) => answer?.isCorrect,
        ).length;
        const score =
          totalQuestions > 0
            ? Math.round((correctCount / totalQuestions) * 100)
            : 0;
        setQuizCompletionByAsset((prev) => ({
          ...prev,
          [assetKey]: {
            correctCount,
            incorrectCount: Math.max(totalQuestions - correctCount, 0),
            totalQuestions,
            score,
          },
        }));
        setIsQuizAttemptLocked(true);
        setQuizSets((prev) =>
          prev.map((set) =>
            set._id === activeQuizSetView._id
              ? { ...set, progressPercent: 100 }
              : set,
          ),
        );
        fetchWithAuth(
          API_ROUTES.QUIZ_SETS.COMPLETE_ATTEMPT(activeQuizAttemptId),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answers: answersPayload,
              totalQuestions,
            }),
          },
        )
          .then(() => loadQuizSets())
          .catch(() => {});
      }
      return;
    }

    attemptSyncTimeoutRef.current = setTimeout(async () => {
      try {
        await fetchWithAuth(
          API_ROUTES.QUIZ_SETS.UPDATE_ATTEMPT(activeQuizAttemptId),
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answers: answersPayload,
              currentIndex,
              totalQuestions,
            }),
          },
        );
      } catch (error) {
        // Ignore attempt updates for now.
      }
    }, 500);

    return () => {
      if (attemptSyncTimeoutRef.current) {
        clearTimeout(attemptSyncTimeoutRef.current);
      }
    };
  }, [
    activeQuizAttemptId,
    activeQuizSetView,
    buildAttemptAnswers,
    loadQuizSets,
    quizAnswerByAsset,
    quizIndexByAsset,
  ]);

  useEffect(() => {
    if (
      !activeFlashcardAttemptId ||
      !activeSetView?._id ||
      !flashcardStudyActive
    ) {
      return;
    }
    const assetKey = String(activeSetView._id);
    const totalCards = Array.isArray(activeSetView.cards)
      ? activeSetView.cards.length
      : 0;
    const dueIndices = getDueCardIndices(flashcardAttemptMeta, totalCards);
    const currentDuePos = flashcardIndexByAsset[assetKey] || 0;
    const currentIndex =
      dueIndices.length > 0
        ? dueIndices[Math.min(currentDuePos, dueIndices.length - 1)]
        : flashcardIndexByAsset[assetKey] || 0;
    const cardsSeen = Math.min(
      totalCards,
      (dueIndices.length > 0 ? currentDuePos : currentIndex) + 1,
    );
    const payloadKey = JSON.stringify({
      activeFlashcardAttemptId,
      currentIndex,
      totalCards,
      cardsSeen,
    });
    if (payloadKey === lastFlashcardAttemptPayloadRef.current) return;
    lastFlashcardAttemptPayloadRef.current = payloadKey;

    if (flashcardAttemptSyncTimeoutRef.current) {
      clearTimeout(flashcardAttemptSyncTimeoutRef.current);
    }

    flashcardAttemptSyncTimeoutRef.current = setTimeout(async () => {
      try {
        await fetchWithAuth(
          API_ROUTES.FLASHCARD_SETS.UPDATE_ATTEMPT(activeFlashcardAttemptId),
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentIndex,
              totalCards,
              cardsSeen,
            }),
          },
        );
      } catch (error) {
        // Ignore attempt update failures.
      }
    }, 400);

    return () => {
      if (flashcardAttemptSyncTimeoutRef.current) {
        clearTimeout(flashcardAttemptSyncTimeoutRef.current);
      }
    };
  }, [
    activeFlashcardAttemptId,
    activeSetView,
    flashcardIndexByAsset,
    loadFlashcardSets,
    loadLatestFlashcardAttempt,
    flashcardStudyActive,
    flashcardAttemptMeta,
  ]);

  useEffect(() => {
    if (!activeQuizSetView?._id) return;
    const assetKey = String(activeQuizSetView._id);
    const totalQuestions =
      activeQuizSetView.totalQuestions ||
      activeQuizSetView.questions?.length ||
      0;
    if (!totalQuestions) return;
    const activeIndex = quizIndexByAsset[assetKey] || 0;
    const progressPercent = Math.min(
      100,
      ((activeIndex + 1) / totalQuestions) * 100,
    );
    setQuizSets((prev) =>
      prev.map((set) =>
        set._id === activeQuizSetView._id
          ? { ...set, progressPercent }
          : set,
      ),
    );
  }, [activeQuizSetView, quizIndexByAsset]);

  const startEditSet = () => {
    if (!activeSetView) return;
    setIsEditingSet(true);
  };

  const handleEditCardChange = (index, field, value) => {
    setEditedCards((prev) =>
      prev.map((card, idx) =>
        idx === index ? { ...card, [field]: value } : card,
      ),
    );
  };

  const handleAddCard = () => {
    setEditedCards((prev) => [
      ...prev,
      { front: '', back: '', explanation: '' },
    ]);
  };

  const handleDeleteCard = (index) => {
    setEditedCards((prev) => prev.filter((_, idx) => idx !== index));
  };

  const saveFlashcardCards = async (cards) => {
    if (!activeSetView) return;
    const trimmedCards = cards
      .map((card) => ({
        front: String(card.front || '').trim(),
        back: String(card.back || '').trim(),
        explanation: String(card.explanation || '').trim(),
      }))
      .filter((card) => card.front && card.back);

    if (trimmedCards.length === 0) {
      toast({
        title: 'Add at least one card.',
        status: 'info',
        position: 'top-right',
        isClosable: true,
      });
      return;
    }

    setIsSavingSet(true);
    try {
      const response = await fetchWithAuth(
        API_ROUTES.FLASHCARD_SETS.UPDATE(activeSetView._id),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cards: trimmedCards }),
        },
      );
      if (!response.ok) {
        throw new Error('Failed to update set.');
      }
      const payload = await response.json();
      const updated = payload?.set;
      const updatedCards = Array.isArray(updated?.cards)
        ? updated.cards
        : trimmedCards;
      setActiveSetView((prev) =>
        prev
          ? { ...prev, cards: updatedCards, count: updatedCards.length }
          : prev,
      );
      setEditedCards(updatedCards.map((card) => ({ ...card })));
      setIsEditingSet(false);
      await loadFlashcardSets();
    } catch (error) {
      toast({
        title: 'Unable to save changes.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    } finally {
      setIsSavingSet(false);
    }
  };

  const handleSaveSetEdits = async () => {
    await saveFlashcardCards(editedCards);
  };

  const handleQuickDeleteCard = async (index) => {
    if (!activeSetView) return;
    const confirmed = window.confirm('Delete this flashcard?');
    if (!confirmed) return;
    const currentCards = Array.isArray(activeSetView.cards)
      ? activeSetView.cards
      : [];
    const nextCards = currentCards.filter((_, idx) => idx !== index);
    setEditedCards(nextCards.map((card) => ({ ...card })));
    await saveFlashcardCards(nextCards);
  };

  const handleRenameFlashcardSet = (setId, currentTitle) => {
    setEditFlashcardSetId(setId);
    setEditFlashcardSetTitle(currentTitle || 'Untitled Set');
  };

  const handleCancelFlashcardSetTitle = () => {
    setEditFlashcardSetId('');
    setEditFlashcardSetTitle('');
  };

  const handleConfirmFlashcardSetTitle = async () => {
    if (!editFlashcardSetId) return;
    const nextTitle = editFlashcardSetTitle.trim();
    if (!nextTitle) {
      toast({
        title: 'Title is required.',
        status: 'info',
        position: 'top-right',
        isClosable: true,
      });
      return;
    }
    try {
      const response = await fetchWithAuth(
        API_ROUTES.FLASHCARD_SETS.UPDATE(editFlashcardSetId),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: nextTitle }),
        },
      );
      if (!response.ok) {
        throw new Error('Update failed');
      }
      const payload = await response.json();
      const updated = payload?.set;
      setFlashcardSets((prev) =>
        prev.map((item) =>
          item._id === editFlashcardSetId
            ? { ...item, ...(updated || { title: nextTitle }) }
            : item,
        ),
      );
      if (activeSetView?._id === editFlashcardSetId && updated?.title) {
        setActiveSetView((prev) =>
          prev ? { ...prev, title: updated.title } : prev,
        );
      }
      handleCancelFlashcardSetTitle();
    } catch (error) {
      toast({
        title: 'Unable to update set title.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    }
  };

  const handleDeleteFlashcardSet = (setId) => {
    setDeleteFlashcardSetId(setId);
  };

  const handleConfirmDeleteFlashcardSet = async () => {
    if (!deleteFlashcardSetId) return;
    try {
      const response = await fetchWithAuth(
        API_ROUTES.FLASHCARD_SETS.DELETE(deleteFlashcardSetId),
        { method: 'DELETE' },
      );
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      setFlashcardSets((prev) =>
        prev.filter((item) => item._id !== deleteFlashcardSetId),
      );
      if (activeSetView?._id === deleteFlashcardSetId) {
        setActiveSetView(null);
      }
      setDeleteFlashcardSetId('');
    } catch (error) {
      toast({
        title: 'Unable to delete flashcard set.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    }
  };

  const handleStartFlashcardStudy = async ({ forceNew = false } = {}) => {
    if (!activeSetView?._id) return;
    const totalCards = Array.isArray(activeSetView.cards)
      ? activeSetView.cards.length
      : 0;
    try {
      const response = await fetchWithAuth(
        API_ROUTES.FLASHCARD_SETS.START_ATTEMPT(activeSetView._id),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ totalCards, forceNew }),
        },
      );
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.cooldown && payload?.nextReviewAt) {
        setFlashcardAttemptMeta({
          status: 'completed',
          nextReviewAt: payload.nextReviewAt,
        });
        setFlashcardStudyActive(false);
        toast({
          title: 'Next review not available yet.',
          status: 'info',
          position: 'top-right',
          isClosable: true,
        });
        return;
      }
      const attempt = payload?.attempt;
      if (attempt?._id) {
        setActiveFlashcardAttemptId(String(attempt._id));
        setFlashcardAttemptMeta(attempt);
        setFlashcardStudyActive(true);
        const assetKey = String(activeSetView._id);
        const dueIndices = getDueCardIndices(attempt, totalCards);
        if (dueIndices.length === 0) {
          setFlashcardStudyActive(false);
          setActiveFlashcardAttemptId('');
          toast({
            title: 'No cards are due yet.',
            status: 'info',
            position: 'top-right',
            isClosable: true,
          });
          return;
        }
        const resumeIndex = 0;
        setFlashcardIndexByAsset((prev) => ({
          ...prev,
          [assetKey]: resumeIndex,
        }));
        setFlashcardFlipByAsset((prev) => ({ ...prev, [assetKey]: false }));
        setFlashcardExplanationByAsset((prev) => ({
          ...prev,
          [assetKey]: false,
        }));
      }
    } catch (error) {
      toast({
        title: 'Unable to start study.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    }
  };

  function getDueCardIndices(attemptMeta, totalCards) {
    if (!totalCards) return [];
    const now = Date.now();
    const attemptCards = Array.isArray(attemptMeta?.cards)
      ? attemptMeta.cards
      : [];
    if (attemptCards.length === 0) {
      return Array.from({ length: totalCards }, (_, index) => index);
    }
    return attemptCards
      .filter((card) => {
        if (!card?.nextReviewAt) return true;
        const next = new Date(card.nextReviewAt).getTime();
        return Number.isFinite(next) && next <= now;
      })
      .map((card) => card.index)
      .sort((a, b) => a - b);
  }

  const handleRateFlashcard = async (rating) => {
    if (!activeSetView?._id || !activeFlashcardAttemptId) return;
    const assetKey = String(activeSetView._id);
    const totalCards = Array.isArray(activeSetView.cards)
      ? activeSetView.cards.length
      : 0;
    const dueCardIndices = getDueCardIndices(flashcardAttemptMeta, totalCards);
    const currentDuePos = flashcardIndexByAsset[assetKey] || 0;
    const currentIndex =
      dueCardIndices.length > 0
        ? dueCardIndices[Math.min(currentDuePos, dueCardIndices.length - 1)]
        : flashcardIndexByAsset[assetKey] || 0;
    let latestAttempt = flashcardAttemptMeta;
    try {
      const response = await fetchWithAuth(
        API_ROUTES.FLASHCARD_SETS.UPDATE_ATTEMPT(activeFlashcardAttemptId),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardIndex: currentIndex,
            rating,
            totalCards,
            currentIndex,
          }),
        },
      );
      if (response.ok) {
        const payload = await response.json();
        if (payload?.attempt) {
          latestAttempt = payload.attempt;
          setFlashcardAttemptMeta(payload.attempt);
        }
      }
    } catch (error) {
      // Ignore rating errors.
    }

    const nextDueIndices = getDueCardIndices(latestAttempt, totalCards);
    const noDueLeft = nextDueIndices.length === 0;
    const nextDuePos = noDueLeft
      ? 0
      : Math.min(currentDuePos, nextDueIndices.length - 1);
    setFlashcardIndexByAsset((prev) => ({
      ...prev,
      [assetKey]: noDueLeft ? 0 : nextDuePos,
    }));
    setFlashcardFlipByAsset((prev) => ({ ...prev, [assetKey]: false }));
    setFlashcardExplanationByAsset((prev) => ({ ...prev, [assetKey]: false }));

    const trackedCards = Array.isArray(latestAttempt?.cards)
      ? latestAttempt.cards
      : [];
    const updatedStudied = trackedCards.filter(
      (card) => card?.status && card.status !== 'not_studied',
    ).length;
    const hasCardStates = trackedCards.length > 0;
    const effectiveStudied = hasCardStates
      ? updatedStudied
      : Math.min(totalCards, currentIndex + 1);
    const isSpacedReview = flashcardStudyMode === 'spaced';
    if (
      !isSpacedReview &&
      totalCards > 0 &&
      effectiveStudied >= totalCards &&
      !flashcardAttemptCompletedRef.current.has(activeFlashcardAttemptId)
    ) {
      flashcardAttemptCompletedRef.current.add(activeFlashcardAttemptId);
      fetchWithAuth(
        API_ROUTES.FLASHCARD_SETS.COMPLETE_ATTEMPT(activeFlashcardAttemptId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentIndex,
            totalCards,
            cardsSeen: totalCards,
          }),
        },
      )
        .then(async () => {
          await loadFlashcardSets();
          await loadLatestFlashcardAttempt(activeSetView?._id);
          setFlashcardStudyActive(false);
          setActiveFlashcardAttemptId('');
        })
        .catch(() => {});
    }
    if (noDueLeft) {
      if (
        isSpacedReview &&
        !flashcardAttemptCompletedRef.current.has(activeFlashcardAttemptId)
      ) {
        flashcardAttemptCompletedRef.current.add(activeFlashcardAttemptId);
        fetchWithAuth(
          API_ROUTES.FLASHCARD_SETS.COMPLETE_ATTEMPT(activeFlashcardAttemptId),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentIndex,
              totalCards,
              cardsSeen: totalCards,
            }),
          },
        )
          .then(async () => {
            await loadFlashcardSets();
            await loadLatestFlashcardAttempt(activeSetView?._id);
          })
          .catch(() => {});
      }
      setFlashcardStudyActive(false);
      setActiveFlashcardAttemptId('');
      await loadLatestFlashcardAttempt(activeSetView?._id);
    }
  };

  const filteredSets = useMemo(() => {
    const query = setSearch.trim().toLowerCase();
    if (!query) return flashcardSets;
    return flashcardSets.filter((set) =>
      String(set.title || '')
        .toLowerCase()
        .includes(query),
    );
  }, [flashcardSets, setSearch]);

  const renderSaveSetPopover = (flashcardId) => (
    <Popover
      isOpen={activeFlashcardId === String(flashcardId)}
      onClose={() => setActiveFlashcardId('')}
      placement="top-end"
      closeOnBlur
    >
      <PopoverTrigger>
        <Button
          size="sm"
          variant="outline"
          borderRadius="12px"
          onClick={(event) => {
            event.stopPropagation();
            openSaveSetPopover(flashcardId);
          }}
        >
          Save Set
        </Button>
      </PopoverTrigger>
      <PopoverContent
        w="300px"
        p="12px"
        borderRadius="16px"
        borderColor={inputBorder}
        bg={cardsBg}
        boxShadow="0px 1px 40px rgb(189 189 189 / 15%)"
      >
        <PopoverBody p="0">
          <Flex align="center" gap="8px" px="10px" py="6px" mb="8px">
            <Icon as={FiSearch} color={mutedText} />
            <Input
              placeholder="Select flashcard set"
              value={setSearch}
              onChange={(event) => setSetSearch(event.target.value)}
              variant="unstyled"
              fontSize="sm"
            />
          </Flex>
          <Box borderBottom="1px solid" borderColor={inputBorder} mb="8px" />
          <Stack spacing="8px" maxH="220px" overflowY="auto" mb="12px">
            {filteredSets.length === 0 ? (
              <Text fontSize="sm" color={mutedText} px="6px">
                No sets found.
              </Text>
            ) : (
              filteredSets.map((set) => (
                <Flex
                  key={set._id}
                  align="center"
                  justify="space-between"
                  borderRadius="12px"
                  px="10px"
                  py="8px"
                  cursor="pointer"
                  bg={selectedSetId === set._id ? setRowActiveBg : setRowBg}
                  onClick={() => setSelectedSetId(set._id)}
                >
                  <Flex align="center" gap="8px">
                    <Box
                      w="16px"
                      h="16px"
                      borderRadius="4px"
                      border="1px solid"
                      borderColor={setCheckboxBorder}
                      bg={
                        selectedSetId === set._id
                          ? setCheckboxActiveBg
                          : setCheckboxBg
                      }
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="white"
                      fontSize="12px"
                    >
                      {selectedSetId === set._id ? <MdCheck /> : null}
                    </Box>
                    <Box>
                      <Text fontSize="sm" fontWeight="600">
                        {set.title || 'Untitled set'}
                      </Text>
                      <Text fontSize="xs" color={mutedText}>
                        {set.cardCount || 0} cards
                      </Text>
                    </Box>
                  </Flex>
                </Flex>
              ))
            )}
          </Stack>
          <Button
            w="100%"
            borderRadius="12px"
            mb="8px"
            onClick={handleAddToSet}
            isLoading={isSavingSet}
            isDisabled={!selectedSetId}
            bg="gray.800"
            color="white"
            _hover={{ bg: 'gray.900' }}
            leftIcon={<MdBookmarkBorder />}
          >
            Add To Set
          </Button>
          <Button
            w="100%"
            variant="outline"
            borderRadius="12px"
            onClick={handleCreateSetFromSession}
            isLoading={isSavingSet}
            leftIcon={<MdAdd />}
          >
            Create New Set
          </Button>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );

  const pageBg = useColorModeValue('white', 'black');
  const floatUp = keyframes`
    0% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
    100% { transform: translateY(0); }
  `;
  const shimmer = keyframes`
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  `;
  const notePreview = (note) => {
    const text = String(note?.content || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return '';
    return text.length > 180 ? `${text.slice(0, 180)}...` : text;
  };
  const handleDownloadNote = (note) => {
    if (!note) return;
    const title = note.title || 'Study Notes';
    const content = note.content || '';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 16px; }
    pre { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
  };
  const noteBodyRef = useRef(null);
  const [videoTab, setVideoTab] = useState('transcript');
  const videoTranscript = Array.isArray(videoContext?.transcript)
    ? videoContext.transcript
    : [];
  const videoChapters = Array.isArray(videoContext?.chapters)
    ? videoContext.chapters
    : [];
  const formatTimestamp = (seconds) => {
    const safe = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  const embedUrl = videoContext?.videoId
    ? `https://www.youtube.com/embed/${videoContext.videoId}`
    : null;

  const renderFlashcardViewer = (flashcard, assetKey, options = {}) => {
    if (!flashcard) {
      return (
        <Card
          p="18px"
          borderRadius="18px"
          border="1px solid"
          borderColor={cardBorder}
        >
          <Text color={mutedText}>Flashcards not available.</Text>
        </Card>
      );
    }
    const { showSaveSet = true, showEdit = false, onEdit } = options;
    const cards = Array.isArray(flashcard?.cards) ? flashcard.cards : [];
    const dueCardIndices =
      flashcardStudyMode === 'spaced' && flashcardStudyActive
        ? getDueCardIndices(flashcardAttemptMeta, cards.length)
        : null;
    const activeDuePos = flashcardIndexByAsset[assetKey] || 0;
    const activeIndex =
      dueCardIndices && dueCardIndices.length > 0
        ? dueCardIndices[Math.min(activeDuePos, dueCardIndices.length - 1)]
        : flashcardIndexByAsset[assetKey] || 0;
    const isFlipped = Boolean(flashcardFlipByAsset[assetKey]);
    const activeCard = cards[activeIndex] || null;
    const totalCards =
      dueCardIndices && dueCardIndices.length > 0
        ? dueCardIndices.length
        : cards.length;
    const hasExplanation = Boolean(activeCard?.explanation);
    const isExplanationOpen = Boolean(flashcardExplanationByAsset[assetKey]);

    return (
      <Box maxW="820px" w="100%">
        
        <Card
          p={{ base: '16px', md: '18px' }}
          borderRadius="18px"
          border="1px solid"
          borderColor={cardBorder}
        >
          <Text fontSize="sm" color={mutedText} mb="10px">
            Hint
          </Text>
          <Box
            minH="320px"
            position="relative"
            textAlign="center"
            onClick={() =>
              setFlashcardFlipByAsset((prev) => ({
                ...prev,
                [assetKey]: !prev[assetKey],
              }))
            }
            cursor="pointer"
            sx={{ perspective: '900px' }}
            overflow="hidden"
          >
            <Box
              position="relative"
              w="100%"
              minH="320px"
              transition="transform 0.6s"
              transform={isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'}
              sx={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
            >
              <Flex
                position="absolute"
                inset="0"
                alignItems="center"
                justifyContent="center"
                textAlign="center"
                px="16px"
                borderRadius="16px"
                border="1px solid"
                borderColor={cardBorder}
                bg={flashcardFaceBg}
                sx={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <Text fontSize="md" color={headingColor}>
                  {activeCard?.front || 'Flashcard prompt'}
                </Text>
              </Flex>
              <Flex
                position="absolute"
                inset="0"
                alignItems="center"
                justifyContent="center"
                textAlign="center"
                px="16px"
                transform="rotateX(180deg)"
                borderRadius="16px"
                border="1px solid"
                borderColor={cardBorder}
                bg={flashcardFaceBg}
                sx={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <Text fontSize="md" color={headingColor}>
                  {activeCard?.back || 'Flashcard answer'}
                </Text>
              </Flex>
            </Box>
          </Box>
          {flashcardStudyMode === 'spaced' && !isFlipped ? (
            <Flex justify="center">
              <Button
                mt="16px"
                size="sm"
                borderRadius="999px"
                bg="black"
                color="white"
                _hover={{ bg: 'gray.800' }}
                onClick={(event) => {
                  event.stopPropagation();
                  setFlashcardFlipByAsset((prev) => ({
                    ...prev,
                    [assetKey]: true,
                  }));
                }}
              >
                Tap to show answer
              </Button>
            </Flex>
          ) : null}
          {hasExplanation && isFlipped ? (
            <Box mt="10px">
              <Button
                size="sm"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  setFlashcardExplanationByAsset((prev) => ({
                    ...prev,
                    [assetKey]: !prev[assetKey],
                  }));
                }}
              >
                {isExplanationOpen ? 'Hide explanation' : 'Show explanation'}
              </Button>
              {isExplanationOpen ? (
                <Box
                  mt="8px"
                  px="12px"
                  py="10px"
                  borderRadius="12px"
                  border="1px solid"
                  borderColor={cardBorder}
                  bg={tabsActiveBg}
                >
                  <Text fontSize="sm" color={headingColor}>
                    {activeCard?.explanation}
                  </Text>
                </Box>
              ) : null}
            </Box>
          ) : null}
          {flashcardStudyMode === 'spaced' &&
          flashcardStudyActive &&
          isFlipped ? (
            <Flex mt="16px" gap="10px" justify="center" wrap="wrap">
              {[
                {
                  label: 'Again',
                  sub: '1 minute',
                  value: 'again',
                  bg: 'red.50',
                  color: 'red.500',
                },
                {
                  label: 'Hard',
                  sub: '8 minutes',
                  value: 'hard',
                  bg: 'yellow.50',
                  color: 'yellow.600',
                },
                {
                  label: 'Good',
                  sub: '15 minutes',
                  value: 'good',
                  bg: 'green.50',
                  color: 'green.500',
                },
                {
                  label: 'Easy',
                  sub: '2 days',
                  value: 'easy',
                  bg: 'blue.50',
                  color: 'blue.500',
                },
              ].map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  borderRadius="12px"
                  bg={option.bg}
                  color={option.color}
                  _hover={{ filter: 'brightness(0.98)' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRateFlashcard(option.value);
                  }}
                >
                  <Flex direction="column" align="center" gap="2px">
                    <Text fontWeight="600">{option.label}</Text>
                    <Text fontSize="xs">{option.sub}</Text>
                  </Flex>
                </Button>
              ))}
            </Flex>
          ) : null}
          <Flex
            align="center"
            justify="flex-end"
            mt="14px"
            color={mutedText}
          >
            
            <Flex align="center" gap="10px">
              <IconButton
                aria-label="Previous card"
                icon={<MdArrowBack />}
                size="sm"
                variant="outline"
                borderRadius="12px"
                isDisabled={
                  dueCardIndices && dueCardIndices.length > 0
                    ? activeDuePos <= 0
                    : activeIndex <= 0
                }
                onClick={() => {
                  setFlashcardIndexByAsset((prev) => ({
                    ...prev,
                    [assetKey]:
                      dueCardIndices && dueCardIndices.length > 0
                        ? Math.max(0, activeDuePos - 1)
                        : Math.max(0, activeIndex - 1),
                  }));
                  setFlashcardFlipByAsset((prev) => ({
                    ...prev,
                    [assetKey]: false,
                  }));
                  setFlashcardExplanationByAsset((prev) => ({
                    ...prev,
                    [assetKey]: false,
                  }));
                }}
              />
              {flashcardStudyMode !== 'spaced' ? (
                <Text fontSize="sm">
                  {Math.min(
                    (dueCardIndices && dueCardIndices.length > 0
                      ? activeDuePos
                      : activeIndex) + 1,
                    totalCards,
                  )}{' '}
                  / {totalCards || 1}
                </Text>
              ) : null}
              <IconButton
                aria-label="Next card"
                icon={<MdArrowForward />}
                size="sm"
                variant="outline"
                borderRadius="12px"
                isDisabled={
                  dueCardIndices && dueCardIndices.length > 0
                    ? activeDuePos >= totalCards - 1
                    : activeIndex >= totalCards - 1
                }
                onClick={() => {
                  setFlashcardIndexByAsset((prev) => ({
                    ...prev,
                    [assetKey]:
                      dueCardIndices && dueCardIndices.length > 0
                        ? Math.min(totalCards - 1, activeDuePos + 1)
                        : Math.min(totalCards - 1, activeIndex + 1),
                  }));
                  setFlashcardFlipByAsset((prev) => ({
                    ...prev,
                    [assetKey]: false,
                  }));
                  setFlashcardExplanationByAsset((prev) => ({
                    ...prev,
                    [assetKey]: false,
                  }));
                }}
              />
              {showSaveSet ? renderSaveSetPopover(assetKey) : null}
              {showEdit ? (
                <IconButton
                  aria-label="Edit set"
                  icon={<MdEdit />}
                  size="sm"
                  variant="ghost"
                  borderRadius="12px"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit?.();
                  }}
                />
              ) : null}
            </Flex>
          </Flex>
        </Card>
      </Box>
    );
  };

  const flashcardCooldownMeta = useMemo(() => {
    const now = Date.now();
    const attemptCards = Array.isArray(flashcardAttemptMeta?.cards)
      ? flashcardAttemptMeta.cards
      : [];
    const cardNextTimes = attemptCards
      .map((card) => (card?.nextReviewAt ? new Date(card.nextReviewAt) : null))
      .filter((date) => date && !Number.isNaN(date.getTime()))
      .map((date) => date.getTime());
    const hasDueCard = attemptCards.some(
      (card) =>
        !card?.nextReviewAt || new Date(card.nextReviewAt).getTime() <= now,
    );
    const nextCardTime = cardNextTimes.length
      ? Math.min(...cardNextTimes)
      : null;
    const fallbackNext = flashcardAttemptMeta?.nextReviewAt
      ? new Date(flashcardAttemptMeta.nextReviewAt).getTime()
      : null;
    const nextReviewAt = Number.isFinite(nextCardTime)
      ? nextCardTime
      : Number.isFinite(fallbackNext)
      ? fallbackNext
      : null;
    const remainingMs =
      nextReviewAt && nextReviewAt > now ? nextReviewAt - now : 0;
    return {
      hasDueCard,
      remainingMs,
    };
  }, [flashcardAttemptMeta]);
  const flashcardCooldownLabel = formatCountdown(
    flashcardCooldownMeta.remainingMs,
  );
  const isFlashcardCooldown =
    !flashcardCooldownMeta.hasDueCard && flashcardCooldownMeta.remainingMs > 0;

  const flashcardProgress = useMemo(() => {
    const total = Array.isArray(activeSetView?.cards)
      ? activeSetView.cards.length
      : 0;
    const trackedCards = Array.isArray(flashcardAttemptMeta?.cards)
      ? flashcardAttemptMeta.cards
      : [];
    const studiedCount = trackedCards.filter(
      (card) => card?.status && card.status !== 'not_studied',
    ).length;
    const notStudied = Math.max(total - studiedCount, 0);
    const toReview = trackedCards.filter(
      (card) => card?.status === 'to_review',
    ).length;
    let progressPct = total > 0 ? Math.round((toReview / total) * 100) : 0;
    if (total > 0 && toReview >= total) {
      progressPct = 100;
    } else if (progressPct > 99) {
      progressPct = 99;
    }
    return { total, notStudied, toReview, progressPct };
  }, [activeSetView, flashcardAttemptMeta]);

  const renderQuizViewer = (quiz, assetKey) => {
    if (!quiz) {
      return (
        <Card
          p="18px"
          borderRadius="18px"
          border="1px solid"
          borderColor={cardBorder}
        >
          <Text color={mutedText}>Quiz not available.</Text>
        </Card>
      );
    }
    const questionList = Array.isArray(quiz?.questions) ? quiz.questions : [];
    const totalQuestions = questionList.length;
    const activeIndex = quizIndexByAsset[assetKey] || 0;
    const activeQuestion = questionList[activeIndex];
    const answersForAsset = quizAnswerByAsset[assetKey] || {};
    const answerState = answersForAsset[activeIndex] || {};
    const questionType = normalizeQuestionType(activeQuestion?.type);
    const isMultiple = questionType === 'multiple_choice';
    const selectedOption = answerState.selected || null;
    const selectedOptions = Array.isArray(selectedOption)
      ? selectedOption
      : selectedOption
      ? [selectedOption]
      : [];
    const isSubmitted = Boolean(answerState.submitted);
    const isCorrect = answerState.status === 'correct';
    const isPartial = answerState.status === 'partial';
    const resolvedCorrectAnswer = normalizeCorrectAnswer(
      activeQuestion?.options,
      activeQuestion?.correctAnswer,
    );
    const correctAnswerText = splitAnswerText(resolvedCorrectAnswer).join(', ');
    const answersPayload = buildAttemptAnswers(
      quiz?.questions,
      answersForAsset,
    );
    const completionSummary = quizCompletionByAsset[assetKey];

    return (
      <Box maxW="820px" w="100%">
        <Card
          p={{ base: '16px', md: '18px' }}
          borderRadius="18px"
          border="1px solid"
          borderColor={cardBorder}
        >
          {completionSummary ? (
            <Stack spacing="18px" align="center" py="20px">
              <Box
                w="52px"
                h="52px"
                borderRadius="full"
                bg="purple.50"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={MdCheckCircle} boxSize="28px" color="purple.500" />
              </Box>
              <Text fontSize="lg" fontWeight="700" color={headingColor}>
                Great job!
              </Text>
              <Text fontSize="sm" color={mutedText}>
                You&apos;ve completed this quiz set.
              </Text>
              <Flex gap="14px" wrap="wrap" justify="center">
                <Card
                  p="12px 16px"
                  borderRadius="14px"
                  border="1px solid"
                  borderColor={cardBorder}
                  bg={cardsBg}
                  minW="140px"
                >
                  <Text fontSize="xs" color={mutedText}>
                    Score
                  </Text>
                  <Text fontSize="lg" fontWeight="700" color={headingColor}>
                    {completionSummary.score}%
                  </Text>
                </Card>
                <Card
                  p="12px 16px"
                  borderRadius="14px"
                  border="1px solid"
                  borderColor={cardBorder}
                  bg={cardsBg}
                  minW="140px"
                >
                  <Text fontSize="xs" color={mutedText}>
                    Correct
                  </Text>
                  <Text fontSize="lg" fontWeight="700" color={headingColor}>
                    {completionSummary.correctCount}
                  </Text>
                </Card>
                <Card
                  p="12px 16px"
                  borderRadius="14px"
                  border="1px solid"
                  borderColor={cardBorder}
                  bg={cardsBg}
                  minW="140px"
                >
                  <Text fontSize="xs" color={mutedText}>
                    Incorrect
                  </Text>
                  <Text fontSize="lg" fontWeight="700" color={headingColor}>
                    {completionSummary.incorrectCount}
                  </Text>
                </Card>
              </Flex>
              <Button
                borderRadius="999px"
                variant="outline"
                onClick={() => setActiveQuizSetView(null)}
              >
                Back to sets
              </Button>
            </Stack>
          ) : activeQuestion ? (
            <Stack spacing="12px">
              <Text fontSize="sm" color={mutedText}>
                {formatQuestionType(questionType)}
              </Text>
              <Text fontSize="md" fontWeight="600" color={headingColor}>
                {activeQuestion?.question || 'Question'}
              </Text>
              <Stack spacing="10px">
                {activeQuestion?.options?.map((option, optionIndex) => {
                  const isSelected = selectedOptions.includes(option);
                  const isOptionCorrect = isAnswerOptionCorrect(
                    option,
                    resolvedCorrectAnswer,
                  );
                  let optionBg = neutralBg;
                  let optionBorder = cardBorder;
                  if (isSubmitted) {
                    if (isOptionCorrect) {
                      optionBg = correctBg;
                      optionBorder = correctBorder;
                    } else if (isSelected) {
                      optionBg = wrongBg;
                      optionBorder = wrongBorder;
                    }
                  } else if (isSelected) {
                    optionBg = selectedBg;
                    optionBorder = selectedBorder;
                  }
                  return (
                    <Button
                      key={`${option}-${optionIndex}`}
                      variant="outline"
                      borderColor={optionBorder}
                      bg={optionBg}
                      color={headingColor}
                      justifyContent="flex-start"
                      borderRadius="12px"
                      isDisabled={isQuizAttemptLocked}
                      onClick={() => {
                        if (isQuizAttemptLocked) return;
                        if (!activeQuestion) return;
                        setQuizAnswerByAsset((prev) => {
                          const next = { ...prev };
                          const assetAnswers = { ...(next[assetKey] || {}) };
                          const answerForQuestion =
                            assetAnswers[activeIndex] || {};
                          if (isMultiple) {
                            const nextSelected = new Set(
                              Array.isArray(answerForQuestion.selected)
                                ? answerForQuestion.selected
                                : [],
                            );
                            if (nextSelected.has(option)) {
                              nextSelected.delete(option);
                            } else {
                              nextSelected.add(option);
                            }
                            assetAnswers[activeIndex] = {
                              ...answerForQuestion,
                              selected: Array.from(nextSelected),
                            };
                          } else {
                            const updatedStatus = isCorrectAnswer(
                              option,
                              resolvedCorrectAnswer,
                            )
                              ? 'correct'
                              : 'incorrect';
                            assetAnswers[activeIndex] = {
                              ...answerForQuestion,
                              selected: option,
                              submitted: true,
                              status: updatedStatus,
                            };
                          }
                          next[assetKey] = assetAnswers;
                          return next;
                        });
                      }}
                    >
                      <Text>{option}</Text>
                    </Button>
                  );
                })}
              </Stack>
              {isMultiple ? (
                <Button
                  size="sm"
                  variant="outline"
                  borderRadius="12px"
                  alignSelf="flex-start"
                  onClick={() => {
                    if (isQuizAttemptLocked) return;
                    if (!activeQuestion) return;
                    setQuizAnswerByAsset((prev) => {
                      const next = { ...prev };
                      const assetAnswers = { ...(next[assetKey] || {}) };
                      const current = assetAnswers[activeIndex] || {};
                      const status = getMultipleChoiceStatus(
                        current.selected,
                        resolvedCorrectAnswer,
                      );
                      assetAnswers[activeIndex] = {
                        ...current,
                        submitted: true,
                        status,
                      };
                      next[assetKey] = assetAnswers;
                      return next;
                    });
                  }}
                  isDisabled={selectedOptions.length === 0 || isQuizAttemptLocked}
                >
                  Submit
                </Button>
              ) : null}
              {isSubmitted ? (
                <Box
                  border="1px solid"
                  borderColor={
                    isCorrect
                      ? correctBorder
                      : isPartial
                      ? partialBorder
                      : wrongBorder
                  }
                  bg={isCorrect ? correctBg : isPartial ? partialBg : wrongBg}
                  borderRadius="14px"
                  p="12px"
                >
                  <Text fontWeight="600" color={headingColor} mb="4px">
                    {isCorrect
                      ? 'Correct'
                      : isPartial
                      ? 'Partially correct'
                      : 'Incorrect'}
                  </Text>
                  <Text fontSize="sm" color={headingColor}>
                    Correct answer: {correctAnswerText || 'N/A'}
                  </Text>
                </Box>
              ) : null}
              <Flex align="center" justify="space-between">
                <Button
                  size="sm"
                  variant="outline"
                  borderRadius="12px"
                  onClick={() =>
                    setQuizIndexByAsset((prev) => ({
                      ...prev,
                      [assetKey]: Math.max(0, activeIndex - 1),
                    }))
                  }
                  isDisabled={activeIndex <= 0}
                >
                  <Icon as={MdArrowBack} />
                </Button>
                <Text fontSize="sm" color={mutedText}>
                  {Math.min(activeIndex + 1, totalQuestions)} /{' '}
                  {totalQuestions || 1}
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  borderRadius="12px"
                  onClick={() => {
                    if (activeIndex >= totalQuestions - 1) {
                      if (!isSubmitted) return;
                      setQuizCompletionByAsset((prev) => {
                        if (prev[assetKey]) return prev;
                        const correctCount = answersPayload.filter(
                          (answer) => answer?.isCorrect,
                        ).length;
                        const score =
                          totalQuestions > 0
                            ? Math.round((correctCount / totalQuestions) * 100)
                            : 0;
                        return {
                          ...prev,
                          [assetKey]: {
                            correctCount,
                            incorrectCount: Math.max(totalQuestions - correctCount, 0),
                            totalQuestions,
                            score,
                          },
                        };
                      });
                      return;
                    }
                    setQuizIndexByAsset((prev) => ({
                      ...prev,
                      [assetKey]: Math.min(totalQuestions - 1, activeIndex + 1),
                    }));
                  }}
                  isDisabled={!isSubmitted}
                >
                  {activeIndex >= totalQuestions - 1 ? 'Finish' : 'Next'}
                </Button>
              </Flex>
            </Stack>
          ) : (
            <Text fontSize="sm" color={mutedText}>
              No questions available.
            </Text>
          )}
        </Card>
      </Box>
    );
  };

  return (
    <Box
      pt={{ base: '64px', md: '56px', lg: '48px' }}
      bg={pageBg}
      minH="100vh"
      h={videoContext ? '100vh' : 'auto'}
      overflow={videoContext ? 'hidden' : 'visible'}
    >
      <Box
        maxW={videoContext ? '1400px' : '1200px'}
        w="100%"
        mx="auto"
        px={{ base: '16px', md: '24px' }}
      >
        <Box
          maxW={videoContext ? '100%' : { base: '100%', md: '760px' }}
          w="100%"
          mx={videoContext ? '0' : 'auto'}
        >
          <Text fontSize="lg" fontWeight="700" color={headingColor} mb="8px">
            {session?.title || 'Chat session'}
          </Text>
          <Flex
            mt={videoContext ? '18px' : '0'}
            gap={videoContext ? '24px' : '0'}
            align="flex-start"
            direction={{ base: 'column', lg: videoContext ? 'row' : 'column' }}
            w="100%"
          >
            {videoContext ? (
              <VideoPanel
                cardBorder={cardBorder}
                cardsBg={cardsBg}
                mutedText={mutedText}
                headingColor={headingColor}
                videoTab={videoTab}
                setVideoTab={setVideoTab}
                isMobileVideoOpen={isMobileVideoOpen}
                setIsMobileVideoOpen={setIsMobileVideoOpen}
                isVideoExpanded={isVideoExpanded}
                embedUrl={embedUrl}
                videoTranscript={videoTranscript}
                videoChapters={videoChapters}
                transcriptStatus={videoContext.transcriptStatus}
                transcriptError={videoContext.transcriptError}
                chaptersStatus={videoContext.chaptersStatus}
                chaptersError={videoContext.chaptersError}
                formatTimestamp={formatTimestamp}
              />
            ) : null}
            <Box
              flex={videoContext ? '1' : 'initial'}
              w="100%"
              minW="0"
              maxH="calc(100vh - 120px)"
              h="calc(100vh - 120px)"
              pr={videoContext ? '6px' : '0'}
              display="flex"
              flexDirection="column"
              minH="0"
              overflow="hidden"
            >
              <TabsPill
                tabs={TAB_OPTIONS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabsBg={tabsBg}
                tabsBorder={tabsBorder}
                tabsActiveBg={tabsActiveBg}
                headingColor={headingColor}
              />

              {isLoading ? (
                <Stack spacing="18px" mt="18px">
                  <Card
                    p="18px"
                    borderRadius="18px"
                    border="1px solid"
                    borderColor={cardBorder}
                  >
                    <SkeletonText noOfLines={2} spacing="3" />
                    <Skeleton mt="16px" height="220px" borderRadius="18px" />
                  </Card>
                  <Card
                    p="18px"
                    borderRadius="18px"
                    border="1px solid"
                    borderColor={cardBorder}
                  >
                    <SkeletonText noOfLines={2} spacing="3" />
                    <Skeleton mt="16px" height="120px" borderRadius="18px" />
                  </Card>
                </Stack>
              ) : activeTab === 'chat' ? (
                <ChatTab
                  videoContext={videoContext}
                  chatScrollRef={chatScrollRef}
                  handleChatScroll={handleChatScroll}
                  messages={messages}
                  orderedMessages={orderedMessages}
                  currentUser={currentUser}
                  hasSessionContext={hasSessionContext}
                  commandBubbleBg={commandBubbleBg}
                  commandTextColor={commandTextColor}
                  mutedText={mutedText}
                  headingColor={headingColor}
                  quizMap={quizMap}
                  quizIndexByAsset={quizIndexByAsset}
                  quizAnswerByAsset={quizAnswerByAsset}
                  setQuizAnswerByAsset={setQuizAnswerByAsset}
                  setQuizIndexByAsset={setQuizIndexByAsset}
                  flashcardMap={flashcardMap}
                  flashcardIndexByAsset={flashcardIndexByAsset}
                  flashcardFlipByAsset={flashcardFlipByAsset}
                  setFlashcardIndexByAsset={setFlashcardIndexByAsset}
                  setFlashcardFlipByAsset={setFlashcardFlipByAsset}
                  noteMap={noteMap}
                  renderSaveSetPopover={renderSaveSetPopover}
                  renderQuizSetPopover={renderQuizSetPopover}
                  notePreview={notePreview}
                  setActiveNote={setActiveNote}
                  cardBorder={cardBorder}
                  flashcardFaceBg={flashcardFaceBg}
                  correctBg={correctBg}
                  correctBorder={correctBorder}
                  wrongBg={wrongBg}
                  wrongBorder={wrongBorder}
                  partialBg={partialBg}
                  partialBorder={partialBorder}
                  selectedBg={selectedBg}
                  selectedBorder={selectedBorder}
                  neutralBg={neutralBg}
                  normalizeQuestionType={normalizeQuestionType}
                  formatQuestionType={formatQuestionType}
                  isAnswerOptionCorrect={isAnswerOptionCorrect}
                  normalizeCorrectAnswer={normalizeCorrectAnswer}
                  splitAnswerText={splitAnswerText}
                  isCorrectAnswer={isCorrectAnswer}
                  getMultipleChoiceStatus={getMultipleChoiceStatus}
                  hasPending={hasPending}
                  shimmer={shimmer}
                  commandTokens={commandTokens}
                  commandBadgeBg={commandBadgeBg}
                  commandBadgeText={commandBadgeText}
                  commandRemainder={commandRemainder}
                  setCommandText={setCommandText}
                  setShowSuggestions={setShowSuggestions}
                  showSuggestions={showSuggestions}
                  dropdownBg={dropdownBg}
                  dropdownBorder={dropdownBorder}
                  dropdownHover={dropdownHover}
                  dropdownText={dropdownText}
                  COMMAND_SUGGESTIONS={COMMAND_SUGGESTIONS}
                  quizTypeRef={quizTypeRef}
                  difficultyRef={difficultyRef}
                  isQuizTypeOpen={isQuizTypeOpen}
                  isDifficultyOpen={isDifficultyOpen}
                  setIsQuizTypeOpen={setIsQuizTypeOpen}
                  setIsDifficultyOpen={setIsDifficultyOpen}
                  quizType={quizType}
                  setQuizType={setQuizType}
                  QUIZ_TYPES={QUIZ_TYPES}
                  difficulty={difficulty}
                  setDifficulty={setDifficulty}
                  DIFFICULTY_OPTIONS={DIFFICULTY_OPTIONS}
                  isQuiz={isQuiz}
                  isFlashcards={isFlashcards}
                  inputBorder={inputBorder}
                  inputBg={inputBg}
                  handleGenerate={handleGenerate}
                  isLoading={isLoading}
                  isGenerating={isGenerating}
                  isInputEmpty={isInputEmpty}
                  cardsBg={cardsBg}
                />
              ) : activeTab === 'notes' ? (
                <NotesTab
                  videoContext={videoContext}
                  notes={notes}
                  pendingAssets={pendingAssets}
                  mutedText={mutedText}
                  headingColor={headingColor}
                  cardBorder={cardBorder}
                  cardsBg={cardsBg}
                  notePreview={notePreview}
                  setActiveNote={setActiveNote}
                  handleDownloadNote={handleDownloadNote}
                />
              ) : null}

              {activeTab === 'flashcards' ? (
                <FlashcardsTab
                  videoContext={videoContext}
                  activeSetView={activeSetView}
                  isEditingSet={isEditingSet}
                  isSetsLoading={isSetsLoading}
                  isSetViewLoading={isSetViewLoading}
                  flashcardSets={flashcardSets}
                  editedCards={editedCards}
                  headingColor={headingColor}
                  mutedText={mutedText}
                  cardBorder={cardBorder}
                  cardsBg={cardsBg}
                  btnBg={btnBg}
                  inputBg={inputBg}
                  inputBorder={inputBorder}
                  btnHover={btnHover}
                  tabsBg={tabsBg}
                  tabsActiveBg={tabsActiveBg}
                  isSavingSet={isSavingSet}
                  handleAddCard={handleAddCard}
                  handleDeleteCard={handleDeleteCard}
                  handleEditCardChange={handleEditCardChange}
                  handleSaveSetEdits={handleSaveSetEdits}
                  setIsEditingSet={setIsEditingSet}
                  setActiveSetView={setActiveSetView}
                  handleOpenSet={handleOpenSet}
                  renderFlashcardViewer={renderFlashcardViewer}
                  startEditSet={startEditSet}
                  onEditSetTitle={handleRenameFlashcardSet}
                  onDeleteSet={handleDeleteFlashcardSet}
                  editSetId={editFlashcardSetId}
                  editSetTitle={editFlashcardSetTitle}
                  onEditSetTitleChange={setEditFlashcardSetTitle}
                  onConfirmEditSetTitle={handleConfirmFlashcardSetTitle}
                  onCancelEditSetTitle={handleCancelFlashcardSetTitle}
                  flashcardStudyMode={flashcardStudyMode}
                  setFlashcardStudyMode={(mode) => {
                    setFlashcardStudyMode(mode);
                    if (mode === 'fast') {
                      setFlashcardStudyActive(false);
                      setActiveFlashcardAttemptId('');
                    }
                  }}
                  flashcardStudyActive={flashcardStudyActive}
                  flashcardCooldownLabel={flashcardCooldownLabel}
                  isFlashcardCooldown={isFlashcardCooldown}
                  handleStartFlashcardStudy={handleStartFlashcardStudy}
                  flashcardProgress={flashcardProgress}
                  flashcardAttemptCards={flashcardAttemptMeta?.cards}
                  getFlashcardReviewBadge={getFlashcardReviewBadge}
                  handleQuickDeleteCard={handleQuickDeleteCard}
                />
              ) : null}

              {activeTab === 'quizzes' ? (
                <QuizzesTab
                  videoContext={videoContext}
                  activeQuizSetView={activeQuizSetView}
                  isQuizSetsLoading={isQuizSetsLoading}
                  isQuizSetViewLoading={isQuizSetViewLoading}
                  quizSets={quizSets}
                  pendingAssets={pendingAssets}
                  headingColor={headingColor}
                  mutedText={mutedText}
                  cardBorder={cardBorder}
                  cardsBg={cardsBg}
                  tabsBg={tabsBg}
                  quizIndexByAsset={quizIndexByAsset}
                  renderQuizViewer={renderQuizViewer}
                  setActiveQuizSetView={setActiveQuizSetView}
                  handleOpenQuizSet={handleOpenQuizSet}
                  onEditQuizSet={handleEditQuizSet}
                  onRestartQuizSet={handleRestartQuizSet}
                  onEditQuizSetTitle={handleRenameQuizSet}
                  onDeleteQuizSet={handleDeleteQuizSet}
                  editQuizSetId={editQuizSetId}
                  editQuizSetTitle={editQuizSetTitle}
                  onEditQuizSetTitleChange={setEditQuizSetTitle}
                  onConfirmEditQuizSetTitle={handleConfirmQuizSetTitle}
                  onCancelEditQuizSetTitle={handleCancelQuizSetTitle}
                />
              ) : null}
            </Box>
          </Flex>
        </Box>
      </Box>
      <Modal
        isOpen={Boolean(deleteFlashcardSetId)}
        onClose={() => setDeleteFlashcardSetId('')}
        isCentered
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(6px)" />
        <ModalContent borderRadius="16px">
          <ModalHeader>Delete flashcard set</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color={mutedText}>
              Are you sure you want to delete this set? This cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr="8px"
              onClick={() => setDeleteFlashcardSetId('')}
            >
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleConfirmDeleteFlashcardSet}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={Boolean(deleteQuizSetId)}
        onClose={() => setDeleteQuizSetId('')}
        isCentered
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(6px)" />
        <ModalContent borderRadius="16px">
          <ModalHeader>Delete quiz set</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color={mutedText}>
              Are you sure you want to delete this set? This cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr="8px"
              onClick={() => setDeleteQuizSetId('')}
            >
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleConfirmDeleteQuizSet}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={Boolean(activeNote)}
        onClose={() => setActiveNote(null)}
        size="4xl"
      >
        <ModalOverlay backdropFilter="blur(6px)" />
        <ModalContent
          borderRadius="20px"
          maxW="90vw"
          maxH="90vh"
          position="relative"
          bg={cardsBg}
        >
          <ModalHeader>{activeNote?.title || 'Study Notes'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody
            position="relative"
            overflowY="auto"
            maxH="70vh"
            ref={noteBodyRef}
          >
            <Box color={mutedText} fontSize="sm" lineHeight="1.7">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <Text fontSize="sm" mb="12px">
                      {children}
                    </Text>
                  ),
                  strong: ({ children }) => (
                    <Text as="strong" fontWeight="600">
                      {children}
                    </Text>
                  ),
                  ul: ({ children }) => (
                    <Box as="ul" pl="20px" mb="12px">
                      {children}
                    </Box>
                  ),
                  ol: ({ children }) => (
                    <Box as="ol" pl="20px" mb="12px">
                      {children}
                    </Box>
                  ),
                  li: ({ children }) => (
                    <Box as="li" mb="6px">
                      {children}
                    </Box>
                  ),
                }}
              >
                {activeNote?.content || ''}
              </ReactMarkdown>
            </Box>
          </ModalBody>
          <IconButton
            aria-label="Back to top"
            icon={<MdScrollUp />}
            size="sm"
            variant="solid"
            position="absolute"
            bottom="80px"
            right="50px"
            bg="black"
            color="white"
            _hover={{ bg: 'gray.800' }}
            animation={`${floatUp} 2.2s ease-in-out infinite`}
            onClick={() => {
              noteBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
          <ModalFooter gap="8px">
            <IconButton
              aria-label="Download notes"
              icon={<MdDownload />}
              variant="outline"
              onClick={() => handleDownloadNote(activeNote)}
            />
            <Button onClick={() => setActiveNote(null)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
