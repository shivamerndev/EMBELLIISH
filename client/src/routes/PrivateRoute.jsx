import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loading } from '../components/ui';

/**
 * Blocks the dashboard until a token has been validated against /auth/profile.
 * Rendering children before that check finishes would flash the ERP at someone
 * holding an expired token.
 */
export const PrivateRoute = () => {
  const location = useLocation();
  const { token, user, initialised } = useSelector((state) => state.auth);

  if (token && !initialised) return <Loading label="Checking your session…" />;
  if (!token || !user) return <Navigate to="/auth/login" replace state={{ from: location }} />;

  return <Outlet />;
};

export default PrivateRoute;
