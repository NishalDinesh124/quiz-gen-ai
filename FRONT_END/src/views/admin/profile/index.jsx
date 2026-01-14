import {
  Badge,
  Box,
  Button,
  Flex,
  SimpleGrid,
  Stack,
  Text,
  Input,
  NumberInput,
  NumberInputField,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import React, { useEffect, useMemo, useState } from 'react';
import Card from 'components/card/Card';
import { useAuth } from 'auth/AuthContext';
import { fetchWithAuth } from 'api/fetchWithAuth';
import { API_ROUTES } from 'api/apiRoutes';

export default function AdminSettings() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const headingColor = useColorModeValue('gray.900', 'white');
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.300');
  const cardBg = useColorModeValue('white', 'black');
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const inputBg = useColorModeValue('gray.50', 'whiteAlpha.100');

  const [planConfigs, setPlanConfigs] = useState([]);
  const [savingKey, setSavingKey] = useState('');

  const planRows = useMemo(
    () =>
      planConfigs.map((plan) => ({
        ...plan,
        limits: {
          messagesPerDay: plan.limits?.messagesPerDay ?? 0,
          flashcardGenerationsPerDay:
            plan.limits?.flashcardGenerationsPerDay ?? 0,
          quizGenerationsPerDay: plan.limits?.quizGenerationsPerDay ?? 0,
          noteGenerationsPerDay: plan.limits?.noteGenerationsPerDay ?? 0,
        },
        monthlyPriceId: plan.monthly?.priceId || '',
        yearlyPriceId: plan.yearly?.priceId || '',
      })),
    [planConfigs],
  );

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await fetchWithAuth(API_ROUTES.ADMIN.PLANS);
        if (!response.ok) return;
        const payload = await response.json();
        if (payload?.success) {
          setPlanConfigs(payload.plans || []);
        }
      } catch (err) {
        toast({
          status: 'error',
          title: 'Failed to load plans',
          description: err.message || 'Try again later.',
        });
      }
    };
    loadPlans();
  }, [toast]);

  const handlePlanChange = (key, patch) => {
    setPlanConfigs((prev) =>
      prev.map((plan) =>
        plan.key === key
          ? {
              ...plan,
              ...patch,
              limits: {
                ...(plan.limits || {}),
                ...(patch.limits || {}),
              },
            }
          : plan,
      ),
    );
  };

  const handleSavePlan = async (plan) => {
    setSavingKey(plan.key);
    try {
      const payload = {
        limits: plan.limits,
        monthlyPriceId: plan.monthly?.priceId || '',
        yearlyPriceId: plan.yearly?.priceId || '',
      };
      const response = await fetchWithAuth(
        API_ROUTES.ADMIN.UPDATE_PLAN(plan.key),
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        },
      );
      if (response.ok) {
        const payload = await response.json();
        if (payload?.success) {
        toast({
          status: 'success',
          title: `${plan.label} updated`,
        });
        }
      }
    } catch (err) {
      toast({
        status: 'error',
        title: 'Update failed',
        description: err.message || 'Try again later.',
      });
    } finally {
      setSavingKey('');
    }
  };

  return (
    <Box pt={{ base: '120px', md: '96px', xl: '80px' }}>
      <Text fontSize="2xl" fontWeight="700" color={headingColor} mb="4px">
        Settings
      </Text>
      <Text fontSize="sm" color={secondaryText} mb="20px">
        Admin profile and platform preferences.
      </Text>

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap="20px">
        <Card
          p="20px"
          borderRadius="24px"
          border="1px solid"
          borderColor={cardBorder}
          bg={cardBg}
        >
          <Text fontWeight="700" color={headingColor} mb="12px">
            Admin profile
          </Text>
          <Text fontSize="sm" color={secondaryText}>
            Name
          </Text>
          <Text fontWeight="600" color={headingColor} mb="8px">
            {currentUser?.displayName || 'Admin'}
          </Text>
          <Text fontSize="sm" color={secondaryText}>
            Email
          </Text>
          <Text fontWeight="600" color={headingColor} mb="12px">
            {currentUser?.email || 'Not available'}
          </Text>
          <Badge colorScheme="purple" variant="subtle">
            Admin access
          </Badge>
        </Card>

        <Card
          p="20px"
          borderRadius="24px"
          border="1px solid"
          borderColor={cardBorder}
          bg={cardBg}
        >
          <Text fontWeight="700" color={headingColor} mb="12px">
            Platform controls
          </Text>
          <Text fontSize="sm" color={secondaryText} mb="12px">
            Billing management and feature flags can be configured once admin
            endpoints are wired.
          </Text>
          <Flex gap="12px" wrap="wrap">
            <Button size="sm" variant="outline" colorScheme="purple">
              Manage billing
            </Button>
            <Button size="sm" variant="solid" colorScheme="purple">
              Feature flags
            </Button>
          </Flex>
        </Card>

        <Card
          p="20px"
          borderRadius="24px"
          border="1px solid"
          borderColor={cardBorder}
          bg={cardBg}
        >
          <Text fontWeight="700" color={headingColor} mb="8px">
            Plan limits & price IDs
          </Text>
          <Text fontSize="sm" color={secondaryText} mb="16px">
            Update daily limits and Stripe price IDs for Starter, Plus, and Pro.
          </Text>
          <Stack spacing="16px">
            {planRows.map((plan) => (
              <Box
                key={plan.key}
                border="1px solid"
                borderColor={cardBorder}
                borderRadius="16px"
                p="16px"
              >
                <Flex
                  align="center"
                  justify="space-between"
                  mb="12px"
                  wrap="wrap"
                  gap="8px"
                >
                  <Text fontWeight="700" color={headingColor}>
                    {plan.label}
                  </Text>
                  <Text fontSize="xs" color={mutedText}>
                    {plan.monthly?.amount
                      ? `$${plan.monthly.amount}/mo`
                      : 'Pricing set in Stripe'}
                  </Text>
                </Flex>

                <Stack spacing="10px">
                  <Box>
                    <Text fontSize="xs" color={mutedText} mb="4px">
                      Monthly price ID
                    </Text>
                    <Input
                      size="sm"
                      bg={inputBg}
                      value={plan.monthly?.priceId || ''}
                      onChange={(event) =>
                        handlePlanChange(plan.key, {
                          monthly: {
                            ...(plan.monthly || {}),
                            priceId: event.target.value,
                          },
                        })
                      }
                    />
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={mutedText} mb="4px">
                      Yearly price ID
                    </Text>
                    <Input
                      size="sm"
                      bg={inputBg}
                      value={plan.yearly?.priceId || ''}
                      onChange={(event) =>
                        handlePlanChange(plan.key, {
                          yearly: {
                            ...(plan.yearly || {}),
                            priceId: event.target.value,
                          },
                        })
                      }
                    />
                  </Box>
                </Stack>

                <SimpleGrid columns={{ base: 1, md: 2 }} gap="10px" mt="14px">
                  <Box>
                    <Text fontSize="xs" color={mutedText} mb="4px">
                      Messages per day
                    </Text>
                    <NumberInput
                      size="sm"
                      min={0}
                      value={plan.limits?.messagesPerDay ?? 0}
                      onChange={(_, value) =>
                        handlePlanChange(plan.key, {
                          limits: { messagesPerDay: value },
                        })
                      }
                    >
                      <NumberInputField bg={inputBg} />
                    </NumberInput>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={mutedText} mb="4px">
                      Flashcard generations
                    </Text>
                    <NumberInput
                      size="sm"
                      min={0}
                      value={plan.limits?.flashcardGenerationsPerDay ?? 0}
                      onChange={(_, value) =>
                        handlePlanChange(plan.key, {
                          limits: { flashcardGenerationsPerDay: value },
                        })
                      }
                    >
                      <NumberInputField bg={inputBg} />
                    </NumberInput>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={mutedText} mb="4px">
                      Quiz generations
                    </Text>
                    <NumberInput
                      size="sm"
                      min={0}
                      value={plan.limits?.quizGenerationsPerDay ?? 0}
                      onChange={(_, value) =>
                        handlePlanChange(plan.key, {
                          limits: { quizGenerationsPerDay: value },
                        })
                      }
                    >
                      <NumberInputField bg={inputBg} />
                    </NumberInput>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={mutedText} mb="4px">
                      Notes generations
                    </Text>
                    <NumberInput
                      size="sm"
                      min={0}
                      value={plan.limits?.noteGenerationsPerDay ?? 0}
                      onChange={(_, value) =>
                        handlePlanChange(plan.key, {
                          limits: { noteGenerationsPerDay: value },
                        })
                      }
                    >
                      <NumberInputField bg={inputBg} />
                    </NumberInput>
                  </Box>
                </SimpleGrid>

                <Flex justify="flex-end" mt="12px">
                  <Button
                    size="sm"
                    colorScheme="purple"
                    onClick={() => handleSavePlan(plan)}
                    isLoading={savingKey === plan.key}
                  >
                    Save {plan.label}
                  </Button>
                </Flex>
              </Box>
            ))}
          </Stack>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
