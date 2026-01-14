import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  IconButton,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import {
  MdArrowBack,
  MdArrowForward,
  MdArrowUpward,
  MdClose,
  MdKeyboardArrowDown,
  MdOpenInFull,
} from 'react-icons/md';

export default function ChatTab(props) {
  const {
    videoContext,
    chatScrollRef,
    handleChatScroll,
    messages,
    orderedMessages,
    currentUser,
    hasSessionContext,
    commandBubbleBg,
    commandTextColor,
    mutedText,
    headingColor,
    quizMap,
    quizIndexByAsset,
    quizAnswerByAsset,
    setQuizAnswerByAsset,
    setQuizIndexByAsset,
    flashcardMap,
    flashcardIndexByAsset,
    flashcardFlipByAsset,
    setFlashcardIndexByAsset,
    setFlashcardFlipByAsset,
    noteMap,
    renderSaveSetPopover,
    renderQuizSetPopover,
    notePreview,
    setActiveNote,
    cardBorder,
    cardsBg,
    flashcardFaceBg,
    correctBg,
    correctBorder,
    wrongBg,
    wrongBorder,
    partialBg,
    partialBorder,
    selectedBg,
    selectedBorder,
    neutralBg,
    normalizeQuestionType,
    formatQuestionType,
    isAnswerOptionCorrect,
    normalizeCorrectAnswer,
    splitAnswerText,
    isCorrectAnswer,
    getMultipleChoiceStatus,
    hasPending,
    shimmer,
    commandTokens,
    commandBadgeBg,
    commandBadgeText,
    commandRemainder,
    setCommandText,
    setShowSuggestions,
    showSuggestions,
    dropdownBg,
    dropdownBorder,
    dropdownHover,
    dropdownText,
    COMMAND_SUGGESTIONS,
    quizTypeRef,
    difficultyRef,
    isQuizTypeOpen,
    isDifficultyOpen,
    setIsQuizTypeOpen,
    setIsDifficultyOpen,
    quizType,
    setQuizType,
    QUIZ_TYPES,
    difficulty,
    setDifficulty,
    DIFFICULTY_OPTIONS,
    isQuiz,
    isFlashcards,
    inputBorder,
    inputBg,
    handleGenerate,
    isLoading,
    isGenerating,
    isInputEmpty,
  } = props;

  return (
    <Flex mt="18px" direction="column" flex="1" minH="0">
      <Box
        flex="1"
        minH="0"
        overflowY="auto"
        overflowX="hidden"
        pr={videoContext ? '6px' : '0'}
        ref={chatScrollRef}
        onScroll={handleChatScroll}
      >
        {!hasSessionContext ? (
          <Card
            p="16px"
            borderRadius="16px"
            border="1px solid"
            borderColor={cardBorder}
            bg={cardsBg}
          >
            <Flex align="center" justify="space-between" gap="12px">
              <Box>
                <Text fontWeight="600" color={headingColor}>
                  Add content to start chatting
                </Text>
                <Text fontSize="sm" color={mutedText} mt="4px">
                  Create a new session in Studio with your content.
                </Text>
              </Box>
            </Flex>
          </Card>
        ) : null}
        {messages.length === 0 ? (
          <Text color={mutedText}>
            Start by typing @Flashcards or @Quiz to generate content.
          </Text>
        ) : (
          <Stack spacing="28px">
            {orderedMessages.map((message) => {
              if (message.type === 'text') {
                const isUser = message.role === 'user';
                return (
                  <Flex
                    key={message._id}
                    justify={isUser ? 'flex-end' : 'flex-start'}
                    w="100%"
                  >
                    <Box maxW="820px" w="100%">
                      {isUser ? (
                        <Flex justify="flex-end" gap="10px" align="flex-start">
                          <Box
                            px="14px"
                            py="10px"
                            borderRadius="16px"
                            bg={commandBubbleBg}
                            color={commandTextColor}
                            maxW="520px"
                          >
                            <Text fontSize="sm" whiteSpace="pre-wrap">
                              {message.content}
                            </Text>
                          </Box>
                          <Avatar
                            name={currentUser?.displayName || 'User'}
                            src={currentUser?.photoURL || undefined}
                            size="sm"
                            bg={commandBubbleBg}
                            color={commandTextColor}
                          />
                        </Flex>
                      ) : (
                        <Box
                          color={headingColor}
                          fontSize="sm"
                          lineHeight="1.6"
                        >
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => (
                                <Text fontSize="sm" mb="10px">
                                  {children}
                                </Text>
                              ),
                              strong: ({ children }) => (
                                <Text as="strong" fontWeight="600">
                                  {children}
                                </Text>
                              ),
                              ul: ({ children }) => (
                                <Box as="ul" pl="18px" mb="10px">
                                  {children}
                                </Box>
                              ),
                              ol: ({ children }) => (
                                <Box as="ol" pl="18px" mb="10px">
                                  {children}
                                </Box>
                              ),
                              li: ({ children }) => (
                                <Box as="li" mb="4px">
                                  {children}
                                </Box>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </Box>
                      )}
                    </Box>
                  </Flex>
                );
              }

              if (message.type === 'command') {
                return (
                  <Flex key={message._id} justify="flex-end" w="100%">
                    <Box textAlign="right" maxW="260px">
                      <Avatar
                        name={currentUser?.displayName || 'User'}
                        src={currentUser?.photoURL || undefined}
                        size="sm"
                        mb="8px"
                        bg={commandBubbleBg}
                        color={commandTextColor}
                      />
                      <Badge
                        bg={commandBubbleBg}
                        color={commandTextColor}
                        borderRadius="999px"
                        px="14px"
                        py="6px"
                        fontSize="sm"
                      >
                        {message.content}
                      </Badge>
                    </Box>
                  </Flex>
                );
              }

              if (message.type === 'asset' && message.assetType === 'quiz') {
                const quiz = quizMap.get(String(message.assetId));
                const questionList = Array.isArray(quiz?.questions)
                  ? quiz.questions
                  : [];
                const assetKey = String(message.assetId || message._id);
                const activeIndex = quizIndexByAsset[assetKey] || 0;
                const totalQuestions = questionList.length;
                const activeQuestion = questionList[activeIndex];
                const answersForAsset = quizAnswerByAsset[assetKey] || {};
                const answerState = answersForAsset[activeIndex] || {};
                const questionType = normalizeQuestionType(
                  activeQuestion?.type,
                );
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
                const isIncorrect = answerState.status === 'incorrect';
                const resolvedCorrectAnswer = normalizeCorrectAnswer(
                  activeQuestion?.options,
                  activeQuestion?.correctAnswer,
                );
                const correctAnswerText = splitAnswerText(
                  resolvedCorrectAnswer,
                ).join(', ');
                return (
                  <Flex key={message._id} justify="flex-start" w="100%">
                    <Box maxW="820px" w="100%">
                      <Text fontSize="xs" color={mutedText} mb="6px">
                        Generated quiz
                      </Text>
                      <Flex align="center" justify="space-between" mb="12px">
                        <Text fontWeight="600" color={headingColor}>
                          Quiz generated!
                        </Text>
                        {quiz ? renderQuizSetPopover(message.assetId) : null}
                      </Flex>
                      <Card
                        p={{ base: '16px', md: '18px' }}
                        borderRadius="18px"
                        border="1px solid"
                        borderColor={cardBorder}
                        bg={cardsBg}
                      >
                        {activeQuestion ? (
                          <Stack spacing="12px">
                            <Text fontSize="xs" color={mutedText}>
                              {formatQuestionType(questionType)}
                            </Text>
                            <Text fontWeight="600" color={headingColor}>
                              {activeIndex + 1}. {activeQuestion.question}
                            </Text>
                            <Stack spacing="8px">
                              {(activeQuestion.options || []).map(
                                (option, optionIndex) => {
                                  const isOptionSelected = isMultiple
                                    ? selectedOptions.includes(option)
                                    : selectedOption === option;
                                  const isOptionCorrect = isAnswerOptionCorrect(
                                    option,
                                    resolvedCorrectAnswer,
                                  );
                                  const showResults = isMultiple
                                    ? isSubmitted
                                    : answerState.submitted;
                                  const borderColor = showResults
                                    ? isOptionSelected
                                      ? isOptionCorrect
                                        ? correctBorder
                                        : wrongBorder
                                      : isOptionCorrect &&
                                        (isIncorrect || isMultiple)
                                      ? correctBorder
                                      : cardBorder
                                    : isOptionSelected
                                    ? selectedBorder
                                    : cardBorder;
                                  const background = showResults
                                    ? isOptionSelected
                                      ? isOptionCorrect
                                        ? correctBg
                                        : wrongBg
                                      : isOptionCorrect &&
                                        (isIncorrect || isMultiple)
                                      ? correctBg
                                      : neutralBg
                                    : isOptionSelected
                                    ? selectedBg
                                    : neutralBg;
                                  return (
                                    <Box
                                      key={`${message._id}-option-${activeIndex}-${optionIndex}`}
                                      border="1px solid"
                                      borderColor={borderColor}
                                      borderRadius="12px"
                                      px="12px"
                                      py="10px"
                                      fontSize="sm"
                                      cursor="pointer"
                                      bg={background}
                                      onClick={() => {
                                        if (!activeQuestion) return;
                                        if (isMultiple) {
                                          const nextSelected =
                                            selectedOptions.includes(option)
                                              ? selectedOptions.filter(
                                                  (value) => value !== option,
                                                )
                                              : [...selectedOptions, option];
                                          setQuizAnswerByAsset((prev) => ({
                                            ...prev,
                                            [assetKey]: {
                                              ...(prev[assetKey] || {}),
                                              [activeIndex]: {
                                                selected: nextSelected,
                                                isCorrect: null,
                                                submitted: false,
                                              },
                                            },
                                          }));
                                          return;
                                        }
                                        const correct = isCorrectAnswer(
                                          option,
                                          resolvedCorrectAnswer,
                                        );
                                        setQuizAnswerByAsset((prev) => ({
                                          ...prev,
                                          [assetKey]: {
                                            ...(prev[assetKey] || {}),
                                            [activeIndex]: {
                                              selected: option,
                                              status: correct
                                                ? 'correct'
                                                : 'incorrect',
                                              submitted: true,
                                            },
                                          },
                                        }));
                                      }}
                                    >
                                      {String.fromCharCode(65 + optionIndex)}.{' '}
                                      {option}
                                    </Box>
                                  );
                                },
                              )}
                            </Stack>
                            {isMultiple && isSubmitted && (
                              <Box
                                borderRadius="12px"
                                bg={
                                  isCorrect
                                    ? correctBg
                                    : isPartial
                                    ? partialBg
                                    : wrongBg
                                }
                                border="1px solid"
                                borderColor={
                                  isCorrect
                                    ? correctBorder
                                    : isPartial
                                    ? partialBorder
                                    : wrongBorder
                                }
                                px="12px"
                                py="10px"
                              >
                                <Text
                                  fontWeight="600"
                                  color={
                                    isCorrect
                                      ? 'green.500'
                                      : isPartial
                                      ? 'yellow.600'
                                      : 'red.500'
                                  }
                                  mb="4px"
                                >
                                  {isCorrect
                                    ? 'Correct'
                                    : isPartial
                                    ? 'Partially correct'
                                    : 'Incorrect'}
                                </Text>
                                {!isCorrect && (
                                  <Text fontSize="sm" color={mutedText}>
                                    Correct answer:{' '}
                                    {correctAnswerText || 'Unavailable'}
                                  </Text>
                                )}
                              </Box>
                            )}
                            {!isMultiple && isIncorrect && (
                              <Box
                                borderRadius="12px"
                                bg={wrongBg}
                                border="1px solid"
                                borderColor={wrongBorder}
                                px="12px"
                                py="10px"
                              >
                                <Text fontWeight="600" color="red.500" mb="4px">
                                  Incorrect
                                </Text>
                                <Text fontSize="sm" color={mutedText}>
                                  Correct answer:{' '}
                                  {correctAnswerText || 'Unavailable'}
                                </Text>
                              </Box>
                            )}
                            <Flex
                              align="center"
                              justify="space-between"
                              gap="10px"
                              flexWrap="wrap"
                            >
                              <Flex align="center" gap="8px">
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
                                  <MdArrowBack />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  borderRadius="12px"
                                  onClick={() => {
                                    if (isMultiple) {
                                      const status = getMultipleChoiceStatus(
                                        selectedOptions,
                                        resolvedCorrectAnswer,
                                      );
                                      setQuizAnswerByAsset((prev) => ({
                                        ...prev,
                                        [assetKey]: {
                                          ...(prev[assetKey] || {}),
                                          [activeIndex]: {
                                            selected: selectedOptions,
                                            status,
                                            submitted: true,
                                          },
                                        },
                                      }));
                                    } else {
                                      setQuizAnswerByAsset((prev) => ({
                                        ...prev,
                                        [assetKey]: {
                                          ...(prev[assetKey] || {}),
                                          [activeIndex]: {
                                            selected: isMultiple ? [] : null,
                                            status: null,
                                            submitted: false,
                                          },
                                        },
                                      }));
                                    }
                                  }}
                                >
                                  Don't know
                                </Button>
                                {isMultiple ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    borderRadius="12px"
                                    onClick={() => {
                                      const status = getMultipleChoiceStatus(
                                        selectedOptions,
                                        resolvedCorrectAnswer,
                                      );
                                      setQuizAnswerByAsset((prev) => ({
                                        ...prev,
                                        [assetKey]: {
                                          ...(prev[assetKey] || {}),
                                          [activeIndex]: {
                                            selected: selectedOptions,
                                            status,
                                            submitted: true,
                                          },
                                        },
                                      }));
                                    }}
                                    isDisabled={selectedOptions.length === 0}
                                  >
                                    Submit
                                  </Button>
                                ) : null}
                              </Flex>
                              <Text fontSize="sm" color={mutedText}>
                                {Math.min(activeIndex + 1, totalQuestions)} /{' '}
                                {totalQuestions || 1}
                              </Text>
                              <Button
                                size="sm"
                                variant="outline"
                                borderRadius="12px"
                                onClick={() =>
                                  setQuizIndexByAsset((prev) => ({
                                    ...prev,
                                    [assetKey]: Math.min(
                                      totalQuestions - 1,
                                      activeIndex + 1,
                                    ),
                                  }))
                                }
                                isDisabled={activeIndex >= totalQuestions - 1}
                              >
                                Next
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
                  </Flex>
                );
              }

              if (
                message.type === 'asset' &&
                message.assetType === 'flashcards'
              ) {
                const flashcard = flashcardMap.get(String(message.assetId));
                const cards = Array.isArray(flashcard?.cards)
                  ? flashcard.cards
                  : [];
                const assetKey = String(message.assetId || message._id);
                const activeIndex = flashcardIndexByAsset[assetKey] || 0;
                const isFlipped = Boolean(flashcardFlipByAsset[assetKey]);
                const activeCard = cards[activeIndex] || null;
                const totalCards = cards.length;
                return (
                  <Flex key={message._id} justify="flex-start" w="100%">
                    <Box maxW="820px" w="100%">
                      <Text fontSize="xs" color={mutedText} mb="6px">
                        Created flashcards
                      </Text>
                      <Card
                        p={{ base: '16px', md: '20px' }}
                        overflow="hidden"
                        borderRadius="18px"
                        border="1px solid"
                        borderColor={cardBorder}
                        bg={cardsBg}
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
                        >
                          <Box
                            position="relative"
                            w="100%"
                            minH="320px"
                            transition="transform 0.6s"
                            transform={
                              isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'
                            }
                            sx={{
                              transformStyle: 'preserve-3d',
                              willChange: 'transform',
                            }}
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
                        <Flex
                          align="center"
                          justify="flex-end"
                          mt="14px"
                          color={mutedText}
                        >
                          <Flex
                            align="center"
                            justify="space-between"
                            p="3px"
                            gap="10px"
                          >
                            <IconButton
                              aria-label="Previous card"
                              icon={<MdArrowBack />}
                              size="sm"
                              variant="outline"
                              borderRadius="12px"
                              isDisabled={activeIndex <= 0}
                              onClick={() => {
                                setFlashcardIndexByAsset((prev) => ({
                                  ...prev,
                                  [assetKey]: Math.max(0, activeIndex - 1),
                                }));
                                setFlashcardFlipByAsset((prev) => ({
                                  ...prev,
                                  [assetKey]: false,
                                }));
                              }}
                            />
                            <Text fontSize="sm">
                              {Math.min(activeIndex + 1, totalCards)} /{' '}
                              {totalCards || 1}
                            </Text>
                            <IconButton
                              aria-label="Next card"
                              icon={<MdArrowForward />}
                              size="sm"
                              variant="outline"
                              borderRadius="12px"
                              isDisabled={activeIndex >= totalCards - 1}
                              onClick={() => {
                                setFlashcardIndexByAsset((prev) => ({
                                  ...prev,
                                  [assetKey]: Math.min(
                                    totalCards - 1,
                                    activeIndex + 1,
                                  ),
                                }));
                                setFlashcardFlipByAsset((prev) => ({
                                  ...prev,
                                  [assetKey]: false,
                                }));
                              }}
                            />
                          </Flex>
                          {renderSaveSetPopover(assetKey)}
                        </Flex>
                      </Card>
                    </Box>
                  </Flex>
                );
              }

              if (message.type === 'asset' && message.assetType === 'notes') {
                const note = noteMap.get(String(message.assetId));
                if (!note) return null;
                return (
                  <Flex key={message._id} justify="flex-start" w="100%">
                    <Card
                      p="18px"
                      borderRadius="18px"
                      border="1px solid"
                      borderColor={cardBorder}
                      bg={cardsBg}
                      maxW="820px"
                      w="100%"
                    >
                      <Text fontSize="sm" fontWeight="600" color={headingColor}>
                        {note.title || 'Study Notes'}
                      </Text>
                      <Text
                        fontSize="sm"
                        color={mutedText}
                        mt="8px"
                        noOfLines={3}
                      >
                        {notePreview(note)}
                      </Text>
                      <Flex mt="12px" justify="flex-end">
                        <IconButton
                          aria-label="Expand notes"
                          icon={<MdOpenInFull />}
                          size="sm"
                          variant="ghost"
                          onClick={() => setActiveNote(note)}
                        />
                      </Flex>
                    </Card>
                  </Flex>
                );
              }

              return null;
            })}
            {hasPending ? (
              <Text
                color={commandTextColor}
                fontSize="sm"
                fontWeight="600"
                bgGradient="linear(to-r, gray.400, gray.600, gray.400)"
                bgClip="text"
                backgroundSize="200% 100%"
                animation={`${shimmer} 1.6s ease-in-out infinite`}
              >
                Generating content...
              </Text>
            ) : null}
          </Stack>
        )}
      </Box>
      <Box mt="22px" position="sticky" bottom="0px" zIndex="2">
        <Box
          maxW="820px"
          mx="auto"
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
          boxShadow="0 10px 24px rgba(15, 23, 42, 0.08)"
        >
          <Flex flex="1" position="relative" align="center" minW="0" gap="8px">
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
                  setCommandText(`${commandTokens.join(' ')} ${nextValue}`);
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
              _focus={{ boxShadow: 'none' }}
            />
            {showSuggestions ? (
              <Box
                position="absolute"
                bottom="40px"
                left="0"
                w="220px"
                bg={dropdownBg}
                border="1px solid"
                borderColor={dropdownBorder}
                borderRadius="12px"
                boxShadow="0 10px 20px rgba(15, 23, 42, 0.12)"
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
                    color={dropdownText}
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
                        boxShadow="0 10px 20px rgba(15, 23, 42, 0.12)"
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
                          >
                            {type}
                          </Button>
                        ))}
                      </Box>
                    ) : null}
                  </Box>
                ) : null}
                {(isQuiz || isFlashcards) && (
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
                        boxShadow="0 10px 20px rgba(15, 23, 42, 0.12)"
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
                          >
                            {level}
                          </Button>
                        ))}
                      </Box>
                    ) : null}
                  </Box>
                )}
              </Flex>
              <IconButton
                aria-label="Generate"
                icon={<MdArrowUpward />}
                bg={isInputEmpty ? 'gray.400' : 'gray.800'}
                color="white"
                _hover={{ bg: isInputEmpty ? 'gray.500' : 'gray.900' }}
                borderRadius="50%"
                size="sm"
                onClick={handleGenerate}
                isLoading={isLoading || isGenerating}
                isDisabled={isInputEmpty || isGenerating}
              />
            </Flex>
          ) : (
            <>
              <IconButton
                aria-label="Generate"
                icon={<MdArrowUpward />}
                bg={isInputEmpty ? 'gray.400' : 'gray.800'}
                color="white"
                _hover={{ bg: isInputEmpty ? 'gray.500' : 'gray.900' }}
                borderRadius="50%"
                size="sm"
                onClick={handleGenerate}
                isLoading={isLoading || isGenerating}
                isDisabled={isInputEmpty || isGenerating}
              />
            </>
          )}
        </Box>
      </Box>
    </Flex>
  );
}
