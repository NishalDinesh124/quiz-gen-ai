import './assets/css/App.css';
import { Routes, Route } from 'react-router-dom';
import {} from 'react-router-dom';
import AuthLayout from './layouts/auth';
import UserLayout from './layouts/user';
import ProtectedRoute from './auth/ProtectedRoute';
import {
  ChakraProvider,
  // extendTheme
} from '@chakra-ui/react';
import initialTheme from './theme/theme'; //  { themeGreen }
import { useState } from 'react';
// Chakra imports

export default function Main() {
  // eslint-disable-next-line
  const [currentTheme, setCurrentTheme] = useState(initialTheme);
  return (
    <ChakraProvider theme={currentTheme}>
      <Routes>
        <Route path="auth/*" element={<AuthLayout />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <UserLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ChakraProvider>
  );
}
