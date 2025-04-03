import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Moon, Sun, User, ArrowLeft, Phone, CheckCircle, Home, BookOpen, School, Hash } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeRole, getDashboardPath } from "@/utils/security";
import axiosInstance from "@/utils/axiosInstance";

// Admin credentials mapping for fallback
const ADMIN_CREDENTIALS = {
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
  },
  "warden@kietgroup.com": {
    password: "Warden@2026",
    role: "warden"
  }
};

// Backend URL
const backendUrl = "http://localhost:5000/api";

// Floor options
const FLOOR_OPTIONS = [
  { value: "1", label: "1st Floor" },
  { value: "2", label: "2nd Floor" },
  { value: "3", label: "3rd Floor" },
  { value: "4", label: "4th Floor" }
];

// Hostel Block options
const HOSTEL_BLOCK_OPTIONS = [
  { value: "D-Block", label: "D-Block" },
  { value: "E-Block", label: "E-Block" },
  { value: "Women's", label: "Women's Block" }
];

// Branch options
const BRANCH_OPTIONS = [
  { value: "AID", label: "Artificial Intelligence and Data Science" },
  { value: "CSM", label: "Computer Science in Machine Learning" },
  { value: "CAI", label: "Computer Science in Artificial Intelligence" },
  { value: "CSD", label: "Computer Science in Data Science" },
  { value: "CSC", label: "Computer Science in Cyber Security" },
  { value: "CME", label: "Diploma" }
];

// Semester options
const SEMESTER_OPTIONS = [
  { value: "1", label: "1st Semester" },
  { value: "2", label: "2nd Semester" },
  { value: "3", label: "3rd Semester" },
  { value: "4", label: "4th Semester" },
  { value: "5", label: "5th Semester" },
  { value: "6", label: "6th Semester" },
  { value: "7", label: "7th Semester" },
  { value: "8", label: "8th Semester" }
];

