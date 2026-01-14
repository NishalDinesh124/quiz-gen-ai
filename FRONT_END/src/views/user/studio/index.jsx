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
  SimpleGrid,
  Text,
  Textarea,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiClipboard, FiImage, FiLink, FiMic } from 'react-icons/fi';
import { MdArrowUpward, MdClose, MdKeyboardArrowDown } from 'react-icons/md';
import { useAuth } from 'auth/AuthContext';
import { API_ROUTES } from 'api/apiRoutes';
import { fetchWithAuth } from 'api/fetchWithAuth';
import { chunkInput } from 'utils/chunkInput';
import { useNavigate } from 'react-router-dom';
import { getExceededLimitMessage, parseGenerationIntent } from 'utils/commandRouting';

const INPUT_OPTIONS = [
  {
    id: 'upload',
    label: 'Upload',
    subtext: 'File, audio, video',
    icon: FiImage,
  },
  { id: 'link', label: 'Link', subtext: 'YouTube, Website', icon: FiLink },
  { id: 'paste', label: 'Paste', subtext: 'Copied Text', icon: FiClipboard },
  { id: 'record', label: 'Record', subtext: 'Record Lecture', icon: FiMic },
];

const DEFAULT_CATEGORY = 'Education';
const DEFAULT_DIFFICULTY = 'Basic';
const DEFAULT_LANGUAGE = 'English';
const DEFAULT_COUNT = 10;
const QUIZ_TYPES = ['Multiple Choice', 'Single Choice', 'True/False'];
const DIFFICULTY_OPTIONS = ['Basic', 'Intermediate', 'Advanced'];
const COMMAND_SUGGESTIONS = ['@Flashcards', '@Quiz', '@Notes'];
const COMMAND_MAP = {
  '@flashcards': '@Flashcards',
  '@quiz': '@Quiz',
  '@notes': '@Notes',
};

