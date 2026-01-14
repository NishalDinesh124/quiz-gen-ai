/* eslint-disable */
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
// chakra imports
import { Box, Flex, HStack, Text, useColorModeValue } from "@chakra-ui/react";

export function SidebarLinks(props) {
  //   Chakra color mode
  let location = useLocation();
  let activeColor = useColorModeValue("gray.800", "white");
  let inactiveColor = useColorModeValue(
    "secondaryGray.600",
    "secondaryGray.600"
  );
  let activeIcon = useColorModeValue("brand.500", "white");
  let textColor = useColorModeValue("secondaryGray.500", "whiteAlpha.800");
  let brandColor = useColorModeValue("brand.500", "brand.400");
  let activeBg = useColorModeValue("rgba(15, 23, 42, 0.06)", "rgba(255, 255, 255, 0.08)");
  let activeDot = useColorModeValue("black", "white");

  const { routes } = props;

  // verifies if routeName is the one active (in browser input)
  const activeRoute = (routeName, exact = false) => {
    if (exact) {
      return location.pathname === routeName;
    }
    return location.pathname.includes(routeName);
  };

  // this function creates the links from the secondary accordions (for example auth -> sign-in -> default)
  const createLinks = (routes) => {
    return routes.map((route, index) => {
      if (route.hidden) {
        return null;
      }
      if (route.category) {
        return (
          <>
            <Text
              fontSize="sm"
              color={activeColor}
              fontWeight='600'
              mx='auto'
              ps={{
                sm: "8px",
                xl: "12px",
              }}
              pt='14px'
              pb='8px'
              key={index}>
              {route.name}
            </Text>
            {createLinks(route.items)}
          </>
        );
      } else if (
        route.layout === "/admin" ||
        route.layout === "/auth" ||
        route.layout === "/rtl" ||
        route.layout === ""
      ) {
        const fullPath = route.layout + route.path;
        const isActive = activeRoute(route.path.toLowerCase(), route.exact);
        return (
          <NavLink key={index} to={route.layout + route.path}>
            {route.icon ? (
              <Box>
                <HStack
                  spacing={
                    isActive ? "12px" : "14px"
                  }
                  py='6px'
                  ps='6px'
                  borderRadius="12px"
                  bg={isActive ? activeBg : "transparent"}>
                  <Flex w='100%' alignItems='center' justifyContent='center'>
                    <Box
                      w="16px"
                      h="16px"
                      me="12px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color={isActive ? activeIcon : textColor}
                      fontSize="16px">
                      {isActive ? (
                        <Box w="6px" h="6px" borderRadius="full" bg={activeDot} />
                      ) : (
                        route.icon
                      )}
                    </Box>
                    <Text
                      me='auto'
                      color={isActive ? activeColor : textColor}
                      fontWeight={isActive ? "bold" : "normal"}
                      fontSize="sm">
                      {route.name}
                    </Text>
                  </Flex>
                </HStack>
              </Box>
            ) : (
              <Box>
                <HStack
                  spacing={
                    isActive ? "12px" : "14px"
                  }
                  py='6px'
                  ps='6px'
                  borderRadius="12px"
                  bg={isActive ? activeBg : "transparent"}>
                  <Text
                    me='auto'
                    color={isActive ? activeColor : inactiveColor}
                    fontWeight={isActive ? "bold" : "normal"}
                    fontSize="sm">
                    {route.name}
                  </Text>
                </HStack>
              </Box>
            )}
          </NavLink>
        );
      }
    });
  };
  //  BRAND
  return createLinks(routes);
}

export default SidebarLinks;
