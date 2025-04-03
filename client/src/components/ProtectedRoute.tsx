import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeRole } from '@/utils/security';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, userRole } = useAuth();
  const normalizedUserRole = normalizeRole(userRole || '');
  const normalizedAllowedRoles = allowedRoles.map(role => normalizeRole(role));

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
    console.error('Access denied:', {
      userRole: normalizedUserRole,
      allowedRoles: normalizedAllowedRoles,
      path: window.location.pathname
    });
    return <Navigate to="/404" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
