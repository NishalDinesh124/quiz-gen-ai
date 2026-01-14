import {
  Badge,
  Box,
  Flex,
  SimpleGrid,
  Skeleton,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import React, { useEffect, useMemo, useState } from 'react';
import Card from 'components/card/Card';
import { API_ROUTES } from 'api/apiRoutes';
import { fetchWithAuth } from 'api/fetchWithAuth';

export default function AdminContent() {
  const headingColor = useColorModeValue('gray.900', 'white');
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.300');
  const cardBg = useColorModeValue('white', 'black');
  const rowBorder = useColorModeValue('gray.100', 'whiteAlpha.100');

  const [isLoading, setIsLoading] = useState(true);
  const [quizSets, setQuizSets] = useState([]);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [notes, setNotes] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const contentRes = await fetchWithAuth(
          `${API_ROUTES.ADMIN.CONTENT}?limit=6`,
        );
        if (!isMounted) return;

        if (contentRes.ok) {
          const payload = await contentRes.json();
          setQuizSets(Array.isArray(payload?.quizSets) ? payload.quizSets : []);
          setFlashcardSets(
            Array.isArray(payload?.flashcardSets) ? payload.flashcardSets : [],
          );
          setNotes(Array.isArray(payload?.notes) ? payload.notes : []);
          setSessions(Array.isArray(payload?.sessions) ? payload.sessions : []);
        }
      } catch (err) {
        console.error('Failed to load admin content:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const recentSessions = useMemo(() => sessions.slice(0, 6), [sessions]);

  const renderList = (items, renderItem, emptyLabel) => {
    if (isLoading) {
      return <Skeleton h="160px" borderRadius="16px" />;
    }
    if (items.length === 0) {
      return (
        <Text fontSize="sm" color={secondaryText}>
          {emptyLabel}
        </Text>
      );
    }
    return <Box>{items.map(renderItem)}</Box>;
  };

  return (
    <Box pt={{ base: '120px', md: '96px', xl: '80px' }}>
      <Text fontSize="2xl" fontWeight="700" color={headingColor} mb="4px">
        Content
      </Text>
      <Text fontSize="sm" color={secondaryText} mb="20px">
        Latest generated materials across quiz sets, flashcards, and notes.
      </Text>

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
              Quiz sets
            </Text>
            <Badge colorScheme="purple" variant="subtle">
              {quizSets.length}
            </Badge>
          </Flex>
          {renderList(
            quizSets,
            (set) => (
              <Flex
                key={String(set._id)}
                align="center"
                justify="space-between"
                py="10px"
                borderBottom="1px solid"
                borderColor={rowBorder}
              >
                <Box minW="0">
                  <Text color={headingColor} fontSize="sm" noOfLines={1}>
                    {set.title || 'Untitled quiz set'}
                  </Text>
                  <Text fontSize="xs" color={secondaryText}>
                    {set.questionCount ?? 0} questions · {set.userId}
                  </Text>
                </Box>
                <Badge colorScheme="purple" variant="outline">
                  {formatDate(set.updatedAt || set.createdAt)}
                </Badge>
              </Flex>
            ),
            'No quiz sets yet.',
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
              Flashcard sets
            </Text>
            <Badge colorScheme="purple" variant="subtle">
              {flashcardSets.length}
            </Badge>
          </Flex>
          {renderList(
            flashcardSets,
            (set) => (
              <Flex
                key={String(set._id)}
                align="center"
                justify="space-between"
                py="10px"
                borderBottom="1px solid"
                borderColor={rowBorder}
              >
                <Box minW="0">
                  <Text color={headingColor} fontSize="sm" noOfLines={1}>
                    {set.title || 'Untitled flashcard set'}
                  </Text>
                  <Text fontSize="xs" color={secondaryText}>
                    {set.cardCount ?? 0} cards · {set.userId}
                  </Text>
                </Box>
                <Badge colorScheme="purple" variant="outline">
                  {formatDate(set.updatedAt || set.createdAt)}
                </Badge>
              </Flex>
            ),
            'No flashcard sets yet.',
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
              Notes
            </Text>
            <Badge colorScheme="purple" variant="subtle">
              {notes.length}
            </Badge>
          </Flex>
          {renderList(
            notes,
            (note) => (
              <Flex
                key={String(note._id)}
                align="center"
                justify="space-between"
                py="10px"
                borderBottom="1px solid"
                borderColor={rowBorder}
              >
                <Box minW="0">
                  <Text color={headingColor} fontSize="sm" noOfLines={1}>
                    {note.title || 'Untitled note'}
                  </Text>
                  <Text fontSize="xs" color={secondaryText}>
                    {formatDate(note.createdAt)} · {note.userId}
                  </Text>
                </Box>
                <Badge colorScheme="purple" variant="outline">
                  {note.sourceType || 'text'}
                </Badge>
              </Flex>
            ),
            'No notes yet.',
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
              Sessions
            </Text>
            <Badge colorScheme="purple" variant="subtle">
              {sessions.length}
            </Badge>
          </Flex>
          {renderList(
            recentSessions,
            (session) => (
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
            ),
            'No sessions yet.',
          )}
        </Card>
      </SimpleGrid>
    </Box>
  );
}
