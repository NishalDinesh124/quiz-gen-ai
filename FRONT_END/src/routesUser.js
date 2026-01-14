import React from 'react';

import { Icon } from '@chakra-ui/react';
import {
  FiHome,
  FiPlus,
  FiSearch,
  FiClock,
} from 'react-icons/fi';

import UserDashboard from 'views/user/dashboard';
import Studio from 'views/user/studio';
import History from 'views/user/history';
import HistorySession from 'views/user/history/session';

const EmptyPage = () => null;

const routes = [
  {
    name: 'Dashboard',
    layout: '',
    path: '/dashboard',
    icon: <Icon as={FiHome} width="18px" height="18px" color="inherit" />,
    component: <UserDashboard />,
  },
  {
    name: 'Add content',
    layout: '',
    path: '/studio',
    icon: <Icon as={FiPlus} width="18px" height="18px" color="inherit" />,
    component: <Studio />,
  },
  {
    name: 'Search',
    layout: '',
    path: '/search',
    icon: <Icon as={FiSearch} width="18px" height="18px" color="inherit" />,
    component: <EmptyPage />,
  },
  {
    name: 'History',
    layout: '',
    path: '/history',
    icon: <Icon as={FiClock} width="18px" height="18px" color="inherit" />,
    component: <History />,
    exact: true,
  },
  {
    name: 'History Session',
    layout: '',
    path: '/history/:sessionId',
    component: <HistorySession />,
    hidden: true,
  },
];

export default routes;
