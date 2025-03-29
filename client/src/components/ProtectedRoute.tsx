
import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { userRole, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please login to continue");
    } else if (userRole && !allowedRoles.includes(userRole)) {
      toast.error("You don't have permission to access this page");
    }
  }, [userRole, allowedRoles, isAuthenticated]);

  if (!isAuthenticated || !userRole) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={`/dashboard/${userRole}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
