import {
  Avatar,
  Badge,
  Box,
  Flex,
  Grid,
  GridItem,
  Icon,
  IconButton,
  SimpleGrid,
  Skeleton,
  SkeletonText,
  Text,
  useColorModeValue,
  keyframes,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import React, { useEffect, useMemo, useState } from 'react';
import {
  MdChevronLeft,
  MdChevronRight,
  MdClose,
  MdFullscreen,
  MdStar,
  MdChecklist,
} from 'react-icons/md';
import { API_ROUTES } from 'api/apiRoutes';
import { useAuth } from 'auth/AuthContext';

export default function UserDashboard() {
  const { currentUser, loading: isAuthLoading } = useAuth();
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const boxBg = useColorModeValue('gray.100', 'whiteAlpha.100');
  const headingColor = useColorModeValue('gray.900', 'white');
  const cardBorder = useColorModeValue('gray.300', 'whiteAlpha.300');
  const cardBg = useColorModeValue('white', 'black');
  const accent = useColorModeValue('purple.500', 'purple.300');
  const accentSoft = useColorModeValue('purple.50', 'purple.900');
  const accentText = useColorModeValue('purple.700', 'purple.200');
  const bannerPulse = useColorModeValue(
    'linear-gradient(120deg, transparent, rgba(124, 58, 237, 0.18), transparent)',
    'linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
  );
  const calendarActiveBg = accentSoft;
  const calendarActiveText = accentText;
  const calendarIdleBg = useColorModeValue('gray.100', 'whiteAlpha.100');
  const calendarIdleText = useColorModeValue('gray.500', 'gray.300');
  const pageBg = useColorModeValue('white', 'black');
  const [attemptSummary, setAttemptSummary] = useState({
    totals: { totalAttempts: 0, avgScore: 0, bestScore: 0 },
    dailyAttempts: [],
    highestScoresByQuiz: [],
    recentAttempts: [],
  });
  const [flashcardAttemptSummary, setFlashcardAttemptSummary] = useState({
    totals: { totalAttempts: 0 },
    dailyAttempts: [],
  });
  const [summary, setSummary] = useState({
    totalQuizzes: 0,
    totalFlashcards: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [calendarFullscreen, setCalendarFullscreen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const silverSweep = keyframes`
    0% { transform: translateX(-140%); opacity: 0; }
    35% { opacity: 0.35; }
    60% { opacity: 0.55; }
    100% { transform: translateX(140%); opacity: 0; }
  `;

  useEffect(() => {
    let isMounted = true;
    const getAuthHeaders = async () => {
      const token = await currentUser?.getIdToken?.();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      return headers;
    };
    const loadSummary = async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(API_ROUTES.USER_ACTIVITY.GET_SUMMARY, {
          headers,
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (!isMounted) return;
        if (payload?.totals) {
          setSummary({
            totalQuizzes: payload.totals.totalQuizzes ?? 0,
            totalFlashcards: payload.totals.totalFlashcards ?? 0,
          });
        }
      } catch (err) {
        console.error('Error loading summary:', err);
      }
    };
    const loadAttemptSummary = async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(API_ROUTES.ATTEMPTS.GET_SUMMARY, {
          headers,
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (!isMounted) return;
        setAttemptSummary({
          totals: payload?.totals || { totalAttempts: 0, avgScore: 0, bestScore: 0 },
          dailyAttempts: Array.isArray(payload?.dailyAttempts)
            ? payload.dailyAttempts
            : [],
          highestScoresByQuiz: Array.isArray(payload?.highestScoresByQuiz)
            ? payload.highestScoresByQuiz
            : [],
          recentAttempts: Array.isArray(payload?.recentAttempts)
            ? payload.recentAttempts
            : [],
        });
      } catch (err) {
        console.error('Error loading attempt summary:', err);
      }
    };
    const loadFlashcardAttemptSummary = async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(API_ROUTES.FLASHCARD_ATTEMPTS.GET_SUMMARY, {
          headers,
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (!isMounted) return;
        setFlashcardAttemptSummary({
          totals: payload?.totals || { totalAttempts: 0 },
          dailyAttempts: Array.isArray(payload?.dailyAttempts)
            ? payload.dailyAttempts
            : [],
        });
      } catch (err) {
        console.error('Error loading flashcard attempts:', err);
      }
    };
    if (!isAuthLoading && currentUser) {
      Promise.all([
        loadAttemptSummary(),
        loadFlashcardAttemptSummary(),
        loadSummary(),
      ]).finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser, isAuthLoading]);

  useEffect(() => {
    const updateHour = () => setCurrentHour(new Date().getHours());
    updateHour();
    const timer = setInterval(updateHour, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const attemptDays = useMemo(() => {
    return new Set(
      attemptSummary.dailyAttempts.map((item) => String(item.date || '').trim()),
    );
  }, [attemptSummary.dailyAttempts]);

  const momentumDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: date.toLocaleDateString('en-US', {
          weekday: 'short',
          timeZone: 'UTC',
        }),
        active: attemptDays.has(key),
      };
    });
  }, [attemptDays]);

  const activeMomentumCount = useMemo(
    () => momentumDays.filter((day) => day.active).length,
    [momentumDays],
  );

  const currentStreak = useMemo(() => {
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i += 1) {
      const check = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      check.setUTCDate(check.getUTCDate() - i);
      const key = check.toISOString().slice(0, 10);
      if (!attemptDays.has(key)) break;
      streak += 1;
    }
    return streak;
  }, [attemptDays]);

  const greeting = useMemo(() => {
    if (currentHour < 12) return { text: 'Good Morning', emoji: '☀️' };
    if (currentHour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
    return { text: 'Good Evening', emoji: '🌙' };
  }, [currentHour]);

  const calendarMeta = useMemo(() => {
    const year = calendarMonth.getUTCFullYear();
    const month = calendarMonth.getUTCMonth();
    const firstDay = new Date(Date.UTC(year, month, 1));
    const startOffset = firstDay.getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const days = [];
    for (let i = 0; i < startOffset; i += 1) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(Date.UTC(year, month, day));
      days.push({
        key: date.toISOString().slice(0, 10),
        label: day,
      });
    }
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return {
      year,
      month,
      monthLabel: calendarMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      weeks,
    };
  }, [calendarMonth]);

  const formatAttemptDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCalendarNav = (direction) => {
    setCalendarMonth((prev) => {
      const next = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + direction, 1));
      return next;
    });
  };

  return (
    <Box pt={{ base: '120px', md: '96px', lg: '80px' }} bg={pageBg} minH="100vh">
      <Grid
        templateColumns={{ base: '1fr', xl: 'repeat(12, 1fr)' }}
        gap="20px"
        mb="24px"
      >
        <GridItem colSpan={{ base: 1, xl: 8 }}>
          <Card
            p={{ base: '20px', md: '28px' }}
            borderRadius="24px"
            bg={cardBg}
            border="1px solid"
            borderColor={cardBorder}
            position="relative"
            overflow="hidden"
            _before={{
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              w: '100%',
              h: '100%',
              bg: bannerPulse,
              animation: `${silverSweep} 6s ease-in-out infinite`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <Box
              w="48px"
              h="4px"
              borderRadius="999px"
              bg={accent}
              mb="12px"
              position="relative"
              zIndex="1"
            />
            <Box position="relative" zIndex="1">
              <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em">
                {greeting.text} {greeting.emoji}
              </Text>
              <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="700">
                {currentUser?.displayName || 'Student'}
              </Text>
              <Text mt="8px" fontSize={{ base: 'sm', md: 'md' }} color={secondaryText}>
                {currentStreak > 0
                  ? `You are on a ${currentStreak}-day streak. Keep the momentum going.`
                  : 'Start a quiz today to build your learning streak.'}
              </Text>
            </Box>
          </Card>
          <Box mt="20px">
            <Text fontWeight="700" color={headingColor} fontSize="lg">
              Study snapshot
            </Text>
            <Text fontSize="sm" color={secondaryText} mb="12px">
              A friendly check-in on your progress so far.
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="16px">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <Card
                    key={`stat-skeleton-${index}`}
                    py="18px"
                    borderRadius="20px"
                    border="1px solid"
                    borderColor={cardBorder}
                    bg={cardBg}
                  >
                    <Flex align="center" gap="16px">
                      <Skeleton boxSize="56px" borderRadius="16px" />
                      <Box flex="1">
                        <SkeletonText noOfLines={2} spacing="3" />
                      </Box>
                    </Flex>
                  </Card>
                ))
              ) : (
                <>
                  <Card
                    p="18px"
                    borderRadius="20px"
                    border="1px solid"
                    borderColor={cardBorder}
                    bg={cardBg}
                  >
                    <Flex align="center" justify="space-between">
                      <Box>
                        <Text fontSize="sm" color={secondaryText}>
                          Quizzes completed
                        </Text>
                        <Text fontSize="2xl" fontWeight="700" color={headingColor}>
                          {attemptSummary.totals.totalAttempts}
                        </Text>
                      </Box>
                      <Box p="10px" borderRadius="16px" bg={accentSoft}>
                        <Icon as={MdChecklist} w="24px" h="24px" color={accent} />
                      </Box>
                    </Flex>
                  </Card>
                  <Card
                    p="18px"
                    borderRadius="20px"
                    border="1px solid"
                    borderColor={cardBorder}
                    bg={cardBg}
                  >
                    <Flex align="center" justify="space-between">
                      <Box>
                        <Text fontSize="sm" color={secondaryText}>
                          Quizzes created
                        </Text>
                        <Text fontSize="2xl" fontWeight="700" color={headingColor}>
                          {summary.totalQuizzes}
                        </Text>
                      </Box>
                      <Box p="10px" borderRadius="16px" bg={accentSoft}>
                        <Icon as={MdChecklist} w="24px" h="24px" color={accent} />
                      </Box>
                    </Flex>
                  </Card>
                  <Card
                    p="18px"
                    borderRadius="20px"
                    border="1px solid"
                    borderColor={cardBorder}
                    bg={cardBg}
                  >
                    <Flex align="center" justify="space-between">
                      <Box>
                        <Text fontSize="sm" color={secondaryText}>
                          Average score
                        </Text>
                        <Text fontSize="2xl" fontWeight="700" color={headingColor}>
                          {attemptSummary.totals.avgScore}%
                        </Text>
                      </Box>
                      <Box p="10px" borderRadius="16px" bg={accentSoft}>
                        <Icon as={MdStar} w="24px" h="24px" color={accent} />
                      </Box>
                    </Flex>
                  </Card>
                  <Card
                    p="18px"
                    borderRadius="20px"
                    border="1px solid"
                    borderColor={cardBorder}
                    bg={cardBg}
                  >
                    <Flex align="center" justify="space-between">
                      <Box>
                        <Text fontSize="sm" color={secondaryText}>
                          Flashcards created
                        </Text>
                        <Text fontSize="2xl" fontWeight="700" color={headingColor}>
                          {summary.totalFlashcards}
                        </Text>
                      </Box>
                      <Box p="10px" borderRadius="16px" bg={accentSoft}>
                        <Icon as={MdStar} w="24px" h="24px" color={accent} />
                      </Box>
                    </Flex>
                  </Card>
                  <Card
                    p="18px"
                    borderRadius="20px"
                    border="1px solid"
                    borderColor={cardBorder}
                    bg={cardBg}
                  >
                    <Flex align="center" justify="space-between">
                      <Box>
                        <Text fontSize="sm" color={secondaryText}>
                          Flashcard sessions
                        </Text>
                        <Text fontSize="2xl" fontWeight="700" color={headingColor}>
                          {flashcardAttemptSummary.totals.totalAttempts}
                        </Text>
                      </Box>
                      <Box p="10px" borderRadius="16px" bg={accentSoft}>
                        <Icon as={MdChecklist} w="24px" h="24px" color={accent} />
                      </Box>
                    </Flex>
                  </Card>
                </>
              )}
            </SimpleGrid>
          </Box>
        </GridItem>
        <GridItem colSpan={{ base: 1, xl: 4 }}>
          <Card
            p="20px"
            borderRadius="24px"
            border="1px solid"
            borderColor={cardBorder}
            bg={cardBg}
          >
            <Flex align="center" gap="14px">
              <Avatar name={currentUser?.displayName || 'Student'} size="lg" />
              <Box>
                <Text fontWeight="700" color={headingColor}>
                  {currentUser?.displayName || 'Student'}
                </Text>
                <Flex mt="8px" gap="8px" wrap="wrap">
                  <Badge
                    px="10px"
                    py="6px"
                    borderRadius="999px"
                    colorScheme="purple"
                    variant="subtle"
                  >
                    {attemptSummary.totals.totalAttempts * 10} XP
                  </Badge>
                  <Badge
                    px="10px"
                    py="6px"
                    borderRadius="999px"
                    colorScheme="purple"
                    variant="subtle"
                  >
                    {currentStreak} days
                  </Badge>
                </Flex>
              </Box>
            </Flex>
          </Card>
          <Card
            mt="16px"
            p="20px"
            borderRadius="24px"
            border="1px solid"
            borderColor={cardBorder}
            bg={cardBg}
          >
            <Flex align="center" justify="space-between">
              <Box>
                <Text fontWeight="700" color={headingColor}>
                  Activity Calendar
                </Text>
                <Text fontSize="sm" color={secondaryText}>
                  {calendarMeta.monthLabel}
                </Text>
              </Box>
              <Flex gap="6px">
                <IconButton
                  aria-label="Open fullscreen calendar"
                  icon={<MdFullscreen />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setCalendarFullscreen(true)}
                />
                <IconButton
                  aria-label="Previous month"
                  icon={<MdChevronLeft />}
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCalendarNav(-1)}
                />
                <IconButton
                  aria-label="Next month"
                  icon={<MdChevronRight />}
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCalendarNav(1)}
                />
              </Flex>
            </Flex>
            <Flex mt="10px" gap="10px" wrap="wrap">
              <Badge colorScheme="purple" variant="subtle">
                {currentStreak} day streak
              </Badge>
              <Badge colorScheme="purple" variant="subtle">
                {activeMomentumCount} active days (last 7)
              </Badge>
            </Flex>
            <Box mt="12px">
              <Grid templateColumns="repeat(7, 1fr)" gap="10px" mb="10px">
                {[
                  { key: 'mon', label: 'M' },
                  { key: 'tue', label: 'T' },
                  { key: 'wed', label: 'W' },
                  { key: 'thu', label: 'T' },
                  { key: 'fri', label: 'F' },
                  { key: 'sat', label: 'S' },
                  { key: 'sun', label: 'S' },
                ].map((item) => (
                  <Text
                    key={item.key}
                    fontSize="xs"
                    color={secondaryText}
                    textAlign="center"
                  >
                    {item.label}
                  </Text>
                ))}
              </Grid>
              {calendarMeta.weeks.map((week, index) => (
                <Grid
                  key={`week-${index}`}
                  templateColumns="repeat(7, 1fr)"
                  gap="10px"
                  mb="8px"
                >
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return <Box key={`empty-${dayIndex}`} minH="38px" />;
                    }
                    const isActive = attemptDays.has(day.key);
                    return (
                      <Flex
                        key={day.key}
                        align="center"
                        justify="center"
                        minH="38px"
                        borderRadius="12px"
                        bg={isActive ? calendarActiveBg : calendarIdleBg}
                        color={isActive ? calendarActiveText : calendarIdleText}
                        fontSize="xs"
                        fontWeight="600"
                        position="relative"
                        overflow="hidden"
                      >
                        {day.label}
                        {isActive ? (
                          <Box
                            position="absolute"
                            top="6px"
                            right="8px"
                            w="4px"
                            h="4px"
                            borderRadius="full"
                            bg={accent}
                          />
                        ) : null}
                      </Flex>
                    );
                  })}
                </Grid>
              ))}
            </Box>
          </Card>
        </GridItem>
      </Grid>

      <SimpleGrid columns={{ base: 1, xl: 3 }} gap="20px">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card
              key={`momentum-skeleton-${index}`}
              p="20px"
              borderRadius="24px"
              border="1px solid"
              borderColor={cardBorder}
              bg={cardBg}
            >
              <SkeletonText noOfLines={1} mb="12px" />
              <Skeleton h="200px" borderRadius="16px" />
            </Card>
          ))
        ) : (
          <>
            <Card
              p="20px"
              borderRadius="24px"
              border="1px solid"
              borderColor={cardBorder}
              bg={cardBg}
            >
              <Flex align="center" justify="space-between" mb="12px">
                <Text fontWeight="700" color={headingColor}>
                  Weekly momentum
                </Text>
                <Badge colorScheme="purple" variant="subtle">
                  {activeMomentumCount}/7 days
                </Badge>
              </Flex>
              <Flex gap="10px" wrap="wrap">
                {momentumDays.map((day) => (
                  <Flex key={day.key} direction="column" align="center" gap="6px">
                    <Flex
                      w="36px"
                      h="36px"
                      borderRadius="full"
                      align="center"
                      justify="center"
                      bg={day.active ? accentSoft : boxBg}
                      color={day.active ? accentText : calendarIdleText}
                      fontWeight="600"
                      fontSize="xs"
                    >
                      {day.label.slice(0, 1)}
                    </Flex>
                    <Text fontSize="xs" color={secondaryText}>
                      {day.label}
                    </Text>
                  </Flex>
                ))}
              </Flex>
              <Text mt="12px" fontSize="sm" color={secondaryText}>
                Log another study session to keep the streak alive.
              </Text>
            </Card>

            <Card
              p="20px"
              borderRadius="24px"
              border="1px solid"
              borderColor={cardBorder}
              bg={cardBg}
            >
              <Flex align="center" justify="space-between" mb="12px">
                <Text fontWeight="700" color={headingColor}>
                  Recent attempts
                </Text>
                <Badge colorScheme="purple" variant="subtle">
                  {attemptSummary.recentAttempts.length}
                </Badge>
              </Flex>
              <Box maxH="150px" overflowY="auto" pr="4px">
                {attemptSummary.recentAttempts.length > 0 ? (
                  attemptSummary.recentAttempts.map((attempt) => (
                    <Flex
                      key={String(attempt._id)}
                      align="center"
                      justify="space-between"
                      py="8px"
                      borderBottom="1px solid"
                      borderColor={boxBg}
                    >
                      <Box minW="0">
                        <Text color={headingColor} fontSize="sm" noOfLines={1}>
                          {attempt.quizSetId?.title ||
                            attempt.quizId?.title ||
                            'Untitled quiz'}
                        </Text>
                        <Text fontSize="xs" color={secondaryText}>
                          {formatAttemptDate(attempt.attemptedAt)}
                        </Text>
                      </Box>
                      <Badge colorScheme="purple" variant="subtle">
                        {attempt.score}%
                      </Badge>
                    </Flex>
                  ))
                ) : (
                  <Flex h="160px" align="center" justify="center">
                    <Text fontSize="sm" color={secondaryText}>
                      Your first attempt will show up here.
                    </Text>
                  </Flex>
                )}
              </Box>
            </Card>

            <Card
              p="20px"
              borderRadius="24px"
              border="1px solid"
              borderColor={cardBorder}
              bg={cardBg}
            >
              <Flex align="center" justify="space-between" mb="12px">
                <Text fontWeight="700" color={headingColor}>
                  Highest scores
                </Text>
                <Badge colorScheme="purple" variant="subtle">
                  Top 5
                </Badge>
              </Flex>
              <Box maxH="220px" overflowY="auto" pr="4px">
                {attemptSummary.highestScoresByQuiz.length > 0 ? (
                  attemptSummary.highestScoresByQuiz.slice(0, 5).map((item) => (
                    <Flex
                      key={String(item.quizSetId || item.quizId)}
                      align="center"
                      justify="space-between"
                      py="8px"
                      borderBottom="1px solid"
                      borderColor={boxBg}
                    >
                      <Text color={headingColor} fontSize="sm" noOfLines={1}>
                        {item.title || 'Untitled quiz'}
                      </Text>
                      <Text color={secondaryText} fontSize="sm">
                        {item.maxScore}%
                      </Text>
                    </Flex>
                  ))
                ) : (
                  <Flex h="160px" align="center" justify="center">
                    <Text fontSize="sm" color={secondaryText}>
                      Keep practicing to unlock top scores.
                    </Text>
                  </Flex>
                )}
              </Box>
            </Card>
          </>
        )}
      </SimpleGrid>
      {calendarFullscreen ? (
        <Box
          position="fixed"
          inset="0"
          zIndex="2000"
          bg="rgba(15, 23, 42, 0.35)"
          backdropFilter="blur(12px)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={{ base: '16px', md: '32px' }}
        >
          <Card
            w={{ base: '100%', md: '720px' }}
            p="24px"
            borderRadius="24px"
            border="1px solid"
            borderColor={cardBorder}
            bg={cardBg}
          >
            <Flex align="center" justify="space-between" mb="16px">
              <Box>
                <Text fontWeight="700" color={headingColor}>
                  Activity Calendar
                </Text>
                <Text fontSize="sm" color={secondaryText}>
                  {calendarMeta.monthLabel}
                </Text>
              </Box>
              <Flex gap="6px">
                <IconButton
                  aria-label="Previous month"
                  icon={<MdChevronLeft />}
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCalendarNav(-1)}
                />
                <IconButton
                  aria-label="Next month"
                  icon={<MdChevronRight />}
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCalendarNav(1)}
                />
                <IconButton
                  aria-label="Close fullscreen calendar"
                  icon={<MdClose />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setCalendarFullscreen(false)}
                />
              </Flex>
            </Flex>
            <Grid templateColumns="repeat(7, 1fr)" gap="10px" mb="10px">
              {[
                { key: 'mon', label: 'M' },
                { key: 'tue', label: 'T' },
                { key: 'wed', label: 'W' },
                { key: 'thu', label: 'T' },
                { key: 'fri', label: 'F' },
                { key: 'sat', label: 'S' },
                { key: 'sun', label: 'S' },
              ].map((item) => (
                <Text
                  key={item.key}
                  fontSize="xs"
                  color={secondaryText}
                  textAlign="center"
                >
                  {item.label}
                </Text>
              ))}
            </Grid>
            <Box>
              {calendarMeta.weeks.map((week, index) => (
                <Grid
                  key={`fullscreen-week-${index}`}
                  templateColumns="repeat(7, 1fr)"
                  gap="12px"
                  mb="10px"
                >
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return <Box key={`fullscreen-empty-${dayIndex}`} minH="44px" />;
                    }
                    const isActive = attemptDays.has(day.key);
                    return (
                      <Flex
                        key={day.key}
                        align="center"
                        justify="center"
                        minH="44px"
                        borderRadius="14px"
                        bg={isActive ? calendarActiveBg : calendarIdleBg}
                        color={isActive ? calendarActiveText : calendarIdleText}
                        fontSize="sm"
                        fontWeight="600"
                        position="relative"
                        overflow="hidden"
                      >
                        {day.label}
                        {isActive ? (
                          <Box
                            position="absolute"
                            top="8px"
                            right="10px"
                            w="5px"
                            h="5px"
                            borderRadius="full"
                            bg={accent}
                          />
                        ) : null}
                      </Flex>
                    );
                  })}
                </Grid>
              ))}
            </Box>
          </Card>
        </Box>
      ) : null}
    </Box>
  );
}
