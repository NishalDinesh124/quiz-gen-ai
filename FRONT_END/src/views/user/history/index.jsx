import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Skeleton,
  SkeletonText,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import React, { useEffect, useState } from 'react';
import {
  FiLock,
  FiMessageCircle,
  FiPlus,
  FiSettings,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import { API_ROUTES } from 'api/apiRoutes';
import { fetchWithAuth } from 'api/fetchWithAuth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'auth/AuthContext';

export default function History() {
  const { currentUser, loading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingSessionId, setEditingSessionId] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteSessionId, setDeleteSessionId] = useState('');
  const headingColor = useColorModeValue('navy.700', 'white');
  const secondaryText = useColorModeValue(
    'secondaryGray.600',
    'secondaryGray.400',
  );
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.300');
  const cardShadow = useColorModeValue(
    '0 12px 24px rgba(15, 23, 42, 0.08)',
    'none',
  );
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const cardSurface = useColorModeValue('white', 'black');
  const cardHeaderBg = useColorModeValue('white', 'whiteAlpha.100');
  const newChatBg = useColorModeValue('black', 'white');
  const newChatText = useColorModeValue('white', 'black');
  const newChatHoverBg = useColorModeValue('gray.800', 'gray.100');
  const menuBg = useColorModeValue('white', 'black');
  const menuHover = useColorModeValue('gray.100', 'whiteAlpha.200');
  const menuBorder = useColorModeValue('gray.200', 'whiteAlpha.300');

  const handleSaveTitle = async (sessionId) => {
    if (!editingTitle.trim()) {
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
        API_ROUTES.SESSIONS.UPDATE(sessionId),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editingTitle.trim() }),
        },
      );
      if (!response.ok) {
        throw new Error('Update failed');
      }
      const payload = await response.json();
      const updated = payload?.session;
      setSessions((prev) =>
        prev.map((item) =>
          item._id === sessionId
            ? { ...item, ...(updated || { title: editingTitle.trim() }) }
            : item,
        ),
      );
      setEditingSessionId('');
      setEditingTitle('');
    } catch (error) {
      toast({
        title: 'Unable to update title.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return;
    try {
      const response = await fetchWithAuth(
        API_ROUTES.SESSIONS.DELETE(deleteSessionId),
        { method: 'DELETE' },
      );
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      setSessions((prev) =>
        prev.filter((item) => item._id !== deleteSessionId),
      );
      setDeleteSessionId('');
    } catch (error) {
      toast({
        title: 'Unable to delete session.',
        status: 'error',
        position: 'top-right',
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    const loadSessions = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const response = await fetchWithAuth(API_ROUTES.SESSIONS.LIST);
        if (!response.ok) {
          throw new Error('Failed to load sessions.');
        }
        const payload = await response.json();
        if (!isMounted) return;
        setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
      } catch (error) {
        if (!isMounted) return;
        setLoadError('Unable to load history right now.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadSessions();
    return () => {
      isMounted = false;
    };
  }, [currentUser, isAuthLoading]);

  return (
    <Box pt={{ base: '120px', md: '96px', lg: '80px' }}>
      <Box maxW="1200px" mx="auto">
        <Flex align="center" justify="space-between" mb="24px">
          <Box>
            <Text fontSize="sm" color={secondaryText}>
              Continue where you left off.
            </Text>
          </Box>
          <Button
            leftIcon={<Icon as={FiPlus} />}
            size="sm"
            borderRadius="12px"
            bg={newChatBg}
            color={newChatText}
            _hover={{ bg: newChatHoverBg }}
            onClick={() => navigate('/studio')}
          >
            New chat
          </Button>
        </Flex>
        {isLoading ? (
          <SimpleGrid columns={{ base: 1, md: 3 }} gap="18px">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card
                key={`session-skeleton-${index}`}
                p="20px"
                borderRadius="18px"
                bg={cardSurface}
                border="1px solid"
                borderColor={cardBorder}
              >
                <Flex align="center" justify="center" minH="140px">
                  <Skeleton boxSize="56px" borderRadius="20px" />
                </Flex>
                <Box mt="12px">
                  <SkeletonText noOfLines={2} spacing="3" />
                </Box>
              </Card>
            ))}
          </SimpleGrid>
        ) : loadError ? (
          <Card
            p="18px"
            borderRadius="18px"
            border="1px solid"
            borderColor={cardBorder}
            bg={cardSurface}
          >
            <Text color={secondaryText}>{loadError}</Text>
          </Card>
        ) : sessions.length === 0 ? (
          <Card
            p="18px"
            borderRadius="18px"
            border="1px solid"
            borderColor={cardBorder}
            bg={cardSurface}
          >
            <Flex
              align="center"
              justify="center"
              minH="180px"
              textAlign="center"
              flexDirection="column"
              gap="12px"
            >
              <Box
                w="56px"
                h="56px"
                borderRadius="18px"
                bg={cardHeaderBg}
                display="flex"
                alignItems="center"
                justifyContent="center"
                color={headingColor}
              >
                <Icon as={FiMessageCircle} boxSize="28px" />
              </Box>
              <Box>
                <Text fontWeight="600" color={headingColor}>
                  Ask the AI tutor to create something
                </Text>
                <Text fontSize="sm" color={secondaryText} mt="4px">
                  Start a new chat in Studio to generate content.
                </Text>
              </Box>
            </Flex>
          </Card>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 3 }} gap="18px">
            {sessions.map((session) => (
              <Card
                key={session._id}
                p="0px"
                borderRadius="18px"
                border="1px solid"
                borderColor={cardBorder}
                cursor="pointer"
                overflow="hidden"
                boxShadow={cardShadow}
                onClick={() => {
                  if (editingSessionId) return;
                  navigate(`/history/${session._id}`);
                }}
              >
                <Flex
                  align="center"
                  justify="center"
                  minH="140px"
                  bg={cardHeaderBg}
                  color={headingColor}
                >
                  <Icon as={FiMessageCircle} boxSize="48px" />
                </Flex>
                <Flex
                  align="center"
                  justify="space-between"
                  borderTop="1px solid"
                  borderColor={cardBorder}
                  px="16px"
                  py="12px"
                >
                  <Box>
                    {editingSessionId === session._id ? (
                      <Input
                        autoFocus
                        size="sm"
                        variant="unstyled"
                        fontWeight="600"
                        value={editingTitle}
                        onChange={(event) =>
                          setEditingTitle(event.target.value)
                        }
                        onClick={(event) => event.stopPropagation()}
                        onBlur={() => {
                          const nextTitle = editingTitle.trim();
                          const currentTitle = session.title || 'Untitled chat';
                          if (nextTitle && nextTitle !== currentTitle) {
                            handleSaveTitle(session._id);
                          } else {
                            setEditingSessionId('');
                            setEditingTitle('');
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.stopPropagation();
                            handleSaveTitle(session._id);
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            event.stopPropagation();
                            setEditingSessionId('');
                            setEditingTitle('');
                          }
                        }}
                      />
                    ) : (
                      <Text
                        fontWeight="600"
                        color={headingColor}
                        fontSize="sm"
                        noOfLines={1}
                      >
                        {session.title || 'Untitled chat'}
                      </Text>
                    )}
                    <Text fontSize="xs" color={mutedText} mt="4px">
                      {session.lastActivityAt
                        ? new Date(session.lastActivityAt).toLocaleString()
                        : 'Just now'}
                    </Text>
                  </Box>
                  <Flex align="center" gap="8px">
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        aria-label="Session settings"
                        icon={<FiSettings />}
                        size="sm"
                        variant="ghost"
                        onClick={(event) => event.stopPropagation()}
                      />
                      <MenuList
                        bg={menuBg}
                        borderColor={menuBorder}
                        onClick={(event) => event.stopPropagation()}
                        borderRadius="12px"
                        fontSize="sm"
                        minW="140px"
                        py="5px"
                        boxShadow="0 8px 16px rgba(15, 23, 42, 0.08)"
                      >
                        <MenuItem
                          bg={menuBg}
                          _hover={{bg:menuHover}}
                          icon={<FiEdit2 />}
                          onClick={async () => {
                            setEditingSessionId(session._id);
                            setEditingTitle(session.title || 'Untitled chat');
                          }}
                        >
                          Edit title
                        </MenuItem>
                        <MenuItem
                        bg={menuBg}
                        _hover={{bg:menuHover}}
                          icon={<FiTrash2 />}
                          onClick={async () => {
                            setDeleteSessionId(session._id);
                          }}
                          color="red.500"
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                    <Icon as={FiLock} color={mutedText} boxSize="14px" />
                  </Flex>
                </Flex>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Box>
      <Modal
        isOpen={Boolean(deleteSessionId)}
        onClose={() => setDeleteSessionId('')}
        isCentered
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(6px)" />
        <ModalContent borderRadius="16px">
          <ModalHeader>Delete chat session</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color={secondaryText}>
              Are you sure you want to delete this chat? This cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr="8px"
              onClick={() => setDeleteSessionId('')}
            >
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleDeleteSession}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
