import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTrading } from '../context/useTrading';

const ProtectedRoute = ({ children }) => {
  const { user, authLoading } = useTrading();

  if (authLoading) {
    return <div className="min-h-screen bg-slate-900 text-slate-200 grid place-items-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
