import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string | null;
  userEmail: string | null;
  userDetails: any | null;
  login: (email: string, role: string, userDetails?: any) => void;
  logout: () => void;
}

const defaultContext: AuthContextType = {
  isAuthenticated: false,
  userRole: null,
  userEmail: null,
  userDetails: null,
  login: () => {},
  logout: () => {},
};

// Export the AuthContext so it can be imported elsewhere
export const AuthContext = createContext<AuthContextType>(defaultContext);

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);

  // Add immediate auth check on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('userRole');
    const storedEmail = localStorage.getItem('userEmail');
    
    console.log('[AuthContext] Initial auth check:', {
      hasToken: !!token,
      storedRole,
      storedEmail
    });

    if (token && storedRole && storedEmail) {
      setIsAuthenticated(true);
      setUserRole(storedRole);
      setUserEmail(storedEmail);
      
      try {
        const storedDetails = localStorage.getItem('userDetails');
        if (storedDetails) {
          setUserDetails(JSON.parse(storedDetails));
        }
      } catch (error) {
        console.error('[AuthContext] Error parsing stored details:', error);
      }
    }
  }, []);

  const login = async (email: string, role: string, details?: any) => {
    try {
      console.log('[AuthContext] Login called:', { email, role, details });
      
      // Set localStorage items first
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userDetails', JSON.stringify(details));
      
      // Then update state
      setIsAuthenticated(true);
      setUserRole(role);
      setUserEmail(email);
      setUserDetails(details);

      console.log('[AuthContext] State updated:', {
        isAuthenticated: true,
        role,
        email,
        details
      });
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userDetails');
    setIsAuthenticated(false);
    setUserRole(null);
    setUserEmail(null);
    setUserDetails(null);
    
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, userEmail, userDetails, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
