// chakra imports
import { Box, Flex, Stack } from "@chakra-ui/react";
//   Custom components
import Brand from "components/sidebar/components/Brand";
import Links from "components/sidebar/components/Links";
import RecentChats from "components/sidebar/components/Recents";
import React from "react";

// FUNCTIONS

function SidebarContent(props) {
  const { routes } = props;
  const hasUserRoutes = routes.some((route) => {
    if (route.layout === "") return true;
    if (Array.isArray(route.items)) {
      return route.items.some((item) => item.layout === "");
    }
    return false;
  });
  const primaryRoutes = routes;
  // SIDEBAR
  return (
    <Flex direction='column' height='100%' pt='18px' px="12px" borderRadius='24px'>
      <Brand />
      <Stack direction='column' mt='6px'>
        <Box ps='10px' pe={{ md: "12px", "2xl": "1px" }}>
          <Links routes={primaryRoutes} />
        </Box>
      </Stack>
      {hasUserRoutes ? <RecentChats /> : null}

      <Box flex='1' />
      <Box
        mt='40px'
        mb='28px'
        borderRadius='24px'>
      </Box>
    </Flex>
  );
}

export default SidebarContent;