const Login = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { login, isAuthenticated, userRole, userDetails } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Registration form state
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [parentPhoneNumber, setParentPhoneNumber] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [floor, setFloor] = useState("");
  const [hostelBlock, setHostelBlock] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    const currentPath = window.location.pathname;
    console.log('[Login] Auth check:', {
      isAuthenticated,
      userRole,
      currentPath,
      hasToken: !!localStorage.getItem('token'),
      userDetails // Log userDetails to verify it's available
    });

    // Only redirect if on login page and authenticated
    if (isAuthenticated && userRole && currentPath === '/login') {
      const dashboardPath = `/dashboard/${userRole.replace('security', 'gate')}`; // Handle security/gate role mapping
      console.log('[Login] Redirecting to:', dashboardPath);
      navigate(dashboardPath, { replace: true });
    }
  }, [isAuthenticated, userRole, userDetails]); // Add userDetails to dependencies

  const authenticateWithBackend = async (email: string, password: string) => {
    try {
      setConnectionError(false);
      const response = await axiosInstance.post('/auth/login', {
        email,
        password
      });
      
      if (response.data.success) {
        return {
          success: true,
          userData: response.data.user,
          token: response.data.token
        };
      }
      return { success: false, message: response.data.message || 'Authentication failed' };
    } catch (error: any) {
      if (error.message === 'Network Error') {
        setConnectionError(true);
        return { success: false, message: 'Backend connection failed', fallback: true };
      }
      return { success: false, message: error.response?.data?.message || 'Authentication failed' };
    }
  };

  const registerUser = async () => {
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    // Basic validation
    if (!name || !email || !password || !rollNumber || !phoneNumber || 
        !parentPhoneNumber || !floor || !hostelBlock || !roomNumber || 
        !branch || !semester) {
      toast.error("All fields are required");
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    // Phone number validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber) || !phoneRegex.test(parentPhoneNumber)) {
      toast.error("Phone numbers must be 10 digits");
      return false;
    }

    try {
      const response = await axiosInstance.post('/auth/register', {
        email,
        password,
        name,
        rollNumber,
        phoneNumber,
        parentPhoneNumber,
        floor,
        hostelBlock,
        roomNumber,
        branch,
        semester,
        role: "student" // Default role for registering users
      });
      
      if (response.data.success) {
        toast.success("Registration successful! Please log in.");
        return true;
      } else {
        toast.error(response.data.message || "Registration failed");
        return false;
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Check if it's a network error
      if (error.message === 'Network Error') {
        toast.error("Cannot connect to server. Please try again later or contact support.");
      } else {
        toast.error(error.response?.data?.message || "Registration failed. Please try again.");
      }
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const backendAuth = await authenticateWithBackend(email, password);
      
      if (backendAuth.success && backendAuth.userData) {
        if (backendAuth.token) {
          localStorage.setItem('token', backendAuth.token);
        }
        
        const normalizedRole = normalizeRole(backendAuth.userData.role);
        await login(email, normalizedRole, backendAuth.userData);
        toast.success(`Welcome back, ${backendAuth.userData.name || email}`);
        
        const dashboardPath = getDashboardPath(normalizedRole);
        console.log('[Login] Navigating to:', dashboardPath);
        navigate(dashboardPath, { replace: true });
        return;
      }
      
      // Fallback authentication for admin users
      if (backendAuth.fallback || connectionError) {
        if (email in ADMIN_CREDENTIALS) {
          const adminInfo = ADMIN_CREDENTIALS[email as keyof typeof ADMIN_CREDENTIALS];
          
          if (password === adminInfo.password) {
            const mockToken = btoa(`admin:${email}`);
            localStorage.setItem('token', mockToken);
            const normalizedRole = normalizeRole(adminInfo.role);
            await login(email, normalizedRole);
            toast.success(`Welcome, ${normalizedRole.replace('-', ' ')}`);
            navigate(getDashboardPath(normalizedRole), { replace: true });
            return;
          }
        }
      }
      
      toast.error(backendAuth.message || "Invalid login credentials");
    } catch (error) {
      console.error('[Login] Error:', error);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await registerUser();
      if (success) {
        // Reset form and switch to login
        setIsRegistering(false);
        setPassword("");
        setConfirmPassword("");
        // Keep email for convenience
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRegistrationMode = () => {
    setIsRegistering(!isRegistering);
    // Reset form fields when switching modes
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setRollNumber("");
    setPhoneNumber("");
    setParentPhoneNumber("");
    setFloor("");
    setHostelBlock("");
    setRoomNumber("");
    setBranch("");
    setSemester("");
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
      <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700 text-white' : 'glass-card'} w-full max-w-md p-8 space-y-6 overflow-y-auto max-h-screen`}>
        <div className="flex justify-between items-center">
          {isRegistering && (
            <button
              onClick={toggleRegistrationMode}
              className="hover:opacity-80 transition-opacity flex items-center gap-1 text-sm"
              aria-label="Back to login"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </button>
          )}
          <div className={isRegistering ? 'ml-auto' : ''}>
            <button
              onClick={toggleTheme}
              className="hover:opacity-80 transition-opacity"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Outing System</h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
            {isRegistering ? 'Create a new account' : 'Sign in to access your dashboard'}
          </p>
          {connectionError && !isRegistering && (
            <p className="text-yellow-500 text-sm mt-2">
              Backend connection failed. Using fallback authentication.
            </p>
          )}
        </div>

        {isRegistering ? (
          // Registration Form
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="register-name"
                  type="text"
                  placeholder="Enter your full name"
                  className={`pl-10 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder="Enter your email"
                  className={`pl-10 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-roll">Roll Number</Label>
              <div className="relative">
                <CheckCircle className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="register-roll"
                  type="text"
                  placeholder="Enter your roll number"
                  className={`pl-10 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hostel-block">Hostel Block</Label>
                <div className="relative">
                  <Home className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <Select 
                    value={hostelBlock} 
                    onValueChange={setHostelBlock}
                    required
                  >
                    <SelectTrigger className={`pl-10 w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}>
                      <SelectValue placeholder="Select block" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
                      {HOSTEL_BLOCK_OPTIONS.map((option) => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className={theme === 'dark' ? 'hover:bg-gray-700' : ''}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <Select 
                    value={floor} 
                    onValueChange={setFloor}
                    required
                  >
                    <SelectTrigger className={`pl-10 w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}>
                      <SelectValue placeholder="Select floor" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
                      {FLOOR_OPTIONS.map((option) => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className={theme === 'dark' ? 'hover:bg-gray-700' : ''}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-number">Room Number</Label>
              <div className="relative">
                <Home className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="room-number"
                  type="text"
                  placeholder="Enter your room number"
                  className={`pl-10 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <div className="relative">
                  <School className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <Select 
                    value={branch} 
                    onValueChange={setBranch}
                    required
                  >
                    <SelectTrigger className={`pl-10 w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
                      {BRANCH_OPTIONS.map((option) => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className={theme === 'dark' ? 'hover:bg-gray-700' : ''}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <Select 
                    value={semester} 
                    onValueChange={setSemester}
                    required
                  >
                    <SelectTrigger className={`pl-10 w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
                      {SEMESTER_OPTIONS.map((option) => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className={theme === 'dark' ? 'hover:bg-gray-700' : ''}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="register-phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  className={`pl-10 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-parent-phone">Parent's Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="register-parent-phone"
                  type="tel"
                  placeholder="Enter parent's phone number"
                  className={`pl-10 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                  value={parentPhoneNumber}
                  onChange={(e) => setParentPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="register-password"
                  type="password"
                  placeholder="Create a password"
                  className={`pl-10 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="register-confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  className={`pl-10 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button 
              className={`w-full ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : ''}`}
              type="submit"
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </Button>

            <div className="text-center">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={toggleRegistrationMode}
                  className="text-blue-500 hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        ) : (
          // Login Form
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className={`pl-10 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className={`pl-10 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              className={`w-full ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : ''}`}
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={toggleRegistrationMode}
                  className="text-blue-500 hover:underline"
                >
                  Create Account
                </button>
              </p>
            </div>
          </form>
        )}

        {!isRegistering && (
          <div className={`text-center text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>Enter your email and password to sign in.</p>
            <p className="mt-2">Admin Users:</p>
            <p className="mt-1">Floor Incharge: floorincharge@kietgroup.com / FloorIncharge@2026</p>
            <p>Hostel Incharge: hostelincharge@kietgroup.com / HostelIncharge@2026</p>
            <p>Main Gate: maingate@kietgroup.com / MainGate@2026</p>
            <p>Warden: warden@kietgroup.com / Warden@2026</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Login;