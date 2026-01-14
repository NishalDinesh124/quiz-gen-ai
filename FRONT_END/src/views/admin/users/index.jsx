import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from 'components/card/Card';
import { API_ROUTES } from 'api/apiRoutes';
import { fetchWithAuth } from 'api/fetchWithAuth';
import { useLocation, useNavigate } from 'react-router-dom';

export default function AdminUsers() {
  const headingColor = useColorModeValue('gray.900', 'white');
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.300');
  const cardBg = useColorModeValue('white', 'black');

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [updating, setUpdating] = useState({ uid: null, field: null });
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = useCallback((user) => {
    const claims = user?.customClaims || {};
    return Boolean(claims.admin || claims.role === 'admin');
  }, []);

  const loadUsers = useCallback(
    async ({ pageToken = null, append = false } = {}) => {
      try {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (pageToken) params.set('pageToken', pageToken);
        if (query) params.set('search', query);

        const response = await fetchWithAuth(`${API_ROUTES.ADMIN.USERS}?${params}`);
        if (!response.ok) return;
        const payload = await response.json();

        setUsers((prev) => (append ? [...prev, ...(payload.users || [])] : payload.users || []));
        setNextPageToken(payload.nextPageToken || null);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    setIsLoading(true);
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const value = params.get('search') || '';
    setSearch(value);
    setQuery(value);
  }, [location.search]);

  const handleSearch = () => {
    const trimmed = search.trim();
    const path = trimmed
      ? `/admin/users?search=${encodeURIComponent(trimmed)}`
      : '/admin/users';
    navigate(path);
  };

  const handleToggle = async (user, field) => {
    const nextValue = field === 'disabled' ? !user.disabled : !isAdmin(user);
    const payload = field === 'disabled' ? { disabled: nextValue } : { admin: nextValue };

    try {
      setUpdating({ uid: user.uid, field });
      const response = await fetchWithAuth(API_ROUTES.ADMIN.UPDATE_USER(user.uid), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) return;
      const result = await response.json();
      setUsers((prev) =>
        prev.map((item) => (item.uid === user.uid ? result.user : item)),
      );
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setUpdating({ uid: null, field: null });
    }
  };

  const rows = useMemo(() => users, [users]);

  return (
    <Box pt={{ base: '120px', md: '96px', xl: '80px' }}>
      <Text fontSize="2xl" fontWeight="700" color={headingColor} mb="4px">
        Users
      </Text>
      <Text fontSize="sm" color={secondaryText} mb="20px">
        Manage user access and roles.
      </Text>

      <Flex gap="12px" mb="16px" wrap="wrap">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by email, name, or UID"
          maxW="320px"
        />
        <Button colorScheme="purple" size="sm" onClick={handleSearch}>
          Search
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigate('/admin/users');
          }}
        >
          Reset
        </Button>
      </Flex>

      <Card
        p="20px"
        borderRadius="24px"
        border="1px solid"
        borderColor={cardBorder}
        bg={cardBg}
      >
        {isLoading ? (
          <Text fontSize="sm" color={secondaryText}>
            Loading users...
          </Text>
        ) : rows.length > 0 ? (
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>User</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Role</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((user) => {
                  const adminRole = isAdmin(user);
                  return (
                    <Tr key={user.uid}>
                      <Td maxW="220px">
                        <Text fontSize="sm" color={headingColor} noOfLines={1}>
                          {user.displayName || 'Unnamed'}
                        </Text>
                        <Text fontSize="xs" color={secondaryText} noOfLines={1}>
                          {user.uid}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color={secondaryText}>
                          {user.email || 'No email'}
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={user.disabled ? 'red' : 'green'} variant="subtle">
                          {user.disabled ? 'Disabled' : 'Active'}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={adminRole ? 'purple' : 'gray'} variant="subtle">
                          {adminRole ? 'Admin' : 'User'}
                        </Badge>
                      </Td>
                      <Td>
                        <Flex gap="8px" wrap="wrap">
                          <Button
                            size="xs"
                            variant="outline"
                            colorScheme="purple"
                            onClick={() => handleToggle(user, 'admin')}
                            isLoading={
                              updating.uid === user.uid && updating.field === 'admin'
                            }
                          >
                            {adminRole ? 'Remove admin' : 'Make admin'}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            colorScheme={user.disabled ? 'green' : 'red'}
                            onClick={() => handleToggle(user, 'disabled')}
                            isLoading={
                              updating.uid === user.uid && updating.field === 'disabled'
                            }
                          >
                            {user.disabled ? 'Enable' : 'Disable'}
                          </Button>
                        </Flex>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        ) : (
          <Flex align="center" justify="center" py="60px">
            <Text fontSize="sm" color={secondaryText}>
              No users found.
            </Text>
          </Flex>
        )}
      </Card>

      {nextPageToken ? (
        <Flex justify="center" mt="16px">
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadUsers({ pageToken: nextPageToken, append: true })}
          >
            Load more
          </Button>
        </Flex>
      ) : null}
    </Box>
  );
}
