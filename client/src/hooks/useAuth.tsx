
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';

// Admin credentials mapping
const ADMIN_CREDENTIALS: Record<string, { password: string; role: string }> = {
  "floorincharge@kietgroup.com": {
    password: "FloorIncharge@2026",
    role: "floor-incharge"
  },
  "hostelincharge@kietgroup.com": {
    password: "HostelIncharge@2026",
    role: "hostel-incharge"
  },
  "maingate@kietgroup.com": {
    password: "MainGate@2026",
    role: "gate"
  }
};

export const useAuth = () => {
  const auth = useAuthContext();
  const navigate = useNavigate();

  const loginWithCredentials = async (email: string, password: string) => {
    // Check if email exists in admin credentials
    if (email in ADMIN_CREDENTIALS) {
      const adminInfo = ADMIN_CREDENTIALS[email];
      
      // Check if password matches
      if (password === adminInfo.password) {
        // Login using AuthContext
        auth.login(email, adminInfo.role);
        
        // Show success message
        toast.success(`Logged in as ${adminInfo.role}`);
        
        // Redirect to the appropriate dashboard
        navigate(`/dashboard/${adminInfo.role}`);
        return true;
      }
    }
    
    // If execution reaches here, credentials are invalid
    toast.error("Invalid login credentials");
    return false;
  };

  const loginAsStudent = () => {
    const studentEmail = "student@example.com";
    auth.login(studentEmail, "student");
    toast.success("Logged in as student");
    navigate("/dashboard/student");
    return true;
  };

  const logout = () => {
    auth.logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return {
    isAuthenticated: auth.isAuthenticated,
    userRole: auth.userRole,
    userEmail: auth.userEmail,
    loginWithCredentials,
    loginAsStudent,
    logout
  };
};

export default useAuth;
