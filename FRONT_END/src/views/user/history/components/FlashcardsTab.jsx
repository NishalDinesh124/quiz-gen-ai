import React from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  IconButton,
  Input,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Progress,
  Skeleton,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  MdAdd,
  MdArrowBack,
  MdDelete,
  MdEdit,
  MdMoreVert,
  MdStarBorder,
  MdTune,
} from 'react-icons/md';

export default function FlashcardsTab({
  videoContext,
  activeSetView,
  isEditingSet,
  isSetsLoading,
  isSetViewLoading,
  flashcardSets,
  editedCards,
  headingColor,
  mutedText,
  cardBorder,
  cardsBg,
  btnBg,
  btnHover,
  inputBg,
  inputBorder,
  tabsActiveBg,
  tabsBg,
  isSavingSet,
  handleAddCard,
  handleDeleteCard,
  handleEditCardChange,
  handleSaveSetEdits,
  setIsEditingSet,
  setActiveSetView,
  handleOpenSet,
  renderFlashcardViewer,
  startEditSet,
  flashcardStudyMode,
  setFlashcardStudyMode,
  flashcardStudyActive,
  flashcardCooldownLabel,
  isFlashcardCooldown,
  handleStartFlashcardStudy,
  flashcardProgress,
  flashcardAttemptCards,
  getFlashcardReviewBadge,
  handleQuickDeleteCard,
  onEditSetTitle,
  onDeleteSet,
  editSetId,
  editSetTitle,
  onEditSetTitleChange,
  onConfirmEditSetTitle,
  onCancelEditSetTitle,
}) {
  const progressTrack = useColorModeValue('gray.200', 'whiteAlpha.200');
  const progressFill = useColorModeValue('purple.400', 'purple.300');
  const progressCardBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const progressSubtle = useColorModeValue('gray.600', 'gray.300');
  const iconMuted = useColorModeValue('gray.500', 'gray.400');
  const badgeDueBg = useColorModeValue('red.50', 'red.900');
  const badgeDueText = useColorModeValue('red.500', 'red.200');
  const badgeLaterBg = useColorModeValue('gray.100', 'whiteAlpha.200');

  const notStudiedCount = flashcardProgress?.notStudied || 0;
  const toReviewCount = flashcardProgress?.toReview || 0;
  const progressPct = flashcardProgress?.progressPct || 0;
  const attemptCards = Array.isArray(flashcardAttemptCards)
    ? flashcardAttemptCards
    : [];
  const attemptCardMap = new Map(
    attemptCards.map((card) => [Number(card.index), card]),
  );

  return (
    <Box
      mt="18px"
      flex="1"
      minH="0"
      display="flex"
      flexDirection="column"
      overflowY={activeSetView || isEditingSet ? 'hidden' : 'auto'}
      overflowX="hidden"
      pr={videoContext ? '6px' : '0'}
    >
      {isSetsLoading ? (
        <Stack spacing="12px">
          {[0, 1, 2].map((item) => (
            <Card
              key={item}
              p="18px"
              borderRadius="18px"
              border="1px solid"
              borderColor={cardBorder}
              bg={cardsBg}
            >
              <Skeleton height="14px" width="60%" />
              <Skeleton mt="10px" height="12px" width="40%" />
            </Card>
          ))}
        </Stack>
      ) : isSetViewLoading ? (
        <Card
          p="18px"
          borderRadius="18px"
          border="1px solid"
          borderColor={cardBorder}
          bg={cardsBg}
        >
          <Text color={mutedText}>Loading set...</Text>
        </Card>
      ) : activeSetView ? (
        <Flex direction="column" flex="1" minH="0" overflow="auto">
          {isEditingSet ? (
            <>
              <Flex align="center" justify="space-between" mb="16px">
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<MdArrowBack />}
                  onClick={() => setIsEditingSet(false)}
                >
                  Go Back
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<MdAdd />}
                  onClick={handleAddCard}
                >
                  Add Card
                </Button>
              </Flex>
              <Stack
                spacing="16px"
                flex="1"
                minH="0"
                overflowY="auto"
                overflowX="hidden"
                pr="6px"
                pb="24px"
              >
                {editedCards.map((card, index) => (
                  <Card
                    key={`${activeSetView._id}-${index}`}
                    p="16px"
                    borderRadius="18px"
                    border="1px solid"
                    borderColor={cardBorder}
                    bg={cardsBg}
                  >
                    <Flex align="center" justify="space-between" mb="12px">
                      <Text fontWeight="600" color={headingColor}>
                        Card {index + 1}
                      </Text>
                      <IconButton
                        aria-label="Delete card"
                        icon={<MdDelete />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCard(index)}
                      />
                    </Flex>
                    <Stack spacing="10px">
                      <Box>
                        <Text fontSize="xs" color={mutedText} mb="6px">
                          Term
                        </Text>
                        <Input
                          value={card.front}
                          onChange={(event) =>
                            handleEditCardChange(index, 'front', event.target.value)
                          }
                          bg={inputBg}
                          borderColor={inputBorder}
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" color={mutedText} mb="6px">
                          Definition
                        </Text>
                        <Input
                          value={card.back}
                          onChange={(event) =>
                            handleEditCardChange(index, 'back', event.target.value)
                          }
                          bg={inputBg}
                          borderColor={inputBorder}
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" color={mutedText} mb="6px">
                          Explanation
                        </Text>
                        <Input
                          value={card.explanation || ''}
                          onChange={(event) =>
                            handleEditCardChange(index, 'explanation', event.target.value)
                          }
                          bg={inputBg}
                          borderColor={inputBorder}
                        />
                      </Box>
                    </Stack>
                  </Card>
                ))}
              </Stack>
              <Flex justify="flex-end" mt="16px">
                <Button onClick={handleSaveSetEdits} isLoading={isSavingSet}>
                  Save Changes
                </Button>
              </Flex>
            </>
          ) : (
            <>
              <Flex align="center" justify="space-between" mb="12px" gap="12px">
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<MdArrowBack />}
                  alignSelf="flex-start"
                  onClick={() => setActiveSetView(null)}
                >
                  Back to sets
                </Button>
                <Flex
                  p="5px"
                  bg={tabsBg}
                  borderRadius="12px"
                  gap="4px"
                >
                  <Button
                    size="sm"
                    borderRadius="99px"
                    _hover={{cursor:"pointer"}}
                    variant={flashcardStudyMode === 'spaced' ? 'solid' : 'ghost'}
                    bg={flashcardStudyMode === 'spaced' ? tabsActiveBg : 'transparent'}
                    onClick={() => setFlashcardStudyMode('spaced')}
                  >
                    Spaced Repetition
                  </Button>
                  <Button
                    size="sm"
                    borderRadius="999px"
                    variant={flashcardStudyMode === 'fast' ? 'solid' : 'ghost'}
                    bg={flashcardStudyMode === 'fast' ? tabsActiveBg : 'transparent'}
                    onClick={() => setFlashcardStudyMode('fast')}
                  >
                    Fast Review
                  </Button>
                </Flex>
              </Flex>
              {flashcardStudyMode === 'spaced' && !flashcardStudyActive ? (
                <Box>
                  <Flex align="center" justify="space-between" mb="12px">
                    <Text fontWeight="600" color={headingColor}>
                      Cards for today
                    </Text>
                    <IconButton
                      aria-label="Filter"
                      icon={<MdTune />}
                      size="sm"
                      variant="ghost"
                    />
                  </Flex>
                  <Box
                    p="20px"
                    borderRadius="20px"
                    bg={progressCardBg}
                  >
                    {isFlashcardCooldown ? (
                      <Box
                        mb="16px"
                        borderRadius="16px"
                        bg={progressTrack}
                        px="16px"
                        py="18px"
                        textAlign="center"
                      >
                        <Text fontWeight="600" color={headingColor} mb="6px">
                          The deck&apos;s done for now!
                        </Text>
                        <Text fontSize="sm" color={mutedText}>
                          Cards will be available in
                        </Text>
                        <Text fontSize="lg" fontWeight="700" color={headingColor}>
                          {flashcardCooldownLabel}
                        </Text>
                      </Box>
                    ) : null}
                    <Flex
                      align="center"
                      justify="center"
                      gap={{ base: '18px', md: '28px' }}
                      wrap="wrap"
                    >
                      <CircularProgress
                        value={progressPct}
                        size="96px"
                        thickness="10px"
                        color={progressFill}
                        trackColor={progressTrack}
                      >
                        <CircularProgressLabel fontWeight="700" color={headingColor}>
                          {toReviewCount}
                        </CircularProgressLabel>
                      </CircularProgress>
                      <Flex gap="24px" align="center">
                        <Flex direction="column" gap="4px">
                          <Flex align="center" gap="8px">
                            <Icon as={MdStarBorder} color={iconMuted} />
                            <Text fontWeight="600" color={headingColor}>
                              {notStudiedCount}
                            </Text>
                          </Flex>
                          <Text fontSize="sm" color={progressSubtle}>
                            Not Studied
                          </Text>
                        </Flex>
                        <Flex direction="column" gap="4px">
                          <Flex align="center" gap="8px">
                            <Box
                              w="10px"
                              h="10px"
                              borderRadius="50%"
                              bg={progressFill}
                            />
                            <Text fontWeight="600" color={headingColor}>
                              {toReviewCount}
                            </Text>
                          </Flex>
                          <Text fontSize="sm" color={progressSubtle}>
                            To review
                          </Text>
                        </Flex>
                      </Flex>
                    </Flex>
                    <Button
                      mt="18px"
                      w="100%"
                      borderRadius="999px"
                      bg={btnBg}
                      color={cardsBg}
                      _hover={{bg:btnBg}}
                      isDisabled={isFlashcardCooldown}
                      onClick={() => handleStartFlashcardStudy({})}
                    >
                      {isFlashcardCooldown
                        ? `Next review in ${flashcardCooldownLabel}`
                        : 'Study Cards'}
                    </Button>
                  </Box>
                  <Box mt="22px">
                    <Text fontWeight="600" color={headingColor} mb="10px">
                      Deck progress
                    </Text>
                    <Flex align="center" gap="16px" mb="10px">
                      <Flex align="center" gap="8px" color={progressSubtle}>
                        <Box w="8px" h="8px" borderRadius="50%" bg={iconMuted} />
                        <Text fontSize="sm">
                          {notStudiedCount} Not Studied
                        </Text>
                      </Flex>
                      <Flex align="center" gap="8px" color={progressSubtle}>
                        <Box w="8px" h="8px" borderRadius="50%" bg={progressFill} />
                        <Text fontSize="sm">
                          {toReviewCount} To review
                        </Text>
                      </Flex>
                    </Flex>
    <Progress
      value={toReviewCount}
      max={Math.max(1, flashcardProgress?.total || 0)}
      height="10px"
      borderRadius="999px"
      colorScheme="purple"
      trackColor={progressTrack}
      w="100%"
      bg={progressTrack}
    />
                  </Box>
                </Box>
              ) : null}
              {flashcardStudyMode === 'spaced' && !flashcardStudyActive ? (
                <Box mt="20px">
                  <Flex align="center" justify="space-between" mb="14px">
                    <Text fontWeight="600" color={headingColor}>
                      Flashcards ({activeSetView.cards?.length || 0})
                    </Text>
                    <Button
                      size="sm"
                      variant="outline"
                      borderRadius="999px"
                      borderStyle="dashed"
                      leftIcon={<MdAdd />}
                      onClick={() => {
                        setIsEditingSet(true);
                        handleAddCard();
                      }}
                    >
                      Add Card
                    </Button>
                  </Flex>
                  <Stack spacing="16px">
                    {activeSetView.cards?.map((card, index) => {
                      const attemptState = attemptCardMap.get(index);
                      const badge = getFlashcardReviewBadge?.(
                        attemptState?.nextReviewAt,
                      ) || { label: 'Due Now', isDue: true };
                      return (
                        <Card
                          key={`${activeSetView._id}-review-${index}`}
                          p="16px"
                          borderRadius="18px"
                          border="1px solid"
                          borderColor={cardBorder}
                          bg={cardsBg}
                        >
                          <Flex align="center" justify="space-between" mb="12px">
                            <Flex align="center" gap="10px">
                              <Text fontWeight="600" color={headingColor}>
                                Card {index + 1}
                              </Text>
                              <IconButton
                                aria-label="Favorite card"
                                icon={<MdStarBorder />}
                                size="sm"
                                variant="ghost"
                              />
                              <Badge
                                borderRadius="999px"
                                px="10px"
                                py="4px"
                                bg={badge.isDue ? badgeDueBg : badgeLaterBg}
                                color={badge.isDue ? badgeDueText : headingColor}
                                textTransform="none"
                                fontSize="xs"
                              >
                                {badge.label}
                              </Badge>
                            </Flex>
                            <IconButton
                              aria-label="Delete card"
                              icon={<MdDelete />}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleQuickDeleteCard(index)}
                            />
                          </Flex>
                          <Stack spacing="10px">
                            <Box>
                              <Text fontSize="xs" color={mutedText} mb="6px">
                                Term *
                              </Text>
                              <Input
                                value={card.front}
                                isReadOnly
                                bg={inputBg}
                                borderColor={inputBorder}
                              />
                            </Box>
                            <Box>
                              <Text fontSize="xs" color={mutedText} mb="6px">
                                Definition *
                              </Text>
                              <Input
                                value={card.back}
                                isReadOnly
                                bg={inputBg}
                                borderColor={inputBorder}
                              />
                            </Box>
                            <Text fontSize="xs" color={mutedText}>
                              Show more options
                            </Text>
                          </Stack>
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>
              ) : null}
              <Box
                flex="1"
                minH="0"
                overflowY="auto"
                overflowX="hidden"
                pr="6px"
                w="100%"
                pb="24px"
              >
                {(flashcardStudyMode === 'fast' || flashcardStudyActive) &&
                  renderFlashcardViewer(activeSetView, String(activeSetView._id), {
                    showSaveSet: false,
                    showEdit: true,
                    onEdit: startEditSet,
                  })}
              </Box>
            </>
          )}
        </Flex>
      ) : flashcardSets.length === 0 ? (
        <Card
          p="18px"
          borderRadius="18px"
          border="1px solid"
          borderColor={cardBorder}
        >
          <Text color={mutedText}>No saved flashcard sets yet.</Text>
        </Card>
      ) : (
        <>
          <Text fontWeight="700" color={headingColor} mb="12px">
            My Flashcards
          </Text>
          <Stack spacing="12px">
            {flashcardSets.map((set) => (
              <Card
                key={set._id}
                p={{ base: '18px', md: '20px' }}
                borderRadius="18px"
                border="1px solid"
                borderColor={cardBorder}
                bg={cardsBg}
                cursor="pointer"
                onClick={() => handleOpenSet(set._id)}
              >
                <Flex align="center" justify="space-between" gap="12px">
                  {editSetId === set._id ? (
                    <Input
                      autoFocus
                      size="sm"
                      variant="unstyled"
                      fontWeight="600"
                      value={editSetTitle}
                      onChange={(event) => onEditSetTitleChange?.(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onBlur={() => onConfirmEditSetTitle?.()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.stopPropagation();
                          onConfirmEditSetTitle?.();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          event.stopPropagation();
                          onCancelEditSetTitle?.();
                        }
                      }}
                    />
                  ) : (
                    <Text fontWeight="600" color={headingColor}>
                      {set.title || 'Untitled Set'}
                    </Text>
                  )}
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      aria-label="Set options"
                      icon={<MdMoreVert />}
                      size="sm"
                      variant="ghost"
                      onClick={(event) => event.stopPropagation()}
                    />
                    <MenuList
                      onClick={(event) => event.stopPropagation()}
                      bg={cardsBg}
                      borderRadius="12px"
                      fontSize="sm"
                      minW="140px"
                      py="5px"
                      boxShadow="0 8px 16px rgba(15, 23, 42, 0.08)"
                    >
                      <MenuItem
                        icon={<MdEdit fontSize="14px" />}
                        onClick={() => onEditSetTitle?.(set._id, set.title)}
                        bg={cardsBg}
                      >
                        Edit
                      </MenuItem>
                      <MenuItem
                        icon={<MdDelete fontSize="14px" />}
                        onClick={() => onDeleteSet?.(set._id)}
                        color="red.500"
                        bg={cardsBg}
                      >
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Flex>
                <Flex mt="10px" gap="8px" wrap="wrap">
                  {set.dueCount > 0 ? (
                    <Badge
                      bg="purple.50"
                      color="purple.600"
                      borderRadius="999px"
                      textTransform="none"
                      px="12px"
                      py="4px"
                    >
                      Cards for today: {set.dueCount} cards
                    </Badge>
                  ) : null}
                  <Badge
                    bg="blue.50"
                    color="blue.600"
                    borderRadius="999px"
                    textTransform="none"
                    px="12px"
                    py="4px"
                  >
                    Selected All Topics
                  </Badge>
                </Flex>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
