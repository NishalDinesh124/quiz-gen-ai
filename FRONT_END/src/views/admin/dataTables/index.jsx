import {
  Badge,
  Box,
  Flex,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import Card from 'components/card/Card';
import { API_ROUTES } from 'api/apiRoutes';
import { fetchWithAuth } from 'api/fetchWithAuth';

export default function AdminUsage() {
  const headingColor = useColorModeValue('gray.900', 'white');
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.300');
  const cardBg = useColorModeValue('white', 'black');

  const [isLoading, setIsLoading] = useState(true);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadAttempts = async () => {
      try {
        const response = await fetchWithAuth(`${API_ROUTES.ADMIN.USAGE}?limit=20`);
        if (!response.ok) return;
        const payload = await response.json();
        if (isMounted) {
          setAttempts(Array.isArray(payload?.attempts) ? payload.attempts : []);
        }
      } catch (err) {
        console.error('Failed to load attempts:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAttempts();
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

  return (
    <Box pt={{ base: '120px', md: '96px', xl: '80px' }}>
      <Text fontSize="2xl" fontWeight="700" color={headingColor} mb="4px">
        Usage
      </Text>
      <Text fontSize="sm" color={secondaryText} mb="20px">
        Latest quiz set attempts and their status.
      </Text>

      <Card
        p="20px"
        borderRadius="24px"
        border="1px solid"
        borderColor={cardBorder}
        bg={cardBg}
      >
        {isLoading ? (
          <Text fontSize="sm" color={secondaryText}>
            Loading attempts...
          </Text>
        ) : attempts.length > 0 ? (
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Quiz set</Th>
                  <Th>Date</Th>
                  <Th>User</Th>
                  <Th isNumeric>Score</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {attempts.map((attempt) => (
                  <Tr key={String(attempt._id)}>
                    <Td maxW="260px">
                      <Text fontSize="sm" noOfLines={1} color={headingColor}>
                        {attempt.quizSetId?.title || attempt.quizId?.title || 'Untitled quiz'}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="sm" color={secondaryText}>
                        {formatDate(attempt.attemptedAt)}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="sm" color={secondaryText} noOfLines={1}>
                        {attempt.userId}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize="sm" color={headingColor}>
                        {attempt.score}%
                      </Text>
                    </Td>
                    <Td>
                      <Badge colorScheme="purple" variant="subtle">
                        {attempt.status || 'completed'}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ) : (
          <Flex align="center" justify="center" py="60px">
            <Text fontSize="sm" color={secondaryText}>
              No attempts recorded yet.
            </Text>
          </Flex>
        )}
      </Card>
    </Box>
  );
}
