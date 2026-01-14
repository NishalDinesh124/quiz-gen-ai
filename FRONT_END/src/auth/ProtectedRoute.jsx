import React from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return children;
};

export default ProtectedRoute;
