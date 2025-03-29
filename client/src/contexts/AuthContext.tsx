
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

  // Check if user is already logged in
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    const storedEmail = localStorage.getItem('userEmail');
    const storedDetails = localStorage.getItem('userDetails');
    
    if (storedRole) {
      setIsAuthenticated(true);
      setUserRole(storedRole);
      setUserEmail(storedEmail);
      
      if (storedDetails) {
        try {
          setUserDetails(JSON.parse(storedDetails));
        } catch (error) {
          console.error('Error parsing user details:', error);
          // If there's an error parsing, clear the corrupted data
          localStorage.removeItem('userDetails');
        }
      }
    }
  }, []);

  const login = (email: string, role: string, details?: any) => {
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userRole', role);
    
    if (details) {
      localStorage.setItem('userDetails', JSON.stringify(details));
      setUserDetails(details);
    }
    
    setIsAuthenticated(true);
    setUserRole(role);
    setUserEmail(email);
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
