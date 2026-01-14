import React from 'react';
import { Box, Button, Flex, Icon, Text } from '@chakra-ui/react';

export default function TabsPill({
  tabs,
  activeTab,
  onTabChange,
  tabsBg,
  tabsBorder,
  tabsActiveBg,
  headingColor,
}) {
  return (
    <Flex
      justify="center"
      bg={tabsBg}
      mx="auto"
      border="1px solid"
      borderColor={tabsBorder}
      borderRadius="999px"
      maxW="400px"
      p="4px"
      gap="4px"
      flexWrap="wrap"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Button
            key={tab.id}
            size="xs"
            variant="ghost"
            borderRadius="999px"
            bg={isActive ? tabsActiveBg : 'transparent'}
            onClick={() => onTabChange(tab.id)}
            fontWeight="500"
            color={headingColor}
            px="10px"
            height="28px"
          >
            <Flex align="center" gap="6px">
              {isActive ? (
                <Box w="8px" h="8px" borderRadius="full" bg="purple.400" />
              ) : (
                <Icon as={tab.icon} />
              )}
              <Text fontSize="sm">{tab.label}</Text>
            </Flex>
          </Button>
        );
      })}
    </Flex>
  );
}
