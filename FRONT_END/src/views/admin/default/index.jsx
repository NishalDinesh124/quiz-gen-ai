import {
  Badge,
  Box,
  Flex,
  SimpleGrid,
  Skeleton,
  SkeletonText,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import React, { useEffect, useMemo, useState } from 'react';
import Card from 'components/card/Card';
import { API_ROUTES } from 'api/apiRoutes';
import { fetchWithAuth } from 'api/fetchWithAuth';

export default function AdminOverview() {
  const headingColor = useColorModeValue('gray.900', 'white');
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.300');
  const cardBg = useColorModeValue('white', 'black');
  const rowBorder = useColorModeValue('gray.100', 'whiteAlpha.100');

  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState({
    totals: {
      totalUsers: 0,
      activeToday: 0,
      totalQuizSets: 0,
      totalFlashcardSets: 0,
      totalNotes: 0,
      totalSessions: 0,
      totalAttempts: 0,
    },
    activityTotals: {
      quizGeneratedCount: 0,
      flashcardGeneratedCount: 0,
      loginCount: 0,
    },
    recentAttempts: [],
    recentSessions: [],
  });

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const overviewRes = await fetchWithAuth(API_ROUTES.ADMIN.OVERVIEW);
        if (!isMounted) return;

        if (overviewRes.ok) {
          const payload = await overviewRes.json();
          setOverview({
            totals: payload?.totals || {
              totalUsers: 0,
              activeToday: 0,
              totalQuizSets: 0,
              totalFlashcardSets: 0,
              totalNotes: 0,
              totalSessions: 0,
              totalAttempts: 0,
            },
            activityTotals: payload?.activityTotals || {
              quizGeneratedCount: 0,
              flashcardGeneratedCount: 0,
              loginCount: 0,
            },
            recentAttempts: Array.isArray(payload?.recentAttempts)
              ? payload.recentAttempts
              : [],
            recentSessions: Array.isArray(payload?.recentSessions)
              ? payload.recentSessions
              : [],
          });
        }
      } catch (err) {
        console.error('Failed to load admin overview:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const recentSessions = useMemo(
    () => overview.recentSessions.slice(0, 6),
    [overview.recentSessions],
  );
  const recentAttempts = useMemo(
    () => overview.recentAttempts.slice(0, 6),
    [overview.recentAttempts],
  );

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box pt={{ base: '120px', md: '96px', xl: '80px' }}>
      <Text fontSize="2xl" fontWeight="700" color={headingColor} mb="4px">
        Admin overview
      </Text>
      <Text fontSize="sm" color={secondaryText} mb="20px">
        A quick snapshot of content and activity.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap="16px" mb="24px">
        {[
          {
            label: 'Total users',
            value: overview.totals.totalUsers,
            helper: 'Tracked user accounts',
          },
          {
            label: 'Active today',
            value: overview.totals.activeToday,
            helper: 'Users active today (UTC)',
          },
          {
            label: 'Quiz sets',
            value: overview.totals.totalQuizSets,
            helper: 'All quiz sets created',
          },
          {
            label: 'Flashcard sets',
            value: overview.totals.totalFlashcardSets,
            helper: 'All flashcard sets created',
          },
          {
            label: 'Notes generated',
            value: overview.totals.totalNotes,
            helper: 'All notes created',
          },
          {
            label: 'Attempts logged',
            value: overview.totals.totalAttempts,
            helper: 'All quiz attempts',
          },
        ].map((item) => (
          <Card
            key={item.label}
            p="18px"
            borderRadius="20px"
            border="1px solid"
            borderColor={cardBorder}
            bg={cardBg}
          >
            {isLoading ? (
              <SkeletonText noOfLines={2} spacing="3" />
            ) : (
              <>
                <Text fontSize="sm" color={secondaryText}>
                  {item.label}
                </Text>
                <Text fontSize="2xl" fontWeight="700" color={headingColor}>
                  {item.value}
                </Text>
                <Text fontSize="xs" color={secondaryText} mt="4px">
                  {item.helper}
                </Text>
              </>
            )}
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap="20px">
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
              {overview.recentAttempts.length}
            </Badge>
          </Flex>
          {isLoading ? (
            <Skeleton h="140px" borderRadius="16px" />
          ) : recentAttempts.length > 0 ? (
            <Box>
              {recentAttempts.map((attempt) => (
                <Flex
                  key={String(attempt._id)}
                  align="center"
                  justify="space-between"
                  py="10px"
                  borderBottom="1px solid"
                  borderColor={rowBorder}
                >
                  <Box minW="0">
                    <Text color={headingColor} fontSize="sm" noOfLines={1}>
                      {attempt.quizSetId?.title || attempt.quizId?.title || 'Untitled quiz'}
                    </Text>
                    <Text fontSize="xs" color={secondaryText}>
                      {formatDate(attempt.attemptedAt)} · {attempt.userId}
                    </Text>
                  </Box>
                  <Badge colorScheme="purple" variant="subtle">
                    {attempt.score}%
                  </Badge>
                </Flex>
              ))}
            </Box>
          ) : (
            <Text fontSize="sm" color={secondaryText}>
              No attempts yet.
            </Text>
          )}
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
              Recent sessions
            </Text>
            <Badge colorScheme="purple" variant="subtle">
              {overview.recentSessions.length}
            </Badge>
          </Flex>
          {isLoading ? (
            <Skeleton h="140px" borderRadius="16px" />
          ) : recentSessions.length > 0 ? (
            <Box>
              {recentSessions.map((session) => (
                <Flex
                  key={String(session._id)}
                  align="center"
                  justify="space-between"
                  py="10px"
                  borderBottom="1px solid"
                  borderColor={rowBorder}
                >
                  <Box minW="0">
                    <Text color={headingColor} fontSize="sm" noOfLines={1}>
                      {session.title || 'Untitled session'}
                    </Text>
                    <Text fontSize="xs" color={secondaryText}>
                      {formatDate(session.lastActivityAt || session.createdAt)} · {session.userId}
                    </Text>
                  </Box>
                  <Badge colorScheme="purple" variant="outline">
                    chat
                  </Badge>
                </Flex>
              ))}
            </Box>
          ) : (
            <Text fontSize="sm" color={secondaryText}>
              No sessions yet.
            </Text>
          )}
        </Card>
      </SimpleGrid>
    </Box>
  );
}