const buildTemplateReply = (tokens, sourceType) => {
  const parts = [];
  if (tokens.includes('@Flashcards')) parts.push('flashcards');
  if (tokens.includes('@Quiz')) parts.push('quiz');
  if (tokens.includes('@Notes')) parts.push('notes');
  if (parts.length === 0) return '';
  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} and ${parts.slice(-1)}`;
  const sourceLabel = sourceType ? 'your content' : 'your request';
  return `Got it — generating ${list} from ${sourceLabel}.`;
};

export default function Studio() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    isOpen: isLinkOpen,
    onOpen: onOpenLink,
    onClose: onCloseLink,
  } = useDisclosure();
  const {
    isOpen: isPasteOpen,
    onOpen: onOpenPaste,
    onClose: onClosePaste,
  } = useDisclosure();
  const [activeSource, setActiveSource] = useState('upload');
  const [commandText, setCommandText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quizType, setQuizType] = useState('Multiple Choice');
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [linkValue, setLinkValue] = useState('');
  const [linkDraft, setLinkDraft] = useState('');
  const [pasteValue, setPasteValue] = useState('');
  const [pasteDraft, setPasteDraft] = useState('');
  const [fileName, setFileName] = useState('');
  const [imageData, setImageData] = useState('');
  const [pdfData, setPdfData] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLinkSubmitting, setIsLinkSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const quizTypeRef = useRef(null);
  const difficultyRef = useRef(null);
  const isMountedRef = useRef(true);
  const [isQuizTypeOpen, setIsQuizTypeOpen] = useState(false);
  const [isDifficultyOpen, setIsDifficultyOpen] = useState(false);
  const headingColor = useColorModeValue('navy.700', 'white');
  const secondaryText = useColorModeValue(
    'secondaryGray.600',
    'secondaryGray.400',
  );
  const cardBg = useColorModeValue('transparent', 'transparent');
  const tileBg = useColorModeValue('white', 'black');
  const tileBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
  const tileActiveBorder = useColorModeValue('gray.300', 'blue.500');
  const tileShadow = useColorModeValue(
    '0 8px 20px rgba(15, 23, 42, 0.06)',
    'none',
  );
  const inputBg = useColorModeValue('white', 'whiteAlpha.100');
  const inputBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
  const dropdownBg = tileBg;
  const dropdownBorder = inputBorder;
  const dropdownHover = useColorModeValue('gray.100', "whiteAlpha.100");
  const dropdownText = useColorModeValue('gray.700', 'white');
  const modalBg = useColorModeValue('white', 'navy.800');
  const iconTone = useColorModeValue('gray.600', 'gray.200');
  const inputTextColor = useColorModeValue('gray.700', 'white');
  const commandBadgeBg = useColorModeValue('purple.50', 'purple.900');
  const commandBadgeText = useColorModeValue('purple.600', 'purple.200');

  const commandTokens = useMemo(() => {
    const matches = commandText.match(/@flashcards|@quiz|@notes/gi) || [];
    const normalized = matches.map(
      (token) => COMMAND_MAP[token.toLowerCase()] || token,
    );
    return Array.from(new Set(normalized));
  }, [commandText]);
  const isQuiz = commandTokens.includes('@Quiz');
  const commandRemainder = useMemo(() => {
    if (commandTokens.length === 0) return commandText;
    return commandText.replace(/@flashcards|@quiz|@notes/gi, '').trimStart();
  }, [commandText, commandTokens]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  const buildSessionTitle = () => {
    if (fileName) {
      return fileName.replace(/\.[^/.]+$/, '') || 'New chat';
    }
    if (linkValue) {
      try {
        const url = new URL(linkValue);
        return url.hostname.replace('www.', '') || 'New chat';
      } catch (error) {
        return 'New chat';
      }
    }
    if (pasteValue) {
      return pasteValue.trim().slice(0, 48) || 'New chat';
    }
    if (commandText.trim()) {
      return commandText.trim().slice(0, 48) || 'New chat';
    }
    return 'New chat';
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    const hasContext =
      linkValue.trim().length > 0 ||
      pasteValue.trim().length > 0 ||
      fileName ||
      imageData ||
      pdfData;
    if (!commandText.trim() && !hasContext) {
      toast({
        title: 'Add some context first.',
        description: 'Upload a file, paste a link, or add text to continue.',
        status: 'warning',
        position: 'top-right',
        isClosable: true,
      });
      return;
    }
    if (!currentUser) {
      toast({
        title: 'Please sign in.',
        description: 'Login to generate flashcards.',
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
    const rawPrompt = commandRemainder.trim() || commandText.trim();
    const shouldChat =
      rawPrompt.length > 0 &&
      (effectiveTokens.length === 0 || commandRemainder.trim().length > 0);
    if (!hasContext) {
      toast({
        title: 'Add content to continue.',
        description: 'Upload a file, paste a link, or add text as context.',
        status: 'warning',
        position: 'top-right',
        isClosable: true,
      });
      return;
    }

    const chunks =
      pasteValue.trim().length > 0
        ? chunkInput({ text: pasteValue.trim() })
      : linkValue.trim().length > 0
        ? chunkInput({ url: linkValue.trim() })
        : rawPrompt
        ? chunkInput({ text: rawPrompt })
        : [];
    const resolvedSourceType = imageData
      ? 'image'
      : pdfData
      ? 'pdf'
      : linkValue.trim().length > 0
      ? 'link'
      : pasteValue.trim().length > 0
      ? 'text'
      : '';
    const resolvedSourceValue =
      resolvedSourceType === 'link'
        ? linkValue.trim()
        : resolvedSourceType === 'image' || resolvedSourceType === 'pdf'
        ? fileName
        : '';

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
        setIsGenerating(true);
        try {
          const sessionResponse = await fetchWithAuth(API_ROUTES.SESSIONS.CREATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: buildSessionTitle() }),
          });
          if (!sessionResponse.ok) {
            throw new Error('Failed to create session.');
          }
          const sessionPayload = await sessionResponse.json();
          const sessionId = sessionPayload?.session?._id;
          if (!sessionId) {
            throw new Error('Session missing.');
          }

          const contextResponse = await fetchWithAuth(
            API_ROUTES.SESSIONS.ADD_CONTEXT(sessionId),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sourceType: resolvedSourceType,
                sourceValue: resolvedSourceValue,
                text: pasteValue.trim(),
                imageData,
                pdfData,
              }),
            },
          );
          if (!contextResponse.ok) {
            throw new Error('Failed to add context.');
          }

          const chatResponse = await fetchWithAuth(
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
          if (!chatResponse.ok) {
            throw new Error('Failed to send message.');
          }

          navigate(`/history/${sessionId}`);
          return;
        } catch (error) {
          toast({
            title: 'Unable to create session.',
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

    if (
      effectiveTokens.length > 0 &&
      (!chunks || chunks.length === 0) &&
      !imageData &&
      !pdfData
    ) {
      toast({
        title: 'Missing content.',
        description: 'Add text, link, or upload a file.',
        status: 'warning',
        position: 'top-right',
        isClosable: true,
      });
      return;
    }

    const isYoutubeLink = /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)/i.test(
      linkValue.trim(),
    );
    setIsGenerating(true);
    const startedAt = Date.now();
    try {
      const sessionResponse = await fetchWithAuth(API_ROUTES.SESSIONS.CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: buildSessionTitle() }),
      });
      if (!sessionResponse.ok) {
        throw new Error('Failed to create session.');
      }
      const sessionPayload = await sessionResponse.json();
      const sessionId = sessionPayload?.session?._id;
      if (!sessionId) {
        throw new Error('Session missing.');
      }

      await fetchWithAuth(API_ROUTES.SESSIONS.ADD_CONTEXT(sessionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: resolvedSourceType,
          sourceValue: resolvedSourceValue,
          text: pasteValue.trim(),
          imageData,
          pdfData,
        }),
      });

      const requests = [];
      const enqueueRequest = (label, request) => {
        requests.push(
          request
            .then((response) => ({ label, response }))
            .catch((error) => ({ label, error })),
        );
      };
      if (shouldChat) {
        const replyOverride =
          effectiveTokens.length > 0
            ? buildTemplateReply(effectiveTokens, resolvedSourceType)
            : '';
        enqueueRequest(
          'chat',
          fetchWithAuth(API_ROUTES.SESSIONS.SEND_MESSAGE(sessionId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: rawPrompt,
              reply: replyOverride || undefined,
              mode: replyOverride ? 'generator' : 'chat',
            }),
          }),
        );
      }
      if (isYoutubeLink && linkValue.trim()) {
        enqueueRequest(
          'video',
          fetchWithAuth(API_ROUTES.VIDEOS.CREATE_YOUTUBE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, url: linkValue.trim() }),
          }),
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
          imageData,
          pdfData,
          sessionId,
          sourceType: resolvedSourceType,
          sourceValue: resolvedSourceValue,
        };
        enqueueRequest(
          'flashcards',
          fetchWithAuth(API_ROUTES.FLASHCARDS.CREATE_FLASHCARDS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
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
          imageData,
          pdfData,
          sessionId,
          sourceType: resolvedSourceType,
          sourceValue: resolvedSourceValue,
        };
        enqueueRequest(
          'quizzes',
          fetchWithAuth(API_ROUTES.QUIZZES.CREATE_QUIZ, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
        );
      }
      if (effectiveTokens.includes('@Notes')) {
        const payload = {
          title: 'Study Notes',
          language: DEFAULT_LANGUAGE,
          chunks,
          imageData,
          pdfData,
          sessionId,
          sourceType: resolvedSourceType,
          sourceValue: resolvedSourceValue,
        };
        enqueueRequest(
          'notes',
          fetchWithAuth(API_ROUTES.NOTES.CREATE_NOTE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
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

      const settlePromise = Promise.all(requests);
      settlePromise
        .then((results) => {
          const failures = results.filter((result) => !result.response?.ok);
          if (failures.length > 0 && isMountedRef.current) {
            toast({
              title: 'Some content failed to generate.',
              description: 'You can retry the failed items from the session.',
              status: 'warning',
              position: 'top-right',
              isClosable: true,
            });
          }
        })
        .finally(() => {
          if (isMountedRef.current) {
            setIsGenerating(false);
          }
        });

      await waitForFirstSuccess(requests);

      const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      navigate(`/history/${sessionId}`, {
        state: { seconds: elapsed, pendingTypes: effectiveTokens },
      });
    } catch (error) {
      toast({
        title: 'Generation failed.',
        description: 'Please try again in a moment.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const handleAddLink = async () => {
    const nextLink = linkDraft.trim();
    if (!nextLink) {
      onCloseLink();
      return;
    }
    setLinkValue(nextLink);
    setActiveSource('link');

    const isYoutubeLink = /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)/i.test(
      nextLink,
    );
    if (!isYoutubeLink) {
      onCloseLink();
      return;
    }
    if (!currentUser) {
      toast({
        title: 'Please sign in.',
        description: 'Login to continue.',
        status: 'warning',
        position: 'top-right',
        isClosable: true,
      });
      return;
    }
    if (isLinkSubmitting) return;
    setIsLinkSubmitting(true);
    try {
      const sessionResponse = await fetchWithAuth(API_ROUTES.SESSIONS.CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: buildSessionTitle() }),
      });
      if (!sessionResponse.ok) {
        throw new Error('Failed to create session.');
      }
      const sessionPayload = await sessionResponse.json();
      const sessionId = sessionPayload?.session?._id;
      if (!sessionId) {
        throw new Error('Session missing.');
      }
      const response = await fetchWithAuth(API_ROUTES.VIDEOS.CREATE_YOUTUBE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, url: nextLink }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch video transcript.');
      }
      navigate(`/history/${sessionId}`);
    } catch (error) {
      toast({
        title: 'Unable to load video.',
        description: 'Please try again in a moment.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    } finally {
      setIsLinkSubmitting(false);
    }
  };

  return (
    <Box pt={{ base: '120px', md: '96px', lg: '80px' }}>
      <Box maxW="1200px" mx="auto">
        <Box maxW={{ base: '100%', md: '760px' }} mx="auto" mt="12px">
          <Card
            mt="24px"
            p={{ base: '16px', md: '20px' }}
            borderRadius="24px"
            bg={cardBg}
            border="none"
            boxShadow="none"
          >
            <Flex justify="center">
              <Text
                fontSize={{ base: '26px', md: '32px' }}
                fontWeight="500"
                color={headingColor}
                letterSpacing="-0.3px"
              >
                Hey {currentUser?.displayName || 'there'}, ready to learn?
              </Text>
            </Flex>

            <SimpleGrid columns={{ base: 2, md: 4 }} gap="16px" mt="22px">
              {INPUT_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  variant="unstyled"
                  borderRadius="20px"
                  border="1px solid"
                  borderColor={
                    activeSource === option.id ? tileActiveBorder : tileBorder
                  }
                  bg={tileBg}
                  boxShadow={tileShadow}
                  h="96px"
                  justifyContent="flex-start"
                  px="16px"
                  py="12px"
                  onClick={() => {
                    setActiveSource(option.id);
                    if (option.id === 'upload') {
                      fileInputRef.current?.click();
                    }
                    if (option.id === 'link') {
                      setLinkDraft(linkValue);
                      onOpenLink();
                    }
                    if (option.id === 'paste') {
                      setPasteDraft(pasteValue);
                      onOpenPaste();
                    }
                  }}
                >
                  <Flex align="center" gap="12px">
                    <Box
                      w="34px"
                      h="34px"
                      borderRadius="14px"
                      bg="transparent"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon as={option.icon} color={iconTone} />
                    </Box>
                    <Box textAlign="left">
                      <Text fontWeight="600" color={headingColor} fontSize="sm">
                        {option.label}
                      </Text>
                      <Text fontSize="xs" color={secondaryText} noOfLines={1}>
                        {option.subtext}
                      </Text>
                    </Box>
                  </Flex>
                </Button>
              ))}
            </SimpleGrid>

            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              display="none"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setFileName('');
                  setImageData('');
                  setPdfData('');
                  return;
                }
                setFileName(file.name || '');
                const reader = new FileReader();
                reader.onload = () => {
                  if (file.type.startsWith('image/')) {
                    setImageData(reader.result || '');
                    setPdfData('');
                  } else {
                    setPdfData(reader.result || '');
                    setImageData('');
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            {fileName ? (
              <Text fontSize="xs" color={secondaryText} mt="10px">
                Uploaded: {fileName}
              </Text>
            ) : null}

            <Box
              mt="22px"
              borderRadius={commandTokens.length ? '20px' : '999px'}
              border="1px solid"
              borderColor={inputBorder}
              bg={inputBg}
              px="18px"
              py={commandTokens.length ? '12px' : '6px'}
              display="flex"
              flexDirection={commandTokens.length ? 'column' : 'row'}
              alignItems={commandTokens.length ? 'stretch' : 'center'}
              gap={commandTokens.length ? '10px' : '0'}
              boxShadow={tileShadow}
              transition="padding 0.2s ease"
            >
              <Flex
                flex="1"
                position="relative"
                align="center"
                minW="0"
                gap="8px"
              >
                {commandTokens.map((token) => (
                  <Flex
                    key={token}
                    align="center"
                    bg={commandBadgeBg}
                    color={commandBadgeText}
                    borderRadius="999px"
                    px="8px"
                    py="4px"
                    fontSize="sm"
                    fontWeight="600"
                    whiteSpace="nowrap"
                    gap="6px"
                  >
                    <Text>{token}</Text>
                    <IconButton
                      aria-label="Clear command"
                      icon={<MdClose />}
                      size="xs"
                      variant="ghost"
                      minW="20px"
                      h="20px"
                      borderRadius="full"
                      onClick={() => {
                        const nextTokens = commandTokens.filter(
                          (item) => item !== token,
                        );
                        const nextText = nextTokens.length
                          ? `${nextTokens.join(' ')} ${commandRemainder}`
                          : commandRemainder;
                        setCommandText(nextText);
                      }}
                    />
                  </Flex>
                ))}
                <Input
                  placeholder="Learn anything"
                  value={commandRemainder}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (commandTokens.length > 0) {
                      setCommandText(
                        `${commandTokens.join(' ')} ${nextValue}`,
                      );
                    } else {
                      setCommandText(nextValue);
                    }
                    const lastToken = nextValue.split(/\s+/).pop() || '';
                    setShowSuggestions(lastToken.startsWith('@'));
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 120);
                  }}
                  onFocus={() => {
                    const lastToken = commandRemainder.split(/\s+/).pop() || '';
                    setShowSuggestions(lastToken.startsWith('@'));
                  }}
                  bg="transparent"
                  border="none"
                  h="28px"
                  fontSize="sm"
                  lineHeight="28px"
                  py="0"
                  px="0"
                  flex="1"
                  minW="0"
                  color={inputTextColor}
                  _focus={{ boxShadow: 'none' }}
                />
                {showSuggestions ? (
                  <Box
                    position="absolute"
                    bottom="40px"
                    left="0"
                    w="220px"
                    bg={tileBg}
                    border="1px solid"
                    borderColor={inputBorder}
                    borderRadius="12px"
                    boxShadow={tileShadow}
                    py="6px"
                    zIndex="10"
                  >
                    {COMMAND_SUGGESTIONS.map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="ghost"
                        w="100%"
                        justifyContent="flex-start"
                        size="sm"
                        fontWeight="500"
                        borderRadius="10px"
                        mx="6px"
                        _hover={{ bg: dropdownHover }}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          const cleanedRemainder = commandRemainder
                            .replace(/@[\w-]*$/i, '')
                            .trim();
                          const nextTokens = Array.from(
                            new Set([...commandTokens, suggestion]),
                          );
                          const nextText = nextTokens.length
                            ? `${nextTokens.join(' ')} ${cleanedRemainder}`
                            : cleanedRemainder;
                          setCommandText(nextText);
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </Box>
                ) : null}
              </Flex>
              {commandTokens.length > 0 ? (
                <Flex align="center" justify="space-between" gap="10px">
                  <Flex align="center" gap="8px" flexWrap="wrap">
                    {isQuiz ? (
                      <Box position="relative" ref={quizTypeRef}>
                        <Button
                          size="xs"
                          variant="ghost"
                          rightIcon={<MdKeyboardArrowDown />}
                          border="1px solid"
                          borderColor={inputBorder}
                          borderRadius="999px"
                          px="10px"
                          onClick={() => {
                            setIsQuizTypeOpen((prev) => !prev);
                            setIsDifficultyOpen(false);
                          }}
                        >
                          {quizType}
                        </Button>
                        {isQuizTypeOpen ? (
                          <Box
                            position="absolute"
                            bottom="34px"
                            left="0"
                            minW="180px"
                            bg={dropdownBg}
                            border="1px solid"
                            borderColor={dropdownBorder}
                            borderRadius="12px"
                            boxShadow={tileShadow}
                            py="6px"
                            zIndex="10"
                          >
                            {QUIZ_TYPES.map((type) => (
                              <Button
                                key={type}
                                variant="ghost"
                                w="100%"
                                justifyContent="flex-start"
                                size="sm"
                                fontWeight="500"
                                borderRadius="10px"
                                mx="6px"
                                color={dropdownText}
                                _hover={{ bg: dropdownHover }}
                                onClick={() => {
                                  setQuizType(type);
                                  setIsQuizTypeOpen(false);
                                }}
                                whiteSpace="nowrap"
                              >
                                {type}
                              </Button>
                            ))}
                          </Box>
                        ) : null}
                      </Box>
                    ) : null}
                    <Box position="relative" ref={difficultyRef}>
                      <Button
                        size="xs"
                        variant="ghost"
                        rightIcon={<MdKeyboardArrowDown />}
                        border="1px solid"
                        borderColor={inputBorder}
                        borderRadius="999px"
                        px="10px"
                        onClick={() => {
                          setIsDifficultyOpen((prev) => !prev);
                          setIsQuizTypeOpen(false);
                        }}
                      >
                        {difficulty}
                      </Button>
                      {isDifficultyOpen ? (
                        <Box
                          position="absolute"
                          bottom="34px"
                          left="0"
                          minW="160px"
                          bg={dropdownBg}
                          border="1px solid"
                          borderColor={dropdownBorder}
                          borderRadius="12px"
                          boxShadow={tileShadow}
                          py="6px"
                          zIndex="10"
                        >
                          {DIFFICULTY_OPTIONS.map((level) => (
                            <Button
                              key={level}
                              variant="ghost"
                              w="100%"
                              justifyContent="flex-start"
                              size="sm"
                              fontWeight="500"
                              borderRadius="10px"
                              mx="6px"
                              color={dropdownText}
                              _hover={{ bg: dropdownHover }}
                              onClick={() => {
                                setDifficulty(level);
                                setIsDifficultyOpen(false);
                              }}
                              whiteSpace="nowrap"
                            >
                              {level}
                            </Button>
                          ))}
                        </Box>
                      ) : null}
                    </Box>
                  </Flex>
                  <IconButton
                    aria-label="Generate"
                    icon={<MdArrowUpward />}
                    bg={commandText.trim().length > 0 ? 'gray.700' : 'gray.400'}
                    color="white"
                    _hover={{
                      bg:
                        commandText.trim().length > 0 ? 'gray.800' : 'gray.500',
                    }}
                    borderRadius="50%"
                    size="sm"
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    isDisabled={isGenerating}
                  />
                </Flex>
              ) : (
                <IconButton
                  aria-label="Generate"
                  icon={<MdArrowUpward />}
                  bg={commandText.trim().length > 0 ? 'gray.700' : 'gray.400'}
                  color="white"
                  _hover={{
                    bg: commandText.trim().length > 0 ? 'gray.800' : 'gray.500',
                  }}
                  borderRadius="50%"
                  size="sm"
                  onClick={handleGenerate}
                  isLoading={isGenerating}
                  isDisabled={isGenerating}
                />
              )}
            </Box>
          </Card>
        </Box>
        <Modal isOpen={isLinkOpen} onClose={onCloseLink} isCentered>
          <ModalOverlay bg="rgba(15, 23, 42, 0.5)" backdropFilter="blur(6px)" />
          <ModalContent borderRadius="20px" bg={modalBg}>
            <ModalHeader fontSize="lg" fontWeight="700">
              YouTube, Website
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text fontSize="sm" color={secondaryText} mb="12px">
                YouTube (videos & playlists), websites, arXiv, and public file
                URLs: .pdf, .docx, .pptx, .mp3, .mp4
              </Text>
              <Input
                placeholder="https://"
                value={linkDraft}
                onChange={(event) => setLinkDraft(event.target.value)}
                bg={inputBg}
                borderColor={inputBorder}
                borderRadius="14px"
              />
            </ModalBody>
            <ModalFooter>
              <Button
                w="100%"
                borderRadius="14px"
                colorScheme="gray"
                onClick={handleAddLink}
                isLoading={isLinkSubmitting}
              >
                Add
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        <Modal isOpen={isPasteOpen} onClose={onClosePaste} isCentered>
          <ModalOverlay bg="rgba(15, 23, 42, 0.5)" backdropFilter="blur(6px)" />
          <ModalContent borderRadius="20px" bg={modalBg}>
            <ModalHeader fontSize="lg" fontWeight="700">
              Paste Text
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text fontSize="sm" color={secondaryText} mb="12px">
                Copy and paste text to add as content.
              </Text>
              <Textarea
                placeholder="Paste your notes here"
                value={pasteDraft}
                onChange={(event) => setPasteDraft(event.target.value)}
                bg={inputBg}
                borderColor={inputBorder}
                borderRadius="14px"
                minH="120px"
              />
            </ModalBody>
            <ModalFooter>
              <Button
                w="100%"
                borderRadius="14px"
                colorScheme="gray"
                onClick={() => {
                  setPasteValue(pasteDraft.trim());
                  setActiveSource('paste');
                  onClosePaste();
                }}
              >
                Add
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </Box>
  );
}
