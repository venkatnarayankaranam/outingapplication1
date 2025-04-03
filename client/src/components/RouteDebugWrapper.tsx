import { useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RouteDebugWrapperProps {
  children: ReactNode;
}

export const RouteDebugWrapper = ({ children }: RouteDebugWrapperProps) => {
  const location = useLocation();
  const { isAuthenticated, userDetails } = useAuth();

  useEffect(() => {
    console.log('[Route] Location changed:', {
      pathname: location.pathname,
      isAuthenticated,
      userRole: userDetails?.role,
      state: location.state
    });
  }, [location, isAuthenticated, userDetails]);

  return children;
};
