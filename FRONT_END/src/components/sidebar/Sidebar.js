import React, { useContext } from "react";

// chakra imports
import {
  Box,
  IconButton,
  useBreakpointValue,
  useColorModeValue,
} from "@chakra-ui/react";
import Content from "components/sidebar/components/Content";
import {
  renderThumb,
  renderTrack,
  renderView,
} from "components/scrollbar/Scrollbar";
import { Scrollbars } from "react-custom-scrollbars-2";
import PropTypes from "prop-types";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { SidebarContext } from "contexts/SidebarContext";

function Sidebar(props) {
  const { routes } = props;
  const sidebarContext = useContext(SidebarContext);
  const toggleSidebar = sidebarContext?.toggleSidebar ?? true;
  const setToggleSidebar = sidebarContext?.setToggleSidebar;
  const isDesktop = useBreakpointValue({ base: false, xl: true });
  const showOverlay = !isDesktop && toggleSidebar;
  const toggleIcon = toggleSidebar ? <MdChevronLeft /> : <MdChevronRight />;
  const sidebarWidth = "240px";
  const mobileToggleIcon = <MdChevronLeft />;

  let variantChange = "0.2s linear";
  let shadow = useColorModeValue(
    "14px 17px 40px 4px rgba(112, 144, 176, 0.08)",
    "10px 0 26px rgba(15, 23, 42, 0.55)"
  );
  // Chakra Color Mode
  let sidebarBg = useColorModeValue("white", "navy.800");
  let sidebarMargins = "0px";

  // SIDEBAR
  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      h="100vh"
      w={sidebarWidth}
      zIndex="1400"
      pointerEvents={toggleSidebar ? "auto" : "none"}
    >
      {showOverlay ? (
        <Box
          position="fixed"
          inset="0"
          bg="blackAlpha.400"
          zIndex="1400"
          onClick={() => setToggleSidebar?.(false)}
        />
      ) : null}
      <Box
        bg={sidebarBg}
        transition={variantChange}
        w={sidebarWidth}
        h='100vh'
        m={sidebarMargins}
        minH='100%'
        overflowX='hidden'
        boxShadow={shadow}
        position="relative"
        zIndex="1401"
        role="group"
        transform={toggleSidebar ? "translateX(0)" : "translateX(-100%)"}
      >
        {isDesktop ? (
          <IconButton
            aria-label={toggleSidebar ? "Collapse sidebar" : "Expand sidebar"}
            icon={toggleIcon}
            size="sm"
            variant="ghost"
            position="absolute"
            top="10px"
            right="10px"
            borderRadius="full"
            opacity="0"
            zIndex="1"
            transition="opacity 0.2s ease"
            _groupHover={{ opacity: 1 }}
            _focusVisible={{ opacity: 1 }}
            onClick={() => setToggleSidebar?.((prev) => !prev)}
            display={{ base: "none", xl: "inline-flex" }}
          />
        ) : null}
        {!isDesktop ? (
          <IconButton
            aria-label="Close sidebar"
            icon={mobileToggleIcon}
            size="sm"
            variant="ghost"
            position="absolute"
            top="10px"
            right="10px"
            borderRadius="full"
            zIndex="2"
            onClick={() => setToggleSidebar?.(false)}
            display={{ base: "inline-flex", xl: "none" }}
          />
        ) : null}
        <Scrollbars
          autoHide
          renderTrackVertical={renderTrack}
          renderThumbVertical={renderThumb}
          renderView={renderView}>
          <Content routes={routes} />
        </Scrollbars>
      </Box>
    </Box>
  );
}

// FUNCTIONS
export function SidebarResponsive(props) {
  return null;
}
// PROPS

Sidebar.propTypes = {
  logoText: PropTypes.string,
  routes: PropTypes.arrayOf(PropTypes.object),
  variant: PropTypes.string,
};

export default Sidebar;
