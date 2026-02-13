import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTrading } from '../context/useTrading';

const ProtectedRoute = ({ children }) => {
  const { user } = useTrading();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
