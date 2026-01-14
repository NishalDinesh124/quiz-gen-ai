import React, { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Box,
  Flex,
  HStack,
  Icon,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiClock } from "react-icons/fi";
import { API_ROUTES } from "api/apiRoutes";
import { fetchWithAuth } from "api/fetchWithAuth";

function RecentChats() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetchWithAuth(API_ROUTES.SESSIONS.LIST);
      if (!response.ok) return;
      const payload = await response.json();
      const items = Array.isArray(payload.sessions) ? payload.sessions : [];
      setSessions(items.slice(0, 3));
    } catch (error) {
      // Silent fail to avoid blocking the sidebar.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const guardedLoad = async () => {
      if (!isMounted) return;
      await loadSessions();
    };
    guardedLoad();
    return () => {
      isMounted = false;
    };
  }, [loadSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, location.pathname]);

  useEffect(() => {
    const handleFocus = () => loadSessions();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadSessions]);

  const labelColor = useColorModeValue("gray.800", "white");
  const itemColor = useColorModeValue("secondaryGray.600", "whiteAlpha.800");
  const hoverBg = useColorModeValue("rgba(15, 23, 42, 0.06)", "whiteAlpha.100");
  const activeDot = useColorModeValue("black", "white");

  if (isLoading && sessions.length === 0) {
    return (
      <Box mt="14px" px="10px">
        <Text fontSize="sm" fontWeight="600" color={labelColor} mb="6px">
          Recents
        </Text>
        <Text fontSize="xs" color={itemColor}>
          Loading...
        </Text>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Box mt="14px" px="10px">
        <Text fontSize="sm" fontWeight="600" color={labelColor} mb="6px">
          Recents
        </Text>
        <Text fontSize="xs" color={itemColor}>
          No recent chats
        </Text>
      </Box>
    );
  }

  return (
    <Box mt="14px" px="10px">
      <Text fontSize="sm" fontWeight="600" color={labelColor} mb="6px">
        Recents
      </Text>
      <Stack spacing="4px">
        {sessions.map((session) => (
          <NavLink key={session._id} to={`/history/${session._id}`}>
            <HStack
              spacing="8px"
              p="6px"
              borderRadius="10px"
              _hover={{ bg: hoverBg }}
              transition="background-color 0.2s ease"
            >
              <Flex
                w="18px"
                h="18px"
                align="center"
                justify="center"
                color={itemColor}
              >
                {location.pathname === `/history/${session._id}` ? (
                  <Box w="6px" h="6px" borderRadius="full" bg={activeDot} />
                ) : (
                  <Icon as={FiClock} />
                )}
              </Flex>
              <Text fontSize="sm" color={itemColor} noOfLines={1}>
                {session.title || "Untitled chat"}
              </Text>
            </HStack>
          </NavLink>
        ))}
      </Stack>
    </Box>
  );
}

export default RecentChats;
