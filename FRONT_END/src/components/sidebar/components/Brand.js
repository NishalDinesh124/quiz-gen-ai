import React from "react";

// Chakra imports
import { Flex, useColorModeValue,Text } from "@chakra-ui/react";

export function SidebarBrand() {
  //   Chakra color mode
  let logoColor = useColorModeValue("navy.700", "white");

  return (
    <Flex align='center' direction='column'>
      <Text fontSize={30} fontWeight={600} color={logoColor} my={3} >Learn Craft</Text>
    </Flex>
  );
}

export default SidebarBrand;
