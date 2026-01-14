import React from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  IconButton,
  Input,
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
import { MdArrowBack, MdDelete, MdEdit, MdMoreVert} from 'react-icons/md';
import { FiEdit2, FiRefreshCcw } from 'react-icons/fi';

export default function QuizzesTab({
  videoContext,
  activeQuizSetView,
  isQuizSetsLoading,
  isQuizSetViewLoading,
  quizSets,
  pendingAssets,
  headingColor,
  mutedText,
  cardBorder,
  cardsBg,
  tabsBg,
  quizIndexByAsset,
  renderQuizViewer,
  setActiveQuizSetView,
  handleOpenQuizSet,
  onEditQuizSet,
  onRestartQuizSet,
  onEditQuizSetTitle,
  onDeleteQuizSet,
  editQuizSetId,
  editQuizSetTitle,
  onEditQuizSetTitleChange,
  onConfirmEditQuizSetTitle,
  onCancelEditQuizSetTitle,
}) {
  const progressTrack = useColorModeValue('gray.200', 'whiteAlpha.200');
 
  return (
    <Box
      mt="18px"
      flex="1"
      minH="0"
      display="flex"
      flexDirection="column"
      overflowY={activeQuizSetView ? 'hidden' : 'auto'}
      overflowX="hidden"
      pr={videoContext ? '6px' : '0'}
    >
      {isQuizSetsLoading ? (
        <Stack spacing="12px">
          {[0, 1, 2].map((item) => (
            <Card
              key={item}
              p="18px"
              borderRadius="18px"
              border="1px solid"
              borderColor={cardBorder}
            >
              <Skeleton height="14px" width="60%" />
              <Skeleton mt="10px" height="12px" width="40%" />
            </Card>
          ))}
        </Stack>
      ) : isQuizSetViewLoading ? (
        <Card
          p="18px"
          borderRadius="18px"
          border="1px solid"
          borderColor={cardBorder}
          bg={cardsBg}
        >
          <Text color={mutedText}>Loading set...</Text>
        </Card>
      ) : activeQuizSetView ? (
        <Flex direction="column" flex="1" minH="0">
          <Flex align="center" justify="space-between" mb="12px">
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<MdArrowBack />}
              onClick={() => setActiveQuizSetView(null)}
            >
              Back to sets
            </Button>
            <Menu placement="bottom-end">
              <MenuButton
                as={IconButton}
                aria-label="Quiz options"
                icon={<MdMoreVert />}
                size="sm"
                variant="ghost"
              />
              <MenuList
                bg={cardsBg}
                borderRadius="12px"
                fontSize="sm"
                minW="140px"
                py="5px"
                boxShadow="0 8px 16px rgba(15, 23, 42, 0.08)"
              >
                <MenuItem onClick={onEditQuizSet} bg={cardsBg} icon={<FiEdit2 />}>
                  Edit quiz
                </MenuItem>
                <MenuItem onClick={onRestartQuizSet} bg={cardsBg} icon={<FiRefreshCcw/>}>
                  Restart quiz
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
          <Box
            flex="1"
            minH="0"
            overflowY="auto"
            overflowX="hidden"
            pr="6px"
            pb="24px"
          >
            {(() => {
              const assetKey = String(activeQuizSetView._id);
              const total =
                activeQuizSetView.totalQuestions ||
                activeQuizSetView.questions?.length ||
                0;
              const activeIndex = quizIndexByAsset[assetKey] || 0;
              const progress = total
                ? Math.min(100, ((activeIndex + 1) / total) * 100)
                : 0;
              return (
                <>
                  <Box mb="14px">
                    <Box
                      h="6px"
                      bg={tabsBg}
                      borderRadius="999px"
                      overflow="hidden"
                    >
                      <Box
                        h="100%"
                        bg="purple.400"
                        width={`${progress}%`}
                        transition="width 0.25s ease"
                      />
                    </Box>
                    <Flex
                      align="center"
                      justify="space-between"
                      mt="6px"
                      fontSize="xs"
                      color={mutedText}
                    >
                      <Text>
                        Question {Math.min(activeIndex + 1, total)} of{' '}
                        {total || 1}
                      </Text>
                      <Text>{Math.round(progress)}%</Text>
                    </Flex>
                  </Box>
                  {renderQuizViewer(
                    activeQuizSetView,
                    String(activeQuizSetView._id),
                  )}
                </>
              );
            })()}
          </Box>
        </Flex>
      ) : quizSets.length === 0 ? (
        <Card
          p="18px"
          borderRadius="18px"
          border="1px solid"
          borderColor={cardBorder}
        >
          <Text color={mutedText}>
            {pendingAssets.quizzes
              ? 'Generating quizzes...'
              : 'No saved quiz sets yet.'}
          </Text>
        </Card>
      ) : (
        <>
          <Text fontWeight="700" color={headingColor} mb="12px">
            My Quizzes
          </Text>
          <Stack spacing="12px">
            {quizSets.map((set) => (
              <Card
                key={set._id}
                p={{ base: '14px', md: '15px' }}
                borderRadius="16px"
                border="1px solid"
                borderColor={cardBorder}
                bg={cardsBg}
                cursor="pointer"
                onClick={() => handleOpenQuizSet(set._id)}
              >
                <Flex align="center" justify="space-between" gap="12px">
                  {editQuizSetId === set._id ? (
                    <Input
                      autoFocus
                      size="sm"
                      variant="unstyled"
                      fontWeight="600"
                      value={editQuizSetTitle}
                      onChange={(event) =>
                        onEditQuizSetTitleChange?.(event.target.value)
                      }
                      onClick={(event) => event.stopPropagation()}
                      onBlur={() => onConfirmEditQuizSetTitle?.()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.stopPropagation();
                          onConfirmEditQuizSetTitle?.();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          event.stopPropagation();
                          onCancelEditQuizSetTitle?.();
                        }
                      }}
                    />
                  ) : (
                    <Text fontWeight="600" color={headingColor} fontSize="sm">
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
                        onClick={() => onEditQuizSetTitle?.(set._id, set.title)}
                        bg={cardsBg}
                      >
                        Edit
                      </MenuItem>
                      <MenuItem
                        icon={<MdDelete fontSize="14px" />}
                        onClick={() => onDeleteQuizSet?.(set._id)}
                        color="red.500"
                        bg={cardsBg}
                      >
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Flex>
                <Flex mt="8px" gap="8px" wrap="wrap">
                  <Badge
                    bg="blue.50"
                    color="blue.600"
                    borderRadius="999px"
                    textTransform="none"
                    px="12px"
                    py="3px"
                    fontSize="xs"
                  >
                    Selected All Topics
                  </Badge>
                </Flex>
                <Flex align="center" gap="10px" mt="12px">
                  <Progress
                    value={set.progressPercent || 0}
                    max={100}
                    height="5px"
                    borderRadius="999px"
                    colorScheme="purple"
                    trackColor={progressTrack}
                    bg={progressTrack}
                    w="100%"
                  />
                  <Text fontSize="xs" color={mutedText} minW="32px">
                    {set.progressPercent || 0}%
                  </Text>
                </Flex>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
