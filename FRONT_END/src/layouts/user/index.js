// Chakra imports
import { Box, IconButton, Portal, useDisclosure } from '@chakra-ui/react';
// Layout components
import Navbar from 'components/navbar/NavbarUser';
import Sidebar from 'components/sidebar/Sidebar.js';
import { SidebarContext } from 'contexts/SidebarContext';
import React, { useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  matchPath,
} from 'react-router-dom';
import routes from 'routesUser.js';
import { MdMenu } from 'react-icons/md';

export default function UserLayout(props) {
  const { ...rest } = props;
  const [toggleSidebar, setToggleSidebar] = useState(true);
  const sidebarWidth = '240px';
  const { onOpen } = useDisclosure();
  const location = useLocation();
  const isAttendRoute = /^\/quizzes\/[^/]+\/attend$/.test(location.pathname);

  const getRoutes = (layoutRoutes) => {
    return layoutRoutes.map((route, key) => {
      if (route.layout === '') {
        return (
          <Route path={`${route.path}`} element={route.component} key={key} />
        );
      }
      if (route.collapse) {
        return getRoutes(route.items);
      }
      if (route.category) {
        return getRoutes(route.items);
      }
      return null;
    });
  };

  const getActiveRoute = (layoutRoutes) => {
    for (let i = 0; i < layoutRoutes.length; i++) {
      if (layoutRoutes[i].collapse) {
        let collapseActiveRoute = getActiveRoute(layoutRoutes[i].items);
        if (collapseActiveRoute) {
          return collapseActiveRoute;
        }
      } else if (layoutRoutes[i].category) {
        let categoryActiveRoute = getActiveRoute(layoutRoutes[i].items);
        if (categoryActiveRoute) {
          return categoryActiveRoute;
        }
      } else if (layoutRoutes[i].layout === '') {
        const isMatch = matchPath(
          { path: layoutRoutes[i].path, end: false },
          location.pathname,
        );
        if (isMatch) {
          return layoutRoutes[i].name;
        }
      }
    }
    return 'Dashboard';
  };

  document.documentElement.dir = 'ltr';

  if (isAttendRoute) {
    return (
      <Box minH="100vh" w="100%">
        <Routes>
          {getRoutes(routes)}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Box>
    );
  }

  return (
    <Box>
      <SidebarContext.Provider
        value={{
          toggleSidebar,
          setToggleSidebar,
        }}
      >
        <Sidebar routes={routes} display="none" {...rest} />
        {!toggleSidebar ? (
          <IconButton
            aria-label="Open sidebar"
            icon={<MdMenu />}
            size="sm"
            variant="solid"
            position="fixed"
            top={{ base: '12px', md: '16px' }}
            left={{ base: '12px', md: '16px' }}
            zIndex="1500"
            borderRadius="full"
            boxShadow="0 8px 18px rgba(15, 23, 42, 0.18)"
            onClick={() => setToggleSidebar(true)}
          />
        ) : null}
        <Box
          float="right"
          minHeight="100vh"
          position="relative"
          maxHeight="100vh"
          w={{
            base: '100%',
            xl: toggleSidebar ? `calc(100% - ${sidebarWidth})` : '100%',
          }}
          maxWidth={{
            base: '100%',
            xl: toggleSidebar ? `calc(100% - ${sidebarWidth})` : '100%',
          }}
          transition="all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)"
          transitionDuration=".2s, .2s, .35s"
          transitionProperty="top, bottom, width"
          transitionTimingFunction="linear, linear, ease"
        >
          <Portal>
            <Box>
              <Navbar
                onOpen={onOpen}
                brandText={getActiveRoute(routes)}
                routes={routes}
                {...rest}
              />
            </Box>
          </Portal>
          <Box
            mx="auto"
            px={{ base: '12px', md: '20px', xl: '24px' }}
            minH="100vh"
            pt="0px"
           
          >
            <Routes>
              {getRoutes(routes)}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Box>
        </Box>
      </SidebarContext.Provider>
    </Box>
  );
}
