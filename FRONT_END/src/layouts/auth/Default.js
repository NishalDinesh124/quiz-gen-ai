// Chakra imports
import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import React from 'react';
import Footer from 'components/footer/FooterAuth';
import FixedPlugin from 'components/fixedPlugin/FixedPlugin';
// Custom components
import { NavLink } from 'react-router-dom';
// Assets
import { FaChevronLeft } from 'react-icons/fa';

function AuthIllustration(props) {
  const { children} = props;
  // Chakra color mode
  return (
    <Flex position="relative" h="max-content">
      <Flex
        h={{
          sm: 'initial',
          md: 'unset',
          lg: '100vh',
          xl: '97vh',
        }}
        w="100%"
        maxW={{ md: '66%', lg: '1313px' }}
        mx="auto"
        pt={{ sm: '50px', md: '0px' }}
        px={{ lg: '30px', xl: '0px' }}
        ps={{ xl: '70px' }}
        justifyContent="start"
        direction="column"
      >
        <NavLink
          to="/"
          style={() => ({
            width: 'fit-content',
            marginTop: '40px',
          })}
        >
          <Flex
            align="center"
            ps={{ base: '25px', lg: '0px' }}
            pt={{ lg: '0px', xl: '0px' }}
            w="fit-content"
          >
            <Icon
              as={FaChevronLeft}
              me="12px"
              h="13px"
              w="8px"
              color="secondaryGray.600"
            />
            <Text ms="0px" fontSize="sm" color="secondaryGray.600">
              Back to Learn Craft
            </Text>
          </Flex>
        </NavLink>
        {children}
        <Box
          display={{ base: 'none', md: 'block' }}
          h="100%"
          minH="100vh"
          w={{ lg: '50vw', '2xl': '44vw' }}
          position="absolute"
          right="0px"
        >
          <Flex
            justify="center"
            align="center"
            w="100%"
            h="100%"
            bgSize="cover"
            bgPosition="50%"
            position="absolute"
            borderBottomLeftRadius={{ lg: '120px', xl: '200px' }}
            bgGradient="linear(135deg, brand.200 6%,brand.200 35%, brand.100 100%)"
          >
            <Flex flexDirection="column" align="center" textAlign="center">
              <Text fontSize="60px" fontWeight="700" color="brand.100">
                Learn Craft
              </Text>
              <Text fontSize="sm" color="secondaryGray.100">
                Craft and learn fast with our Learn Craft AI
              </Text>
            </Flex>
          </Flex>
        </Box>
        <Footer />
      </Flex>
      <FixedPlugin />
    </Flex>
  );
}
// PROPS

AuthIllustration.propTypes = {
  illustrationBackground: PropTypes.string,
  image: PropTypes.any,
};

export default AuthIllustration;
